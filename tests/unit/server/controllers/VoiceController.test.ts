import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Hono } from 'hono';
import { createVoiceRoutes } from '../../../../src/server/controllers/VoiceController.js';
import { VoiceRepository } from '../../../../src/server/repositories/VoiceRepository.js';
import { ValidationError, NotFoundError } from '../../../../src/server/types/errors.js';

const TEST_DATA_DIR = path.resolve('data', 'test-voices-ctrl');

describe('VoiceController', () => {
  let app: Hono;
  let repository: VoiceRepository;

  beforeEach(async () => {
    repository = new VoiceRepository(TEST_DATA_DIR);
    await repository.ensureDataDir();

    app = new Hono();
    app.route('/api/voices', createVoiceRoutes(repository));

    // グローバルエラーハンドラ
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

  function createMultipartFormData(
    label: string,
    audioContent?: string,
    audioFilename?: string
  ): FormData {
    const formData = new FormData();
    formData.append('label', label);
    if (audioContent !== undefined) {
      const blob = new Blob([audioContent], { type: 'audio/webm' });
      formData.append('audio', blob, audioFilename ?? 'recording.webm');
    }
    return formData;
  }

  describe('GET /api/voices', () => {
    it('200で声一覧を返す', async () => {
      const res = await app.request('/api/voices');
      expect(res.status).toBe(200);
      const json = (await res.json()) as { voices: unknown[] };
      expect(json.voices).toEqual([]);
    });
  });

  describe('POST /api/voices', () => {
    it('正常な入力で201を返す', async () => {
      const formData = createMultipartFormData('テスト声', 'fake audio data');
      const res = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(201);
      const json = (await res.json()) as { id: string; label: string };
      expect(json.label).toBe('テスト声');
      expect(json.id).toBeDefined();
    });

    it('ラベルが空で400を返す', async () => {
      const formData = createMultipartFormData('', 'fake audio data');
      const res = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string; field: string };
      expect(json.field).toBe('label');
    });

    it('音声ファイル未添付で400を返す', async () => {
      const formData = new FormData();
      formData.append('label', 'ラベルのみ');
      const res = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string; field: string };
      expect(json.field).toBe('audio');
    });
  });

  describe('GET /api/voices/:id/file', () => {
    it('存在するIDで音声バイナリを返す', async () => {
      // まず声を登録
      const formData = createMultipartFormData(
        'ファイル取得テスト',
        'audio binary content'
      );
      const createRes = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });
      const created = (await createRes.json()) as { id: string };

      // ファイル取得
      const res = await app.request(`/api/voices/${created.id}/file`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('audio/');
    });

    it('存在しないIDで404を返す', async () => {
      const res = await app.request('/api/voices/non-existent-id/file');
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/voices/:id', () => {
    it('存在するIDで204を返す', async () => {
      // まず声を登録
      const formData = createMultipartFormData(
        '削除テスト',
        'audio to delete'
      );
      const createRes = await app.request('/api/voices', {
        method: 'POST',
        body: formData,
      });
      const created = (await createRes.json()) as { id: string };

      // 削除
      const res = await app.request(`/api/voices/${created.id}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(204);
    });

    it('存在しないIDで404を返す', async () => {
      const res = await app.request('/api/voices/non-existent-id', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });
});
