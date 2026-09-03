import { defineStore } from 'pinia';
import { useBookshelfStore } from './bookshelf';

// 预设番茄小说 8 大 AI 纯在线特色发音人矩阵
const DEFAULT_TOMATO_VOICES = [
  {
    id: 'zh-CN-YunxiNeural',
    name: '云希',
    gender: '男',
    tag: '精品男声 · 番茄男频招牌',
    desc: '热血玄幻、都市爽文第一主播，语调高昂饱满，极富代入感',
    avatarBg: 'bg-amber-600',
    demoText: '三十年河东，三十年河西，莫欺少年穷！'
  },
  {
    id: 'zh-CN-YunjianNeural',
    name: '云健',
    gender: '男',
    tag: '热血评书 · 影视解说',
    desc: '嗓音苍劲有力，自带评书张力，适合悬疑、盗墓、历史大戏',
    avatarBg: 'bg-red-700',
    demoText: '欲知后事如何，且听下回分解！'
  },
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: '晓晓',
    gender: '女',
    tag: '精品女声 · 番茄女频招牌',
    desc: '清脆甜美、温暖亲和，言情都市、穿越古言绝佳选择',
    avatarBg: 'bg-pink-600',
    demoText: '庭前花开花落，这一世，我绝不负你。'
  },
  {
    id: 'zh-CN-XiaoyiNeural',
    name: '晓伊',
    gender: '女',
    tag: '温柔姐姐 · 情感电台',
    desc: '知性从容、声线柔和治愈，适合夜间聆听、情感微澜',
    avatarBg: 'bg-purple-600',
    demoText: '夜深了，愿这段故事陪你安然入梦。'
  },
  {
    id: 'zh-CN-YunyangNeural',
    name: '云扬',
    gender: '男',
    tag: '沉稳大叔 · 严肃历史',
    desc: '成熟磁性、播音主持腔调，适合硬核军事、权谋战争',
    avatarBg: 'bg-slate-700',
    demoText: '滚滚长江东逝水，浪花淘尽英雄。'
  },
  {
    id: 'zh-CN-YunxiaNeural',
    name: '云夏',
    gender: '男',
    tag: '阳光少年 · 青春校园',
    desc: '少年感十足、清澈透亮，适合青春校园与修真萌新',
    avatarBg: 'bg-emerald-600',
    demoText: '风起于青萍之末，少年当扶摇直上九万里！'
  },
  {
    id: 'zh-CN-liaoning-XiaobeiNeural',
    name: '晓北',
    gender: '女',
    tag: '东北老铁 · 幽默风趣',
    desc: '浓郁东北方言风味，自带笑点，适合爆笑种田与打脸爽文',
    avatarBg: 'bg-orange-600',
    demoText: '哎呀妈呀，这剧情也太带劲儿了吧！'
  },
  {
    id: 'zh-CN-shaanxi-XiaoniNeural',
    name: '晓妮',
    gender: '女',
    tag: '陕西乡音 · 特色民俗',
    desc: '古朴淳厚西北腔调，极具民间故事与盗墓灵异质感',
    avatarBg: 'bg-yellow-700',
    demoText: '那古墓深处，究竟藏着什么天大的秘密？'
  }
];

// 云端免翻墙/免配公网在线 TTS 节点
const CLOUD_TTS_GATEWAY = 'https://enquiries-opposition-cleanup-vitamin.trycloudflare.com';

export const useAudioPlayerStore = defineStore('audioPlayer', {
  state: () => ({
    isPlaying: false,
    isLoading: false,
    currentVoiceId: 'zh-CN-YunxiNeural',
    voices: DEFAULT_TOMATO_VOICES,
    playbackRate: 1.0,
    
    // 定时关闭
    sleepTimerMinutes: 0,
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
    
    capsulePosition: { x: null, y: null }
  }),

  getters: {
    currentVoice: (state) => {
      return state.voices.find(v => v.id === state.currentVoiceId) || DEFAULT_TOMATO_VOICES[0];
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
          console.warn('Audio tag error, switching to next or fallback', e);
          this.isLoading = false;
        });
      }

      // 读取本地保存的偏好
      try {
        const savedVoice = localStorage.getItem('ireader_tts_voice');
        if (savedVoice) this.currentVoiceId = savedVoice;
        const savedRate = localStorage.getItem('ireader_tts_rate');
        if (savedRate) this.playbackRate = parseFloat(savedRate);
      } catch (e) {}
    },

    /**
     * 关键解决手机端 Safari / 微信 / Android 自动播放策略
     * 在用户点按【听书】瞬间同步执行，获取手机系统音频播放权限
     */
    unlockMobileAudio() {
      if (!this.audio) {
        this.audio = new Audio();
      }
      // 播放一段极短微秒级静音数据，解锁 iOS/Android Audio 权限
      this.audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.audio.play().then(() => this.audio.pause()).catch(() => {});

      // 同时激活 SpeechSynthesis 上下文（双保险）
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
    },

    splitChapterToSentences(content) {
      if (!content) return [];
      const rawSentences = content
        .replace(/\r\n/g, '\n')
        .split(/(?<=[。！？!?…\n;；])/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

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

    loadChapterForListening(book, chapterIndex, startSentenceIndex = 0) {
      this.bookId = book.id;
      this.chapterIndex = chapterIndex;
      const chapter = book.chapters[chapterIndex];
      if (!chapter) return;

      this.sentences = this.splitChapterToSentences(chapter.content);
      this.sentenceIndex = Math.min(startSentenceIndex, Math.max(0, this.sentences.length - 1));
    },

    /**
     * 纯在线高保真神经网络朗读 (手机端兼容处理)
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

      // 计算在线音频地址：
      // 如果当前在公网/本地隧道，直接用相对路径；如果部署在 GitHub Pages，则直连 Cloudflare 全球公网网关
      let baseUrl = '';
      if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
        baseUrl = CLOUD_TTS_GATEWAY;
      }
      const encodedText = encodeURIComponent(text);
      const audioUrl = `${baseUrl}/api/tts/audio?text=${encodedText}&voice=${this.currentVoiceId}&rate=${this.playbackRate}`;

      let playSuccess = false;

      // 方案 1：请求纯在线云端神经网络 MP3 音频流
      try {
        this.audio.src = audioUrl;
        this.audio.playbackRate = this.playbackRate;
        await this.audio.play();
        playSuccess = true;
      } catch (err) {
        console.warn('Online neural audio play interrupted, trying fallback', err);
      }

      // 方案 2：如果网络超时或隧道暂时未连上，使用手机系统高拟真 Web Speech API 兜底朗读
      if (!playSuccess && typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = this.playbackRate;
          utter.lang = 'zh-CN';
          utter.onend = () => {
            this.handleSentenceEnded();
          };
          utter.onerror = (e) => {
            console.warn('Speech error', e);
            this.isLoading = false;
          };
          window.speechSynthesis.speak(utter);
          playSuccess = true;
        } catch (e) {
          console.warn('Web speech failed', e);
        }
      }

      if (playSuccess) {
        this.isPlaying = true;
        this.isLoading = false;
        const bookshelfStore = useBookshelfStore();
        if (this.bookId) {
          const percent = ((this.sentenceIndex + 1) / this.sentences.length) * 100;
          bookshelfStore.updateProgress(this.bookId, this.chapterIndex, percent);
        }
      } else {
        this.isLoading = false;
      }
    },

    togglePlay() {
      if (this.isPlaying) {
        if (this.audio) this.audio.pause();
        if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.pause();
        this.isPlaying = false;
      } else {
        if (this.audio && this.audio.src && !this.audio.ended) {
          this.audio.play().catch(() => this.playCurrentSentence());
        } else {
          this.playCurrentSentence();
        }
      }
    },

    handleSentenceEnded() {
      if (this.sleepTimerMinutes === 'chapter' && this.sentenceIndex >= this.sentences.length - 1) {
        this.isPlaying = false;
        this.sleepTimerMinutes = 0;
        return;
      }

      if (this.sentenceIndex < this.sentences.length - 1) {
        this.sentenceIndex++;
        this.playCurrentSentence();
      } else {
        this.nextChapter();
      }
    },

    jumpToSentence(index) {
      if (index >= 0 && index < this.sentences.length) {
        this.sentenceIndex = index;
        this.playCurrentSentence();
      }
    },

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

    setVoice(voiceId) {
      this.currentVoiceId = voiceId;
      localStorage.setItem('ireader_tts_voice', voiceId);
      if (this.isPlaying) {
        this.playCurrentSentence();
      }
    },

    setPlaybackRate(rate) {
      this.playbackRate = rate;
      localStorage.setItem('ireader_tts_rate', rate.toString());
      if (this.audio) {
        this.audio.playbackRate = rate;
      }
      if (this.isPlaying) {
        this.playCurrentSentence();
      }
    },

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
      }
    },

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
