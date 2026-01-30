<script setup lang="ts">
import { ref } from 'vue';
import { useVoiceRecorder } from '../composables/useVoiceRecorder';
import { useApi } from '../composables/useApi';

const emit = defineEmits<{
  saved: [];
}>();

const { isRecording, audioBlob, startRecording, stopRecording, reset } =
  useVoiceRecorder();
const { post } = useApi();

const label = ref('');
const isSaving = ref(false);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');

async function handleStartRecording() {
  message.value = '';
  try {
    await startRecording();
  } catch {
    message.value = 'マイクへのアクセスを許可してください';
    messageType.value = 'error';
  }
}

async function handleSave() {
  if (!audioBlob.value || !label.value.trim()) return;

  isSaving.value = true;
  message.value = '';

  try {
    const formData = new FormData();
    formData.append('label', label.value.trim());
    formData.append('audio', audioBlob.value, 'recording.webm');

    await post('/api/voices', formData);

    message.value = '声を登録しました';
    messageType.value = 'success';
    label.value = '';
    reset();
    emit('saved');
  } catch (e) {
    message.value =
      e instanceof Error ? e.message : '声の保存に失敗しました';
    messageType.value = 'error';
  } finally {
    isSaving.value = false;
  }
}

function handleCancel() {
  label.value = '';
  message.value = '';
  reset();
}
</script>

<template>
  <section class="voice-recorder">
    <h2>声の録音</h2>

    <div class="controls">
      <button
        v-if="!isRecording && !audioBlob"
        class="btn btn-record"
        @click="handleStartRecording"
      >
        録音開始
      </button>

      <button
        v-if="isRecording"
        class="btn btn-stop"
        @click="stopRecording"
      >
        <span class="recording-indicator" /> 録音停止
      </button>
    </div>

    <div v-if="audioBlob && !isRecording" class="save-form">
      <input
        v-model="label"
        type="text"
        placeholder="声のラベル（例: 通常の声）"
        maxlength="100"
        class="input-label"
      />
      <div class="save-actions">
        <button
          class="btn btn-save"
          :disabled="!label.trim() || isSaving"
          @click="handleSave"
        >
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
        <button class="btn btn-cancel" @click="handleCancel">
          キャンセル
        </button>
      </div>
    </div>

    <p v-if="message" :class="['message', `message-${messageType}`]">
      {{ message }}
    </p>
  </section>
</template>

<style scoped>
.voice-recorder {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.controls {
  margin: 1rem 0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-record {
  background: #e53e3e;
  color: white;
}

.btn-stop {
  background: #718096;
  color: white;
}

.btn-save {
  background: #3182ce;
  color: white;
}

.btn-cancel {
  background: #e2e8f0;
  color: #2d3748;
  margin-left: 0.5rem;
}

.recording-indicator {
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #e53e3e;
  border-radius: 50%;
  animation: pulse 1s infinite;
  margin-right: 0.5rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.save-form {
  margin: 1rem 0;
}

.input-label {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 0.5rem;
  box-sizing: border-box;
}

.save-actions {
  display: flex;
  gap: 0.5rem;
}

.message {
  margin-top: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.message-success {
  background: #c6f6d5;
  color: #276749;
}

.message-error {
  background: #fed7d7;
  color: #9b2c2c;
}
</style>
