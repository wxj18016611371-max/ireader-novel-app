import { defineStore } from 'pinia';

export const useBookshelfStore = defineStore('bookshelf', {
  state: () => ({
    books: [],
    currentBookId: null,
    viewMode: 'grid', // 'grid' (掌阅九宫格) | 'list' (掌阅列表)
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

      // 如果书架为空，自动从服务端拉取内置样书
      if (!this.books || this.books.length === 0) {
        await this.loadSampleBooks();
      }

      // 读取用户偏好视图
      const savedView = localStorage.getItem('ireader_view_mode');
      if (savedView) {
        this.viewMode = savedView;
      }
    },

    async loadSampleBooks() {
      this.isLoading = true;
      try {
        const res = await fetch('/api/books/samples');
        const data = await res.json();
        if (data.code === 0 && data.data) {
          const now = Date.now();
          this.books = data.data.map((book, idx) => ({
            ...book,
            lastReadTime: now - idx * 3600000,
            currentChapterIndex: 0,
            progressPercent: idx === 0 ? 35 : 0
          }));
          this.persist();
        }
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
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/books/upload', {
          method: 'POST',
          body: formData
        });
        const result = await res.json();
        if (result.code === 0 && result.data) {
          const newBook = {
            ...result.data,
            lastReadTime: Date.now(),
            currentChapterIndex: 0,
            progressPercent: 0
          };
          this.books.unshift(newBook);
          this.persist();
          return { success: true, message: result.message, book: newBook };
        } else {
          return { success: false, message: result.message || '导入失败' };
        }
      } catch (err) {
        return { success: false, message: err.message || '网络或解析异常' };
      } finally {
        this.isLoading = false;
      }
    },

    async importTextContent(title, text) {
      this.isLoading = true;
      try {
        const res = await fetch('/api/books/parse-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, text })
        });
        const result = await res.json();
        if (result.code === 0 && result.data) {
          const newBook = {
            ...result.data,
            lastReadTime: Date.now(),
            currentChapterIndex: 0,
            progressPercent: 0
          };
          this.books.unshift(newBook);
          this.persist();
          return { success: true, message: result.message, book: newBook };
        } else {
          return { success: false, message: result.message || '解析失败' };
        }
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
