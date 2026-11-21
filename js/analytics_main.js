/*
 * analytics_main.js：アクセス解析の入口。ページを開いたときに、計測を1回だけ送る流れだけを書く
 * 送るかどうか・何を送るかは analytics_path.js、送り方は analytics_beacon.js が決める。設定は site_config.js。
 * index.html・diary/index.html・diary/entry.html の <script> の最後に読み込まれる（計測が失敗しても、ほかの表示に影響させないため）。
 */

// 計測のファイルが読み込めなかったとき（広告ブロッカーなど）は、何もしない
if (typeof startAnalytics === "function" && typeof SITE_CONFIG !== "undefined") {
  startAnalytics(SITE_CONFIG, window);
}

// Google タグマネージャー（gtm_loader.js）。読み込めなかったときは何もしない
if (typeof startGtm === "function" && typeof SITE_CONFIG !== "undefined") {
  startGtm(SITE_CONFIG, window);
}

// Google AdSense（adsense_loader.js）。読み込めなかったとき（広告ブロッカーなど）は何もしない
if (typeof startAdsense === "function" && typeof SITE_CONFIG !== "undefined") {
  startAdsense(SITE_CONFIG, window);
}
