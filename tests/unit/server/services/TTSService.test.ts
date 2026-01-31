import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { TTSService } from '../../../../src/server/services/TTSService.js';

const TEMP_DIR = path.resolve('data', 'temp');

// fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('TTSService', () => {
  let service: TTSService;
  const mockReplicate = {
    run: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Replicate SDKをモックしたインスタンスを注入
    service = new TTSService(mockReplicate as never);
    await fs.mkdir(TEMP_DIR, { recursive: true });
  });

  afterEach(async () => {
    // テスト用一時ファイルを削除
    try {
      const files = await fs.readdir(TEMP_DIR);
      for (const file of files) {
        if (file.startsWith('test-job-')) {
          await fs.unlink(path.join(TEMP_DIR, file));
        }
      }
    } catch {
      // ignore
    }
  });

  describe('generateSpeech', () => {
    it('正常な入力でTTS音声ファイルパスを返す', async () => {
      // Given: Replicate APIがURLを返す
      const fakeAudioUrl = 'https://example.com/fake-audio.wav';
      mockReplicate.run.mockResolvedValue(fakeAudioUrl);

      // fetchがダミー音声データを返す
      const fakeAudioData = Buffer.from('fake wav audio data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudioData.buffer),
      });

      // 一時的な声ファイルを作成
      const voiceFilePath = path.join(TEMP_DIR, 'test-job-voice.webm');
      await fs.writeFile(voiceFilePath, Buffer.from('fake voice data'));

      // When
      const result = await service.generateSpeech(
        'テスト台本です',
        voiceFilePath,
        'test-job-001'
      );

      // Then
      expect(result).toBe(path.join(TEMP_DIR, 'test-job-001-tts.wav'));
      expect(mockReplicate.run).toHaveBeenCalledWith('qwen/qwen3-tts', {
        input: {
          text: 'テスト台本です',
          mode: 'voice_clone',
          reference_audio: expect.stringContaining('data:audio/webm;base64,'),
          reference_text: '',
          language: 'auto',
        },
      });

      // ファイルが作成されている
      const stat = await fs.stat(result);
      expect(stat.size).toBeGreaterThan(0);

      // クリーンアップ
      await fs.unlink(voiceFilePath);
      await fs.unlink(result);
    });

    it('styleInstructionありでstyle_instructionがAPIに渡される', async () => {
      // Given
      const fakeAudioUrl = 'https://example.com/fake-audio.wav';
      mockReplicate.run.mockResolvedValue(fakeAudioUrl);

      const fakeAudioData = Buffer.from('fake wav audio data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudioData.buffer),
      });

      const voiceFilePath = path.join(TEMP_DIR, 'test-job-voice-style.webm');
      await fs.writeFile(voiceFilePath, Buffer.from('fake voice data'));

      // When
      const result = await service.generateSpeech(
        'テスト台本です',
        voiceFilePath,
        'test-job-style-001',
        'ゆっくり落ち着いたトーンで'
      );

      // Then
      expect(mockReplicate.run).toHaveBeenCalledWith('qwen/qwen3-tts', {
        input: expect.objectContaining({
          style_instruction: 'ゆっくり落ち着いたトーンで',
        }),
      });
      expect(result).toBe(
        path.join(TEMP_DIR, 'test-job-style-001-tts.wav')
      );

      // クリーンアップ
      await fs.unlink(voiceFilePath);
      await fs.unlink(result);
    });

    it('styleInstructionなしでstyle_instructionがAPIに渡されない', async () => {
      // Given
      const fakeAudioUrl = 'https://example.com/fake-audio.wav';
      mockReplicate.run.mockResolvedValue(fakeAudioUrl);

      const fakeAudioData = Buffer.from('fake wav audio data');
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeAudioData.buffer),
      });

      const voiceFilePath = path.join(TEMP_DIR, 'test-job-voice-nostyle.webm');
      await fs.writeFile(voiceFilePath, Buffer.from('fake voice data'));

      // When
      await service.generateSpeech(
        'テスト台本です',
        voiceFilePath,
        'test-job-nostyle-001'
      );

      // Then: style_instruction が含まれないことを確認
      const callArgs = mockReplicate.run.mock.calls[0][1] as {
        input: Record<string, string>;
      };
      expect(callArgs.input).not.toHaveProperty('style_instruction');

      // クリーンアップ
      await fs.unlink(voiceFilePath);
      await fs.unlink(
        path.join(TEMP_DIR, 'test-job-nostyle-001-tts.wav')
      );
    });

    it('API失敗時にエラーをスローする', async () => {
      // Given: Replicate APIがエラー
      mockReplicate.run.mockRejectedValue(new Error('API rate limit exceeded'));

      const voiceFilePath = path.join(TEMP_DIR, 'test-job-voice2.webm');
      await fs.writeFile(voiceFilePath, Buffer.from('fake voice data'));

      // When/Then
      await expect(
        service.generateSpeech('テスト', voiceFilePath, 'test-job-002')
      ).rejects.toThrow('API rate limit exceeded');

      // クリーンアップ
      await fs.unlink(voiceFilePath);
    });
  });
});
