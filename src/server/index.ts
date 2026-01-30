import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { createVoiceRoutes } from './controllers/VoiceController.js';
import { createPodcastRoutes } from './controllers/PodcastController.js';
import { VoiceRepository } from './repositories/VoiceRepository.js';
import { TTSService } from './services/TTSService.js';
import { AudioMixer } from './services/AudioMixer.js';
import { ValidationError, NotFoundError } from './types/errors.js';

const app = new Hono();

const voiceRepository = new VoiceRepository();
const ttsService = new TTSService();
const audioMixer = new AudioMixer();

// データディレクトリの初期化
await voiceRepository.ensureDataDir();
await fs.mkdir(path.resolve('data', 'bgm'), { recursive: true });
await fs.mkdir(path.resolve('data', 'temp'), { recursive: true });
await fs.mkdir(path.resolve('data', 'output'), { recursive: true });

// ルーティング
app.route('/api/voices', createVoiceRoutes(voiceRepository));
app.route('/api/podcasts', createPodcastRoutes(voiceRepository, ttsService, audioMixer));

// 静的ファイル配信（本番用: dist/client/）
app.use('/*', serveStatic({ root: './dist/client' }));

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
