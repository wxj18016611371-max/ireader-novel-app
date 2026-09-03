<template>
  <div 
    v-if="readerStore.showToc" 
    class="fixed inset-0 z-50 flex animate-in fade-in duration-200"
  >
    <!-- 遮罩背景 -->
    <div 
      class="fixed inset-0 bg-black/60 backdrop-blur-xs"
      @click="readerStore.closeToc()"
    ></div>

    <!-- 侧边抽屉面板 -->
    <div class="relative w-4/5 max-w-sm h-full bg-[#1A1C24] text-slate-100 flex flex-col shadow-2xl border-r border-slate-800 z-10 animate-in slide-in-from-left duration-200">
      <!-- 抽屉头部 -->
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-slate-100 truncate max-w-[200px]">
            {{ bookshelfStore.currentBook?.title }}
          </h2>
          <p class="text-[11px] text-slate-400 mt-0.5">
            共 {{ bookshelfStore.currentBook?.chapters.length || 0 }} 章 · 正文目录
          </p>
        </div>

        <button 
          @click="readerStore.closeToc()"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- 搜索与正倒序筛选 -->
      <div class="px-4 py-2.5 border-b border-slate-800/80 flex items-center space-x-2">
        <div class="relative flex-1">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索章节名..." 
            class="w-full pl-8 pr-3 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <button 
          @click="isReverse = !isReverse"
          class="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-amber-400 text-xs flex items-center space-x-1"
          :title="isReverse ? '倒序排列' : '正序排列'"
        >
          <ArrowUpDown class="w-3.5 h-3.5" />
          <span class="text-[10px]">{{ isReverse ? '倒序' : '正序' }}</span>
        </button>
      </div>

      <!-- 章节列表 -->
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div 
          v-for="(chapter, idx) in displayedChapters" 
          :key="chapter.id || idx"
          @click="selectChapter(chapter.originalIndex)"
          class="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
          :class="chapter.originalIndex === bookshelfStore.currentBook?.currentChapterIndex 
            ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30' 
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'"
        >
          <span class="truncate flex-1 mr-2">{{ chapter.title }}</span>
          <span 
            v-if="chapter.originalIndex === bookshelfStore.currentBook?.currentChapterIndex" 
            class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400"
          >
            当前
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { X, Search, ArrowUpDown } from 'lucide-vue-next';
import { useBookshelfStore } from '../stores/bookshelf';
import { useReaderStore } from '../stores/reader';

const bookshelfStore = useBookshelfStore();
const readerStore = useReaderStore();

const searchQuery = ref('');
const isReverse = ref(false);

const displayedChapters = computed(() => {
  const book = bookshelfStore.currentBook;
  if (!book || !book.chapters) return [];

  let list = book.chapters.map((c, i) => ({ ...c, originalIndex: i }));

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(c => c.title.toLowerCase().includes(q));
  }

  if (isReverse.value) {
    return list.slice().reverse();
  }
  return list;
});

const emit = defineEmits(['jump-chapter']);

function selectChapter(index) {
  emit('jump-chapter', index);
  readerStore.closeToc();
}
</script>
