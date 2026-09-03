const iconv = require('iconv-lite');

/**
 * 智能探测文本文件的字符编码 (支持 UTF-8, GBK, GB2312, GB18030)
 */
function decodeTextBuffer(buffer) {
  // 检查 UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return iconv.decode(buffer.subarray(3), 'utf8');
  }

  // 尝试 UTF-8 严格解码
  try {
    const utf8Str = buffer.toString('utf8');
    // 如果没有出现大量替换符 \uFFFD，说明是有效 UTF-8
    const replacementCount = (utf8Str.match(/\uFFFD/g) || []).length;
    if (replacementCount === 0 || replacementCount / utf8Str.length < 0.001) {
      return utf8Str;
    }
  } catch (e) {
    // 忽略错误，继续尝试 GBK
  }

  // 尝试 GB18030 (兼容 GBK 和 GB2312)
  try {
    const gbkStr = iconv.decode(buffer, 'gb18030');
    return gbkStr;
  } catch (e) {
    return buffer.toString('utf8');
  }
}

/**
 * 智能解析小说章节
 */
function parseNovelText(rawText, defaultTitle = '未命名小说') {
  // 标准化换行
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 尝试从前 1000 字符中提取书名和作者
  let title = defaultTitle;
  let author = '网络文学';
  const headerSection = text.slice(0, 1000);
  
  const titleMatch = headerSection.match(/(?:书名|作品名)[：:]\s*([^\n\r]+)/i);
  if (titleMatch) title = titleMatch[1].trim();

  const authorMatch = headerSection.match(/(?:作者|著)[：:]\s*([^\n\r]+)/i);
  if (authorMatch) author = authorMatch[1].trim();

  // 匹配常见中文小说章节正则
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
    // 找到了标准的章节标题
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i];
      const start = current.index;
      const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
      const fullSection = text.slice(start, end).trim();
      
      // 去除第一行的标题本身，保留正文内容
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

    // 如果首章前有前言/序幕内容
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
    // 没有明显分章标题，自动按字数（每约 2500 字）智能分节
    const paragraphs = text.split('\n').map(p => p.trim()).filter(Boolean);
    let currentChapter = {
      id: 1,
      title: '第 1 节',
      content: ''
    };
    let currentLength = 0;
    let sectionIdx = 1;

    for (const p of paragraphs) {
      currentChapter.content += p + '\n\n';
      currentLength += p.length;

      if (currentLength >= 2200) {
        chapters.push(currentChapter);
        sectionIdx++;
        currentChapter = {
          id: sectionIdx,
          title: `第 ${sectionIdx} 节`,
          content: ''
        };
        currentLength = 0;
      }
    }

    if (currentChapter.content.trim()) {
      chapters.push(currentChapter);
    }
  }

  // 保证至少有章节
  if (chapters.length === 0) {
    chapters.push({
      id: 1,
      title: '全文',
      content: text || '暂无内容'
    });
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

module.exports = {
  decodeTextBuffer,
  parseNovelText
};
