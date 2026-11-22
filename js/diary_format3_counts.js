/*
 * diary_format3_counts.js：3版目（"format": 3）の日記の「強調の数」と「本文の合計の文字数」を数える。画面には触れない
 * 主な関数：listMarkedBlocks（強調を書けるブロックの一覧）、checkMarkupCounts（ハイライト・太字の数の上限）、
 *   countFormat3Characters（記号を除く本文の合計）、checkFormat3Total（合計が範囲内か）
 * 使うもの：diary_markup.js。diary_validate_format3.js と tools/diary_plain_text.js から使われる。tests/diary_validate_format3.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.countCharacters = require("./diary_validate.js").countCharacters;
  const markupParts = require("./diary_markup.js");
  globalThis.countVisibleCharacters = markupParts.countVisibleCharacters;
  globalThis.countMarkupUses = markupParts.countMarkupUses;
}

// 本文の合計の文字数（見出し・抜粋・問題・意見・決定・結果・今日の学び）。記号を除いて数える。図の説明は数えない
const FORMAT3_MIN_TOTAL = 300;
// 〔v5〕上限は3,000字（約2,500字の日記に、見出し・抜粋・今日の学びと書き足しの余裕 約2割を足した値。2版目の1,500字は変えない）
const FORMAT3_MAX_TOTAL = 3000;
// ハイライトは1記事に1か所まで・太字はブロックごとに1か所まで（書き方ルールの「強調は絞る」を機械で止める）
const FORMAT3_MAX_MARK_PER_ENTRY = 1;
const FORMAT3_MAX_STRONG_PER_BLOCK = 1;

/**
 * 強調を書けるブロックごとの文の一覧を返す（強調の数え方の単位。ブロック＝problem 全体／lines 全体／decision／result 全体／takeaway）。
 * 形が正しいデータだけに使う。
 * @param {object} entry 3版目の日記1件
 * @returns {{ name: string, texts: string[] }[]} ブロックの一覧
 * @example listMarkedBlocks(entry)[0].name // "problem"
 */
function listMarkedBlocks(entry) {
  const blocks = [
    { name: "problem", texts: entry.problem },
    { name: "lines", texts: entry.lines.map(function (line) { return line.text; }) },
    { name: "decision", texts: [entry.decision] },
    { name: "result", texts: entry.result }
  ];
  if (typeof entry.takeaway === "string") {
    blocks.push({ name: "takeaway", texts: [entry.takeaway] });
  }
  return blocks;
}

/**
 * 強調の数の上限を調べる（ハイライトは1記事に1か所まで・太字はブロックごとに1か所まで）。形が正しいデータだけに使う。
 * @param {object} entry 3版目の日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkMarkupCounts(entry, problems)
 */
function checkMarkupCounts(entry, problems) {
  let markTotal = 0;
  listMarkedBlocks(entry).forEach(function (block) {
    let strongInBlock = 0;
    block.texts.forEach(function (text) {
      const counts = countMarkupUses(text);
      strongInBlock += counts.strong;
      markTotal += counts.mark;
    });
    if (strongInBlock > FORMAT3_MAX_STRONG_PER_BLOCK) {
      problems.push("「" + block.name + "」の太字が " + strongInBlock + " か所あります（ブロックごとに " + FORMAT3_MAX_STRONG_PER_BLOCK + " か所まで）");
    }
  });
  if (markTotal > FORMAT3_MAX_MARK_PER_ENTRY) {
    problems.push("ハイライトが " + markTotal + " か所あります（1記事に " + FORMAT3_MAX_MARK_PER_ENTRY + " か所まで）");
  }
}

/**
 * 本文の合計の文字数を数える（記号を除く。見出し・抜粋・問題・意見・決定・結果・今日の学び）。図の説明は数えない。形が正しいデータだけに使う。
 * @param {object} entry 3版目の日記1件
 * @returns {number} 合計の文字数
 * @example countFormat3Characters(entry) // 640
 */
function countFormat3Characters(entry) {
  let total = countCharacters(entry.title) + countCharacters(entry.summary);
  listMarkedBlocks(entry).forEach(function (block) {
    block.texts.forEach(function (text) {
      total += countVisibleCharacters(text);
    });
  });
  return total;
}

/**
 * 本文の合計の文字数が 300〜3,000 文字かを調べ、外れていれば問題を足す。形が正しいデータだけに使う。
 * @param {object} entry 3版目の日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Total(entry, problems)
 */
function checkFormat3Total(entry, problems) {
  const total = countFormat3Characters(entry);
  if (total < FORMAT3_MIN_TOTAL || total > FORMAT3_MAX_TOTAL) {
    problems.push("本文の合計が " + FORMAT3_MIN_TOTAL + "〜" + FORMAT3_MAX_TOTAL + " 文字になっていません（今は " + total + " 文字）");
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { listMarkedBlocks, checkMarkupCounts, countFormat3Characters, checkFormat3Total };
}
