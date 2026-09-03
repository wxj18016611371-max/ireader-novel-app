<template>
  <div v-if="readerStore.showMenu" class="fixed inset-0 z-40 pointer-events-none select-none">
    <!-- 顶部菜单栏 -->
    <header class="pointer-events-auto absolute top-0 left-0 right-0 h-14 bg-[#181A22]/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between shadow-lg text-slate-100 animate-in slide-in-from-top duration-200">
      <button 
        @click="handleBackToShelf" 
        class="flex items-center space-x-1 py-1.5 px-2 -ml-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
      >
        <ChevronLeft class="w-5 h-5" />
        <span class="text-xs font-medium">书架</span>
      </button>

      <h2 class="text-xs font-bold text-slate-200 truncate max-w-[160px]">
        {{ bookshelfStore.currentBook?.title }}
      </h2>

      <!-- 右侧听书入口与快捷设置 -->
      <div class="flex items-center space-x-2">
        <!-- 启动番茄在线听书 -->
        <button 
          @click="handleStartListening"
          class="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 text-xs font-medium transition-all"
          title="开启在线听书"
        >
          <Headphones class="w-3.5 h-3.5" />
          <span>听书</span>
        </button>

        <button 
          @click="readerStore.showSettings = !readerStore.showSettings"
          class="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"
          :class="readerStore.showSettings ? 'text-amber-400 bg-white/10' : ''"
        >
          <Settings2 class="w-5 h-5" />
        </button>
      </div>
    </header>

    <!-- 排版设置抽屉/二级弹层 -->
    <div 
      v-if="readerStore.showSettings"
      class="pointer-events-auto absolute bottom-20 left-3 right-3 bg-[#1F222D]/95 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl text-slate-200 space-y-4 animate-in slide-in-from-bottom duration-200"
    >
      <!-- 字号调节与行距 -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-400 font-medium">字号大小</span>
        <div class="flex items-center space-x-3 bg-black/30 px-3 py-1.5 rounded-full border border-white/5">
          <button 
            @click="readerStore.setFontSize(-2)" 
            class="px-2.5 py-0.5 text-xs font-bold text-slate-300 hover:text-white active:scale-95"
          >
            A-
          </button>
          <span class="text-xs font-mono font-bold text-amber-400 w-6 text-center">{{ readerStore.fontSize }}</span>
          <button 
            @click="readerStore.setFontSize(2)" 
            class="px-2.5 py-0.5 text-xs font-bold text-slate-300 hover:text-white active:scale-95"
          >
            A+
          </button>
        </div>
      </div>

      <!-- 掌阅 5 大经典阅读主题切换 -->
      <div>
        <span class="text-xs text-slate-400 font-medium block mb-2">背景配色 (掌阅原版色卡)</span>
        <div class="grid grid-cols-5 gap-2">
          <button 
            v-for="th in themes" 
            :key="th.id"
            @click="readerStore.setTheme(th.id)"
            class="flex flex-col items-center p-1.5 rounded-xl border-2 transition-all active:scale-95"
            :class="[
              th.bgClass,
              readerStore.theme === th.id ? 'border-amber-500 scale-105 shadow-md shadow-amber-500/20' : 'border-transparent'
            ]"
          >
            <div class="w-7 h-7 rounded-full shadow-inner flex items-center justify-center text-[10px]" :class="th.previewClass">
              文
            </div>
            <span class="text-[10px] mt-1 font-medium" :class="readerStore.theme === 'night' ? 'text-slate-300' : 'text-slate-700'">
              {{ th.name }}
            </span>
          </button>
        </div>
      </div>

      <!-- 翻页模式 -->
      <div>
        <span class="text-xs text-slate-400 font-medium block mb-2">翻页动画</span>
        <div class="grid grid-cols-3 gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
          <button 
            @click="readerStore.setTurnMode('curl')"
            class="py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="readerStore.turnMode === 'curl' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            仿真翻页
          </button>
          <button 
            @click="readerStore.setTurnMode('slide')"
            class="py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="readerStore.turnMode === 'slide' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            左右平移
          </button>
          <button 
            @click="readerStore.setTurnMode('scroll')"
            class="py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="readerStore.turnMode === 'scroll' ? 'bg-amber-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
          >
            上下滚动
          </button>
        </div>
      </div>

      <!-- 字体选择 -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs text-slate-400 font-medium">阅读字体</span>
        <div class="flex items-center space-x-1.5 bg-black/30 p-1 rounded-xl border border-white/5">
          <button 
            @click="readerStore.setFontFamily('system')"
            class="px-2.5 py-1 rounded-lg text-xs transition-all"
            :class="readerStore.fontFamily === 'system' ? 'bg-white/15 text-amber-400 font-medium' : 'text-slate-400'"
          >
            系统黑体
          </button>
          <button 
            @click="readerStore.setFontFamily('kaiti')"
            class="px-2.5 py-1 rounded-lg text-xs font-serif transition-all"
            :class="readerStore.fontFamily === 'kaiti' ? 'bg-white/15 text-amber-400 font-medium' : 'text-slate-400'"
          >
            掌阅楷体
          </button>
          <button 
            @click="readerStore.setFontFamily('songti')"
            class="px-2.5 py-1 rounded-lg text-xs font-serif transition-all"
            :class="readerStore.fontFamily === 'songti' ? 'bg-white/15 text-amber-400 font-medium' : 'text-slate-400'"
          >
            文艺宋体
          </button>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <footer class="pointer-events-auto absolute bottom-0 left-0 right-0 h-18 bg-[#181A22]/95 backdrop-blur-md border-t border-white/10 px-6 flex items-center justify-between shadow-2xl text-slate-200 animate-in slide-in-from-bottom duration-200">
      <!-- 上一章 -->
      <button 
        @click="$emit('prev-chapter')"
        :disabled="currentChapterIndex <= 0"
        class="flex flex-col items-center text-[10px] text-slate-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-400"
      >
        <SkipBack class="w-4 h-4 mb-1" />
        <span>上一章</span>
      </button>

      <!-- 目录 -->
      <button 
        @click="readerStore.openToc()"
        class="flex flex-col items-center text-[10px] text-slate-400 hover:text-amber-400"
      >
        <ListOrdered class="w-4 h-4 mb-1" />
        <span>目录</span>
      </button>

      <!-- 夜间模式一键切换 -->
      <button 
        @click="toggleNightMode"
        class="flex flex-col items-center text-[10px] text-slate-400 hover:text-amber-400"
      >
        <Moon v-if="readerStore.theme !== 'night'" class="w-4 h-4 mb-1" />
        <Sun v-else class="w-4 h-4 mb-1 text-amber-400" />
        <span>{{ readerStore.theme === 'night' ? '日间' : '夜间' }}</span>
      </button>

      <!-- 设置 -->
      <button 
        @click="readerStore.showSettings = !readerStore.showSettings"
        class="flex flex-col items-center text-[10px]"
        :class="readerStore.showSettings ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'"
      >
        <Sliders class="w-4 h-4 mb-1" />
        <span>排版</span>
      </button>

      <!-- 下一章 -->
      <button 
        @click="$emit('next-chapter')"
        :disabled="currentChapterIndex >= totalChapters - 1"
        class="flex flex-col items-center text-[10px] text-slate-400 hover:text-amber-400 disabled:opacity-30 disabled:hover:text-slate-400"
      >
        <SkipForward class="w-4 h-4 mb-1" />
        <span>下一章</span>
      </button>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { 
  ChevronLeft, 
  Headphones, 
  Settings2, 
  SkipBack, 
  SkipForward, 
  ListOrdered, 
  Moon, 
  Sun, 
  Sliders 
} from 'lucide-vue-next';
import { useReaderStore } from '../stores/reader';
import { useBookshelfStore } from '../stores/bookshelf';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const readerStore = useReaderStore();
const bookshelfStore = useBookshelfStore();
const audioPlayerStore = useAudioPlayerStore();

const props = defineProps({
  currentChapterIndex: {
    type: Number,
    default: 0
  },
  totalChapters: {
    type: Number,
    default: 1
  }
});

const emit = defineEmits(['prev-chapter', 'next-chapter']);

const themes = [
  { id: 'parchment', name: '羊皮纸', bgClass: 'bg-[#F6F1E7]', previewClass: 'bg-[#eadbc5] text-[#382E25]' },
  { id: 'green', name: '护眼绿', bgClass: 'bg-[#CCE2CF]', previewClass: 'bg-[#b8d4bb] text-[#243526]' },
  { id: 'white', name: '晨光白', bgClass: 'bg-[#F7F7F9]', previewClass: 'bg-[#eaebee] text-[#2B2D30]' },
  { id: 'gray', name: '水墨灰', bgClass: 'bg-[#D6D6DA]', previewClass: 'bg-[#c5c5cb] text-[#27282A]' },
  { id: 'night', name: '深邃夜', bgClass: 'bg-[#191B1F]', previewClass: 'bg-[#292c33] text-[#8C9098]' }
];

function handleBackToShelf() {
  readerStore.showMenu = false;
  bookshelfStore.closeBook();
}

function handleStartListening() {
  readerStore.showMenu = false;
  const book = bookshelfStore.currentBook;
  if (!book) return;

  audioPlayerStore.loadChapterForListening(book, props.currentChapterIndex, 0);
  audioPlayerStore.playCurrentSentence();
  audioPlayerStore.openPlayerModal();
}

function toggleNightMode() {
  if (readerStore.theme === 'night') {
    readerStore.setTheme('parchment');
  } else {
    readerStore.setTheme('night');
  }
}
</script>
