<template>
  <div 
    class="relative w-full h-full flex flex-col overflow-hidden select-none transition-colors duration-300 perspective-container"
    :class="[readerStore.themeClass, readerStore.theme === 'parchment' ? 'bg-parchment-pattern' : '']"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 书脊仿真阴影 (实体书左侧阴影) -->
    <div class="absolute left-0 top-0 bottom-0 w-8 book-spine-shadow z-20 pointer-events-none"></div>

    <!-- 顶部极简状态信息 (仿掌阅) -->
    <div class="h-8 px-6 flex items-center justify-between text-[11px] opacity-60 shrink-0 pointer-events-none z-10">
      <span class="truncate max-w-[180px] font-medium">{{ book.title }}</span>
      <span class="truncate max-w-[180px] text-right">{{ currentChapter?.title }}</span>
    </div>

    <!-- ================= 掌阅 3D 仿真翻页视口 ================= -->
    <div 
      ref="readerViewport"
      class="flex-1 relative overflow-hidden flex flex-col justify-between px-6 py-2 cursor-pointer"
      :style="{
        fontSize: `${readerStore.fontSize}px`,
        lineHeight: readerStore.lineHeight,
        fontFamily: readerStore.fontFamilyStyle,
        paddingLeft: `${readerStore.sideMargin}px`,
        paddingRight: `${readerStore.sideMargin}px`
      }"
      @click="handleViewportClick"
    >
      <!-- 底层页 (翻页时显露的目标页) -->
      <div 
        v-if="isTurning"
        class="absolute inset-0 px-6 py-2 flex flex-col justify-between pointer-events-none z-0"
        :class="[readerStore.themeClass, readerStore.theme === 'parchment' ? 'bg-parchment-pattern' : '']"
        :style="{
          fontSize: `${readerStore.fontSize}px`,
          lineHeight: readerStore.lineHeight,
          fontFamily: readerStore.fontFamilyStyle,
          paddingLeft: `${readerStore.sideMargin}px`,
          paddingRight: `${readerStore.sideMargin}px`
        }"
      >
        <div>
          <h2 v-if="targetPageIndex === 0" class="text-lg font-bold mb-4 opacity-90 border-b pb-2 border-current/15">
            {{ currentChapter?.title }}
          </h2>
          <div class="space-y-3.5">
            <p 
              v-for="(para, pIdx) in targetPageContent" 
              :key="'target-' + pIdx" 
              class="indent-8 leading-relaxed tracking-normal"
            >
              <span v-for="sent in para.sentences" :key="'target-s-' + sent.globalIndex">
                {{ sent.text }}
              </span>
            </p>
          </div>
        </div>
        <!-- 底层页码 -->
        <div class="h-6 flex items-center justify-between text-[10px] opacity-50 pb-1">
          <span>{{ currentChapter?.title }}</span>
          <span>第 {{ targetPageIndex + 1 }} / {{ totalPages }} 页</span>
        </div>
      </div>

      <!-- 当前页 (主阅读页或正在掀起翻动的纸页) -->
      <div 
        class="relative w-full h-full flex flex-col justify-between z-10 page-sheet"
        :class="[
          isTurning && turnDirection === 'next' ? 'anim-curl-next' : '',
          isTurning && turnDirection === 'prev' ? 'anim-curl-prev' : ''
        ]"
      >
        <!-- 正文内容区 -->
        <div class="overflow-hidden flex-1">
          <!-- 仅在第一页顶部显示章节大标题 -->
          <h1 
            v-if="currentPageIndex === 0" 
            class="text-lg font-bold mb-4 pt-1 tracking-wide opacity-90 border-b pb-2 border-current/15"
          >
            {{ currentChapter?.title }}
          </h1>

          <!-- 正文段落与句子 -->
          <div class="space-y-3.5">
            <p 
              v-for="(para, pIdx) in currentPageContent" 
              :key="'curr-' + pIdx" 
              class="indent-8 leading-relaxed tracking-normal"
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
        <div class="h-6 flex items-center justify-between text-[10px] opacity-50 shrink-0 pt-2 border-t border-current/5">
          <span>本章进度 {{ chapterProgressPercent }}%</span>
          <span>第 {{ currentPageIndex + 1 }} / {{ totalPages }} 页</span>
        </div>

        <!-- 翻页时伴随的圆柱立体纸张反光层 -->
        <div v-if="isTurning" class="absolute inset-0 page-curl-sheen z-20"></div>
      </div>
    </div>

    <!-- 底部极简阅读进度条 (时间 & 电量/总进度) -->
    <div class="h-7 px-6 flex items-center justify-between text-[10px] opacity-50 shrink-0 pointer-events-none border-t border-current/5 z-10">
      <span>{{ timeString }}</span>
      <span>全书已读 {{ totalBookPercent }}%</span>
    </div>

    <!-- ================= 用户专属【听书按钮】 (按用户要求显式触发) ================= -->
    <!-- 当尚未开启听书时，在页面右下方常驻一个优雅的掌阅/番茄风【听书】悬浮胶囊 -->
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

// 计算当前是否正在听这本小说以及这一章
const isAudioActiveOnThisChapter = computed(() => {
  return audioPlayerStore.isPlaying && 
         audioPlayerStore.bookId === props.book.id && 
         audioPlayerStore.chapterIndex === currentChapterIndex.value;
});

// 全书进度百分比
const totalBookPercent = computed(() => {
  if (!props.book.chapters.length) return 0;
  return Math.round(((currentChapterIndex.value + 1) / props.book.chapters.length) * 100);
});

// 本章进度百分比
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

// 动态分页算法：根据字体大小和段落长度自适应拆分为离散书页
const pagedData = computed(() => {
  const paras = allChapterParagraphs.value;
  if (!paras.length) return [[]];

  // 根据字号预估每页容纳字数 (例如 18px 约 360 字，24px 约 240 字)
  const charsPerPage = Math.max(180, Math.floor(6500 / (readerStore.fontSize * readerStore.lineHeight)));
  
  const pages = [];
  let currentPage = [];
  let currentLength = 0;

  for (let p of paras) {
    const pLength = p.sentences.reduce((acc, s) => acc + s.text.length, 0);
    if (currentLength + pLength > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [p];
      currentLength = pLength;
    } else {
      currentPage.push(p);
      currentLength += pLength;
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
    }, 420);
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
    }, 420);
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

// 移动端手势滑动仿真翻页
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

    // 水平滑动手势判定 (防止上下误触)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        turnNextPage(); // 向左滑 -> 翻下一页
      } else {
        turnPrevPage(); // 向右滑 -> 翻上一页
      }
    }
  }
}

// ================= 用户专属听书逻辑 =================
// 仅当用户主动点击【听书】按钮时，才开启在线听书
function startListeningExplicitly() {
  const book = props.book;
  // 获取当前页的第一句话对应的 globalIndex，以便从当前视口第一行朗读
  let startSentenceIndex = 0;
  if (currentPageContent.value.length > 0 && currentPageContent.value[0].sentences.length > 0) {
    startSentenceIndex = currentPageContent.value[0].sentences[0].globalIndex;
  }

  audioPlayerStore.loadChapterForListening(book, currentChapterIndex.value, startSentenceIndex);
  audioPlayerStore.playCurrentSentence();
  audioPlayerStore.openPlayerModal();
}

// 听书自动跨页：当正在朗读的句子超出当前页时，自动触发仿真翻页同步！
watch(() => audioPlayerStore.sentenceIndex, (newSentIdx) => {
  if (!isAudioActiveOnThisChapter.value) return;

  // 检查 newSentIdx 是否在当前页内
  const currentSentences = [];
  currentPageContent.value.forEach(p => p.sentences.forEach(s => currentSentences.push(s.globalIndex)));

  if (!currentSentences.includes(newSentIdx)) {
    // 寻找包含该句子的页码
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

    // 如果听书正在进行中，同步切章听书
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
