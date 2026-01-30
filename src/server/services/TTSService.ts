import fs from 'node:fs/promises';
import path from 'node:path';
import Replicate from 'replicate';

const TEMP_DIR = path.resolve('data', 'temp');

export class TTSService {
  private replicate: Replicate;

  constructor(replicate?: Replicate) {
    this.replicate =
      replicate ??
      new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }

  /**
   * Replicate APIのqwen3-ttsでTTS音声を生成する
   *
   * @param script - 台本テキスト
   * @param voiceFilePath - クローン元の声ファイルパス
   * @param jobId - ジョブID（一時ファイル名に使用）
   * @returns 生成された音声ファイルのパス（data/temp/{jobId}-tts.wav）
   */
  async generateSpeech(
    script: string,
    voiceFilePath: string,
    jobId: string
  ): Promise<string> {
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // 声ファイルをBufferとして読み込み、data URIに変換
    const voiceBuffer = await fs.readFile(voiceFilePath);
    const base64 = voiceBuffer.toString('base64');
    const mimeType = this.guessMimeType(voiceFilePath);
    const dataUri = `data:${mimeType};base64,${base64}`;

    const output = await this.replicate.run('qwen/qwen3-tts', {
      input: {
        text: script,
        mode: 'voice_clone',
        reference_audio: dataUri,
        reference_text: '',
        language: 'auto',
      },
    });

    // outputはURIを含むReadableStreamまたはURL文字列
    const audioUrl = this.extractAudioUrl(output);
    const outputPath = path.join(TEMP_DIR, `${jobId}-tts.wav`);

    await this.downloadFile(audioUrl, outputPath);

    return outputPath;
  }

  private extractAudioUrl(output: unknown): string {
    // Replicate APIの返り値はモデルにより異なるが、
    // qwen3-ttsはURLまたはReadableStreamを返す
    if (typeof output === 'string') {
      return output;
    }
    if (output && typeof output === 'object' && 'url' in output) {
      return (output as { url: string }).url;
    }
    if (output && typeof output === 'object' && Symbol.asyncIterator in Object(output)) {
      // FileOutputの場合、URL()で文字列化可能
      return String(output);
    }
    throw new Error(
      `Unexpected Replicate API output format: ${typeof output}`
    );
  }

  private async downloadFile(url: string, destPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download TTS audio: ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    await fs.writeFile(destPath, Buffer.from(arrayBuffer));
  }

  private guessMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.webm': 'audio/webm',
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
    };
    return map[ext] ?? 'audio/webm';
  }
}
