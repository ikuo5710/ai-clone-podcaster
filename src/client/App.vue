<script setup lang="ts">
import { ref } from 'vue';
import VoiceRecorder from './components/VoiceRecorder.vue';
import VoiceList from './components/VoiceList.vue';
import PodcastForm from './components/PodcastForm.vue';
import PodcastPlayer from './components/PodcastPlayer.vue';
import { usePodcastCreator } from './composables/usePodcastCreator';

const activeTab = ref<'voices' | 'podcast'>('voices');

const voiceListRef = ref<InstanceType<typeof VoiceList> | null>(null);
const podcastFormRef = ref<InstanceType<typeof PodcastForm> | null>(null);

const {
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
} = usePodcastCreator();

function handleVoiceSaved() {
  voiceListRef.value?.fetchVoices();
  podcastFormRef.value?.fetchVoices();
}

function handleReset() {
  resetForm();
}
</script>

<template>
  <div class="app">
    <h1>AI Clone Podcaster</h1>

    <nav class="tabs">
      <button
        :class="['tab', { active: activeTab === 'voices' }]"
        @click="activeTab = 'voices'"
      >
        声の管理
      </button>
      <button
        :class="['tab', { active: activeTab === 'podcast' }]"
        @click="activeTab = 'podcast'"
      >
        ポッドキャスト作成
      </button>
    </nav>

    <div v-show="activeTab === 'voices'">
      <VoiceRecorder @saved="handleVoiceSaved" />
      <VoiceList ref="voiceListRef" />
    </div>

    <div v-show="activeTab === 'podcast'">
      <PodcastForm
        ref="podcastFormRef"
        v-model:script="script"
        v-model:selected-voice-id="selectedVoiceId"
        v-model:bgm-file="bgmFile"
        v-model:bgm-volume="bgmVolume"
        :is-submitting="isSubmitting"
        :has-job="jobId !== null"
        @submit="createPodcast"
      />

      <PodcastPlayer
        v-if="jobId && jobStatus"
        :job-id="jobId"
        :status="jobStatus"
        :error="jobError"
        @reset="handleReset"
      />
    </div>
  </div>
</template>

<style>
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 0;
  padding: 0;
  background: #f5f5f5;
}

.app {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 {
  margin-bottom: 1rem;
  color: #2d3748;
}

.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.tab {
  padding: 0.6rem 1.2rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  color: #718096;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s, border-color 0.2s;
}

.tab.active {
  color: #2d3748;
  border-bottom-color: #805ad5;
  font-weight: 600;
}
</style>
