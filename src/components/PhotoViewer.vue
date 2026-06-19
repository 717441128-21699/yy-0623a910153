<template>
  <div v-if="visible" class="photo-viewer" @click.self="close">
    <button class="pv-close" @click="close">✕</button>
    <button v-if="photos.length > 1" class="pv-nav pv-prev" @click.stop="prev" :disabled="index === 0">‹</button>
    <div class="pv-content">
      <img v-if="currentPhoto" :src="currentPhoto.preview || currentPhoto.url" @click.stop />
      <div class="pv-info">
        <span class="pv-counter">{{ index + 1 }} / {{ photos.length }}</span>
        <span v-if="currentPhoto?.title" class="pv-title">{{ currentPhoto.title }}</span>
      </div>
    </div>
    <button v-if="photos.length > 1" class="pv-nav pv-next" @click.stop="next" :disabled="index === photos.length - 1">›</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  photos: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 }
})
const emit = defineEmits(['close'])

const index = ref(0)

const currentPhoto = computed(() => props.photos[index.value] || null)

watch(() => props.visible, (v) => {
  if (v) {
    index.value = props.startIndex || 0
  }
})

watch(() => props.startIndex, (v) => {
  if (props.visible) index.value = v
})

function prev() {
  if (index.value > 0) index.value--
}
function next() {
  if (index.value < props.photos.length - 1) index.value++
}
function close() {
  emit('close')
}
</script>

<style scoped>
.photo-viewer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.pv-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}
.pv-close:hover { background: rgba(255, 255, 255, 0.2); }

.pv-nav {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 28px;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.pv-nav:hover:not(:disabled) { background: rgba(255, 255, 255, 0.25); }
.pv-nav:disabled { opacity: 0.3; cursor: not-allowed; }

.pv-prev { margin-right: 20px; }
.pv-next { margin-left: 20px; }

.pv-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  max-height: 100%;
}
.pv-content img {
  max-width: 100%;
  max-height: calc(100vh - 140px);
  object-fit: contain;
  border-radius: 6px;
  cursor: default;
}

.pv-info {
  display: flex;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}
.pv-counter { font-weight: 500; }
.pv-title { color: rgba(255, 255, 255, 0.6); font-size: 12px; }
</style>
