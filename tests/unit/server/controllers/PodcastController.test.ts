import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { createPodcastRoutes } from '../../../../src/server/controllers/PodcastController.js';
import { VoiceRepository } from '../../../../src/server/repositories/VoiceRepository.js';
import { TTSService } from '../../../../src/server/services/TTSService.js';
import { AudioMixer } from '../../../../src/server/services/AudioMixer.js';
import {
  ValidationError,
  NotFoundError,
} from '../../../../src/server/types/errors.js';
import type { PodcastJob } from '../../../../src/server/types/podcast.js';

const TEST_DATA_DIR = path.resolve('data', 'test-voices-podcast');
const OUTPUT_DIR = path.resolve('data', 'output');

describe('PodcastController', () => {
  let app: Hono;
  let voiceRepository: VoiceRepository;
  let podcastApp: Hono;

  beforeEach(async () => {
    voiceRepository = new VoiceRepository(TEST_DATA_DIR);
    await voiceRepository.ensureDataDir();

    // TTSServiceとAudioMixerのモック — 即座に解決する
    const ttsService = {
      generateSpeech: vi.fn().mockResolvedValue('/tmp/fake-tts.wav'),
    } as unknown as TTSService;

    const audioMixer = {
      mixWithBgm: vi.fn().mockResolvedValue(undefined),
      convertToMp3: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioMixer;

    podcastApp = createPodcastRoutes(voiceRepository, ttsService, audioMixer);

    app = new Hono();
    app.route('/api/podcasts', podcastApp);

    app.onError((err, c) => {
      if (err instanceof ValidationError) {
        return c.json({ error: err.message, field: err.field }, 400);
      }
      if (err instanceof NotFoundError) {
        return c.json({ error: err.message }, 404);
      }
      return c.json({ error: 'Internal Server Error' }, 500);
    });
  });

  afterEach(async () => {
    try {
      await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  async function registerVoice(): Promise<string> {
    const voice = await voiceRepository.save(
      'テスト声',
      Buffer.from('fake audio'),
      'audio/webm'
    );
    return voice.id;
  }

  /** ジョブMapへのアクセスヘルパー */
  function getJobs(): Map<string, PodcastJob> {
    return (podcastApp as unknown as { _jobs: Map<string, PodcastJob> })._jobs;
  }

  describe('POST /api/podcasts', () => {
    it('正常な入力で202を返す', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'これはテスト台本です');
      formData.append('voiceId', voiceId);

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { id: string; status: string };
      expect(json.id).toBeDefined();
      // バックグラウンドジョブが即座に開始するため、pendingまたはtts_processingのいずれか
      expect(['pending', 'tts_processing']).toContain(json.status);
    });

    it('styleInstructionを含むリクエストでジョブに保存される', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'これはテスト台本です');
      formData.append('voiceId', voiceId);
      formData.append('styleInstruction', 'ゆっくり落ち着いたトーンで');

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { id: string };
      const jobs = getJobs();
      const job = jobs.get(json.id);
      expect(job?.styleInstruction).toBe('ゆっくり落ち着いたトーンで');
    });

    it('styleInstruction未指定の場合undefinedになる', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'これはテスト台本です');
      formData.append('voiceId', voiceId);

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(202);
      const json = (await res.json()) as { id: string };
      const jobs = getJobs();
      const job = jobs.get(json.id);
      expect(job?.styleInstruction).toBeUndefined();
    });

    it('台本が空で400を返す', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', '');
      formData.append('voiceId', voiceId);

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as { field: string };
      expect(json.field).toBe('script');
    });

    it('存在しない声IDで404を返す', async () => {
      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', 'non-existent-voice-id');

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/podcasts/:id', () => {
    it('ジョブステータスを返す', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', voiceId);

      const createRes = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      const created = (await createRes.json()) as { id: string };

      const res = await app.request(`/api/podcasts/${created.id}`);
      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        id: string;
        status: string;
        createdAt: string;
      };
      expect(json.id).toBe(created.id);
      expect(json.status).toBeDefined();
      expect(json.createdAt).toBeDefined();
    });

    it('存在しないジョブIDで404を返す', async () => {
      const res = await app.request('/api/podcasts/non-existent-job-id');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/podcasts/:id/download', () => {
    it('完了済みジョブでmp3を返す', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', voiceId);

      const createRes = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      const created = (await createRes.json()) as { id: string };

      // バックグラウンド処理が完了するのを待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // ジョブを手動でcompleted状態にする（テスト制御のため）
      const jobs = getJobs();
      const job = jobs.get(created.id)!;
      job.status = 'completed';
      job.outputFileName = `${created.id}.mp3`;

      // ダミーmp3ファイルを作成
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      await fs.writeFile(
        path.join(OUTPUT_DIR, job.outputFileName),
        Buffer.from('fake mp3 data')
      );

      const res = await app.request(
        `/api/podcasts/${created.id}/download`
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('audio/mpeg');

      // クリーンアップ
      await fs.unlink(path.join(OUTPUT_DIR, job.outputFileName));
    });

    it('未完了ジョブで409を返す', async () => {
      const voiceId = await registerVoice();

      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', voiceId);

      const createRes = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      const created = (await createRes.json()) as { id: string };

      // ジョブを強制的にpendingに保持
      const jobs = getJobs();
      const job = jobs.get(created.id)!;
      job.status = 'pending';

      const res = await app.request(
        `/api/podcasts/${created.id}/download`
      );
      expect(res.status).toBe(409);
    });
  });
});
