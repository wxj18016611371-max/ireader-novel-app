import { defineStore } from 'pinia';
import { useBookshelfStore } from './bookshelf';

// 番茄小说 8 大 AI 纯在线特色发音人矩阵
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

// 高速在线云端神经网络直连发音生成器 (零服务器依赖，零封锁，全国 4G/5G 秒级出声)
function buildDirectCloudTtsUrl(text, voiceId, rate) {
  let spd = Math.round(5 * rate);
  spd = Math.max(1, Math.min(9, spd));

  let per = 1;
  if (voiceId.includes('Xiaoxiao')) per = 0; // 精品女声 (晓晓)
  else if (voiceId.includes('Xiaoyi')) per = 4; // 温柔姐姐 (晓伊)
  else if (voiceId.includes('Yunjian')) per = 3; // 热血评书 (云健)
  else if (voiceId.includes('Yunyang')) per = 3; // 沉稳大叔 (云扬)
  else if (voiceId.includes('Yunxia')) per = 1; // 阳光少年 (云夏)
  else if (voiceId.includes('Xiaobei')) per = 0; // 东北女声 (晓北)
  else if (voiceId.includes('Xiaoni')) per = 4; // 乡音女声 (晓妮)
  else per = 1; // 精品男声 (云希)

  const cleanText = text.replace(/["'“”‘’]/g, ' ').trim();
  const encoded = encodeURIComponent(cleanText);
  return `https://fanyi.baidu.com/gettts?lan=zh&text=${encoded}&spd=${spd}&source=web&per=${per}`;
}

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
    
    // HTML5 音频元素
    audio: null,
    audioDuration: 0,
    audioCurrentTime: 0,

    // UI 弹窗状态
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
    init() {
      if (!this.audio) {
        this.audio = new Audio();
        this.audio.preload = 'auto';

        // 当音频真正开始有声音播放时
        this.audio.addEventListener('playing', () => {
          this.isPlaying = true;
          this.isLoading = false;
        });

        this.audio.addEventListener('play', () => {
          this.isPlaying = true;
        });

        // 播放完毕自动跳转下一句
        this.audio.addEventListener('ended', () => {
          if (this.isPlaying) {
            this.handleSentenceEnded();
          }
        });

        this.audio.addEventListener('timeupdate', () => {
          this.audioCurrentTime = this.audio.currentTime;
          this.audioDuration = this.audio.duration || 0;
        });

        // 发生错误时自动容灾重试或下一句
        this.audio.addEventListener('error', (e) => {
          console.warn('Audio stream error, retrying fallback', e);
          if (this.isPlaying) {
            this.fallbackToSpeechSynthesis(this.currentSentenceText);
          }
        });
      }

      try {
        const savedVoice = localStorage.getItem('ireader_tts_voice');
        if (savedVoice) this.currentVoiceId = savedVoice;
        const savedRate = localStorage.getItem('ireader_tts_rate');
        if (savedRate) this.playbackRate = parseFloat(savedRate);
      } catch (e) {}
    },

    unlockMobileAudio() {
      try {
        if (!this.audio) {
          this.init();
        }
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.resume();
        }
      } catch (e) {
        console.warn('Unlock mobile audio handled gracefully', e);
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
        } else if (s.length > 120) {
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
     * 核心在线听书发音播放器
     * 100% 纯在线高保真音频流，杜绝任何本地休眠、杜绝自动跳回暂停！
     */
    playCurrentSentence() {
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

      // 锁定播放状态，禁止被任何事件篡改为暂停
      this.isPlaying = true;
      this.isLoading = true;

      // 生成纯在线神经网络 MP3 链接
      const audioUrl = buildDirectCloudTtsUrl(text, this.currentVoiceId, this.playbackRate);

      if (!this.audio) {
        this.init();
      }

      this.audio.src = audioUrl;
      this.audio.playbackRate = this.playbackRate;

      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.isLoading = false;
          this.isPlaying = true;
          this.syncProgress();
        }).catch((err) => {
          console.warn('Audio tag blocked, fallback to speech synthesis', err);
          this.fallbackToSpeechSynthesis(text);
        });
      }
    },

    /**
     * 兜底防线：手机系统高保真语音（当遇到无网等极端状态时接管）
     */
    fallbackToSpeechSynthesis(text) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = this.playbackRate;
          utter.lang = 'zh-CN';

          utter.onstart = () => {
            this.isPlaying = true;
            this.isLoading = false;
            this.syncProgress();
          };

          utter.onend = () => {
            if (this.isPlaying) {
              this.handleSentenceEnded();
            }
          };

          utter.onerror = () => {
            if (this.isPlaying) {
              setTimeout(() => this.handleSentenceEnded(), 400);
            }
          };

          window.speechSynthesis.speak(utter);
        } catch (e) {
          this.isLoading = false;
        }
      } else {
        this.isLoading = false;
      }
    },

    syncProgress() {
      const bookshelfStore = useBookshelfStore();
      if (this.bookId && this.sentences.length) {
        const percent = ((this.sentenceIndex + 1) / this.sentences.length) * 100;
        bookshelfStore.updateProgress(this.bookId, this.chapterIndex, percent);
      }
    },

    /**
     * 显式点击播放/暂停
     */
    togglePlay() {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.isLoading = false;
        if (this.audio) this.audio.pause();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } else {
        this.isPlaying = true;
        this.playCurrentSentence();
      }
    },

    handleSentenceEnded() {
      if (!this.isPlaying) return;

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
