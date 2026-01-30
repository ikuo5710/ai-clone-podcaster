import { ref, onUnmounted } from 'vue';
import { useApi } from './useApi';
import type { JobStatus, JobStatusResponse } from '../types/podcast';

const POLL_INTERVAL_MS = 2000;

export function usePodcastCreator() {
  const script = ref('');
  const selectedVoiceId = ref('');
  const bgmFile = ref<File | null>(null);
  const bgmVolume = ref(0.3);

  const jobId = ref<string | null>(null);
  const jobStatus = ref<JobStatus | null>(null);
  const jobError = ref<string | null>(null);
  const isSubmitting = ref(false);

  const { post, get } = useApi();
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  async function createPodcast(): Promise<void> {
    if (!script.value.trim() || !selectedVoiceId.value) return;

    isSubmitting.value = true;
    jobError.value = null;

    try {
      const formData = new FormData();
      formData.append('script', script.value.trim());
      formData.append('voiceId', selectedVoiceId.value);
      formData.append('bgmVolume', String(bgmVolume.value));
      if (bgmFile.value) {
        formData.append('bgm', bgmFile.value);
      }

      const res = await post('/api/podcasts', formData);
      const data = (await res.json()) as { id: string; status: JobStatus };
      jobId.value = data.id;
      jobStatus.value = data.status;

      startPolling(data.id);
    } catch (e) {
      jobError.value =
        e instanceof Error ? e.message : 'ポッドキャスト生成に失敗しました';
    } finally {
      isSubmitting.value = false;
    }
  }

  function startPolling(id: string): void {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const data = await get<JobStatusResponse>(`/api/podcasts/${id}`);
        jobStatus.value = data.status;

        if (data.status === 'completed' || data.status === 'failed') {
          stopPolling();
          if (data.status === 'failed' && data.error) {
            jobError.value = data.error;
          }
        }
      } catch (e) {
        console.error('[usePodcastCreator] ステータス取得失敗:', e);
        stopPolling();
        jobError.value = 'ステータス取得に失敗しました';
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling(): void {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function resetForm(): void {
    stopPolling();
    script.value = '';
    selectedVoiceId.value = '';
    bgmFile.value = null;
    bgmVolume.value = 0.3;
    jobId.value = null;
    jobStatus.value = null;
    jobError.value = null;
    isSubmitting.value = false;
  }

  onUnmounted(() => {
    stopPolling();
  });

  return {
    script,
    selectedVoiceId,
    bgmFile,
    bgmVolume,
    jobId,
    jobStatus,
    jobError,
    isSubmitting,
    createPodcast,
    resetForm,
  };
}
