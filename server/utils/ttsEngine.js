const { Communicate } = require('edge-tts-universal');

// 番茄小说专属纯在线 AI 神经网络发音人矩阵
const TOMATO_VOICES = [
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

// 简单内存缓存以加快重复朗读的秒开速度
const audioCache = new Map();
const MAX_CACHE_ITEMS = 80;

/**
 * 转换语速数值为 Edge-TTS 格式字符串
 * 例如 1.0 -> "+0%", 1.5 -> "+50%", 0.8 -> "-20%"
 */
function formatRate(rateNum) {
  if (!rateNum || Math.abs(rateNum - 1) < 0.05) return '+0%';
  const percent = Math.round((rateNum - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}

/**
 * 纯在线云端神经网络合成音频并捕获字词时间戳
 */
async function synthesizeSpeech(text, options = {}) {
  const voice = options.voice || 'zh-CN-YunxiNeural';
  const rate = options.rate ? formatRate(options.rate) : '+0%';
  const pitch = options.pitch || '+0Hz';

  const cacheKey = `${voice}_${rate}_${pitch}_${text}`;
  if (audioCache.has(cacheKey)) {
    return audioCache.get(cacheKey);
  }

  const comm = new Communicate(text, {
    voice,
    rate,
    pitch
  });

  const audioChunks = [];
  const boundaries = [];

  for await (const chunk of comm.stream()) {
    if (chunk.type === 'audio') {
      audioChunks.push(chunk.data);
    } else if (chunk.type === 'WordBoundary') {
      boundaries.push({
        text: chunk.text,
        offset: chunk.offset, // 100-nanosecond units
        duration: chunk.duration
      });
    }
  }

  const fullAudioBuffer = Buffer.concat(audioChunks);
  const result = {
    audio: fullAudioBuffer,
    boundaries,
    voice,
    textLength: text.length
  };

  // 缓存控制
  if (audioCache.size >= MAX_CACHE_ITEMS) {
    const firstKey = audioCache.keys().next().value;
    audioCache.delete(firstKey);
  }
  audioCache.set(cacheKey, result);

  return result;
}

module.exports = {
  TOMATO_VOICES,
  synthesizeSpeech,
  formatRate
};
