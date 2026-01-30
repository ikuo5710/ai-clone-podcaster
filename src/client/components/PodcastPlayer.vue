<script setup lang="ts">
import { computed } from 'vue';
import type { JobStatus } from '../types/podcast';

const props = defineProps<{
  jobId: string;
  status: JobStatus;
  error: string | null;
}>();

const emit = defineEmits<{
  reset: [];
}>();

const statusLabel = computed(() => {
  const map: Record<JobStatus, string> = {
    pending: '待機中...',
    tts_processing: '音声を生成中...',
    mixing: 'BGMを合成中...',
    completed: '生成完了',
    failed: '生成失敗',
  };
  return map[props.status];
});

const isProcessing = computed(
  () =>
    props.status === 'pending' ||
    props.status === 'tts_processing' ||
    props.status === 'mixing'
);

const downloadUrl = computed(
  () => `/api/podcasts/${props.jobId}/download`
);
</script>

<template>
  <section class="podcast-player">
    <h2>生成状況</h2>

    <div class="status-bar">
      <span :class="['status-label', `status-${status}`]">
        {{ statusLabel }}
      </span>
      <div v-if="isProcessing" class="progress-indicator" />
    </div>

    <p v-if="status === 'failed' && error" class="error-message">
      {{ error }}
    </p>

    <div v-if="status === 'completed'" class="completed-actions">
      <audio controls :src="downloadUrl" class="audio-preview">
        お使いのブラウザは音声再生に対応していません。
      </audio>

      <div class="action-buttons">
        <a :href="downloadUrl" download class="btn btn-download">
          ダウンロード
        </a>
        <button class="btn btn-new" @click="emit('reset')">
          新規作成
        </button>
      </div>
    </div>

    <div v-if="status === 'failed'" class="failed-actions">
      <button class="btn btn-new" @click="emit('reset')">
        やり直す
      </button>
    </div>
  </section>
</template>

<style scoped>
.podcast-player {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1rem 0;
}

.status-label {
  font-weight: 600;
  font-size: 1.1rem;
}

.status-pending,
.status-tts_processing,
.status-mixing {
  color: #d69e2e;
}

.status-completed {
  color: #38a169;
}

.status-failed {
  color: #e53e3e;
}

.progress-indicator {
  width: 20px;
  height: 20px;
  border: 3px solid #e2e8f0;
  border-top-color: #805ad5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #9b2c2c;
  background: #fed7d7;
  padding: 0.5rem;
  border-radius: 4px;
}

.completed-actions {
  margin-top: 1rem;
}

.audio-preview {
  width: 100%;
  margin-bottom: 1rem;
}

.action-buttons,
.failed-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  text-align: center;
}

.btn-download {
  background: #3182ce;
  color: white;
}

.btn-new {
  background: #e2e8f0;
  color: #2d3748;
}
</style>
