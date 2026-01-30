import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { VoiceRepository } from '../../../../src/server/repositories/VoiceRepository.js';
import { NotFoundError } from '../../../../src/server/types/errors.js';

// テスト用に一時ディレクトリを使う
const TEST_DATA_DIR = path.resolve('data', 'voices');

describe('VoiceRepository', () => {
  let repository: VoiceRepository;

  beforeEach(async () => {
    repository = new VoiceRepository();
    await repository.ensureDataDir();
    // テスト前にvoices.jsonをクリア
    const voicesJsonPath = path.join(TEST_DATA_DIR, 'voices.json');
    await fs.writeFile(voicesJsonPath, JSON.stringify({ voices: [] }, null, 2));
  });

  afterEach(async () => {
    // テスト後にvoices.jsonをクリア + 生成ファイルを削除
    const voicesJsonPath = path.join(TEST_DATA_DIR, 'voices.json');
    try {
      const raw = await fs.readFile(voicesJsonPath, 'utf-8');
      const data = JSON.parse(raw) as { voices: { fileName: string }[] };
      for (const voice of data.voices) {
        try {
          await fs.unlink(path.join(TEST_DATA_DIR, voice.fileName));
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
    await fs.writeFile(voicesJsonPath, JSON.stringify({ voices: [] }, null, 2));
  });

  describe('findAll', () => {
    it('空の場合は空配列を返す', async () => {
      const voices = await repository.findAll();
      expect(voices).toEqual([]);
    });
  });

  describe('save + findAll', () => {
    it('保存後に一覧で取得できる', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      await repository.save('テスト声', audioBuffer, 'audio/webm');

      const voices = await repository.findAll();
      expect(voices).toHaveLength(1);
      expect(voices[0].label).toBe('テスト声');
      expect(voices[0].mimeType).toBe('audio/webm');
      expect(voices[0].fileName).toMatch(/\.webm$/);
    });
  });

  describe('findById', () => {
    it('存在するIDで取得できる', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const saved = await repository.save(
        '存在する声',
        audioBuffer,
        'audio/webm'
      );

      const found = await repository.findById(saved.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(saved.id);
      expect(found!.label).toBe('存在する声');
    });

    it('存在しないIDでnullを返す', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('削除後にfindByIdでnullを返す', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const saved = await repository.save(
        '削除対象',
        audioBuffer,
        'audio/webm'
      );

      await repository.delete(saved.id);

      const found = await repository.findById(saved.id);
      expect(found).toBeNull();
    });

    it('存在しないIDでNotFoundErrorをスローする', async () => {
      await expect(repository.delete('non-existent-id')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getFilePath', () => {
    it('音声ファイルの絶対パスを返す', async () => {
      const audioBuffer = Buffer.from('fake audio data');
      const saved = await repository.save(
        'パステスト',
        audioBuffer,
        'audio/webm'
      );

      const filePath = repository.getFilePath(saved);
      expect(filePath).toContain(saved.fileName);
      expect(path.isAbsolute(filePath)).toBe(true);
    });
  });
});
