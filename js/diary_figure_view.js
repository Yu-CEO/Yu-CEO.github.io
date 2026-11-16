/*
 * diary_figure_view.js：新しい形の日記の「図」（diary/figures/YYYY-MM-DD.svg）を表示する部品を作る
 * 図の場所はデータの文字からは決めず、検査を通った日付（date）から「figures/<日付>.svg」と組み立てる（別のファイルを読ませないため）。
 * 図は必ず <img> で表示する（<img> で読んだSVGは、中のプログラムが動かず、外部も読みに行かない）。説明文は alt 属性に、caption は文字として入れる。
 * 読み込めないときは、図と caption の場所だけを隠す（本文はそのまま読める）。
 * 主な関数：createDiaryFigure（図の部品を作る）。diary_story_view.js から使われる。tests/diary_story_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
}

// 図のファイル名の後ろにつける文字（例 "2026-11-17" ＋ ".svg"）
const DIARY_FIGURE_SUFFIX = ".svg";
// 図を描くときの座標の幅と高さ（ブログライター向けの見本と同じ幅300）。読み込む前に場所を取って、表示のずれを防ぐ
const DIARY_FIGURE_WIDTH = 300;
const DIARY_FIGURE_HEIGHT = 300;

/**
 * 図の部品（白いふちの中の <img> と、下の「図」の札＋caption）を作る。
 * 日付が YYYY-MM-DD の形でないときは null を返し、何も読みに行かない（念のための二重の確認）。
 * @param {{ date: string, figure: { alt: string, caption: string } }} entry 検査を通った新しい形の日記（figure がある日）
 * @param {string} figureFolder diary/figures/ の場所（1件のページからは "figures/"）
 * @returns {HTMLElement|null} 図の部品
 * @example createDiaryFigure(entry, "figures/") // <figure> の中に <img src="figures/2026-11-17.svg">
 */
function createDiaryFigure(entry, figureFolder) {
  if (!isDiaryDate(entry.date)) {
    return null;
  }
  const figure = makeDiaryElement("figure", "d-fig", "");
  const frame = makeDiaryElement("div", "fig-frame", "");
  const image = makeDiaryElement("img", "", "");
  image.alt = entry.figure.alt;
  image.width = DIARY_FIGURE_WIDTH;
  image.height = DIARY_FIGURE_HEIGHT;
  image.decoding = "async";
  // 読み込めないときは、図と caption だけを隠す（本文は出したまま）
  image.addEventListener("error", function () {
    figure.hidden = true;
  });
  image.src = figureFolder + entry.date + DIARY_FIGURE_SUFFIX;
  frame.appendChild(image);
  const caption = makeDiaryElement("figcaption", "", "");
  caption.appendChild(makeDiaryElement("span", "fig-tag", "図"));
  caption.appendChild(makeDiaryElement("span", "", entry.figure.caption));
  figure.appendChild(frame);
  figure.appendChild(caption);
  return figure;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createDiaryFigure };
}
