export type JobStatus =
  | 'pending'
  | 'tts_processing'
  | 'mixing'
  | 'completed'
  | 'failed';

export interface PodcastJob {
  id: string;
  status: JobStatus;
  script: string;
  voiceId: string;
  styleInstruction?: string;
  bgmFileName?: string;
  bgmVolume: number;
  outputFileName?: string;
  error?: string;
  createdAt: string;
}
