import ffmpeg from 'fluent-ffmpeg';

export class AudioMixer {
  /**
   * TTS音声とBGMをミキシングしてmp3で出力する
   *
   * @param speechPath - TTS音声ファイルパス
   * @param bgmPath - BGMファイルパス
   * @param volume - BGM音量（0.0-1.0）
   * @param outputPath - 出力mp3ファイルパス
   */
  async mixWithBgm(
    speechPath: string,
    bgmPath: string,
    volume: number,
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(speechPath)
        .input(bgmPath)
        .complexFilter([
          // BGMをTTS音声の長さに合わせてトリム＋音量調整
          `[1:a]volume=${volume}[bgm]`,
          `[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]`,
        ])
        .outputOptions(['-map', '[out]', '-codec:a', 'libmp3lame', '-q:a', '2'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) =>
          reject(new Error(`BGM合成に失敗しました: ${err.message}`))
        )
        .run();
    });
  }

  /**
   * 音声ファイルをmp3に変換する（BGMなしの場合）
   *
   * @param inputPath - 入力音声ファイルパス
   * @param outputPath - 出力mp3ファイルパス
   */
  async convertToMp3(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .outputOptions(['-codec:a', 'libmp3lame', '-q:a', '2'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) =>
          reject(new Error(`mp3変換に失敗しました: ${err.message}`))
        )
        .run();
    });
  }
}
