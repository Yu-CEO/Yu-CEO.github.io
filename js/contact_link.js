/*
 * contact_link.js：お問い合わせフォームのURLが認める形かを判定し、リンクの設定（href・target・rel）を決める計算だけのファイル（画面には触れない）
 * 主な関数：isAllowedContactFormUrl（認める形かの判定）、buildContactLink（リンクの設定と、出せないときのコンソール用の文を返す）
 * 認めるのは https://forms.gle/… と https://docs.google.com/forms/… だけ（知らないサイトへ読者を送らないため）。
 * contact_main.js から使われる。tests/contact_link.test.js でテストする。
 */

// 認めるホスト名（forms.gle は Google フォームの短縮URL）
const CONTACT_SHORT_HOST = "forms.gle";
const CONTACT_DOCS_HOST = "docs.google.com";
// docs.google.com のときに、パスの先頭として認める部分（フォーム以外の Google ドキュメントを開かせないため）
const CONTACT_DOCS_PATH_PREFIX = "/forms/";
// フォームは別のサイトなので、新しいタブで開く。rel は「開いた先からこのページを操作させない・どのページから来たかを送らない」ため
const CONTACT_LINK_TARGET = "_blank";
const CONTACT_LINK_REL = "noopener noreferrer";
// URLが正しくないときに、コンソール（開発者用の画面）に出す文
const CONTACT_URL_WARNING = "お問い合わせフォームのURLが正しくないため、ボタンを出していません。site_config.js の CONTACT_FORM_URL を確認してください（forms.gle か docs.google.com/forms のGoogleフォームのURLを、https で始めて入れてください）";

/**
 * フォームのURLとして認める形かを判定する。
 * @param {*} url 設定ファイルの CONTACT_FORM_URL
 * @returns {boolean} 認める形なら true
 * @example isAllowedContactFormUrl("https://forms.gle/abc")        // true
 * @example isAllowedContactFormUrl("http://forms.gle/abc")         // false（https でない）
 * @example isAllowedContactFormUrl("https://forms.gle.example.com/x") // false（ホストが違う）
 */
function isAllowedContactFormUrl(url) {
  if (typeof url !== "string" || url === "") {
    return false;
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return false;
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    return false;
  }
  if (parsed.hostname === CONTACT_SHORT_HOST) {
    return true;
  }
  return parsed.hostname === CONTACT_DOCS_HOST && parsed.pathname.startsWith(CONTACT_DOCS_PATH_PREFIX);
}

/**
 * フォームへのリンクの設定を決める。出せないときは show が false で、warning に直し方の文が入る。
 * @param {*} url 設定ファイルの CONTACT_FORM_URL
 * @returns {{ show: boolean, href: string, target: string, rel: string, warning: string }} リンクの設定
 * @example buildContactLink("https://forms.gle/abc") // { show: true, href: "https://forms.gle/abc", target: "_blank", rel: "noopener noreferrer", warning: "" }
 * @example buildContactLink("")                      // { show: false, href: "", ..., warning: "お問い合わせフォームのURLが…" }
 */
function buildContactLink(url) {
  if (!isAllowedContactFormUrl(url)) {
    return { show: false, href: "", target: "", rel: "", warning: CONTACT_URL_WARNING };
  }
  return { show: true, href: url, target: CONTACT_LINK_TARGET, rel: CONTACT_LINK_REL, warning: "" };
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { isAllowedContactFormUrl, buildContactLink, CONTACT_URL_WARNING };
}
