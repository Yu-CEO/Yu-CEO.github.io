/*
 * analytics_path.js：アクセス解析（GoatCounter）で「送ってよいか」と「送信用のURL」を決める計算だけのファイル（画面には触れない）
 * 主な関数：planPageView（設定とページの情報から、送るか・送信用URL・コンソールに出す文を決める）、
 *   isValidAnalyticsHost（送り先の形の確認）、buildPagePath（送るページの場所）、buildReferrerSite（参照元のサイト名だけ）、
 *   buildCountUrl（送信用URLの組み立て）、readEntryDate（日記の日付だけを取り出す）、isTrackingRefused（「トラッキングしない」の確認）
 * 送るのは「ページの場所（p）」「参照元のサイト名（r）」「キャッシュ回避の乱数（rnd）」の3つだけ（GoatCounter の /count の決まった名前）。
 * analytics_beacon.js から使われる。tests/analytics_path.test.js でテストする。
 */

// 送り先として認める形：英小文字・数字・ハイフンのサイトコード ＋ ".goatcounter.com"。
// 「*.goatcounter.com」のような広い許可や、ほかのサイトへの送信を防ぐため、この形だけにする
const ANALYTICS_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.goatcounter\.com$/;
// GoatCounter が閲覧を受け取る場所（公式ドキュメントの「Tracking pixel」）
const ANALYTICS_COUNT_PATH = "/count";
// 日記1件のページ。このページだけ、日付（?date=）を付けて日ごとに数える
const ANALYTICS_ENTRY_PAGE_PATH = "/diary/entry.html";
// 日記の日付として付けてよい形（YYYY-MM-DD）。それ以外の値は外へ送らない
const ANALYTICS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// 参照元のサイト名として認める文字（読者の環境から来る値をそのまま外へ送らないため、形を確かめる）
const ANALYTICS_REFERRER_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:$/;
const ANALYTICS_REFERRER_HOST_PATTERN = /^[a-z0-9.-]+$/;
// 送り先の設定が正しくないときに、コンソール（開発者用の画面）に出す文
const ANALYTICS_HOST_WARNING = "計測の送り先の設定が正しくないため、計測していません。site_config.js の ANALYTICS_HOST を確認してください（例：サイトコード.goatcounter.com）";

/**
 * 送り先のホスト名が「サイトコード.goatcounter.com」の形かを確かめる。
 * @param {string} host 設定の ANALYTICS_HOST
 * @returns {boolean} 形が正しければ true
 * @example isValidAnalyticsHost("abc.goatcounter.com") // true
 * @example isValidAnalyticsHost("evil.goatcounter.com.example.com") // false
 */
function isValidAnalyticsHost(host) {
  if (typeof host !== "string") {
    return false;
  }
  return ANALYTICS_HOST_PATTERN.test(host);
}

/**
 * 送るページの場所を作る。# 以降とクエリ（? 以降）は捨てる。日記1件のページだけ、正しい形の日付を ?date= で付ける。
 * @param {string} pathname ページの場所（location.pathname）
 * @param {string} search クエリ（location.search。例 "?date=2026-11-15"）
 * @returns {string} 送るページの場所
 * @example buildPagePath("/diary/entry.html", "?date=2026-11-15&utm_source=x") // "/diary/entry.html?date=2026-11-15"
 * @example buildPagePath("/diary/entry.html", "?date=abc") // "/diary/entry.html"
 */
function buildPagePath(pathname, search) {
  let pagePath = "/";
  if (typeof pathname === "string" && pathname.startsWith("/")) {
    pagePath = pathname;
  }
  if (pagePath !== ANALYTICS_ENTRY_PAGE_PATH) {
    return pagePath;
  }
  const entryDate = readEntryDate(search);
  if (entryDate === "") {
    return pagePath;
  }
  return pagePath + "?date=" + entryDate;
}

/**
 * クエリから日記の日付（date）を取り出す。YYYY-MM-DD の形でなければ空を返す。
 * @param {string} search クエリ（例 "?date=2026-11-15"）
 * @returns {string} 日付、または ""
 * @example readEntryDate("?date=2026-11-15") // "2026-11-15"
 */
function readEntryDate(search) {
  if (typeof search !== "string") {
    return "";
  }
  const dateValue = new URLSearchParams(search).get("date");
  if (dateValue === null || !ANALYTICS_DATE_PATTERN.test(dateValue)) {
    return "";
  }
  return dateValue;
}

/**
 * 参照元（document.referrer）から、サイト名（例 "https://www.tiktok.com"）だけを取り出す。
 * パス・クエリは送らない（共有リンクに含まれる識別子を外へ送らないため）。読めないときは空にする。
 * @param {string} referrer 参照元のURL
 * @returns {string} サイト名、または ""
 * @example buildReferrerSite("https://www.tiktok.com/@yu_from_l2w/video/123?lang=ja") // "https://www.tiktok.com"
 */
function buildReferrerSite(referrer) {
  if (typeof referrer !== "string" || referrer === "") {
    return "";
  }
  let parsed;
  try {
    parsed = new URL(referrer);
  } catch (error) {
    return "";
  }
  const protocol = parsed.protocol.toLowerCase();
  const hostName = parsed.hostname.toLowerCase();
  if (!ANALYTICS_REFERRER_PROTOCOL_PATTERN.test(protocol) || !ANALYTICS_REFERRER_HOST_PATTERN.test(hostName)) {
    return "";
  }
  return protocol + "//" + hostName;
}

/**
 * 送信用のURLを組み立てる。送り先は https:// ＋ 設定のホスト名に固定し、値は p・r・rnd の3つだけにする。
 * @param {string} host 送り先（形を確かめ済みの ANALYTICS_HOST）
 * @param {string} pagePath 送るページの場所
 * @param {string} referrerSite 参照元のサイト名（無ければ ""）
 * @param {string} randomValue キャッシュ回避の値（人を区別する値にはしない）
 * @returns {string} 送信用のURL
 * @example buildCountUrl("abc.goatcounter.com", "/", "", "k3x") // "https://abc.goatcounter.com/count?p=%2F&r=&rnd=k3x"
 */
function buildCountUrl(host, pagePath, referrerSite, randomValue) {
  const query = "p=" + encodeURIComponent(pagePath)
    + "&r=" + encodeURIComponent(referrerSite)
    + "&rnd=" + encodeURIComponent(randomValue);
  return "https://" + host + ANALYTICS_COUNT_PATH + "?" + query;
}

/**
 * ブラウザが「トラッキングしない」を求めているかを確かめる。
 * @param {{ doNotTrack: (string|null|undefined), globalPrivacyControl: (boolean|undefined) }} privacy ブラウザの設定
 * @returns {boolean} 求めていれば true
 * @example isTrackingRefused({ doNotTrack: "1" }) // true
 */
function isTrackingRefused(privacy) {
  if (!privacy) {
    return false;
  }
  return privacy.doNotTrack === "1" || privacy.globalPrivacyControl === true;
}

/**
 * 設定とページの情報から、計測を送るかどうかと送信用URLを決める。1つでも当てはまれば送らない：
 * 計測を止めている／送り先の形が正しくない（このときだけコンソール用の文を返す）／公開サイトの https でない／「トラッキングしない」。
 * @param {{ ANALYTICS_ENABLED: boolean, ANALYTICS_HOST: string, ANALYTICS_PUBLIC_HOST: string }} config site_config.js の設定
 * @param {{ protocol: string, hostname: string, pathname: string, search: string, referrer: string,
 *   doNotTrack: (string|null|undefined), globalPrivacyControl: (boolean|undefined), randomValue: string }} page ページとブラウザの情報
 * @returns {{ send: boolean, url: string, warning: string }} 送るか・送信用URL（送らないときは ""）・コンソールに出す文（無ければ ""）
 * @example planPageView(config, { protocol: "https:", hostname: "yu-ceo.github.io", pathname: "/", search: "", referrer: "", randomValue: "a1" })
 */
function planPageView(config, page) {
  const skip = { send: false, url: "", warning: "" };
  if (!config || config.ANALYTICS_ENABLED !== true) {
    return skip;
  }
  // 送り先の確認を、公開サイトかどうかの確認より先にする（手元で開いたときにも設定の間違いに気づけるように）
  if (!isValidAnalyticsHost(config.ANALYTICS_HOST)) {
    return { send: false, url: "", warning: ANALYTICS_HOST_WARNING };
  }
  // 手元の確認（localhost・file://）の閲覧が数字に混ざらないよう、公開サイトの https だけで送る
  if (page.protocol !== "https:" || page.hostname !== config.ANALYTICS_PUBLIC_HOST) {
    return skip;
  }
  if (isTrackingRefused(page)) {
    return skip;
  }
  const pagePath = buildPagePath(page.pathname, page.search);
  const referrerSite = buildReferrerSite(page.referrer);
  const url = buildCountUrl(config.ANALYTICS_HOST, pagePath, referrerSite, page.randomValue);
  return { send: true, url: url, warning: "" };
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    planPageView,
    isValidAnalyticsHost,
    buildPagePath,
    readEntryDate,
    buildReferrerSite,
    buildCountUrl,
    isTrackingRefused,
    ANALYTICS_HOST_WARNING
  };
}
