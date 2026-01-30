<script setup lang="ts">
import { ref } from 'vue';
import VoiceRecorder from './components/VoiceRecorder.vue';
import VoiceList from './components/VoiceList.vue';

const voiceListRef = ref<InstanceType<typeof VoiceList> | null>(null);

function handleVoiceSaved() {
  voiceListRef.value?.fetchVoices();
}
</script>

<template>
  <div class="app">
    <h1>AI Clone Podcaster</h1>
    <VoiceRecorder @saved="handleVoiceSaved" />
    <VoiceList ref="voiceListRef" />
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
  margin-bottom: 1.5rem;
  color: #2d3748;
}
</style>
