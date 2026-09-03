import { defineStore } from 'pinia';
import sampleNovelsData from '../data/sample_novels.json';

// 纯浏览器端正则分章提取算法 (静态 GitHub Pages 模式免后端)
function parseNovelTextLocally(rawText, defaultTitle = '未命名小说') {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let title = defaultTitle;
  let author = '网络文学';
  const headerSection = text.slice(0, 1000);
  
  const titleMatch = headerSection.match(/(?:书名|作品名)[：:]\s*([^\n\r]+)/i);
  if (titleMatch) title = titleMatch[1].trim();

  const authorMatch = headerSection.match(/(?:作者|著)[：:]\s*([^\n\r]+)/i);
  if (authorMatch) author = authorMatch[1].trim();

  const chapterRegex = /(?:^|\n)\s*(第[0-9一二三四五六七八九十百千万]+[章回节卷集部篇]|Chapter\s*[0-9]+|序[言章]|楔子|尾声|后记|番外\s*[0-9一二三四五六七八九十]*)\s*([^\n\r]*)/gi;

  const chapters = [];
  const matches = [];
  let match;

  while ((match = chapterRegex.exec(text)) !== null) {
    matches.push({
      fullTitle: `${match[1]} ${match[2]}`.trim(),
      index: match.index + (match[0].startsWith('\n') ? 1 : 0)
    });
  }

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const start = current.index;
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const fullSection = text.slice(start, end).trim();
      
      const firstLineEnd = fullSection.indexOf('\n');
      let content = '';
      if (firstLineEnd !== -1) {
        content = fullSection.slice(firstLineEnd + 1).trim();
      } else {
        content = fullSection;
      }

      chapters.push({
        id: i + 1,
        title: current.fullTitle,
        content: content || '本章暂无内容'
      });
    }

    if (matches[0].index > 50) {
      const prologue = text.slice(0, matches[0].index).trim();
      if (prologue.length > 20) {
        chapters.unshift({
          id: 0,
          title: '序章 / 前言',
          content: prologue
        });
      }
    }
  } else {
    const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean);
    let currentChapter = { id: 1, title: '第 1 节', content: '' };
    let currentLength = 0;
    let sectionIdx = 1;

    for (const p of paragraphs) {
      currentChapter.content += p + '\n\n';
      currentLength += p.length;

      if (currentLength >= 2200) {
        chapters.push(currentChapter);
        sectionIdx++;
        currentChapter = { id: sectionIdx, title: `第 ${sectionIdx} 节`, content: '' };
        currentLength = 0;
      }
    }

    if (currentChapter.content.trim()) {
      chapters.push(currentChapter);
    }
  }

  if (chapters.length === 0) {
    chapters.push({ id: 1, title: '全文', content: text || '暂无内容' });
  }

  return {
    id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    title,
    author,
    category: '导入书籍',
    coverColor: 'from-emerald-700 to-teal-900',
    intro: chapters[0].content.slice(0, 120).replace(/\s+/g, ' ') + '...',
    chapters
  };
}

export const useBookshelfStore = defineStore('bookshelf', {
  state: () => ({
    books: [],
    currentBookId: null,
    viewMode: 'grid',
    selectedCategory: '全部',
    searchKeyword: '',
    isLoading: false
  }),

  getters: {
    currentBook: (state) => {
      return state.books.find(b => b.id === state.currentBookId) || null;
    },

    categories: (state) => {
      const set = new Set(['全部']);
      state.books.forEach(b => {
        if (b.category) set.add(b.category);
      });
      return Array.from(set);
    },

    filteredBooks: (state) => {
      return state.books.filter(book => {
        const matchesCategory = state.selectedCategory === '全部' || book.category === state.selectedCategory;
        const matchesSearch = !state.searchKeyword || 
          book.title.toLowerCase().includes(state.searchKeyword.toLowerCase()) ||
          (book.author && book.author.toLowerCase().includes(state.searchKeyword.toLowerCase()));
        return matchesCategory && matchesSearch;
      }).sort((a, b) => (b.lastReadTime || 0) - (a.lastReadTime || 0));
    }
  },

  actions: {
    async init() {
      try {
        const saved = localStorage.getItem('ireader_bookshelf');
        if (saved) {
          this.books = JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load bookshelf from local storage', e);
      }

      if (!this.books || this.books.length === 0) {
        await this.loadSampleBooks();
      }

      const savedView = localStorage.getItem('ireader_view_mode');
      if (savedView) {
        this.viewMode = savedView;
      }
    },

    async loadSampleBooks() {
      this.isLoading = true;
      try {
        // 优先拉取服务端，若处于纯前端 GitHub Pages 静态模式则降级直接加载本地数据
        let sampleList = null;
        try {
          const res = await fetch('/api/books/samples');
          if (res.ok) {
            const data = await res.json();
            if (data.code === 0 && data.data) sampleList = data.data;
          }
        } catch (e) {}

        if (!sampleList) {
          sampleList = sampleNovelsData;
        }

        const now = Date.now();
        this.books = sampleList.map((book, idx) => ({
          ...book,
          lastReadTime: now - idx * 3600000,
          currentChapterIndex: 0,
          progressPercent: idx === 0 ? 35 : 0
        }));
        this.persist();
      } catch (err) {
        console.error('Failed to fetch sample novels', err);
      } finally {
        this.isLoading = false;
      }
    },

    persist() {
      try {
        localStorage.setItem('ireader_bookshelf', JSON.stringify(this.books));
      } catch (e) {
        console.error('Failed to save to local storage', e);
      }
    },

    setViewMode(mode) {
      this.viewMode = mode;
      localStorage.setItem('ireader_view_mode', mode);
    },

    openBook(bookId) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        book.lastReadTime = Date.now();
        this.currentBookId = bookId;
        this.persist();
      }
    },

    closeBook() {
      this.currentBookId = null;
    },

    updateProgress(bookId, chapterIndex, percent = 0) {
      const book = this.books.find(b => b.id === bookId);
      if (book) {
        book.currentChapterIndex = chapterIndex;
        book.progressPercent = Math.min(100, Math.max(0, Math.round(percent)));
        book.lastReadTime = Date.now();
        this.persist();
      }
    },

    async importBookFile(file) {
      this.isLoading = true;
      try {
        // 先尝试服务端接口
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/books/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const result = await res.json();
            if (result.code === 0 && result.data) {
              const newBook = { ...result.data, lastReadTime: Date.now(), currentChapterIndex: 0, progressPercent: 0 };
              this.books.unshift(newBook);
              this.persist();
              return { success: true, message: result.message, book: newBook };
            }
          }
        } catch (e) {}

        // 服务端不可达时（纯静态 GitHub Pages 模式），纯前端本地解码与分章
        const arrayBuffer = await file.arrayBuffer();
        let decodedText = '';
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          decodedText = utf8Decoder.decode(arrayBuffer);
        } catch (err) {
          // UTF-8 解码失败，尝试 GB18030 (兼容 GBK, GB2312)
          try {
            const gbkDecoder = new TextDecoder('gb18030');
            decodedText = gbkDecoder.decode(arrayBuffer);
          } catch (e2) {
            decodedText = new TextDecoder('utf-8').decode(arrayBuffer);
          }
        }

        const bookTitle = file.name.replace(/\.(txt|epub)$/i, '');
        const parsedBook = parseNovelTextLocally(decodedText, bookTitle);
        const newBook = { ...parsedBook, lastReadTime: Date.now(), currentChapterIndex: 0, progressPercent: 0 };
        this.books.unshift(newBook);
        this.persist();
        return { success: true, message: `成功导入《${newBook.title}》，共 ${newBook.chapters.length} 章`, book: newBook };
      } catch (err) {
        return { success: false, message: err.message || '文件解析异常' };
      } finally {
        this.isLoading = false;
      }
    },

    async importTextContent(title, text) {
      this.isLoading = true;
      try {
        try {
          const res = await fetch('/api/books/parse-text', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, text })
          });
          if (res.ok) {
            const result = await res.json();
            if (result.code === 0 && result.data) {
              const newBook = { ...result.data, lastReadTime: Date.now(), currentChapterIndex: 0, progressPercent: 0 };
              this.books.unshift(newBook);
              this.persist();
              return { success: true, message: result.message, book: newBook };
            }
          }
        } catch (e) {}

        // 前端纯本地解析
        const parsedBook = parseNovelTextLocally(text, title || '网络导入小说');
        const newBook = { ...parsedBook, lastReadTime: Date.now(), currentChapterIndex: 0, progressPercent: 0 };
        this.books.unshift(newBook);
        this.persist();
        return { success: true, message: `成功导入《${newBook.title}》，共 ${newBook.chapters.length} 章`, book: newBook };
      } catch (err) {
        return { success: false, message: err.message || '异常' };
      } finally {
        this.isLoading = false;
      }
    },

    removeBook(bookId) {
      const idx = this.books.findIndex(b => b.id === bookId);
      if (idx !== -1) {
        this.books.splice(idx, 1);
        if (this.currentBookId === bookId) {
          this.currentBookId = null;
        }
        this.persist();
      }
    }
  }
});
