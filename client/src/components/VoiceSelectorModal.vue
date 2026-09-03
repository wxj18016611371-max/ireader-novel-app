<template>
  <div 
    v-if="audioPlayerStore.isVoiceModalOpen" 
    class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
  >
    <!-- 背景遮罩 -->
    <div 
      class="fixed inset-0 bg-black/70 backdrop-blur-xs"
      @click="audioPlayerStore.isVoiceModalOpen = false"
    ></div>

    <!-- 弹窗主体 (仿番茄小说主播矩阵选择抽屉) -->
    <div class="relative w-full max-w-lg bg-[#1D202B] rounded-t-3xl sm:rounded-2xl border-t sm:border border-slate-700 shadow-2xl flex flex-col max-h-[85vh] z-10 animate-in slide-in-from-bottom duration-200 text-slate-100 overflow-hidden">
      <!-- 头部 -->
      <div class="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-base font-bold text-slate-50">番茄小说 AI 精选发音人</h2>
            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">
              纯在线高保真
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">微软 Cognitive Neural 语音引擎驱动 · 拒绝机械离线音</p>
        </div>

        <button 
          @click="audioPlayerStore.isVoiceModalOpen = false"
          class="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 发音人列表 -->
      <div class="p-4 overflow-y-auto space-y-3 flex-1">
        <div 
          v-for="voice in audioPlayerStore.voices" 
          :key="voice.id"
          @click="selectVoice(voice.id)"
          class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer"
          :class="voice.id === audioPlayerStore.currentVoiceId 
            ? 'bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-500/10' 
            : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60'"
        >
          <!-- 头像与主播信息 -->
          <div class="flex items-center space-x-3 min-w-0 flex-1">
            <div 
              class="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md"
              :class="voice.avatarBg || 'bg-amber-600'"
            >
              {{ voice.name[0] }}
            </div>

            <div class="min-w-0 flex-1 pr-2">
              <div class="flex items-center space-x-2">
                <span class="font-bold text-sm text-slate-100">{{ voice.name }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/80 text-slate-300">
                  {{ voice.gender }}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium truncate max-w-[120px]">
                  {{ voice.tag }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-1 truncate">
                {{ voice.desc }}
              </p>
            </div>
          </div>

          <!-- 试听按钮与选中状态 -->
          <div class="flex items-center space-x-2 shrink-0">
            <button 
              @click.stop="previewVoice(voice)"
              class="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
              :class="previewingVoiceId === voice.id 
                ? 'bg-amber-500 text-white border-amber-500' 
                : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'"
            >
              <Volume2 v-if="previewingVoiceId === voice.id" class="w-3.5 h-3.5 animate-pulse" />
              <Play v-else class="w-3.5 h-3.5" />
              <span>{{ previewingVoiceId === voice.id ? '播放中' : '试听' }}</span>
            </button>

            <!-- 选中标记 -->
            <div 
              class="w-5 h-5 rounded-full flex items-center justify-center text-xs"
              :class="voice.id === audioPlayerStore.currentVoiceId ? 'bg-amber-500 text-white' : 'border border-slate-600 text-transparent'"
            >
              <Check class="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      <!-- 底部关闭 -->
      <div class="p-3 bg-slate-900/60 border-t border-slate-800 flex justify-end">
        <button 
          @click="audioPlayerStore.isVoiceModalOpen = false"
          class="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-md"
        >
          确定使用当前发音人
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { X, Volume2, Play, Check } from 'lucide-vue-next';
import { useAudioPlayerStore } from '../stores/audioPlayer';

const audioPlayerStore = useAudioPlayerStore();
const previewingVoiceId = ref(null);
let previewAudio = null;

function selectVoice(voiceId) {
  audioPlayerStore.setVoice(voiceId);
}

function previewVoice(voice) {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio = null;
  }

  if (previewingVoiceId.value === voice.id) {
    previewingVoiceId.value = null;
    return;
  }

  previewingVoiceId.value = voice.id;
  const sample = voice.demoText || `我是发音人${voice.name}，正在为您在线朗读小说。`;
  const url = `/api/tts/audio?text=${encodeURIComponent(sample)}&voice=${voice.id}&rate=1.0`;

  previewAudio = new Audio(url);
  previewAudio.play().catch(e => console.warn('Preview blocked', e));
  previewAudio.onended = () => {
    previewingVoiceId.value = null;
    previewAudio = null;
  };
  previewAudio.onerror = () => {
    previewingVoiceId.value = null;
    previewAudio = null;
  };
}
</script>
