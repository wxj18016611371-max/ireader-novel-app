<template>
  <!-- 当有音频正在播放或曾经载入过，并且全屏播放面板未打开时显示 -->
  <div 
    v-if="audioPlayerStore.bookId && !audioPlayerStore.isPlayerModalOpen"
    ref="widgetRef"
    class="fixed z-50 select-none touch-none transition-transform duration-150"
    :style="widgetStyle"
    @mousedown="startDrag"
    @touchstart="startTouchDrag"
  >
    <!-- 类似番茄小说的黑胶悬浮胶囊 -->
    <div 
      class="flex items-center space-x-2.5 px-3 py-2 rounded-full bg-[#1A1C24]/95 text-white shadow-2xl border border-amber-500/30 backdrop-blur-md cursor-pointer hover:border-amber-500/60 active:scale-95 group transition-all"
      @click="handleClick"
    >
      <!-- 黑胶唱片旋转封面 -->
      <div class="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-amber-500/40 shadow-inner flex items-center justify-center bg-black">
        <div 
          class="w-full h-full rounded-full bg-gradient-to-tr from-amber-600 via-orange-600 to-yellow-500 flex items-center justify-center text-[10px] font-bold text-white animate-spin-slow"
          :class="{ 'paused': !audioPlayerStore.isPlaying }"
        >
          听
        </div>
        <!-- 唱片中心圆孔 -->
        <div class="absolute w-2.5 h-2.5 rounded-full bg-[#1A1C24] border border-white/20"></div>
      </div>

      <!-- 声音信息与声波律动 -->
      <div class="flex flex-col max-w-[90px]">
        <div class="flex items-center space-x-1">
          <span class="text-xs font-bold text-slate-100 truncate">{{ audioPlayerStore.currentVoice.name }}</span>
          <span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400">AI</span>
        </div>
        <span class="text-[10px] text-slate-400 truncate">
          {{ audioPlayerStore.isLoading ? '在线加载中...' : (audioPlayerStore.isPlaying ? '正在听书' : '已暂停') }}
        </span>
      </div>

      <!-- 律动波形 (播放时跳动) -->
      <div v-if="audioPlayerStore.isPlaying && !audioPlayerStore.isLoading" class="flex items-end space-x-0.5 h-4 px-1">
        <div class="w-0.5 bg-amber-400 rounded-full wave-bar-1"></div>
        <div class="w-0.5 bg-amber-400 rounded-full wave-bar-2"></div>
        <div class="w-0.5 bg-amber-400 rounded-full wave-bar-3"></div>
        <div class="w-0.5 bg-amber-400 rounded-full wave-bar-4"></div>
      </div>

      <!-- 快速播放/暂停按钮 -->
      <button 
        @click.stop="audioPlayerStore.togglePlay()"
        class="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30 transition-transform active:scale-90"
      >
        <Loader2 v-if="audioPlayerStore.isLoading" class="w-3.5 h-3.5 animate-spin" />
        <Pause v-else-if="audioPlayerStore.isPlaying" class="w-3.5 h-3.5 fill-current" />
        <Play v-else class="w-3.5 h-3.5 fill-current ml-0.5" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Play, Pause, Loader2 } from 'lucide-vue-next';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const audioPlayerStore = useAudioPlayerStore();
const widgetRef = ref(null);

const posX = ref(null);
const posY = ref(null);
let isDragging = false;
let startX = 0;
let startY = 0;
let initialX = 0;
let initialY = 0;
let dragMoved = false;

const widgetStyle = computed(() => {
  if (posX.value === null || posY.value === null) {
    return {
      right: '16px',
      bottom: '90px'
    };
  }
  return {
    left: `${posX.value}px`,
    top: `${posY.value}px`
  };
});

function handleClick() {
  if (!dragMoved) {
    audioPlayerStore.openPlayerModal();
  }
}

// 鼠标拖拽支持
function startDrag(e) {
  isDragging = true;
  dragMoved = false;
  startX = e.clientX;
  startY = e.clientY;
  const rect = widgetRef.value.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  window.addEventListener('mousemove', onDragging);
  window.addEventListener('mouseup', stopDrag);
}

function onDragging(e) {
  if (!isDragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved = true;
  }
  posX.value = Math.max(10, Math.min(window.innerWidth - 180, initialX + dx));
  posY.value = Math.max(40, Math.min(window.innerHeight - 80, initialY + dy));
}

function stopDrag() {
  isDragging = false;
  window.removeEventListener('mousemove', onDragging);
  window.removeEventListener('mouseup', stopDrag);
}

// 触摸屏移动拖拽支持
function startTouchDrag(e) {
  if (e.touches.length !== 1) return;
  isDragging = true;
  dragMoved = false;
  const touch = e.touches[0];
  startX = touch.clientX;
  startY = touch.clientY;
  const rect = widgetRef.value.getBoundingClientRect();
  initialX = rect.left;
  initialY = rect.top;

  window.addEventListener('touchmove', onTouchDragging, { passive: false });
  window.addEventListener('touchend', stopTouchDrag);
}

function onTouchDragging(e) {
  if (!isDragging || e.touches.length !== 1) return;
  e.preventDefault();
  const touch = e.touches[0];
  const dx = touch.clientX - startX;
  const dy = touch.clientY - startY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved = true;
  }
  posX.value = Math.max(10, Math.min(window.innerWidth - 180, initialX + dx));
  posY.value = Math.max(40, Math.min(window.innerHeight - 80, initialY + dy));
}

function stopTouchDrag() {
  isDragging = false;
  window.removeEventListener('touchmove', onTouchDragging);
  window.removeEventListener('touchend', stopTouchDrag);
}

onMounted(() => {
  // 默认位置靠右居底
  posX.value = Math.max(20, window.innerWidth - 180);
  posY.value = Math.max(100, window.innerHeight - 100);
});
</script>
