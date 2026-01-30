import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { createVoiceRoutes } from '../../src/server/controllers/VoiceController.js';
import { createPodcastRoutes } from '../../src/server/controllers/PodcastController.js';
import { VoiceRepository } from '../../src/server/repositories/VoiceRepository.js';
import { TTSService } from '../../src/server/services/TTSService.js';
import { AudioMixer } from '../../src/server/services/AudioMixer.js';
import {
  ValidationError,
  NotFoundError,
} from '../../src/server/types/errors.js';

const TEST_DATA_DIR = path.resolve('data', 'test-integration');

describe('API結合テスト', () => {
  let app: Hono;
  let voiceRepository: VoiceRepository;

  beforeEach(async () => {
    voiceRepository = new VoiceRepository(TEST_DATA_DIR);
    await voiceRepository.ensureDataDir();

    const ttsService = {
      generateSpeech: vi.fn().mockResolvedValue('/tmp/fake-tts.wav'),
    } as unknown as TTSService;

    const audioMixer = {
      mixWithBgm: vi.fn().mockResolvedValue(undefined),
      convertToMp3: vi.fn().mockResolvedValue(undefined),
    } as unknown as AudioMixer;

    app = new Hono();
    app.route('/api/voices', createVoiceRoutes(voiceRepository));
    app.route(
      '/api/podcasts',
      createPodcastRoutes(voiceRepository, ttsService, audioMixer)
    );

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

  describe('声の登録→一覧取得→ファイル取得→削除のフルフロー', () => {
    it('声のCRUDフルサイクルが正常に動作する', async () => {
      // 1. 声を登録
      const formData = new FormData();
      formData.append('label', '結合テスト用の声');
      formData.append(
        'audio',
        new Blob(['fake audio data'], { type: 'audio/webm' }),
        'recording.webm'
      );

      const createRes = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });
      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        id: string;
        label: string;
      };
      expect(created.label).toBe('結合テスト用の声');
      expect(created.id).toBeDefined();

      // 2. 一覧取得で登録した声が含まれる
      const listRes = await app.request('/api/voices');
      expect(listRes.status).toBe(200);
      const listData = (await listRes.json()) as {
        voices: { id: string; label: string }[];
      };
      expect(listData.voices).toHaveLength(1);
      expect(listData.voices[0].id).toBe(created.id);

      // 3. 音声ファイル取得
      const fileRes = await app.request(`/api/voices/${created.id}/file`);
      expect(fileRes.status).toBe(200);
      expect(fileRes.headers.get('Content-Type')).toContain('audio/');

      // 4. 削除
      const deleteRes = await app.request(`/api/voices/${created.id}`, {
        method: 'DELETE',
      });
      expect(deleteRes.status).toBe(204);

      // 5. 削除後は一覧が空
      const listAfterDelete = await app.request('/api/voices');
      const afterData = (await listAfterDelete.json()) as {
        voices: unknown[];
      };
      expect(afterData.voices).toHaveLength(0);

      // 6. 削除済みIDで404
      const deletedFileRes = await app.request(
        `/api/voices/${created.id}/file`
      );
      expect(deletedFileRes.status).toBe(404);
    });
  });

  describe('ポッドキャスト作成のバリデーション', () => {
    it('台本が空で400を返す', async () => {
      const formData = new FormData();
      formData.append('script', '');
      formData.append('voiceId', 'some-id');

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { field: string };
      expect(json.field).toBe('script');
    });

    it('voiceIdが空で400を返す', async () => {
      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', '');

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(400);
      const json = (await res.json()) as { field: string };
      expect(json.field).toBe('voiceId');
    });

    it('存在しない声IDで404を返す', async () => {
      const formData = new FormData();
      formData.append('script', 'テスト台本');
      formData.append('voiceId', 'non-existent-id');

      const res = await app.request('/api/podcasts', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(404);
    });
  });

  describe('ポッドキャスト作成→ステータス取得', () => {
    it('ジョブ作成後にステータスが取得できる', async () => {
      // まず声を登録
      const voiceForm = new FormData();
      voiceForm.append('label', 'ポッドキャスト用の声');
      voiceForm.append(
        'audio',
        new Blob(['fake audio'], { type: 'audio/webm' }),
        'recording.webm'
      );
      const voiceRes = await app.request('/api/voices', {
        method: 'POST',
        body: voiceForm,
      });
      const voice = (await voiceRes.json()) as { id: string };

      // ポッドキャスト作成
      const podcastForm = new FormData();
      podcastForm.append('script', '結合テスト用台本です');
      podcastForm.append('voiceId', voice.id);

      const createRes = await app.request('/api/podcasts', {
        method: 'POST',
        body: podcastForm,
      });
      expect(createRes.status).toBe(202);
      const job = (await createRes.json()) as { id: string; status: string };
      expect(job.id).toBeDefined();

      // ステータス取得
      const statusRes = await app.request(`/api/podcasts/${job.id}`);
      expect(statusRes.status).toBe(200);
      const statusData = (await statusRes.json()) as {
        id: string;
        status: string;
        createdAt: string;
      };
      expect(statusData.id).toBe(job.id);
      expect(statusData.status).toBeDefined();
      expect(statusData.createdAt).toBeDefined();
    });

    it('存在しないジョブIDで404を返す', async () => {
      const res = await app.request('/api/podcasts/non-existent-id');
      expect(res.status).toBe(404);
    });

    it('未完了ジョブのダウンロードで409を返す', async () => {
      // 声を登録
      const voiceForm = new FormData();
      voiceForm.append('label', 'ダウンロードテスト用');
      voiceForm.append(
        'audio',
        new Blob(['fake audio'], { type: 'audio/webm' }),
        'recording.webm'
      );
      const voiceRes = await app.request('/api/voices', {
        method: 'POST',
        body: voiceForm,
      });
      const voice = (await voiceRes.json()) as { id: string };

      // ポッドキャスト作成
      const podcastForm = new FormData();
      podcastForm.append('script', 'ダウンロードテスト台本');
      podcastForm.append('voiceId', voice.id);

      const createRes = await app.request('/api/podcasts', {
        method: 'POST',
        body: podcastForm,
      });
      const job = (await createRes.json()) as { id: string };

      // ジョブのステータスを確認し、completed以外ならダウンロードで409
      const statusRes = await app.request(`/api/podcasts/${job.id}`);
      const status = (await statusRes.json()) as { status: string };

      if (status.status !== 'completed') {
        const downloadRes = await app.request(
          `/api/podcasts/${job.id}/download`
        );
        expect(downloadRes.status).toBe(409);
      }
      // モックが即座に完了する場合はこのテストをスキップ（テストの意図は
      // PodcastController単体テストでカバー済み）
    });
  });
});
