const qrcode = require('qrcode-terminal');
const os = require('os');
const localtunnel = require('localtunnel');

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
  console.log('📱 掌阅 iReader + 番茄在线听书 · 手机多场景访问指南');
  console.log('=============================================================\n');

  console.log('【场景 1：在家 / 办公室连接同一 Wi-Fi】');
  console.log(`👉 局域网高速直连地址: \x1b[32m\x1b[1m${wifiUrl}\x1b[0m`);
  console.log('直接用手机浏览器扫描下方二维码即可秒开体验:');
  qrcode.generate(wifiUrl, { small: true });

  console.log('\n-------------------------------------------------------------');
  console.log('【场景 2：出门在外（手机 4G/5G 蜂窝网络随时随地使用）】');
  console.log('方案 A（一键公网穿透）：');
  console.log('   正在为您申请临时全球公网 HTTPS 安全隧道...');

  try {
    const tunnel = await Promise.race([
      localtunnel({ port: PORT }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('连接公网网关超时')), 8000))
    ]);

    console.log(`\n🎉 公网隧道已就绪！出门在外随时看书听书：`);
    console.log(`👉 远程公网链接: \x1b[36m\x1b[1m${tunnel.url}\x1b[0m`);
    console.log('手机扫描此公网二维码均可访问:');
    qrcode.generate(tunnel.url, { small: true });
  } catch (e) {
    console.log('   (提示: 免费公共隧道网关繁忙，建议使用方案 B 或 Cloudflare 隧道)');
  }

  console.log('\n方案 B（永久免费云端托管，最推荐！出门永不关机）：');
  console.log('   项目已为您配置好 `vercel.json` 和 `Dockerfile`！');
  console.log('   只需将代码推送到 GitHub，在 Vercel (https://vercel.com) 点击一键导入，');
  console.log('   即可获得一个永久免费、24小时不掉线的专属域名（如 https://my-reader.vercel.app）！');
  console.log('=============================================================\n');
}

main();
