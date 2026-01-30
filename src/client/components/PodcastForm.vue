<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useVoiceList } from '../composables/useVoiceList';

const MAX_BGM_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const props = defineProps<{
  script: string;
  selectedVoiceId: string;
  bgmFile: File | null;
  bgmVolume: number;
  isSubmitting: boolean;
  hasJob: boolean;
}>();

const emit = defineEmits<{
  'update:script': [value: string];
  'update:selectedVoiceId': [value: string];
  'update:bgmFile': [value: File | null];
  'update:bgmVolume': [value: number];
  submit: [];
}>();

const { voices, fetchVoices } = useVoiceList();

const canSubmit = computed(
  () =>
    props.script.trim().length > 0 &&
    props.selectedVoiceId !== '' &&
    !props.isSubmitting &&
    !props.hasJob
);

const bgmError = ref('');

function handleBgmChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;

  if (file && file.size > MAX_BGM_FILE_SIZE) {
    bgmError.value = `BGMファイルサイズが上限(100MB)を超えています: ${(file.size / 1024 / 1024).toFixed(1)}MB`;
    emit('update:bgmFile', null);
    input.value = '';
    return;
  }

  bgmError.value = '';
  emit('update:bgmFile', file);
}

onMounted(fetchVoices);

defineExpose({ fetchVoices });
</script>

<template>
  <section class="podcast-form">
    <h2>ポッドキャスト作成</h2>

    <div class="field">
      <label for="script">台本</label>
      <textarea
        id="script"
        :value="script"
        placeholder="台本テキストを入力してください"
        rows="6"
        class="textarea"
        :disabled="hasJob"
        @input="emit('update:script', ($event.target as HTMLTextAreaElement).value)"
      />
    </div>

    <div class="field">
      <label for="voice-select">声の選択</label>
      <select
        id="voice-select"
        :value="selectedVoiceId"
        class="select"
        :disabled="hasJob"
        @change="emit('update:selectedVoiceId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="" disabled>声を選択してください</option>
        <option v-for="voice in voices" :key="voice.id" :value="voice.id">
          {{ voice.label }}
        </option>
      </select>
      <p v-if="voices.length === 0" class="hint">
        声が登録されていません。「声の管理」タブから録音してください。
      </p>
    </div>

    <div class="field">
      <label for="bgm">BGM（任意）</label>
      <input
        id="bgm"
        type="file"
        accept="audio/*"
        class="file-input"
        :disabled="hasJob"
        @change="handleBgmChange"
      />
      <p v-if="bgmError" class="error-hint">{{ bgmError }}</p>
    </div>

    <div class="field">
      <label for="bgm-volume">BGM音量: {{ bgmVolume.toFixed(1) }}</label>
      <input
        id="bgm-volume"
        :value="bgmVolume"
        type="range"
        min="0"
        max="1"
        step="0.1"
        class="range"
        :disabled="hasJob"
        @input="emit('update:bgmVolume', Number(($event.target as HTMLInputElement).value))"
      />
    </div>

    <button
      class="btn btn-generate"
      :disabled="!canSubmit"
      @click="emit('submit')"
    >
      {{ isSubmitting ? '送信中...' : 'ポッドキャスト生成' }}
    </button>
  </section>
</template>

<style scoped>
.podcast-form {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.field {
  margin-bottom: 1rem;
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: #2d3748;
}

.textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
}

.select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.file-input {
  font-size: 0.9rem;
}

.range {
  width: 100%;
}

.hint {
  color: #a0aec0;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.error-hint {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.btn {
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-generate {
  background: #805ad5;
  color: white;
}
</style>
