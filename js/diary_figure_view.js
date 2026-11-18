/*
 * diary_figure_view.js：新しい形の日記の「図」（diary/figures/YYYY-MM-DD.svg。3版目は2枚目 YYYY-MM-DD-2.svg も）を表示する部品を作る
 * 図の場所はデータの文字からは決めず、検査を通った日付（date）と決まった文字（.svg・-2.svg）から「figures/<日付>.svg」と組み立てる（別のファイルを読ませないため）。
 * 図は必ず <img> で表示する（<img> で読んだSVGは、中のプログラムが動かず、外部も読みに行かない）。説明文は alt 属性に、caption は文字として入れる。
 * 読み込めないときは、図と caption の場所だけを隠す（本文はそのまま読める）。
 * 主な関数：createDiaryFigure（図の部品を作る）。diary_story_view.js と〔v4〕3版目の diary_story3_view.js から使われる。tests/diary_story_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
}

// 図のファイル名の後ろにつける文字（例 "2026-11-17" ＋ ".svg"）。2枚目は "-2.svg"（決まった文字だけ。データからは決めない）
const DIARY_FIGURE_SUFFIXES = { 1: ".svg", 2: "-2.svg" };
// 図を描くときの座標の幅と高さ（ブログライター向けの見本と同じ幅300）。読み込む前に場所を取って、表示のずれを防ぐ。2枚目（決定→結果のカード）は少し低い
const DIARY_FIGURE_WIDTH = 300;
const DIARY_FIGURE_HEIGHTS = { 1: 300, 2: 232 };
// 図の下の札の文字。2枚目は「まとめ」（読み分けるため）
const DIARY_FIGURE_TAGS = { 1: "図", 2: "まとめ" };

/**
 * 図の部品（白いふちの中の <img> と、下の「図」の札＋caption）を作る。
 * 日付が YYYY-MM-DD の形でないときは null を返し、何も読みに行かない（念のための二重の確認）。
 * @param {{ date: string, figure: { alt: string, caption: string }, figure2: { alt: string, caption: string } }} entry 検査を通った新しい形の日記
 * @param {string} figureFolder diary/figures/ の場所（1件のページからは "figures/"）
 * @param {number} [figureNumber] 何枚目か（1 か 2。書かなければ 1。2 は 3版目の figure2）
 * @returns {HTMLElement|null} 図の部品。その枚数の図の説明がない・日付の形が違うときは null
 * @example createDiaryFigure(entry, "figures/") // <figure> の中に <img src="figures/2026-11-17.svg">
 * @example createDiaryFigure(entry, "figures/", 2) // <img src="figures/2026-11-20-2.svg">
 */
function createDiaryFigure(entry, figureFolder, figureNumber) {
  let number = 1;
  if (figureNumber === 2) {
    number = 2;
  }
  const description = number === 2 ? entry.figure2 : entry.figure;
  if (!isDiaryDate(entry.date) || description === undefined) {
    return null;
  }
  const figure = makeDiaryElement("figure", "d-fig", "");
  const frame = makeDiaryElement("div", "fig-frame", "");
  const image = makeDiaryElement("img", "", "");
  image.alt = description.alt;
  image.width = DIARY_FIGURE_WIDTH;
  image.height = DIARY_FIGURE_HEIGHTS[number];
  image.decoding = "async";
  // 図は本文の途中にあるので、見える場所に近づいてから読み込む（最初の表示を軽くするため）
  image.loading = "lazy";
  // 読み込めないときは、図と caption だけを隠す（本文は出したまま）
  image.addEventListener("error", function () {
    figure.hidden = true;
  });
  image.src = figureFolder + entry.date + DIARY_FIGURE_SUFFIXES[number];
  frame.appendChild(image);
  const caption = makeDiaryElement("figcaption", "", "");
  let tagClass = "fig-tag";
  if (number === 2) {
    tagClass += " is-summary";
  }
  caption.appendChild(makeDiaryElement("span", tagClass, DIARY_FIGURE_TAGS[number]));
  caption.appendChild(makeDiaryElement("span", "", description.caption));
  figure.appendChild(frame);
  figure.appendChild(caption);
  return figure;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createDiaryFigure };
}
