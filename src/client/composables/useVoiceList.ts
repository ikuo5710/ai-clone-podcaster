import { ref } from 'vue';
import { useApi } from './useApi';
import type { Voice } from '../types/voice';

export function useVoiceList() {
  const voices = ref<Voice[]>([]);
  const isLoading = ref(false);
  const { get, del } = useApi();

  let currentAudio: HTMLAudioElement | null = null;
  const playingId = ref<string | null>(null);

  async function fetchVoices(): Promise<void> {
    isLoading.value = true;
    try {
      const data = await get<{ voices: Voice[] }>('/api/voices');
      voices.value = data.voices;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteVoice(id: string): Promise<void> {
    if (!window.confirm('この声を削除しますか？')) return;
    await del(`/api/voices/${id}`);
    stopPlayback();
    await fetchVoices();
  }

  function playVoice(id: string): void {
    stopPlayback();
    currentAudio = new Audio(`/api/voices/${id}/file`);
    currentAudio.onended = () => {
      playingId.value = null;
    };
    currentAudio.play();
    playingId.value = id;
  }

  function stopPlayback(): void {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    playingId.value = null;
  }

  return { voices, isLoading, playingId, fetchVoices, deleteVoice, playVoice, stopPlayback };
}
