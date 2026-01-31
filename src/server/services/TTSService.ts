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
   * @param styleInstruction - スタイル指示（声のトーン・スピード・感情等、任意）
   * @returns 生成された音声ファイルのパス（data/temp/{jobId}-tts.wav）
   */
  async generateSpeech(
    script: string,
    voiceFilePath: string,
    jobId: string,
    styleInstruction?: string
  ): Promise<string> {
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // 声ファイルをBufferとして読み込み、data URIに変換
    const voiceBuffer = await fs.readFile(voiceFilePath);
    const base64 = voiceBuffer.toString('base64');
    const mimeType = this.guessMimeType(voiceFilePath);
    const dataUri = `data:${mimeType};base64,${base64}`;

    const input: Record<string, string> = {
      text: script,
      mode: 'voice_clone',
      reference_audio: dataUri,
      reference_text: '',
      language: 'auto',
    };
    if (styleInstruction) {
      input['style_instruction'] = styleInstruction;
    }

    const output = await this.replicate.run('qwen/qwen3-tts', { input });

    // outputはURIを含むReadableStreamまたはURL文字列
    const audioUrl = this.extractAudioUrl(output);
    const outputPath = path.join(TEMP_DIR, `${jobId}-tts.wav`);

    await this.downloadFile(audioUrl, outputPath);

    return outputPath;
  }

  private extractAudioUrl(output: unknown): string {
    // Replicate APIの返り値はモデルにより異なるが、
    // qwen3-ttsはURLまたはFileOutput(ReadableStream)を返す
    if (typeof output === 'string') {
      return output;
    }
    if (output && typeof output === 'object') {
      // FileOutputの場合、url()メソッドでURLを取得
      if ('url' in output && typeof (output as { url: unknown }).url === 'function') {
        const url = (output as { url: () => URL }).url();
        return url.toString();
      }
      // urlプロパティが文字列の場合
      if ('url' in output && typeof (output as { url: unknown }).url === 'string') {
        return (output as { url: string }).url;
      }
      // toString()がオーバーライドされている場合（FileOutput.toString()はURLを返す）
      if ('toString' in output) {
        return String(output);
      }
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
