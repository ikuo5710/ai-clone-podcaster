import { ref } from 'vue';

export function useVoiceRecorder() {
  const isRecording = ref(false);
  const audioBlob = ref<Blob | null>(null);

  let mediaRecorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];

  async function startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      audioBlob.value = new Blob(chunks, { type: 'audio/webm' });
      // マイクストリームを停止
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start();
    isRecording.value = true;
  }

  function stopRecording(): void {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      isRecording.value = false;
    }
  }

  function reset(): void {
    audioBlob.value = null;
    mediaRecorder = null;
    chunks = [];
  }

  return { isRecording, audioBlob, startRecording, stopRecording, reset };
}
