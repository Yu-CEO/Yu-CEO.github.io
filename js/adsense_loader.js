/*
 * adsense_loader.js：Google AdSense（広告）の本体を読み込むファイル（2026-11-21 追加）
 * 読み込むのは「ADSENSE_CLIENT の形が正しい」「公開サイト（https の ANALYTICS_PUBLIC_HOST）で開いた」の2つがそろったときだけ。
 * 手元や file:// で開いたときは Google と通信しない。
 * HTML に外部の <script> を直接書かず、このファイルが読み込む（CSP の script-src で読み込み先を Google の広告の場所に限る）。
 * 主な関数：planAdsense（読み込むかと、読み込むURLを決める計算だけ）、startAdsense（実際に読み込む）。
 * analytics_main.js から呼ばれる。tests/adsense_loader.test.js でテストする。
 * サイトの所有権の確認は、各ページの <meta name="google-adsense-account"> と ads.txt で行う（このファイルは関係しない）。
 */

// AdSense のサイト運営者ID の形（例 ca-pub-1234567890123456）。形が違う値では読み込まない
const ADSENSE_CLIENT_PATTERN = /^ca-pub-[0-9]{16}$/;
// AdSense の本体の場所（Google の公式の読み込み先）
const ADSENSE_SCRIPT_BASE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=";

/**
 * 設定とページの情報から、AdSense を読み込むかを決める。読み込まないときは null。
 * @param {{ ADSENSE_CLIENT: string, ANALYTICS_PUBLIC_HOST: string }} config site_config.js の設定
 * @param {{ protocol: string, hostname: string }} page ページの情報
 * @returns {(string|null)} 読み込むURL か null
 * @example planAdsense({ ADSENSE_CLIENT: "ca-pub-1234567890123456", ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io" },
 *   { protocol: "https:", hostname: "yu-ceo.github.io" }) // "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
 */
function planAdsense(config, page) {
  if (!config || typeof config.ADSENSE_CLIENT !== "string" || !ADSENSE_CLIENT_PATTERN.test(config.ADSENSE_CLIENT)) {
    return null;
  }
  if (!page || page.protocol !== "https:" || page.hostname !== config.ANALYTICS_PUBLIC_HOST) {
    return null;
  }
  return ADSENSE_SCRIPT_BASE + encodeURIComponent(config.ADSENSE_CLIENT);
}

/**
 * AdSense を読み込む（Google の公式のコードと同じ：async・crossorigin="anonymous" の script を1つ足す）。
 * @param {object} config site_config.js の SITE_CONFIG
 * @param {Window} win ブラウザの window
 */
function startAdsense(config, win) {
  const url = planAdsense(config, {
    protocol: win.location.protocol,
    hostname: win.location.hostname
  });
  if (!url) {
    return;
  }
  const script = win.document.createElement("script");
  script.async = true;
  script.src = url;
  script.crossOrigin = "anonymous";
  win.document.head.appendChild(script);
}

if (typeof module !== "undefined") {
  module.exports = { planAdsense, startAdsense, ADSENSE_CLIENT_PATTERN };
}
