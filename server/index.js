const express = require('express');
const cors = require('cors');
const path = require('path');
const ttsRoutes = require('./routes/tts');
const booksRoutes = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 挂载 API 路由
app.use('/api/tts', ttsRoutes);
app.use('/api/books', booksRoutes);

// 健康检查路由
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iReader Novel & Tomato TTS Online Engine',
    timestamp: new Date().toISOString()
  });
});

// 前端静态文件托管与 SPA 回退路由
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('iReader Novel Backend API Server is Running.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 掌阅iReader风格小说 & 番茄在线听书引擎已启动`);
  console.log(`📡 服务端监听端口: http://localhost:${PORT}`);
  console.log(`🎙️ 在线云端发音人矩阵: http://localhost:${PORT}/api/tts/voices`);
  console.log(`📚 预置小说样书列表: http://localhost:${PORT}/api/books/samples`);
  console.log(`=======================================================`);
});
