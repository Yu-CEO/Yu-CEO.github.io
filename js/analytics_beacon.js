/*
 * analytics_beacon.js：アクセス解析（GoatCounter）へ、ページを開いたことを 1×1 の画像の読み込みで1回だけ送る
 * 主な関数：startAnalytics（ページの情報を集め、送ってよければ1回だけ送る）、sendCountImage（画像を作って src を入れる）、
 *   readPageInfo（ブラウザからページの情報を集める）
 * 外部のスクリプトは使わず、画像はページに追加しない（見た目・レイアウトに一切出さないため）。読み込みの成否は見ず、再送もしない。
 * 「送ってよいか」と送信用URLは analytics_path.js が決める。analytics_main.js から使われる。
 */

// Node.js（テスト）では、analytics_path.js の関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
// （ブラウザでは、同じページで先に読み込まれた analytics_path.js の関数がそのまま使える）
if (typeof module !== "undefined" && module.exports) {
  globalThis.planPageView = require("./analytics_path.js").planPageView;
}

// キャッシュ回避の値の範囲。36 の6乗＝36進数（0〜9 と a〜z）で最大6文字（短くなることもある）。人を区別する値にはしない
const ANALYTICS_RANDOM_RANGE = 36 ** 6;
// 同じページで2回送らないための印（main の呼び出しが重なっても1回だけにする）
let analyticsAlreadySent = false;

/**
 * キャッシュ回避の値を作る（同じ画像が使い回されて数え漏れるのを防ぐ）。毎回変わり、どこにも保存しない。
 * @returns {string} 乱数の文字（例 "k3x9a1"）
 * @example makeRandomValue() // "1z8f0q"
 */
function makeRandomValue() {
  return Math.floor(Math.random() * ANALYTICS_RANDOM_RANGE).toString(36);
}

/**
 * ブラウザから、計測の判断に要る情報だけを集める（画面の大きさ・題名・Cookie などは読まない）。
 * @param {{ location: object, document: object, navigator: object }} environment ブラウザの window にあたるもの
 * @returns {object} planPageView に渡すページの情報
 * @example readPageInfo({ location: window.location, document: document, navigator: navigator })
 */
function readPageInfo(environment) {
  const navigatorObject = environment.navigator || {};
  return {
    protocol: environment.location.protocol,
    hostname: environment.location.hostname,
    pathname: environment.location.pathname,
    search: environment.location.search,
    referrer: environment.document.referrer,
    doNotTrack: navigatorObject.doNotTrack,
    globalPrivacyControl: navigatorObject.globalPrivacyControl,
    randomValue: makeRandomValue()
  };
}

/**
 * 計測用の画像を作って src を入れる。ページには追加しない（読み込みだけが起きる）。
 * @param {Document} documentObject 画面の document
 * @param {string} url 送信用のURL（analytics_path.js が作ったもの）
 * @returns {HTMLImageElement} 作った画像（ページには置かれていない）
 * @example sendCountImage(document, "https://abc.goatcounter.com/count?p=%2F&r=&rnd=k3x")
 */
function sendCountImage(documentObject, url) {
  const image = documentObject.createElement("img");
  image.alt = "";
  // src を入れた時点でブラウザが読み込みを始めるので、ページに置かなくても通信は1回起きる（QA が開発者ツールで AC-1 を確かめる）
  image.src = url;
  return image;
}

/**
 * ページの情報を集め、送ってよければ計測を1回だけ送る。設定の間違いはコンソールに日本語で出す。
 * どんな例外も受け止め、ほかのJS（日記・道具箱など）の動きを止めない。
 * @param {object} config site_config.js の SITE_CONFIG
 * @param {{ location: object, document: object, navigator: object, console: object }} environment ブラウザの window にあたるもの
 * @returns {boolean} 送ったら true
 * @example startAnalytics(SITE_CONFIG, window)
 */
function startAnalytics(config, environment) {
  try {
    if (analyticsAlreadySent) {
      return false;
    }
    const plan = planPageView(config, readPageInfo(environment));
    if (plan.warning !== "" && environment.console) {
      environment.console.warn(plan.warning);
    }
    if (!plan.send) {
      return false;
    }
    analyticsAlreadySent = true;
    sendCountImage(environment.document, plan.url);
    return true;
  } catch (error) {
    // 計測は無くても困らないので、失敗しても何も表示しない
    return false;
  }
}

/**
 * テスト用：「送った」印を戻す（ブラウザでは使わない）。
 * @returns {void}
 * @example resetAnalyticsForTest()
 */
function resetAnalyticsForTest() {
  analyticsAlreadySent = false;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { startAnalytics, sendCountImage, readPageInfo, makeRandomValue, resetAnalyticsForTest };
}
