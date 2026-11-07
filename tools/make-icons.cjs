// アプリのアイコン（icon-192.png・icon-512.png）を作る。生成りの地形図の紙に、朱の帯と「〒」の記号。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#eef2e6"/>
      <path d="M0 78c20-6 34 6 52 0s30-8 48-2v24H0z" fill="#d5e1f3"/>
      <rect x="0" y="0" width="12" height="100" fill="#b23c26"/>
      <g fill="none" stroke="#1f2a44" stroke-width="4.5" stroke-linecap="round"><circle cx="56" cy="44" r="26"/><path d="M43 31h26M43 41h26M56 41v22"/></g></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
