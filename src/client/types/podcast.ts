export type JobStatus =
  | 'pending'
  | 'tts_processing'
  | 'mixing'
  | 'completed'
  | 'failed';

export interface JobStatusResponse {
  id: string;
  status: JobStatus;
  createdAt: string;
  error?: string;
}
