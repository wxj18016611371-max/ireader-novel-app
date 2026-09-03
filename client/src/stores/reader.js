import { defineStore } from 'pinia';

export const useReaderStore = defineStore('reader', {
  state: () => ({
    theme: 'parchment', // 'parchment' | 'green' | 'white' | 'gray' | 'night'
    turnMode: 'curl', // 默认优先掌阅仿真翻页 'curl' (仿真) | 'slide' (滑动) | 'scroll' (连续滚动)
    fontSize: 18,
    lineHeight: 1.8,
    fontFamily: 'system', // 'system' | 'kaiti' | 'songti'
    sideMargin: 20,
    showMenu: false,
    showToc: false,
    showSettings: false
  }),

  getters: {
    themeClass: (state) => {
      return `theme-${state.theme}`;
    },
    fontFamilyStyle: (state) => {
      if (state.fontFamily === 'kaiti') {
        return '"STKaiti", "KaiTi", "SimKai", serif';
      }
      if (state.fontFamily === 'songti') {
        return '"Songti SC", "SimSun", "STSong", serif';
      }
      return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
    }
  },

  actions: {
    init() {
      try {
        const saved = localStorage.getItem('ireader_reader_config');
        if (saved) {
          const config = JSON.parse(saved);
          this.theme = config.theme || 'parchment';
          this.turnMode = config.turnMode || 'curl';
          this.fontSize = config.fontSize || 18;
          this.lineHeight = config.lineHeight || 1.8;
          this.fontFamily = config.fontFamily || 'system';
          this.sideMargin = config.sideMargin || 20;
        }
      } catch (e) {
        console.error('Failed to load reader config', e);
      }
    },

    persist() {
      try {
        localStorage.setItem('ireader_reader_config', JSON.stringify({
          theme: this.theme,
          turnMode: this.turnMode,
          fontSize: this.fontSize,
          lineHeight: this.lineHeight,
          fontFamily: this.fontFamily,
          sideMargin: this.sideMargin
        }));
      } catch (e) {
        console.error('Failed to save reader config', e);
      }
    },

    setTheme(theme) {
      this.theme = theme;
      this.persist();
    },

    setTurnMode(mode) {
      this.turnMode = mode;
      this.persist();
    },

    setFontSize(delta) {
      this.fontSize = Math.min(32, Math.max(14, this.fontSize + delta));
      this.persist();
    },

    setLineHeight(delta) {
      this.lineHeight = Math.min(2.4, Math.max(1.4, +(this.lineHeight + delta).toFixed(1)));
      this.persist();
    },

    setFontFamily(font) {
      this.fontFamily = font;
      this.persist();
    },

    toggleMenu() {
      this.showMenu = !this.showMenu;
      if (!this.showMenu) {
        this.showSettings = false;
      }
    },

    openToc() {
      this.showMenu = false;
      this.showToc = true;
    },

    closeToc() {
      this.showToc = false;
    }
  }
});
