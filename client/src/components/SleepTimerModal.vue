<template>
  <div 
    v-if="audioPlayerStore.isTimerModalOpen" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
  >
    <!-- 背景遮罩 -->
    <div 
      class="fixed inset-0 bg-black/70 backdrop-blur-xs"
      @click="audioPlayerStore.isTimerModalOpen = false"
    ></div>

    <!-- 弹窗主体 -->
    <div class="relative w-full max-w-sm bg-[#1D202B] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700 shadow-2xl p-5 z-10 animate-in slide-in-from-bottom duration-200 text-slate-100">
      <!-- 头部 -->
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex items-center space-x-2">
          <Clock class="w-5 h-5 text-amber-500" />
          <h2 class="text-base font-bold text-slate-100">睡眠定时关闭</h2>
        </div>
        <button 
          @click="audioPlayerStore.isTimerModalOpen = false"
          class="p-1 rounded-full text-slate-400 hover:text-white"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 实时剩余时间提醒 -->
      <div v-if="audioPlayerStore.sleepRemainingSeconds > 0" class="mt-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
        <span>定时器已启动，剩余：</span>
        <span class="font-mono font-bold text-sm">{{ formattedRemainingTime }}</span>
      </div>

      <!-- 定时选项列表 -->
      <div class="mt-4 space-y-2">
        <button 
          v-for="opt in timerOptions" 
          :key="opt.value"
          @click="setTimer(opt.value)"
          class="w-full flex items-center justify-between px-4 py-3 rounded-xl border text-xs font-medium transition-all"
          :class="audioPlayerStore.sleepTimerMinutes === opt.value 
            ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-md' 
            : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60 text-slate-300'"
        >
          <span>{{ opt.label }}</span>
          <Check v-if="audioPlayerStore.sleepTimerMinutes === opt.value" class="w-4 h-4 text-amber-400" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { Clock, X, Check } from 'lucide-vue-next';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const audioPlayerStore = useAudioPlayerStore();

const timerOptions = [
  { label: '不开启定时', value: 0 },
  { label: '播完当前章节停止', value: 'chapter' },
  { label: '15 分钟后停止', value: 15 },
  { label: '30 分钟后停止', value: 30 },
  { label: '45 分钟后停止', value: 45 },
  { label: '60 分钟后停止', value: 60 },
  { label: '90 分钟后停止', value: 90 }
];

const formattedRemainingTime = computed(() => {
  const sec = audioPlayerStore.sleepRemainingSeconds;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

function setTimer(val) {
  audioPlayerStore.setSleepTimer(val);
  audioPlayerStore.isTimerModalOpen = false;
}
</script>
