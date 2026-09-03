<template>
  <div class="w-full h-full min-h-screen bg-[#0d0f17] flex flex-col items-center justify-center relative overflow-hidden font-sans">
    <!-- 桌面端顶部辅助工具条 (用于切换手机仿真框 / 全屏模式) -->
    <header class="hidden lg:flex items-center justify-between w-full max-w-5xl px-6 py-2.5 text-xs text-slate-400 z-30 shrink-0">
      <div class="flex items-center space-x-2">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-bold text-slate-200">掌阅 iReader + 番茄在线听书引擎</span>
        <span class="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
          纯在线 AI 神经网络 TTS 驱动
        </span>
      </div>

      <div class="flex items-center space-x-3">
        <!-- 切换视图形态 -->
        <div class="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
          <button 
            @click="isPhoneFrame = true"
            class="flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all text-xs font-medium"
            :class="isPhoneFrame ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            <Smartphone class="w-3.5 h-3.5" />
            <span>手机仿真框</span>
          </button>
          <button 
            @click="isPhoneFrame = false"
            class="flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all text-xs font-medium"
            :class="!isPhoneFrame ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            <Maximize2 class="w-3.5 h-3.5" />
            <span>自适应全屏</span>
          </button>
        </div>

        <button 
          @click="bookshelfStore.loadSampleBooks()" 
          class="text-xs text-slate-400 hover:text-amber-400 transition-colors"
          title="重新载入精编样书"
        >
          重置样书
        </button>
      </div>
    </header>

    <!-- 应用主体容器 (根据 isPhoneFrame 动态呈现手机外壳或全屏) -->
    <div 
      class="relative transition-all duration-300 flex flex-col overflow-hidden"
      :class="[
        isPhoneFrame 
          ? 'w-[390px] h-[820px] max-h-[96vh] rounded-[48px] shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-[10px] border-[#2E313D] ring-1 ring-white/10' 
          : 'w-full h-full max-w-md lg:max-w-xl h-screen shadow-2xl border-x border-slate-800'
      ]"
    >
      <!-- 手机听筒/灵动岛假组件 (仅仿真外框模式显示) -->
      <div v-if="isPhoneFrame" class="absolute top-2.5 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex items-center justify-center">
        <div class="w-24 h-5 rounded-full bg-black flex items-center justify-end px-2.5 space-x-1.5 shadow-md">
          <div class="w-2.5 h-2.5 rounded-full bg-[#111] border border-blue-950/60"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-blue-500/20"></div>
        </div>
      </div>

      <!-- 视图路由：书架 或 阅读器 -->
      <div class="w-full h-full flex-1 overflow-hidden relative">
        <BookshelfView v-if="!bookshelfStore.currentBook" />
        <ReaderView v-else :book="bookshelfStore.currentBook" />
      </div>

      <!-- 番茄小说全局悬浮黑胶胶囊 (在书架和阅读器全局浮动) -->
      <AudioFloatingWidget />

      <!-- 番茄小说全屏听书台弹窗 -->
      <AudioPlayerModal />

      <!-- AI 发音人矩阵切换弹窗 -->
      <VoiceSelectorModal />

      <!-- 睡眠定时关闭弹窗 -->
      <SleepTimerModal />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Smartphone, Maximize2 } from 'lucide-vue-next';
import { useBookshelfStore } from './stores/bookshelf';
import { useReaderStore } from './stores/reader';
import { useAudioPlayerStore } from './stores/audioPlayer';

import BookshelfView from './components/BookshelfView.vue';
import ReaderView from './components/ReaderView.vue';
import AudioFloatingWidget from './components/AudioFloatingWidget.vue';
import AudioPlayerModal from './components/AudioPlayerModal.vue';
import VoiceSelectorModal from './components/VoiceSelectorModal.vue';
import SleepTimerModal from './components/SleepTimerModal.vue';

const bookshelfStore = useBookshelfStore();
const readerStore = useReaderStore();
const audioPlayerStore = useAudioPlayerStore();

// 桌面端默认开启手机仿真外框，移动端自动全屏
const isPhoneFrame = ref(window.innerWidth > 768);

onMounted(async () => {
  await bookshelfStore.init();
  readerStore.init();
  await audioPlayerStore.init();
});
</script>
