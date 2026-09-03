const express = require('express');
const router = express.Router();
const { TOMATO_VOICES, synthesizeSpeech } = require('../utils/ttsEngine');

/**
 * 获取番茄小说特色发音人矩阵列表
 */
router.get('/voices', (req, res) => {
  res.json({
    code: 0,
    data: TOMATO_VOICES
  });
});

/**
 * 直接通过 GET 请求返回音频 MP3 数据流，供 HTML5 <audio> 直接播放
 * 例如: /api/tts/audio?text=你好&voice=zh-CN-YunxiNeural&rate=1.0
 */
router.get('/audio', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).send('缺少待合成文本参数');
    }

    const voice = req.query.voice || 'zh-CN-YunxiNeural';
    const rate = req.query.rate ? parseFloat(req.query.rate) : 1.0;

    const result = await synthesizeSpeech(text, { voice, rate });

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': result.audio.length,
      'Cache-Control': 'public, max-age=86400',
      'Accept-Ranges': 'bytes'
    });

    res.end(result.audio);
  } catch (err) {
    console.error('TTS audio generation error:', err);
    res.status(500).json({ error: '音频合成失败', details: err.message });
  }
});

/**
 * 高级合成接口：返回音频 Base64 数据及句级/字级时间戳信息（用于声画卡拉OK同步与字词高亮）
 */
router.post('/synthesize', async (req, res) => {
  try {
    const { text, voice, rate, pitch } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ code: -1, message: '文本不能为空' });
    }

    const result = await synthesizeSpeech(text.trim(), {
      voice: voice || 'zh-CN-YunxiNeural',
      rate: rate || 1.0,
      pitch: pitch || '+0Hz'
    });

    res.json({
      code: 0,
      data: {
        audioBase64: `data:audio/mp3;base64,${result.audio.toString('base64')}`,
        boundaries: result.boundaries,
        textLength: result.textLength,
        voice: result.voice
      }
    });
  } catch (err) {
    console.error('TTS synthesize error:', err);
    res.status(500).json({ code: -1, message: '在线语音合成异常', error: err.message });
  }
});

module.exports = router;
