import { describe, it, expect, vi } from 'vitest';
import { AudioMixer } from '../../../../src/server/services/AudioMixer.js';

// fluent-ffmpegをモック
vi.mock('fluent-ffmpeg', () => {
  const mockInstance = {
    input: vi.fn().mockReturnThis(),
    complexFilter: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (
      this: Record<string, unknown>,
      event: string,
      callback: (err?: Error) => void
    ) {
      if (event === 'end') {
        // endコールバックを保存
        (this as Record<string, (err?: Error) => void>)._onEnd = callback;
      }
      if (event === 'error') {
        (this as Record<string, (err?: Error) => void>)._onError = callback;
      }
      return this;
    }),
    run: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      // runが呼ばれたらendコールバックを実行
      const onEnd = (this as Record<string, () => void>)._onEnd;
      if (onEnd) {
        setTimeout(() => onEnd(), 0);
      }
    }),
  };

  return {
    default: vi.fn(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

describe('AudioMixer', () => {
  let mixer: AudioMixer;

  beforeEach(() => {
    mixer = new AudioMixer();
  });

  describe('mixWithBgm', () => {
    it('BGMありでミキシングを実行する', async () => {
      await expect(
        mixer.mixWithBgm(
          '/tmp/speech.wav',
          '/tmp/bgm.mp3',
          0.3,
          '/tmp/output.mp3'
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('convertToMp3', () => {
    it('BGMなしでmp3変換を実行する', async () => {
      await expect(
        mixer.convertToMp3('/tmp/speech.wav', '/tmp/output.mp3')
      ).resolves.toBeUndefined();
    });
  });
});
