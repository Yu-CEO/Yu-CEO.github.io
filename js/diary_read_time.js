/*
 * diary_read_time.js：3版目の日記の「読む目安 約N分」を計算する。画面には触れない
 * 主な関数：calcReadMinutes（本文の合計の文字数から分数を出す）、formatReadTimeLabel（「読む目安 約N分」の文字を作る）
 * 使うもの：diary_format3_counts.js の countFormat3Characters（記号を除いた本文の合計）。diary_entry_view.js（紺の帯）から使われる。
 * tests/diary_v5.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.countFormat3Characters = require("./diary_format3_counts.js").countFormat3Characters;
}

// 1分で読める文字数。日本語の読み物の目安（500字／分。requirements_diary.md 1章と同じ）
const READ_CHARACTERS_PER_MINUTE = 500;
// 目安の最小の分数。短い日でも「約0分」とは出さないため
const READ_MINUTES_MIN = 1;

/**
 * 本文の合計の文字数（記号を除く）から、読む目安の分数を出す。÷500 を四捨五入し、最小は1分。
 * @param {number} characterCount 本文の合計の文字数
 * @returns {number} 分数（1以上の整数）
 * @example calcReadMinutes(2500) // 5
 * @example calcReadMinutes(600) // 1
 */
function calcReadMinutes(characterCount) {
  const minutes = Math.round(characterCount / READ_CHARACTERS_PER_MINUTE);
  return Math.max(READ_MINUTES_MIN, minutes);
}

/**
 * 3版目の日記1件の「読む目安 約N分」の文字を作る。
 * @param {object} entry 検査を通った3版目の日記1件
 * @returns {string} 例：「読む目安 約5分」
 * @example formatReadTimeLabel(entry) // "読む目安 約5分"
 */
function formatReadTimeLabel(entry) {
  return "読む目安 約" + calcReadMinutes(countFormat3Characters(entry)) + "分";
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { calcReadMinutes, formatReadTimeLabel };
}
