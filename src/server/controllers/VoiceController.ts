import fs from 'node:fs/promises';
import { Hono } from 'hono';
import { VoiceRepository } from '../repositories/VoiceRepository.js';
import { ValidationError, NotFoundError } from '../types/errors.js';

const MAX_VOICE_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function createVoiceRoutes(repository: VoiceRepository): Hono {
  const app = new Hono();

  /** GET /api/voices — 声の一覧取得 */
  app.get('/', async (c) => {
    const voices = await repository.findAll();
    return c.json({ voices });
  });

  /** POST /api/voices — 声の登録 */
  app.post('/', async (c) => {
    const body = await c.req.parseBody();

    const label = body['label'];
    if (typeof label !== 'string' || label.trim().length === 0) {
      throw new ValidationError(
        'ラベルは1文字以上で入力してください',
        'label',
        label
      );
    }
    if (label.length > 100) {
      throw new ValidationError(
        'ラベルは100文字以下で入力してください',
        'label',
        label
      );
    }

    const audio = body['audio'];
    if (!(audio instanceof File)) {
      throw new ValidationError(
        '音声ファイルを添付してください',
        'audio',
        null
      );
    }

    if (audio.size > MAX_VOICE_FILE_SIZE) {
      throw new ValidationError(
        `ファイルサイズが上限を超えています（上限: 50MB）`,
        'audio',
        audio.size
      );
    }

    const arrayBuffer = await audio.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = audio.type || 'audio/webm';

    const voice = await repository.save(label.trim(), buffer, mimeType);
    return c.json(voice, 201);
  });

  /** GET /api/voices/:id/file — 声の音声ファイル取得 */
  app.get('/:id/file', async (c) => {
    const id = c.req.param('id');
    const voice = await repository.findById(id);
    if (!voice) {
      throw new NotFoundError('Voice', id);
    }

    const filePath = repository.getFilePath(voice);
    const fileBuffer = await fs.readFile(filePath);

    c.header('Content-Type', voice.mimeType);
    return c.body(fileBuffer);
  });

  /** DELETE /api/voices/:id — 声の削除 */
  app.delete('/:id', async (c) => {
    const id = c.req.param('id');
    await repository.delete(id);
    return c.body(null, 204);
  });

  return app;
}
