<script setup lang="ts">
import { onMounted } from 'vue';
import { useVoiceList } from '../composables/useVoiceList';

const { voices, isLoading, playingId, fetchVoices, deleteVoice, playVoice, stopPlayback } =
  useVoiceList();

onMounted(fetchVoices);

defineExpose({ fetchVoices });
</script>

<template>
  <section class="voice-list">
    <h2>登録済みの声</h2>

    <p v-if="isLoading" class="loading">読み込み中...</p>

    <p v-else-if="voices.length === 0" class="empty">
      声が登録されていません。上のフォームから録音してください。
    </p>

    <div v-else class="cards">
      <div v-for="voice in voices" :key="voice.id" class="card">
        <div class="card-info">
          <span class="card-label">{{ voice.label }}</span>
          <span class="card-date">{{
            new Date(voice.createdAt).toLocaleDateString('ja-JP')
          }}</span>
        </div>
        <div class="card-actions">
          <button
            v-if="playingId !== voice.id"
            class="btn btn-play"
            @click="playVoice(voice.id)"
          >
            再生
          </button>
          <button
            v-else
            class="btn btn-stop"
            @click="stopPlayback"
          >
            停止
          </button>
          <button
            class="btn btn-delete"
            @click="deleteVoice(voice.id)"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.voice-list {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.loading,
.empty {
  color: #718096;
  padding: 1rem 0;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f7fafc;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-label {
  font-weight: 600;
}

.card-date {
  font-size: 0.85rem;
  color: #718096;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-play {
  background: #38a169;
  color: white;
}

.btn-stop {
  background: #718096;
  color: white;
}

.btn-delete {
  background: #e53e3e;
  color: white;
}
</style>
