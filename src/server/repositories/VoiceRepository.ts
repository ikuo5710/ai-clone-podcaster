import fs from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type { Voice } from '../types/voice.js';
import { NotFoundError } from '../types/errors.js';

const DEFAULT_DATA_DIR = path.resolve('data', 'voices');

interface VoicesData {
  voices: Voice[];
}

export class VoiceRepository {
  private readonly dataDir: string;
  private readonly voicesJsonPath: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ?? DEFAULT_DATA_DIR;
    this.voicesJsonPath = path.join(this.dataDir, 'voices.json');
  }

  /** data/voices/ ディレクトリとvoices.jsonの初期化 */
  async ensureDataDir(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    try {
      await fs.access(this.voicesJsonPath);
    } catch {
      await fs.writeFile(
        this.voicesJsonPath,
        JSON.stringify({ voices: [] }, null, 2)
      );
    }
  }

  /** 全件取得 */
  async findAll(): Promise<Voice[]> {
    const data = await this.readVoicesJson();
    return data.voices;
  }

  /** ID指定で1件取得。見つからない場合はnullを返す */
  async findById(id: string): Promise<Voice | null> {
    const data = await this.readVoicesJson();
    return data.voices.find((v) => v.id === id) ?? null;
  }

  /** 声を保存する。UUIDを生成し、音声ファイルとメタデータの両方を永続化する */
  async save(
    label: string,
    audioBuffer: Buffer,
    mimeType: string
  ): Promise<Voice> {
    await this.ensureDataDir();

    const id = uuidv4();
    const ext = this.extensionFromMime(mimeType);
    const fileName = `${id}${ext}`;
    const filePath = path.join(this.dataDir, fileName);

    await fs.writeFile(filePath, audioBuffer);

    const voice: Voice = {
      id,
      label,
      fileName,
      mimeType,
      createdAt: new Date().toISOString(),
    };

    const data = await this.readVoicesJson();
    data.voices.push(voice);
    await this.writeVoicesJson(data);

    return voice;
  }

  /** IDで削除する。存在しない場合はNotFoundErrorをスローする */
  async delete(id: string): Promise<void> {
    const data = await this.readVoicesJson();
    const index = data.voices.findIndex((v) => v.id === id);
    if (index === -1) {
      throw new NotFoundError('Voice', id);
    }

    const voice = data.voices[index];
    const filePath = path.join(this.dataDir, voice.fileName);

    try {
      await fs.unlink(filePath);
    } catch {
      // ファイルが既に存在しない場合は無視
    }

    data.voices.splice(index, 1);
    await this.writeVoicesJson(data);
  }

  /** 音声ファイルの絶対パスを取得する */
  getFilePath(voice: Voice): string {
    return path.join(this.dataDir, voice.fileName);
  }

  private async readVoicesJson(): Promise<VoicesData> {
    try {
      const raw = await fs.readFile(this.voicesJsonPath, 'utf-8');
      return JSON.parse(raw) as VoicesData;
    } catch {
      return { voices: [] };
    }
  }

  private async writeVoicesJson(data: VoicesData): Promise<void> {
    await fs.writeFile(this.voicesJsonPath, JSON.stringify(data, null, 2));
  }

  private extensionFromMime(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/wav': '.wav',
      'audio/wave': '.wav',
      'audio/x-wav': '.wav',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/ogg': '.ogg',
      'audio/mp4': '.m4a',
    };
    return map[mimeType] ?? '.webm';
  }
}
