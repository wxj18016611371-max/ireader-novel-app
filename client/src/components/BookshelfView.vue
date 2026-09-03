<template>
  <div class="flex flex-col h-full bg-[#16181F] text-slate-100 overflow-hidden select-none">
    <!-- 顶部状态与导航栏 -->
    <header class="px-4 pt-3 pb-2 bg-[#1A1C24] border-b border-slate-800/80 shrink-0">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-red-500 flex items-center justify-center font-bold text-white shadow-md shadow-amber-500/20">
            阅
          </div>
          <div>
            <h1 class="text-lg font-bold text-slate-50 tracking-wide">掌阅 iReader</h1>
            <p class="text-[10px] text-slate-400">番茄在线听书增强版</p>
          </div>
        </div>

        <!-- 右侧操作区：视图切换 + 导入按钮 -->
        <div class="flex items-center space-x-2">
          <!-- 切换宫格/列表 -->
          <button 
            @click="bookshelfStore.setViewMode(bookshelfStore.viewMode === 'grid' ? 'list' : 'grid')"
            class="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            :title="bookshelfStore.viewMode === 'grid' ? '切换为列表视图' : '切换为九宫格视图'"
          >
            <component :is="bookshelfStore.viewMode === 'grid' ? LayoutList : LayoutGrid" class="w-4 h-4" />
          </button>

          <!-- 导入小说弹窗开关 -->
          <button 
            @click="showImportModal = true"
            class="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>导入小说</span>
          </button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="relative">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          v-model="bookshelfStore.searchKeyword"
          type="text" 
          placeholder="搜索书架上的小说、作者..."
          class="w-full pl-9 pr-4 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button 
          v-if="bookshelfStore.searchKeyword"
          @click="bookshelfStore.searchKeyword = ''"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- 分类标签栏 -->
      <div class="flex items-center space-x-2 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
        <button 
          v-for="cat in bookshelfStore.categories" 
          :key="cat"
          @click="bookshelfStore.selectedCategory = cat"
          class="px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all"
          :class="bookshelfStore.selectedCategory === cat 
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 font-medium' 
            : 'bg-slate-800/40 text-slate-400 hover:text-slate-200 border border-transparent'"
        >
          {{ cat }}
        </button>
      </div>
    </header>

    <!-- 书架主体内容区 -->
    <main class="flex-1 overflow-y-auto p-4">
      <!-- 空状态提示 -->
      <div v-if="bookshelfStore.filteredBooks.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6">
        <div class="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
          <BookOpen class="w-8 h-8" />
        </div>
        <p class="text-sm text-slate-300 font-medium">书架空空如也</p>
        <p class="text-xs text-slate-500 mt-1 max-w-xs">您可以导入本地 TXT 小说，或者重置加载精选试读小说</p>
        <div class="flex items-center space-x-3 mt-4">
          <button 
            @click="showImportModal = true"
            class="px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
          >
            导入本地书籍
          </button>
          <button 
            @click="bookshelfStore.loadSampleBooks()"
            class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
          >
            加载内置样书
          </button>
        </div>
      </div>

      <!-- 掌阅经典【九宫格书脊视图】 -->
      <div v-else-if="bookshelfStore.viewMode === 'grid'" class="grid grid-cols-3 gap-3.5 pb-20">
        <div 
          v-for="book in bookshelfStore.filteredBooks" 
          :key="book.id"
          @click="openBook(book)"
          class="group flex flex-col cursor-pointer transition-transform duration-200 active:scale-95"
        >
          <!-- 书籍封面立体卡片 -->
          <div 
            class="relative aspect-[3/4.2] rounded-lg shadow-lg overflow-hidden border border-white/10 flex flex-col justify-between p-2.5 transition-all group-hover:shadow-amber-500/10 group-hover:border-amber-500/40"
            :class="[book.coverColor ? `bg-gradient-to-br ${book.coverColor}` : 'bg-gradient-to-br from-amber-700 to-slate-900']"
          >
            <!-- 书脊左侧高光暗影效果 (仿实体书) -->
            <div class="absolute left-0 top-0 bottom-0 w-2.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent pointer-events-none"></div>

            <!-- 顶部角标：分类与阅读百分比 -->
            <div class="flex items-center justify-between z-10">
              <span class="text-[9px] px-1.5 py-0.5 rounded bg-black/40 text-amber-200 font-mono">
                {{ book.progressPercent ? `${book.progressPercent}%` : '未读' }}
              </span>
              <span class="text-[9px] text-white/70 truncate max-w-[55px]">
                {{ book.category || '小说' }}
              </span>
            </div>

            <!-- 封面书名与作者 -->
            <div class="z-10 mt-auto">
              <h3 class="text-xs font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                {{ book.title }}
              </h3>
              <p class="text-[10px] text-white/75 mt-0.5 truncate drop-shadow">
                {{ book.author || '佚名' }}
              </p>
            </div>
          </div>

          <!-- 下方书名简述 -->
          <div class="mt-1.5 px-0.5">
            <p class="text-xs text-slate-200 font-medium truncate group-hover:text-amber-400 transition-colors">
              {{ book.title }}
            </p>
            <p class="text-[10px] text-slate-400 truncate">
              {{ book.chapters[book.currentChapterIndex || 0]?.title || '未开始' }}
            </p>
          </div>
        </div>

        <!-- 九宫格末尾：极简添加卡片 -->
        <div 
          @click="showImportModal = true"
          class="aspect-[3/4.2] rounded-lg border-2 border-dashed border-slate-700/80 hover:border-amber-500/60 bg-slate-800/20 hover:bg-slate-800/40 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 group"
        >
          <div class="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-amber-400 group-hover:scale-110 transition-all">
            <Plus class="w-5 h-5" />
          </div>
          <span class="text-xs text-slate-400 group-hover:text-slate-200 mt-2 font-medium">导入新书</span>
        </div>
      </div>

      <!-- 掌阅经典【列表视图】 -->
      <div v-else class="space-y-2.5 pb-20">
        <div 
          v-for="book in bookshelfStore.filteredBooks" 
          :key="book.id"
          @click="openBook(book)"
          class="flex items-center p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all active:scale-[0.99]"
        >
          <!-- 左侧微缩封面 -->
          <div 
            class="relative w-14 h-[72px] rounded-md overflow-hidden shrink-0 shadow-md flex flex-col justify-end p-1.5"
            :class="[book.coverColor ? `bg-gradient-to-br ${book.coverColor}` : 'bg-gradient-to-br from-amber-700 to-slate-900']"
          >
            <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-black/40 via-white/10 to-transparent"></div>
            <p class="text-[9px] font-bold text-white truncate z-10 leading-tight">{{ book.title }}</p>
          </div>

          <!-- 右侧详情 -->
          <div class="ml-3 flex-1 min-w-0">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-100 truncate">{{ book.title }}</h3>
              <span class="text-[10px] text-amber-400 font-mono ml-2 shrink-0">
                {{ book.progressPercent ? `已读 ${book.progressPercent}%` : '未读' }}
              </span>
            </div>
            
            <p class="text-xs text-slate-400 mt-0.5 truncate">
              作者：{{ book.author || '未知' }} · {{ book.category || '通俗文学' }}
            </p>

            <div class="flex items-center justify-between mt-2">
              <span class="text-[11px] text-slate-400 truncate max-w-[180px]">
                读至：{{ book.chapters[book.currentChapterIndex || 0]?.title || '第 1 章' }}
              </span>
              <button 
                @click.stop="bookshelfStore.removeBook(book.id)"
                class="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                title="从书架移除"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 导入小说模态弹窗 -->
    <div 
      v-if="showImportModal" 
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div class="w-full max-w-md bg-[#1F222E] rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- 弹窗标题 -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
          <div class="flex items-center space-x-2">
            <BookPlus class="w-5 h-5 text-amber-500" />
            <h2 class="text-sm font-bold text-slate-100">导入小说到书架</h2>
          </div>
          <button @click="showImportModal = false" class="text-slate-400 hover:text-slate-200">
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 导入模式 Tab -->
        <div class="flex border-b border-slate-800 px-5 pt-2">
          <button 
            @click="importTab = 'file'"
            class="pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors"
            :class="importTab === 'file' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
          >
            本地 TXT 文件导入
          </button>
          <button 
            @click="importTab = 'text'"
            class="pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors"
            :class="importTab === 'text' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
          >
            快速文本粘贴
          </button>
        </div>

        <!-- 弹窗内容主体 -->
        <div class="p-5 overflow-y-auto flex-1">
          <!-- 文件上传区 -->
          <div v-if="importTab === 'file'">
            <div 
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
              class="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors"
              :class="isDragging ? 'border-amber-500 bg-amber-500/10' : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'"
              @click="$refs.fileInput.click()"
            >
              <input 
                ref="fileInput" 
                type="file" 
                accept=".txt,.epub" 
                class="hidden" 
                @change="handleFileSelect"
              />
              <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 mb-3">
                <UploadCloud class="w-6 h-6" />
              </div>
              <p class="text-sm font-medium text-slate-200">点击选择或将 TXT 文件拖拽到此处</p>
              <p class="text-xs text-slate-400 mt-1">支持 UTF-8、GBK、GB2312 编码小说，智能章节正则提取</p>
            </div>

            <!-- 特性说明 -->
            <div class="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-800 text-xs text-slate-400 space-y-1.5">
              <p class="flex items-center text-slate-300 font-medium">
                <Check class="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> 自动探测中文内码，杜绝繁乱乱码
              </p>
              <p class="flex items-center text-slate-300 font-medium">
                <Check class="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> 自动匹配《第X章》、《Chapter》生成全本目录
              </p>
              <p class="flex items-center text-slate-300 font-medium">
                <Check class="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> 本地持久化缓存，无需联网重新上传
              </p>
            </div>
          </div>

          <!-- 文本快速粘贴区 -->
          <div v-else class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">小说书名</label>
              <input 
                v-model="pasteTitle" 
                type="text" 
                placeholder="例如：万界修仙传" 
                class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">章节内容 (含标题及正文)</label>
              <textarea 
                v-model="pasteContent" 
                rows="8" 
                placeholder="在此粘贴小说文本内容，支持“第一章 ...”等目录自动分节..." 
                class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none font-mono"
              ></textarea>
            </div>
            <button 
              @click="handlePasteSubmit" 
              :disabled="!pasteContent.trim() || isSubmitting"
              class="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-xs shadow-md disabled:opacity-50 transition-all"
            >
              {{ isSubmitting ? '正在解析章节...' : '确认导入书架' }}
            </button>
          </div>
        </div>

        <!-- 导入中状态条 -->
        <div v-if="bookshelfStore.isLoading" class="p-3 bg-amber-500/10 border-t border-amber-500/30 flex items-center justify-center space-x-2 text-xs text-amber-300">
          <Loader2 class="w-4 h-4 animate-spin" />
          <span>正在解码并智能提取小说章节，请稍候...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { 
  LayoutGrid, 
  LayoutList, 
  Plus, 
  Search, 
  X, 
  BookOpen, 
  Trash2, 
  BookPlus, 
  UploadCloud, 
  Check, 
  Loader2 
} from 'lucide-vue-next';
import { useBookshelfStore } from '../stores/bookshelf';

const bookshelfStore = useBookshelfStore();

const showImportModal = ref(false);
const importTab = ref('file'); // 'file' | 'text'
const isDragging = ref(false);
const pasteTitle = ref('');
const pasteContent = ref('');
const isSubmitting = ref(false);

function openBook(book) {
  bookshelfStore.openBook(book.id);
}

async function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  await processFile(file);
}

async function handleFileDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer.files?.[0];
  if (!file) return;
  await processFile(file);
}

async function processFile(file) {
  const res = await bookshelfStore.importBookFile(file);
  if (res.success) {
    showImportModal.value = false;
    alert(res.message);
  } else {
    alert('导入失败：' + res.message);
  }
}

async function handlePasteSubmit() {
  if (!pasteContent.value.trim()) return;
  isSubmitting.value = true;
  const res = await bookshelfStore.importTextContent(pasteTitle.value || '粘贴录入小说', pasteContent.value);
  isSubmitting.value = false;
  if (res.success) {
    showImportModal.value = false;
    pasteContent.value = '';
    pasteTitle.value = '';
    alert(res.message);
  } else {
    alert('导入失败：' + res.message);
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
