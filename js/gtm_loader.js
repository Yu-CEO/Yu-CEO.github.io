/*
 * gtm_loader.js：Google タグマネージャー（GTM）を読み込むファイル（requirements_analytics.md 2-10）
 * 読み込むのは「計測をオンにしている」「公開サイト（https の ANALYTICS_PUBLIC_HOST）で開いた」「トラッキングしない を設定していない」
 * の3つがそろったときだけ（GoatCounter と同じ決まり）。手元や file:// で開いたときは Google と通信しない。
 * 主な関数：planGtm（読み込むかと、読み込むURLを決める計算だけ）、startGtm（実際に読み込む）。
 * analytics_main.js から呼ばれる。tests/gtm_loader.test.js でテストする。
 * CSP の都合で、GTM の管理画面で足した「カスタムHTML」のタグは動かない（Google のタグだけが動く）。
 */

// GTM のコンテナID の形（例 GTM-PH2VNGMC）。形が違う値では読み込まない
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,12}$/;
// GTM の本体の場所（Google の公式の読み込み先）
const GTM_SCRIPT_BASE = "https://www.googletagmanager.com/gtm.js?id=";

/**
 * 「トラッキングしない」の確認。analytics_path.js の isTrackingRefused を使う（同じ決まりにするため）。
 * @param {{ doNotTrack: (string|null|undefined), globalPrivacyControl: (boolean|undefined) }} privacy ブラウザの設定
 * @returns {boolean} 計測を断っていれば true
 */
function gtmTrackingRefused(privacy) {
  const check = typeof isTrackingRefused === "function"
    ? isTrackingRefused
    : require("./analytics_path.js").isTrackingRefused;
  return check(privacy);
}

/**
 * 設定とページの情報から、GTM を読み込むかを決める。読み込まないときは null。
 * @param {{ ANALYTICS_ENABLED: boolean, GTM_ID: string, ANALYTICS_PUBLIC_HOST: string }} config site_config.js の設定
 * @param {{ protocol: string, hostname: string, doNotTrack: (string|null|undefined), globalPrivacyControl: (boolean|undefined) }} page ページとブラウザの情報
 * @returns {(string|null)} 読み込むURL か null
 * @example planGtm({ ANALYTICS_ENABLED: true, GTM_ID: "GTM-ABCD", ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io" },
 *   { protocol: "https:", hostname: "yu-ceo.github.io" }) // "https://www.googletagmanager.com/gtm.js?id=GTM-ABCD"
 */
function planGtm(config, page) {
  if (!config || config.ANALYTICS_ENABLED !== true) {
    return null;
  }
  if (typeof config.GTM_ID !== "string" || !GTM_ID_PATTERN.test(config.GTM_ID)) {
    return null;
  }
  if (!page || page.protocol !== "https:" || page.hostname !== config.ANALYTICS_PUBLIC_HOST) {
    return null;
  }
  if (gtmTrackingRefused(page)) {
    return null;
  }
  return GTM_SCRIPT_BASE + encodeURIComponent(config.GTM_ID);
}

/**
 * GTM を読み込む（Google の公式の読み込み方と同じ：dataLayer に開始の印を入れてから、本体を非同期で読む）。
 * @param {object} config site_config.js の SITE_CONFIG
 * @param {Window} win ブラウザの window
 */
function startGtm(config, win) {
  const url = planGtm(config, {
    protocol: win.location.protocol,
    hostname: win.location.hostname,
    doNotTrack: win.navigator.doNotTrack,
    globalPrivacyControl: win.navigator.globalPrivacyControl
  });
  if (!url) {
    return;
  }
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = win.document.createElement("script");
  script.async = true;
  script.src = url;
  win.document.head.appendChild(script);
}

if (typeof module !== "undefined") {
  module.exports = { planGtm, startGtm, GTM_ID_PATTERN };
}
