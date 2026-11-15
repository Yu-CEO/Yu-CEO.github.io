/*
 * link_button.js：設定ファイルのURLをもとに、LINEボタン（とTikTokのリンク）を出すかどうかを決めて切り替える
 * 主な関数：shouldShowLinkButton（1つのボタンを出すかの判定）、decideLineButtons（LINEの2つのボタンとパネルを出すかの判定）
 *           ※この2つは画面に触れない。applyLinkButton（画面のボタンに反映する）、setPanelVisible（パネルごと出す・隠す）
 * TikTokのリンク（固定バー・ヒーローの丸いボタン）も「URLが正しいときだけ出す」という同じルールなので、この関数を使う。
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
 * LINEの2つのボタン（オープンチャット・公式アカウント）と、LINEパネルそのものを出すかどうかを決める。
 * 2つとも出せないときはパネルごと隠す（空のパネルを残さない。決定済みのルール）。
 * ヒーローの「オープンチャットに参加」も showOpenchat で出し分ける。
 * @param {*} openchatUrl 設定ファイルのオープンチャットのURL
 * @param {*} officialUrl 設定ファイルの公式アカウントのURL
 * @returns {{ showOpenchat: boolean, showOfficial: boolean, showPanel: boolean }} それぞれ出すなら true
 * @example decideLineButtons("https://line.me/x", "")  // { showOpenchat: true, showOfficial: false, showPanel: true }
 * @example decideLineButtons("", "")                   // { showOpenchat: false, showOfficial: false, showPanel: false }
 */
function decideLineButtons(openchatUrl, officialUrl) {
  const showOpenchat = shouldShowLinkButton(openchatUrl);
  const showOfficial = shouldShowLinkButton(officialUrl);
  return {
    showOpenchat: showOpenchat,
    showOfficial: showOfficial,
    showPanel: showOpenchat || showOfficial
  };
}

/**
 * パネル（など画面の一区切り）を、出すか隠すかを切り替える。
 * @param {string} elementId パネルの id（index.html に書いたもの）
 * @param {boolean} visible 出すなら true
 * @returns {void}
 * @example setPanelVisible("line-panel", false)
 */
function setPanelVisible(elementId, visible) {
  const panel = document.getElementById(elementId);
  if (panel === null) {
    console.warn("id「" + elementId + "」のパネルが index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return;
  }
  panel.hidden = !visible;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { shouldShowLinkButton, decideLineButtons, applyLinkButton, setPanelVisible };
}
