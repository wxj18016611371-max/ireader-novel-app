import { defineStore } from 'pinia';
import { useBookshelfStore } from './bookshelf';

export const useAudioPlayerStore = defineStore('audioPlayer', {
  state: () => ({
    isPlaying: false,
    isLoading: false,
    currentVoiceId: 'zh-CN-YunxiNeural',
    voices: [],
    playbackRate: 1.0,
    
    // 定时关闭
    sleepTimerMinutes: 0, // 0 表示关闭, 15, 30, 45, 60, 或 'chapter'
    sleepRemainingSeconds: 0,
    timerIntervalId: null,

    // 当前播放的书籍与章节
    bookId: null,
    chapterIndex: 0,
    sentenceIndex: 0,
    sentences: [],
    
    // 音频播放器实例
    audio: null,
    audioDuration: 0,
    audioCurrentTime: 0,

    // UI 状态
    isPlayerModalOpen: false,
    isVoiceModalOpen: false,
    isTimerModalOpen: false,
    
    // 悬浮听书胶囊位置 (支持拖拽)
    capsulePosition: { x: null, y: null }
  }),

  getters: {
    currentVoice: (state) => {
      return state.voices.find(v => v.id === state.currentVoiceId) || {
        id: 'zh-CN-YunxiNeural',
        name: '云希',
        tag: '精品男声 · 番茄男频招牌'
      };
    },

    currentSentenceText: (state) => {
      if (state.sentences && state.sentences[state.sentenceIndex]) {
        return state.sentences[state.sentenceIndex];
      }
      return '';
    },

    progressPercent: (state) => {
      if (!state.sentences.length) return 0;
      return Math.round(((state.sentenceIndex + 1) / state.sentences.length) * 100);
    }
  },

  actions: {
    async init() {
      // 创建专用音频对象
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.preload = 'auto';

        this.audio.addEventListener('play', () => {
          this.isPlaying = true;
          this.isLoading = false;
        });

        this.audio.addEventListener('pause', () => {
          this.isPlaying = false;
        });

        this.audio.addEventListener('ended', () => {
          this.handleSentenceEnded();
        });

        this.audio.addEventListener('timeupdate', () => {
          this.audioCurrentTime = this.audio.currentTime;
          this.audioDuration = this.audio.duration || 0;
        });

        this.audio.addEventListener('error', (e) => {
          console.error('Audio playback error', e);
          this.isLoading = false;
          this.isPlaying = false;
        });
      }

      // 拉取番茄小说特色发音人列表
      try {
        const res = await fetch('/api/tts/voices');
        const data = await res.json();
        if (data.code === 0 && data.data) {
          this.voices = data.data;
        }
      } catch (err) {
        console.error('Failed to load TTS voices', err);
      }

      // 读取保存的偏好
      try {
        const savedVoice = localStorage.getItem('ireader_tts_voice');
        if (savedVoice) this.currentVoiceId = savedVoice;
        const savedRate = localStorage.getItem('ireader_tts_rate');
        if (savedRate) this.playbackRate = parseFloat(savedRate);
      } catch (e) {}
    },

    /**
     * 将章节长文本按标点符号分割为自然句子/语段
     */
    splitChapterToSentences(content) {
      if (!content) return [];
      // 按照换行以及。！？…；等标点分割成朗读语段，保留原标点
      const rawSentences = content
        .replace(/\r\n/g, '\n')
        .split(/(?<=[。！？!?…\n;；])/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      // 如果某一段过短（如单个标点或对话引号），尝试与前一句合并；如果某一句过长（超150字），进一步按逗号分句
      const refined = [];
      for (let s of rawSentences) {
        if (refined.length > 0 && s.length <= 2 && !/[一-龥a-zA-Z0-9]/.test(s)) {
          refined[refined.length - 1] += s;
        } else if (s.length > 180) {
          const subParts = s.split(/(?<=[，,])/).map(p => p.trim()).filter(Boolean);
          refined.push(...subParts);
        } else {
          refined.push(s);
        }
      }
      return refined.length > 0 ? refined : ['暂无朗读内容'];
    },

    /**
     * 载入章节并开始准备听书
     */
    loadChapterForListening(book, chapterIndex, startSentenceIndex = 0) {
      this.bookId = book.id;
      this.chapterIndex = chapterIndex;
      const chapter = book.chapters[chapterIndex];
      if (!chapter) return;

      this.sentences = this.splitChapterToSentences(chapter.content);
      this.sentenceIndex = Math.min(startSentenceIndex, Math.max(0, this.sentences.length - 1));
    },

    /**
     * 开始播放指定句子（纯在线流式合成）
     */
    async playCurrentSentence() {
      if (!this.sentences || this.sentences.length === 0) return;
      if (this.sentenceIndex >= this.sentences.length) {
        this.nextChapter();
        return;
      }

      const text = this.sentences[this.sentenceIndex];
      if (!text || !text.trim()) {
        this.sentenceIndex++;
        this.playCurrentSentence();
        return;
      }

      this.isLoading = true;
      if (this.audio) {
        this.audio.pause();
      }

      // 请求服务端的纯在线神经网络音频流
      const encodedText = encodeURIComponent(text);
      const url = `/api/tts/audio?text=${encodedText}&voice=${this.currentVoiceId}&rate=${this.playbackRate}`;

      this.audio.src = url;
      this.audio.playbackRate = this.playbackRate;

      try {
        await this.audio.play();
        this.isPlaying = true;
        this.isLoading = false;

        // 同步通知书架保存当前阅读进度
        const bookshelfStore = useBookshelfStore();
        if (this.bookId) {
          const percent = ((this.sentenceIndex + 1) / this.sentences.length) * 100;
          bookshelfStore.updateProgress(this.bookId, this.chapterIndex, percent);
        }
      } catch (err) {
        console.warn('Audio play request interrupted or blocked', err);
        this.isLoading = false;
      }
    },

    /**
     * 暂停或继续播放
     */
    togglePlay() {
      if (this.isPlaying) {
        if (this.audio) this.audio.pause();
        this.isPlaying = false;
      } else {
        if (this.audio && this.audio.src && !this.audio.ended) {
          this.audio.play().catch(() => this.playCurrentSentence());
        } else {
          this.playCurrentSentence();
        }
      }
    },

    /**
     * 单句播完后的回调：自动连播下一句或下一章
     */
    handleSentenceEnded() {
      // 检查“本章播完停止”定时器
      if (this.sleepTimerMinutes === 'chapter' && this.sentenceIndex >= this.sentences.length - 1) {
        this.isPlaying = false;
        this.sleepTimerMinutes = 0;
        return;
      }

      if (this.sentenceIndex < this.sentences.length - 1) {
        this.sentenceIndex++;
        this.playCurrentSentence();
      } else {
        // 本章播完，自动切换并播放下一章
        this.nextChapter();
      }
    },

    /**
     * 点句即读：在阅读器中点击任意句子，立即跳转并从该句开始朗读
     */
    jumpToSentence(index) {
      if (index >= 0 && index < this.sentences.length) {
        this.sentenceIndex = index;
        this.playCurrentSentence();
      }
    },

    /**
     * 上一句 / 下一句
     */
    prevSentence() {
      if (this.sentenceIndex > 0) {
        this.sentenceIndex--;
        this.playCurrentSentence();
      }
    },

    nextSentence() {
      if (this.sentenceIndex < this.sentences.length - 1) {
        this.sentenceIndex++;
        this.playCurrentSentence();
      } else {
        this.nextChapter();
      }
    },

    /**
     * 快进 15 秒 / 快退 15 秒
     */
    seekTime(seconds) {
      if (this.audio && this.audio.duration) {
        let newTime = this.audio.currentTime + seconds;
        if (newTime < 0) {
          this.prevSentence();
        } else if (newTime >= this.audio.duration) {
          this.nextSentence();
        } else {
          this.audio.currentTime = newTime;
        }
      } else {
        if (seconds > 0) this.nextSentence();
        else this.prevSentence();
      }
    },

    /**
     * 切换发音人 (番茄小说特色声音切换)
     */
    setVoice(voiceId) {
      this.currentVoiceId = voiceId;
      localStorage.setItem('ireader_tts_voice', voiceId);
      if (this.isPlaying) {
        this.playCurrentSentence();
      }
    },

    /**
     * 调节倍速
     */
    setPlaybackRate(rate) {
      this.playbackRate = rate;
      localStorage.setItem('ireader_tts_rate', rate.toString());
      if (this.audio) {
        this.audio.playbackRate = rate;
      }
      if (this.isPlaying) {
        // 重载以应用服务端 rate 优化合成（微软神经声音在服务端调整音调更自然）
        this.playCurrentSentence();
      }
    },

    /**
     * 切换上一章 / 下一章
     */
    prevChapter() {
      const bookshelfStore = useBookshelfStore();
      const book = bookshelfStore.currentBook;
      if (!book) return;

      if (this.chapterIndex > 0) {
        this.chapterIndex--;
        this.loadChapterForListening(book, this.chapterIndex, 0);
        this.playCurrentSentence();
      }
    },

    nextChapter() {
      const bookshelfStore = useBookshelfStore();
      const book = bookshelfStore.currentBook;
      if (!book) return;

      if (this.chapterIndex < book.chapters.length - 1) {
        this.chapterIndex++;
        this.loadChapterForListening(book, this.chapterIndex, 0);
        this.playCurrentSentence();
      } else {
        this.isPlaying = false;
        console.log('本书已播完');
      }
    },

    /**
     * 启动睡眠倒计时
     */
    setSleepTimer(minutes) {
      this.sleepTimerMinutes = minutes;
      if (this.timerIntervalId) {
        clearInterval(this.timerIntervalId);
        this.timerIntervalId = null;
      }

      if (minutes === 0 || minutes === 'chapter') {
        this.sleepRemainingSeconds = 0;
        return;
      }

      this.sleepRemainingSeconds = minutes * 60;
      this.timerIntervalId = setInterval(() => {
        if (this.sleepRemainingSeconds > 0) {
          this.sleepRemainingSeconds--;
        } else {
          // 时间到，暂停播放并清除定时器
          clearInterval(this.timerIntervalId);
          this.timerIntervalId = null;
          this.sleepTimerMinutes = 0;
          this.togglePlay();
        }
      }, 1000);
    },

    openPlayerModal() {
      this.isPlayerModalOpen = true;
    },

    closePlayerModal() {
      this.isPlayerModalOpen = false;
    }
  }
});
