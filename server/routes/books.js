const express = require('express');
const router = express.Router();
const multer = require('multer');
const { decodeTextBuffer, parseNovelText } = require('../utils/novelParser');
const sampleNovels = require('../data/sample_novels.json');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB 限制
});

/**
 * 获取预置经典小说列表（开箱即读）
 */
router.get('/samples', (req, res) => {
  res.json({
    code: 0,
    data: sampleNovels
  });
});

/**
 * 上传本地 TXT 文件并解析为章节对象
 */
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ code: -1, message: '请选择要上传的小说文件' });
    }

    const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const bookTitle = filename.replace(/\.(txt|epub)$/i, '');

    // 智能解码二进制流 (兼容 UTF-8, GBK, GB2312, GB18030)
    const textContent = decodeTextBuffer(req.file.buffer);

    // 智能解析章节
    const parsedBook = parseNovelText(textContent, bookTitle);

    res.json({
      code: 0,
      data: parsedBook,
      message: `成功导入《${parsedBook.title}》，共解析出 ${parsedBook.chapters.length} 个章节`
    });
  } catch (err) {
    console.error('Book import error:', err);
    res.status(500).json({ code: -1, message: '书籍解析失败', error: err.message });
  }
});

/**
 * 文本粘贴快速导入接口
 */
router.post('/parse-text', (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ code: -1, message: '文本内容不能为空' });
    }

    const parsedBook = parseNovelText(text, title || '网络导入小说');

    res.json({
      code: 0,
      data: parsedBook,
      message: `成功导入《${parsedBook.title}》，共解析出 ${parsedBook.chapters.length} 个章节`
    });
  } catch (err) {
    console.error('Parse text error:', err);
    res.status(500).json({ code: -1, message: '解析失败', error: err.message });
  }
});

module.exports = router;
