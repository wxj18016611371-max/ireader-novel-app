const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const os = require('os');

const PORT = process.env.PORT || 3000;

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function main() {
  const localIP = getLocalIP();
  const wifiUrl = `http://${localIP}:${PORT}`;

  console.log('\n=============================================================');
  console.log('📱 掌阅 iReader + 番茄在线听书 · 手机全场景访问连接器');
  console.log('=============================================================\n');

  console.log('【场景 1：在家 / 办公室连接同一 Wi-Fi】');
  console.log(`👉 局域网极速地址: \x1b[32m\x1b[1m${wifiUrl}\x1b[0m`);
  console.log('手机扫描下方二维码直接打开:');
  qrcode.generate(wifiUrl, { small: true });

  console.log('\n-------------------------------------------------------------');
  console.log('【场景 2：出门在外（手机 4G/5G 蜂窝网络随时随地使用）】');
  console.log('🚀 正在通过 Cloudflare 全球高速边缘网络建立公网隧道 (免注册、免美国号码)...');

  const cloudflaredPath = path.join(__dirname, 'cloudflared.exe');
  if (fs.existsSync(cloudflaredPath)) {
    const cf = spawn(cloudflaredPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let foundUrl = false;
    const checkLine = (data) => {
      const str = data.toString();
      const match = str.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !foundUrl) {
        foundUrl = true;
        const publicUrl = match[0];
        console.log('\n🎉 公网隧道建立成功！无需任何国外手机号，出门随时看书听书！');
        console.log(`👉 手机公网访问网址: \x1b[36m\x1b[1m${publicUrl}\x1b[0m\n`);
        console.log('📱 请用手机微信、Safari 或任意手机浏览器【扫码直接打开】:');
        qrcode.generate(publicUrl, { small: true });

        console.log('\n💡 出门使用技巧:');
        console.log('1. 手机打开上述链接后，点击浏览器菜单的【添加到主屏幕】。');
        console.log('2. 桌面就会生成掌阅 App 图标，出门坐地铁、走在路上点开就是全屏掌阅+番茄听书！');
        console.log('3. 只要保持此终端运行，出门即可随时使用。\n');
      }
    };

    cf.stdout.on('data', checkLine);
    cf.stderr.on('data', checkLine);

    cf.on('close', () => {
      console.log('隧道已停止。');
    });
  } else {
    console.log('未找到 cloudflared.exe，请使用局域网 Wi-Fi 访问或免费云托管平台。');
  }
}

main();
