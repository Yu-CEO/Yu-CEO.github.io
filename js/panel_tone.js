/*
 * panel_tone.js：2枚目以降の明るいパネルに、薄いグレー → 白 → 薄いグレー…と交互に背景の色をつける
 * 対象はツール・LINEのパネルと、最下部の注意書き（注意書きも含む）。隣り合うパネルの色を変えて、区切りをわかりやすくするため。
 * 隠れているパネルは数えない。
 * 主な関数：chooseTone（何枚目かから色を決める。画面に触れない）、paintPanelTones（画面のパネルに色をつける）
 * main.js から使われる。tests/panel_tone.test.js で chooseTone をテストする。
 */

// 交互に使う背景の色のクラス名（css/style.css の .tone-gray・.tone-white）。ヒーローの次の1枚目はグレー
const PANEL_TONES = ["tone-gray", "tone-white"];

/**
 * 明るいパネルの何枚目か（0から数える）から、背景の色のクラス名を決める。
 * @param {number} index 0から数えた順番
 * @returns {string} クラス名
 * @example chooseTone(0) // "tone-gray"
 * @example chooseTone(1) // "tone-white"
 */
function chooseTone(index) {
  return PANEL_TONES[index % PANEL_TONES.length];
}

/**
 * 決まった場所にあるパネルのうち、表示されているものに、上から順に交互の背景の色をつける。
 * LINEパネルを隠したあとに呼ぶ（隠れたパネルを飛ばして数えないと、同じ色が隣り合うため）。
 * @param {string} selector 色をつけるパネルを選ぶ書き方（CSSのセレクター）
 * @returns {void}
 * @example paintPanelTones("#tool-area .panel, #line-panel, #note")
 */
function paintPanelTones(selector) {
  const panels = Array.from(document.querySelectorAll(selector));
  const visiblePanels = panels.filter(function (panel) {
    return !panel.hidden;
  });
  visiblePanels.forEach(function (panel, index) {
    PANEL_TONES.forEach(function (tone) {
      panel.classList.remove(tone);
    });
    panel.classList.add(chooseTone(index));
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { chooseTone, paintPanelTones };
}
