/*
 * diary_takeaway_view.js：3版目の「今日の学び」の枠（本文の最後の薄い黄色の枠）を作る
 * takeaway がない日は何も作らない（空の枠や余白を残さない）。文は diary_markup_view.js で強調つきで入れる。
 * 主な関数：createTakeawayBox。diary_story3_view.js から使われる。tests/diary_story3_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.appendMarkedText = require("./diary_markup_view.js").appendMarkedText;
}

// 枠の小見出し。読み上げ用の名前（aria-label）にも同じ文字を使う
const TAKEAWAY_LABEL = "今日の学び";

/**
 * 「今日の学び」の枠（小見出し＋1文）を作る。
 * @param {string|undefined} takeaway 今日の学び（なければ undefined）
 * @returns {HTMLElement|null} 枠の要素。takeaway がなければ null
 * @example createTakeawayBox("図にすると文章が減る。")
 */
function createTakeawayBox(takeaway) {
  if (typeof takeaway !== "string") {
    return null;
  }
  const box = makeDiaryElement("section", "d-take", "");
  box.setAttribute("aria-label", TAKEAWAY_LABEL);
  box.appendChild(makeDiaryElement("p", "take-label", TAKEAWAY_LABEL));
  const sentence = makeDiaryElement("p", "take-text", "");
  appendMarkedText(sentence, takeaway);
  box.appendChild(sentence);
  return box;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createTakeawayBox };
}
