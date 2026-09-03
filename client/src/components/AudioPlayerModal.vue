<template>
  <div 
    v-if="audioPlayerStore.isPlayerModalOpen" 
    class="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1C1F2B] via-[#14161F] to-[#0E1017] text-slate-100 select-none animate-in slide-in-from-bottom duration-300"
  >
    <!-- 顶部状态栏 -->
    <header class="px-5 pt-4 pb-2 flex items-center justify-between border-b border-white/5 shrink-0">
      <!-- 最小化收起按钮 -->
      <button 
        @click="audioPlayerStore.closePlayerModal()" 
        class="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
        title="收起为悬浮胶囊"
      >
        <ChevronDown class="w-6 h-6" />
      </button>

      <!-- 当前书名与章节 -->
      <div class="flex flex-col items-center max-w-[200px] text-center">
        <h2 class="text-sm font-bold text-slate-100 truncate w-full">{{ currentBook?.title }}</h2>
        <span class="text-[11px] text-amber-400 font-medium truncate w-full mt-0.5">
          {{ currentChapter?.title }}
        </span>
      </div>

      <!-- 换声音快捷入口 -->
      <button 
        @click="audioPlayerStore.isVoiceModalOpen = true"
        class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs text-slate-200"
      >
        <Mic2 class="w-3.5 h-3.5 text-amber-400" />
        <span class="text-[11px] font-medium">{{ audioPlayerStore.currentVoice.name }}</span>
      </button>
    </header>

    <!-- 中部舞台区：黑胶旋转大唱片 + 实时句子卡片 -->
    <main class="flex-1 flex flex-col items-center justify-center px-6 py-4 overflow-hidden">
      <!-- 仿真番茄黑胶大唱片 -->
      <div class="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full bg-radial from-slate-900 via-black to-slate-950 p-3 shadow-2xl border-4 border-slate-800/80 flex items-center justify-center my-auto">
        <!-- 唱片同心环纹理 -->
        <div class="absolute inset-0 rounded-full border border-white/5 pointer-events-none"></div>
        <div class="absolute inset-4 rounded-full border border-white/5 pointer-events-none"></div>
        <div class="absolute inset-8 rounded-full border border-white/5 pointer-events-none"></div>

        <!-- 唱片中心书影旋转体 -->
        <div 
          class="w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden shadow-2xl border-2 border-amber-500/40 flex items-center justify-center animate-spin-slow"
          :class="{ 'paused': !audioPlayerStore.isPlaying }"
        >
          <div 
            class="w-full h-full p-3 flex flex-col items-center justify-center text-center text-white"
            :class="[currentBook?.coverColor ? `bg-gradient-to-br ${currentBook.coverColor}` : 'bg-gradient-to-br from-amber-700 to-red-900']"
          >
            <span class="text-xs font-bold leading-tight drop-shadow line-clamp-2">{{ currentBook?.title }}</span>
            <span class="text-[9px] text-white/70 mt-1 drop-shadow">{{ currentBook?.author }}</span>
          </div>
        </div>

        <!-- 黑胶唱针定点轴心 -->
        <div class="absolute w-6 h-6 rounded-full bg-slate-800 border-2 border-white/30 flex items-center justify-center">
          <div class="w-2 h-2 rounded-full bg-amber-400"></div>
        </div>
      </div>

      <!-- 番茄小说特色：当前播报文字字幕卡片 (字字传神) -->
      <div class="w-full max-w-sm mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-md text-center min-h-[96px] flex flex-col items-center justify-center">
        <div class="flex items-center space-x-1 mb-1 text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
          <Sparkles class="w-3 h-3" />
          <span>正在在线朗读 (第 {{ audioPlayerStore.sentenceIndex + 1 }} / {{ audioPlayerStore.sentences.length }} 句)</span>
        </div>
        <p class="text-sm font-medium text-slate-100 leading-relaxed line-clamp-3">
          {{ audioPlayerStore.currentSentenceText || '准备就绪，点击播放开始在线朗读' }}
        </p>
      </div>
    </main>

    <!-- 底部控制核心区域 -->
    <footer class="px-6 pb-8 pt-2 bg-[#12141D] border-t border-white/5 space-y-4 shrink-0">
      <!-- 进度指示条与时间 -->
      <div>
        <div class="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
          <span>{{ audioPlayerStore.sentenceIndex + 1 }} 句</span>
          <span class="text-amber-400 font-bold">{{ audioPlayerStore.progressPercent }}%</span>
          <span>{{ audioPlayerStore.sentences.length }} 句</span>
        </div>
        <!-- 进度条点击跳转 -->
        <div 
          class="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden cursor-pointer"
          @click="handleProgressClick"
        >
          <div 
            class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-200"
            :style="{ width: `${audioPlayerStore.progressPercent}%` }"
          ></div>
        </div>
      </div>

      <!-- 核心播放控制器 (快退15s / 上一句 / 播放暂停 / 下一句 / 快进15s) -->
      <div class="flex items-center justify-between px-2 py-1">
        <!-- 快退 15 秒 -->
        <button 
          @click="audioPlayerStore.seekTime(-15)"
          class="p-2.5 rounded-full text-slate-400 hover:text-white active:scale-90 transition-all flex flex-col items-center"
          title="快退 15 秒"
        >
          <RotateCcw class="w-5 h-5" />
          <span class="text-[8px] mt-0.5 font-mono">15s</span>
        </button>

        <!-- 上一句 -->
        <button 
          @click="audioPlayerStore.prevSentence"
          :disabled="audioPlayerStore.sentenceIndex <= 0"
          class="p-2.5 rounded-full text-slate-300 hover:text-white active:scale-90 disabled:opacity-30 transition-all"
          title="上一句"
        >
          <SkipBack class="w-6 h-6" />
        </button>

        <!-- 核心播放/暂停大按钮 (带呼吸波光) -->
        <button 
          @click="audioPlayerStore.togglePlay()"
          class="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 active:scale-95 transition-all"
        >
          <Loader2 v-if="audioPlayerStore.isLoading" class="w-7 h-7 animate-spin" />
          <Pause v-else-if="audioPlayerStore.isPlaying" class="w-7 h-7 fill-current" />
          <Play v-else class="w-7 h-7 fill-current ml-1" />
        </button>

        <!-- 下一句 -->
        <button 
          @click="audioPlayerStore.nextSentence"
          :disabled="audioPlayerStore.sentenceIndex >= audioPlayerStore.sentences.length - 1"
          class="p-2.5 rounded-full text-slate-300 hover:text-white active:scale-90 disabled:opacity-30 transition-all"
          title="下一句"
        >
          <SkipForward class="w-6 h-6" />
        </button>

        <!-- 快进 15 秒 -->
        <button 
          @click="audioPlayerStore.seekTime(15)"
          class="p-2.5 rounded-full text-slate-400 hover:text-white active:scale-90 transition-all flex flex-col items-center"
          title="快进 15 秒"
        >
          <RotateCw class="w-5 h-5" />
          <span class="text-[8px] mt-0.5 font-mono">15s</span>
        </button>
      </div>

      <!-- 仿番茄小说底部工具栏：倍速 / 换主播 / 定时关闭 / 选章节 -->
      <div class="grid grid-cols-4 gap-2 pt-2 border-t border-white/5 text-center">
        <!-- 倍速切换 -->
        <button 
          @click="cycleRate"
          class="flex flex-col items-center py-1.5 rounded-xl hover:bg-white/5 active:scale-95 transition-colors"
        >
          <span class="text-xs font-bold font-mono text-amber-400">{{ audioPlayerStore.playbackRate }}x</span>
          <span class="text-[10px] text-slate-400 mt-0.5">语速</span>
        </button>

        <!-- 换主播 -->
        <button 
          @click="audioPlayerStore.isVoiceModalOpen = true"
          class="flex flex-col items-center py-1.5 rounded-xl hover:bg-white/5 active:scale-95 transition-colors"
        >
          <Mic2 class="w-4 h-4 text-slate-300 mb-0.5" />
          <span class="text-[10px] text-slate-400">换声音</span>
        </button>

        <!-- 定时关闭 -->
        <button 
          @click="audioPlayerStore.isTimerModalOpen = true"
          class="flex flex-col items-center py-1.5 rounded-xl hover:bg-white/5 active:scale-95 transition-colors"
        >
          <Clock class="w-4 h-4 text-slate-300 mb-0.5" />
          <span class="text-[10px] text-slate-400">
            {{ audioPlayerStore.sleepTimerMinutes ? `${audioPlayerStore.sleepTimerMinutes}分` : '定时' }}
          </span>
        </button>

        <!-- 目录切换 -->
        <button 
          @click="openTocFromAudio"
          class="flex flex-col items-center py-1.5 rounded-xl hover:bg-white/5 active:scale-95 transition-colors"
        >
          <ListOrdered class="w-4 h-4 text-slate-300 mb-0.5" />
          <span class="text-[10px] text-slate-400">选章节</span>
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  ChevronDown, 
  Mic2, 
  RotateCcw, 
  RotateCw, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Loader2, 
  Clock, 
  ListOrdered, 
  Sparkles 
} from 'lucide-vue-next';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import { useBookshelfStore } from '../stores/bookshelf';
import { useReaderStore } from '../stores/reader';

const audioPlayerStore = useAudioPlayerStore();
const bookshelfStore = useBookshelfStore();
const readerStore = useReaderStore();

const currentBook = computed(() => {
  return bookshelfStore.books.find(b => b.id === audioPlayerStore.bookId) || bookshelfStore.currentBook;
});

const currentChapter = computed(() => {
  if (!currentBook.value || !currentBook.value.chapters) return null;
  return currentBook.value.chapters[audioPlayerStore.chapterIndex] || currentBook.value.chapters[0];
});

// 循环切换倍速 (0.75x -> 1.0x -> 1.25x -> 1.5x -> 1.75x -> 2.0x -> 3.0x)
const rateList = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0];
function cycleRate() {
  const current = audioPlayerStore.playbackRate;
  const idx = rateList.indexOf(current);
  const next = idx === -1 || idx === rateList.length - 1 ? rateList[0] : rateList[idx + 1];
  audioPlayerStore.setPlaybackRate(next);
}

function handleProgressClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const targetIndex = Math.floor(ratio * audioPlayerStore.sentences.length);
  audioPlayerStore.jumpToSentence(targetIndex);
}

function openTocFromAudio() {
  audioPlayerStore.closePlayerModal();
  readerStore.openToc();
}
</script>
