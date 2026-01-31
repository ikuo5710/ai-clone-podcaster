import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { Hono } from 'hono';
import type { PodcastJob } from '../types/podcast.js';
import { ValidationError, NotFoundError } from '../types/errors.js';
import { VoiceRepository } from '../repositories/VoiceRepository.js';
import { TTSService } from '../services/TTSService.js';
import { AudioMixer } from '../services/AudioMixer.js';

const MAX_BGM_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const BGM_DIR = path.resolve('data', 'bgm');
const OUTPUT_DIR = path.resolve('data', 'output');

export function createPodcastRoutes(
  voiceRepository: VoiceRepository,
  ttsService: TTSService,
  audioMixer: AudioMixer
): Hono {
  const app = new Hono();
  const jobs = new Map<string, PodcastJob>();

  /** POST /api/podcasts — ポッドキャスト生成ジョブ作成 */
  app.post('/', async (c) => {
    const body = await c.req.parseBody();

    // バリデーション: script
    const script = body['script'];
    if (typeof script !== 'string' || script.trim().length === 0) {
      throw new ValidationError(
        '台本テキストを入力してください',
        'script',
        script
      );
    }

    // バリデーション: voiceId
    const voiceId = body['voiceId'];
    if (typeof voiceId !== 'string' || voiceId.trim().length === 0) {
      throw new ValidationError(
        '声IDを指定してください',
        'voiceId',
        voiceId
      );
    }

    const voice = await voiceRepository.findById(voiceId);
    if (!voice) {
      throw new NotFoundError('Voice', voiceId);
    }

    // BGM音量
    const bgmVolumeRaw = body['bgmVolume'];
    let bgmVolume = 0.3;
    if (bgmVolumeRaw !== undefined && bgmVolumeRaw !== '') {
      bgmVolume = Number(bgmVolumeRaw);
      if (isNaN(bgmVolume) || bgmVolume < 0 || bgmVolume > 1) {
        throw new ValidationError(
          'BGM音量は0.0〜1.0の範囲で指定してください',
          'bgmVolume',
          bgmVolumeRaw
        );
      }
    }

    // スタイル指示（任意）
    const styleInstructionRaw = body['styleInstruction'];
    const styleInstruction =
      typeof styleInstructionRaw === 'string' && styleInstructionRaw.trim().length > 0
        ? styleInstructionRaw.trim()
        : undefined;

    // BGMファイル（任意）
    let bgmFileName: string | undefined;
    const bgm = body['bgm'];
    if (bgm instanceof File && bgm.size > 0) {
      if (bgm.size > MAX_BGM_FILE_SIZE) {
        throw new ValidationError(
          'BGMファイルサイズが上限を超えています（上限: 100MB）',
          'bgm',
          bgm.size
        );
      }
      await fs.mkdir(BGM_DIR, { recursive: true });
      const ext = bgm.name?.split('.').pop() ?? 'mp3';
      bgmFileName = `${uuidv4()}.${ext}`;
      const bgmBuffer = Buffer.from(await bgm.arrayBuffer());
      await fs.writeFile(path.join(BGM_DIR, bgmFileName), bgmBuffer);
    }

    // ジョブ作成
    const jobId = uuidv4();
    const job: PodcastJob = {
      id: jobId,
      status: 'pending',
      script: script.trim(),
      voiceId,
      styleInstruction,
      bgmFileName,
      bgmVolume,
      createdAt: new Date().toISOString(),
    };
    jobs.set(jobId, job);

    // バックグラウンドで処理開始
    processJob(job, voiceRepository, ttsService, audioMixer).catch(() => {
      // エラーはjob.error/job.statusに記録済み
    });

    return c.json({ id: job.id, status: job.status }, 202);
  });

  /** GET /api/podcasts/:id — ジョブステータス取得 */
  app.get('/:id', (c) => {
    const id = c.req.param('id');
    const job = jobs.get(id);
    if (!job) {
      throw new NotFoundError('PodcastJob', id);
    }

    const response: Record<string, unknown> = {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
    };
    if (job.status === 'failed' && job.error) {
      response['error'] = job.error;
    }
    return c.json(response);
  });

  /** GET /api/podcasts/:id/download — ポッドキャスト音声ダウンロード */
  app.get('/:id/download', async (c) => {
    const id = c.req.param('id');
    const job = jobs.get(id);
    if (!job) {
      throw new NotFoundError('PodcastJob', id);
    }

    if (job.status !== 'completed' || !job.outputFileName) {
      return c.json({ error: 'ジョブが未完了です' }, 409);
    }

    const filePath = path.join(OUTPUT_DIR, job.outputFileName);
    const fileBuffer = await fs.readFile(filePath);
    c.header('Content-Type', 'audio/mpeg');
    c.header(
      'Content-Disposition',
      `attachment; filename="${job.outputFileName}"`
    );
    return c.body(fileBuffer);
  });

  // テスト用にジョブMapにアクセスするためのヘルパー
  (app as unknown as { _jobs: Map<string, PodcastJob> })._jobs = jobs;

  return app;
}

async function processJob(
  job: PodcastJob,
  voiceRepository: VoiceRepository,
  ttsService: TTSService,
  audioMixer: AudioMixer
): Promise<void> {
  try {
    // TTS生成
    job.status = 'tts_processing';

    const voice = await voiceRepository.findById(job.voiceId);
    if (!voice) {
      throw new Error(`Voice not found: ${job.voiceId}`);
    }
    const voiceFilePath = voiceRepository.getFilePath(voice);

    const ttsOutputPath = await ttsService.generateSpeech(
      job.script,
      voiceFilePath,
      job.id,
      job.styleInstruction
    );

    // BGM合成 or mp3変換
    job.status = 'mixing';
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const outputFileName = `${job.id}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    if (job.bgmFileName) {
      const bgmPath = path.join(BGM_DIR, job.bgmFileName);
      await audioMixer.mixWithBgm(
        ttsOutputPath,
        bgmPath,
        job.bgmVolume,
        outputPath
      );
    } else {
      await audioMixer.convertToMp3(ttsOutputPath, outputPath);
    }

    job.outputFileName = outputFileName;
    job.status = 'completed';
  } catch (err) {
    job.status = 'failed';
    job.error =
      err instanceof Error ? err.message : '不明なエラーが発生しました';
  }
}
