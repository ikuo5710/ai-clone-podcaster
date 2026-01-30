import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createVoiceRoutes } from './controllers/VoiceController.js';
import { VoiceRepository } from './repositories/VoiceRepository.js';
import { ValidationError, NotFoundError } from './types/errors.js';

const app = new Hono();

const voiceRepository = new VoiceRepository();

// データディレクトリの初期化
await voiceRepository.ensureDataDir();

// ルーティング
app.route('/api/voices', createVoiceRoutes(voiceRepository));

// グローバルエラーハンドラ
app.onError((err, c) => {
  if (err instanceof ValidationError) {
    return c.json({ error: err.message, field: err.field }, 400);
  }
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  console.error('予期しないエラー:', err);
  return c.json({ error: 'サーバーエラーが発生しました' }, 500);
});

// サーバー起動
const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});

export { app };
