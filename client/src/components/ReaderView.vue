<template>
  <div 
    class="relative w-full h-full flex flex-col overflow-hidden select-none transition-colors duration-300 perspective-container"
    :class="[readerStore.themeClass, readerStore.theme === 'parchment' ? 'bg-parchment-pattern' : '']"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 仿真实体书书脊阴影 (左侧柔和光影) -->
    <div class="absolute left-0 top-0 bottom-0 w-8 book-spine-shadow z-20 pointer-events-none"></div>

    <!-- 顶部极简状态信息 (书名 & 章节名) -->
    <div class="h-8 px-5 flex items-center justify-between text-[11px] opacity-60 shrink-0 pointer-events-none z-10 border-b border-current/5">
      <span class="truncate max-w-[160px] font-medium">{{ book.title }}</span>
      <span class="truncate max-w-[160px] text-right font-mono">{{ currentChapter?.title }}</span>
    </div>

    <!-- ================= 掌阅 3D 满屏仿真翻页视口 ================= -->
    <div 
      ref="readerViewport"
      class="flex-1 relative overflow-hidden flex flex-col justify-between px-5 py-3 cursor-pointer"
      :style="{
        fontSize: `${readerStore.fontSize}px`,
        lineHeight: readerStore.lineHeight,
        fontFamily: readerStore.fontFamilyStyle,
        paddingLeft: `${readerStore.sideMargin}px`,
        paddingRight: `${readerStore.sideMargin}px`
      }"
      @click="handleViewportClick"
    >
      <!-- 底层页 (翻页时透出的目标页，保持视觉连贯) -->
      <div 
        v-if="isTurning"
        class="absolute inset-0 px-5 py-3 flex flex-col justify-between pointer-events-none z-0"
        :class="[readerStore.themeClass, readerStore.theme === 'parchment' ? 'bg-parchment-pattern' : '']"
        :style="{
          fontSize: `${readerStore.fontSize}px`,
          lineHeight: readerStore.lineHeight,
          fontFamily: readerStore.fontFamilyStyle,
          paddingLeft: `${readerStore.sideMargin}px`,
          paddingRight: `${readerStore.sideMargin}px`
        }"
      >
        <div class="overflow-hidden flex-1 flex flex-col">
          <h2 v-if="targetPageIndex === 0" class="text-base font-bold mb-3 opacity-90 border-b pb-1.5 border-current/15">
            {{ currentChapter?.title }}
          </h2>
          <div class="space-y-2 text-justify flex-1">
            <p 
              v-for="(para, pIdx) in targetPageContent" 
              :key="'target-' + pIdx" 
              :class="para.isContinuation ? 'indent-0' : 'indent-8'"
              class="leading-relaxed tracking-normal"
            >
              <span v-for="sent in para.sentences" :key="'target-s-' + sent.globalIndex">
                {{ sent.text }}
              </span>
            </p>
          </div>
        </div>
        <!-- 底层页码 -->
        <div class="h-6 flex items-center justify-between text-[10px] opacity-50 shrink-0 pt-1 border-t border-current/5">
          <span>{{ currentChapter?.title }}</span>
          <span>第 {{ targetPageIndex + 1 }} / {{ totalPages }} 页</span>
        </div>
      </div>

      <!-- 当前页 (主屏满屏纸页) -->
      <div 
        class="relative w-full h-full flex flex-col justify-between z-10 page-sheet"
        :class="[
          isTurning && turnDirection === 'next' ? 'anim-curl-next' : '',
          isTurning && turnDirection === 'prev' ? 'anim-curl-prev' : ''
        ]"
      >
        <!-- 正文内容区 (紧密满屏填满，绝无大片空白) -->
        <div class="overflow-hidden flex-1 flex flex-col">
          <!-- 仅在第一页显示章节标题 -->
          <h1 
            v-if="currentPageIndex === 0" 
            class="text-base font-bold mb-3 pt-0.5 tracking-wide opacity-90 border-b pb-1.5 border-current/15 shrink-0"
          >
            {{ currentChapter?.title }}
          </h1>

          <!-- 满页段落与句子 -->
          <div class="space-y-2.5 text-justify flex-1">
            <p 
              v-for="(para, pIdx) in currentPageContent" 
              :key="'curr-' + pIdx" 
              :class="para.isContinuation ? 'indent-0' : 'indent-8'"
              class="leading-relaxed tracking-normal"
            >
              <span 
                v-for="sent in para.sentences" 
                :key="'curr-s-' + sent.globalIndex"
                :id="`sent-${sent.globalIndex}`"
                class="transition-all duration-200 rounded px-0.5 inline"
                :class="[
                  isAudioActiveOnThisChapter && audioPlayerStore.sentenceIndex === sent.globalIndex
                    ? 'sentence-active ring-2 ring-amber-400/60' 
                    : ''
                ]"
              >
                {{ sent.text }}
              </span>
            </p>
          </div>
        </div>

        <!-- 页面底部仿真页码与章节进度 (掌阅经典底注) -->
        <div class="h-6 flex items-center justify-between text-[10px] opacity-50 shrink-0 pt-1 border-t border-current/5">
          <span>本章进度 {{ chapterProgressPercent }}%</span>
          <span>第 {{ currentPageIndex + 1 }} / {{ totalPages }} 页</span>
        </div>

        <!-- 翻页时伴随的圆柱立体纸张反光层 -->
        <div v-if="isTurning" class="absolute inset-0 page-curl-sheen z-20"></div>
      </div>
    </div>

    <!-- 底部极简阅读进度条 (时间 & 全书总进度) -->
    <div class="h-7 px-5 flex items-center justify-between text-[10px] opacity-50 shrink-0 pointer-events-none border-t border-current/5 z-10">
      <span>{{ timeString }}</span>
      <span>全书已读 {{ totalBookPercent }}%</span>
    </div>

    <!-- ================= 用户专属【听书按钮】 ================= -->
    <div 
      v-if="!audioPlayerStore.isPlaying && !readerStore.showMenu"
      class="fixed bottom-12 right-5 z-30 animate-in fade-in zoom-in duration-200"
    >
      <button 
        @click.stop="startListeningExplicitly"
        class="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-xl shadow-amber-500/30 border border-white/20 active:scale-95 transition-all group"
        title="开启番茄在线听书"
      >
        <Headphones class="w-4 h-4 group-hover:scale-110 transition-transform" />
        <span>听书</span>
      </button>
    </div>

    <!-- 掌阅顶部/底部操作菜单栏 -->
    <ReaderMenu 
      :current-chapter-index="currentChapterIndex"
      :total-chapters="book.chapters.length"
      @prev-chapter="prevChapter"
      @next-chapter="nextChapter"
    />

    <!-- 章节目录抽屉 -->
    <TocDrawer @jump-chapter="jumpToChapter" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Headphones } from 'lucide-vue-next';
import { useReaderStore } from '../stores/reader';
import { useBookshelfStore } from '../stores/bookshelf';
import { useAudioPlayerStore } from '../stores/audioPlayer';
import ReaderMenu from './ReaderMenu.vue';
import TocDrawer from './TocDrawer.vue';

const props = defineProps({
  book: {
    type: Object,
    required: true
  }
});

const readerStore = useReaderStore();
const bookshelfStore = useBookshelfStore();
const audioPlayerStore = useAudioPlayerStore();

const readerViewport = ref(null);
const timeString = ref('');
let timeInterval = null;

// 仿真翻页核心状态
const currentPageIndex = ref(0);
const isTurning = ref(false);
const turnDirection = ref('next'); // 'next' | 'prev'
const targetPageIndex = ref(0);

// 手势识别
let touchStartX = 0;
let touchStartY = 0;

const currentChapterIndex = computed(() => {
  return props.book.currentChapterIndex || 0;
});

const currentChapter = computed(() => {
  return props.book.chapters[currentChapterIndex.value] || props.book.chapters[0];
});

const isAudioActiveOnThisChapter = computed(() => {
  return audioPlayerStore.isPlaying && 
         audioPlayerStore.bookId === props.book.id && 
         audioPlayerStore.chapterIndex === currentChapterIndex.value;
});

const totalBookPercent = computed(() => {
  if (!props.book.chapters.length) return 0;
  return Math.round(((currentChapterIndex.value + 1) / props.book.chapters.length) * 100);
});

const chapterProgressPercent = computed(() => {
  if (totalPages.value <= 1) return 100;
  return Math.round(((currentPageIndex.value + 1) / totalPages.value) * 100);
});

// 解析当前章节所有段落与句子
const allChapterParagraphs = computed(() => {
  if (!currentChapter.value || !currentChapter.value.content) return [];
  
  const rawParas = currentChapter.value.content
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);

  let globalIdx = 0;
  return rawParas.map(paraText => {
    const sentencesRaw = paraText.split(/(?<=[。！？!?…；;])/).filter(Boolean);
    const sentences = sentencesRaw.map(st => {
      const item = {
        text: st,
        globalIndex: globalIdx
      };
      globalIdx++;
      return item;
    });
    return {
      sentences: sentences.length > 0 ? sentences : [{ text: paraText, globalIndex: globalIdx++ }]
    };
  });
});

/**
 * ================= 满屏自适应排版分页算法 =================
 * 彻底解决“只显示半页或三分之一”的排版缺陷：
 * 1. 动态获取视口实际高度与宽度，计算精准的行数与每行中文字数。
 * 2. 连续跨段排版，当前页填满前绝不提前切页！
 * 3. 跨页段落平滑接续，使每一页从第一行严谨排布到最后一行！
 */
const pagedData = computed(() => {
  const paras = allChapterParagraphs.value;
  if (!paras.length) return [[]];

  // 移动端视口动态参数
  const vH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vW = typeof window !== 'undefined' ? Math.min(window.innerWidth, 540) : 390;

  // 可用排版高度 (扣减顶部状态栏、底部页码栏以及上下边距)
  const availableH = Math.max(420, vH - 120);
  const availableW = Math.max(260, vW - readerStore.sideMargin * 2);

  const lineH = readerStore.fontSize * readerStore.lineHeight;
  const charsPerLine = Math.max(14, Math.floor(availableW / readerStore.fontSize));
  const linesPerPage = Math.max(16, Math.floor(availableH / lineH));

  // 充满整个屏幕需要的核心中文字数 (约 380~480 字)
  const idealCharsPerPage = Math.floor(linesPerPage * charsPerLine * 0.94);

  const pages = [];
  let currentPage = [];
  let currentChars = 0;

  for (let pIdx = 0; pIdx < paras.length; pIdx++) {
    const para = paras[pIdx];
    let isParaContinuation = false;
    let paraPart = { sentences: [], isContinuation: false };

    for (let sIdx = 0; sIdx < para.sentences.length; sIdx++) {
      const sent = para.sentences[sIdx];
      const sentLength = sent.text.length;

      // 如果当前页还能容纳这句话，或者当前页还没任何内容
      if (currentChars + sentLength <= idealCharsPerPage || currentPage.length === 0) {
        paraPart.sentences.push(sent);
        currentChars += sentLength;
      } else {
        // 当前页已经彻底写满，推入整页！
        if (paraPart.sentences.length > 0) {
          currentPage.push(paraPart);
        }
        pages.push(currentPage);

        // 另起满屏新页
        currentPage = [];
        currentChars = sentLength;
        isParaContinuation = true;
        paraPart = { sentences: [sent], isContinuation: true };
      }
    }

    if (paraPart.sentences.length > 0) {
      currentPage.push(paraPart);
      // 段落末尾适当增加少许虚拟字数代表段间距
      currentChars += Math.floor(charsPerLine * 0.4);
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
});

const totalPages = computed(() => {
  return pagedData.value.length || 1;
});

const currentPageContent = computed(() => {
  return pagedData.value[currentPageIndex.value] || [];
});

const targetPageContent = computed(() => {
  return pagedData.value[targetPageIndex.value] || [];
});

// 仿真翻下一页
function turnNextPage() {
  if (isTurning.value) return;

  if (currentPageIndex.value < totalPages.value - 1) {
    turnDirection.value = 'next';
    targetPageIndex.value = currentPageIndex.value + 1;
    isTurning.value = true;

    setTimeout(() => {
      currentPageIndex.value = targetPageIndex.value;
      isTurning.value = false;
      saveProgress();
    }, 400);
  } else {
    // 最后一页翻向下一章
    if (currentChapterIndex.value < props.book.chapters.length - 1) {
      jumpToChapter(currentChapterIndex.value + 1, 0);
    }
  }
}

// 仿真翻上一页
function turnPrevPage() {
  if (isTurning.value) return;

  if (currentPageIndex.value > 0) {
    turnDirection.value = 'prev';
    targetPageIndex.value = currentPageIndex.value - 1;
    isTurning.value = true;

    setTimeout(() => {
      currentPageIndex.value = targetPageIndex.value;
      isTurning.value = false;
      saveProgress();
    }, 400);
  } else {
    // 第一页翻向上一章
    if (currentChapterIndex.value > 0) {
      jumpToChapter(currentChapterIndex.value - 1, 'last');
    }
  }
}

// 屏幕点击区域划分 (左 30% 上一页，右 30% 下一页，中 40% 呼出掌阅菜单)
function handleViewportClick(e) {
  if (isTurning.value) return;
  const rect = readerViewport.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;

  if (clickX > width * 0.35 && clickX < width * 0.65) {
    readerStore.toggleMenu();
  } else if (clickX <= width * 0.35) {
    turnPrevPage();
  } else {
    turnNextPage();
  }
}

// 移动端手势滑动
function handleTouchStart(e) {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchEnd(e) {
  if (e.changedTouches.length === 1) {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        turnNextPage();
      } else {
        turnPrevPage();
      }
    }
  }
}

// 用户主动点击【听书】按钮
function startListeningExplicitly() {
  // 关键步骤：在用户触摸事件上下文同步解锁手机系统音频权限
  audioPlayerStore.unlockMobileAudio();

  const book = props.book;
  let startSentenceIndex = 0;
  if (currentPageContent.value.length > 0 && currentPageContent.value[0].sentences.length > 0) {
    startSentenceIndex = currentPageContent.value[0].sentences[0].globalIndex;
  }

  audioPlayerStore.loadChapterForListening(book, currentChapterIndex.value, startSentenceIndex);
  audioPlayerStore.playCurrentSentence();
  audioPlayerStore.openPlayerModal();
}

// 听书跨页自动仿真翻页
watch(() => audioPlayerStore.sentenceIndex, (newSentIdx) => {
  if (!isAudioActiveOnThisChapter.value) return;

  const currentSentences = [];
  currentPageContent.value.forEach(p => p.sentences.forEach(s => currentSentences.push(s.globalIndex)));

  if (!currentSentences.includes(newSentIdx)) {
    for (let pIdx = 0; pIdx < pagedData.value.length; pIdx++) {
      const page = pagedData.value[pIdx];
      const pageSentences = [];
      page.forEach(p => p.sentences.forEach(s => pageSentences.push(s.globalIndex)));
      if (pageSentences.includes(newSentIdx)) {
        currentPageIndex.value = pIdx;
        break;
      }
    }
  }
});

function prevChapter() {
  if (currentChapterIndex.value > 0) {
    jumpToChapter(currentChapterIndex.value - 1, 0);
  }
}

function nextChapter() {
  if (currentChapterIndex.value < props.book.chapters.length - 1) {
    jumpToChapter(currentChapterIndex.value + 1, 0);
  }
}

function jumpToChapter(index, page = 0) {
  bookshelfStore.updateProgress(props.book.id, index, 0);
  nextTick(() => {
    if (page === 'last') {
      currentPageIndex.value = Math.max(0, totalPages.value - 1);
    } else {
      currentPageIndex.value = 0;
    }
    saveProgress();

    if (audioPlayerStore.isPlaying && audioPlayerStore.bookId === props.book.id) {
      audioPlayerStore.loadChapterForListening(props.book, index, 0);
      audioPlayerStore.playCurrentSentence();
    }
  });
}

function saveProgress() {
  const percent = totalPages.value > 0 ? ((currentPageIndex.value + 1) / totalPages.value) * 100 : 0;
  bookshelfStore.updateProgress(props.book.id, currentChapterIndex.value, percent);
}

function updateClock() {
  const now = new Date();
  timeString.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

onMounted(() => {
  updateClock();
  timeInterval = setInterval(updateClock, 30000);
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>
