/*
 * link_button.js：設定ファイルのURLをもとに、LINEボタン（とTikTokボタン）を出すかどうかを決めて切り替える
 * 主な関数：shouldShowLinkButton（出すかどうかの判定。画面に触れない）、applyLinkButton（画面のボタンに反映する）、
 *           hideAreaIfNoButton（LINEボタンが1つもないとき、場所ごと隠す）
 * TikTokボタンも「URLが正しいときだけ出す」という同じルールなので、この関数を使う。
 * main.js から使われる。tests/link_button.test.js で判定をテストする。
 */

// ボタンのURLの先頭として認める文字。tools_validate.js のURLのルールと同じ（危ないリンクを防ぐため）。
// このファイルだけでテストできるように、ほかのファイルには頼らず、ここにも書いている。
// ルールを変えるときは、tools_validate.js の SAFE_TOOL_URL_PREFIX も同じように変える
const SAFE_BUTTON_URL_PREFIX = "https://";

/**
 * ボタンを出してよいURLかどうかを判定する。空・文字でない・https:// で始まらないときは出さない。
 * @param {*} url 設定ファイルに書かれたURL
 * @returns {boolean} 出してよいなら true
 * @example shouldShowLinkButton("https://lin.ee/abc")    // true
 * @example shouldShowLinkButton("")                      // false
 * @example shouldShowLinkButton("javascript:alert(1)")   // false
 */
function shouldShowLinkButton(url) {
  if (typeof url !== "string") {
    return false;
  }
  return url.startsWith(SAFE_BUTTON_URL_PREFIX);
}

/**
 * 画面のボタン（リンク）1つに、URLを入れて表示するか、隠すかを反映する。
 * 隠すときは hidden（要素を見えなくし、場所も取らなくする印）をつける。
 * @param {string} elementId ボタンの id（index.html に書いたもの）
 * @param {*} url 設定ファイルに書かれたURL
 * @returns {void}
 * @example applyLinkButton("line-openchat", SITE_CONFIG.LINE_OPENCHAT_URL)
 */
function applyLinkButton(elementId, url) {
  const button = document.getElementById(elementId);
  if (button === null) {
    console.warn("id「" + elementId + "」のボタンが index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return;
  }
  if (shouldShowLinkButton(url)) {
    button.href = url;
    button.hidden = false;
  } else {
    button.removeAttribute("href");
    button.hidden = true;
  }
}

/**
 * LINEボタンが1つも出ないときは、ボタンを入れている場所ごと隠す（何もない枠だけが見えないようにするため）。
 * @param {string} areaId ボタンを入れている場所の id
 * @returns {void}
 * @example hideAreaIfNoButton("line-area")
 */
function hideAreaIfNoButton(areaId) {
  const area = document.getElementById(areaId);
  if (area === null) {
    return;
  }
  const visibleButtons = area.querySelectorAll("a:not([hidden])");
  area.hidden = visibleButtons.length === 0;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { shouldShowLinkButton, applyLinkButton, hideAreaIfNoButton };
}
