/*
 * diary_format.js：日記1件の「形」を見分け、形に合った検査を呼び分ける入口。画面には触れない
 * 形の見分け：format がない＝旧形式（2026-11-15 以前だけ）／format が数字の 2＝2版目（2026-11-16 〜 2版目の最後の日だけ）／
 *   format が数字の 3＝3版目（2版目の最後の日の次の日以降だけ。太字・ハイライト・今日の学び・図2枚）／それ以外＝誤り
 * 主な関数：findEntryProblems（形を見分けて日記1件を検査する。空なら正しい）、isStoryEntry（2版目か）、isFormat3Entry（3版目か）
 * 使うもの：diary_validate.js（旧形式）・diary_validate_story.js（2版目）・diary_validate_format3.js（3版目）。
 * diary_load.js（画面）と tests/diary_data.test.js（CI）が同じこの関数を使う。tests/diary_format.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.findDiaryProblems = require("./diary_validate.js").findDiaryProblems;
  globalThis.findStoryProblems = require("./diary_validate_story.js").findStoryProblems;
  globalThis.findFormat3Problems = require("./diary_validate_format3.js").findFormat3Problems;
}

// 新しい形の印（"format": 2）。文字の "2" は認めない（書き間違いをそのまま通さないため）
const DIARY_STORY_FORMAT = 2;
// 新しい形を使い始める日。これより前は旧形式だけ、この日から後は新しい形だけを通す（古い形で書き続けるのを防ぐ）
const DIARY_STORY_FIRST_DATE = "2026-11-16";
// 3版目の印（"format": 3）。文字の "3" は認めない
const DIARY_FORMAT3_FORMAT = 3;
// 2版目の最後の日（公開済みの最後の2版目の日付。この1か所だけに書く）。これより後は3版目だけを通す（v4 公開のあとに2版目で書き続けるのを防ぐ）
const DIARY_STORY_LAST_DATE = "2026-11-18";

/**
 * 2版目（"format": 2）の日記かを調べる。
 * @param {*} entry 日記1件
 * @returns {boolean} 新しい形なら true
 * @example isStoryEntry({ format: 2 }) // true
 * @example isStoryEntry({ title: "旧形式" }) // false
 */
function isStoryEntry(entry) {
  return entry !== null && typeof entry === "object" && entry.format === DIARY_STORY_FORMAT;
}

/**
 * 3版目（"format": 3）の日記かを調べる。
 * @param {*} entry 日記1件
 * @returns {boolean} 3版目なら true
 * @example isFormat3Entry({ format: 3 }) // true
 * @example isFormat3Entry({ format: "3" }) // false
 */
function isFormat3Entry(entry) {
  return entry !== null && typeof entry === "object" && entry.format === DIARY_FORMAT3_FORMAT;
}

/**
 * 日付が、その形で使ってよい範囲かを調べ、問題を problems に足す（日付の形そのものは各形の検査が調べる）。
 * YYYY-MM-DD の形なら、文字の大小の比べ方がそのまま日付の前後になる。
 * @param {*} date 日記の日付
 * @param {number|null} formatNumber 形の番号（旧形式は null、2版目は 2、3版目は 3）
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkDateForFormat("2026-11-16", null, problems) // 旧形式なので問題が足される
 */
function checkDateForFormat(date, formatNumber, problems) {
  if (!isDiaryDate(date)) {
    return;
  }
  if (formatNumber === null && date >= DIARY_STORY_FIRST_DATE) {
    problems.push(DIARY_STORY_FIRST_DATE + " 以降の日記は、新しい形（\"format\": 2 か 3）で書いてください（旧形式は 2026-11-15 以前だけ）");
  }
  if (formatNumber === DIARY_STORY_FORMAT && date < DIARY_STORY_FIRST_DATE) {
    problems.push("新しい形（\"format\": 2）は " + DIARY_STORY_FIRST_DATE + " 以降の日付だけに使えます");
  }
  if (formatNumber === DIARY_STORY_FORMAT && date > DIARY_STORY_LAST_DATE) {
    problems.push(DIARY_STORY_LAST_DATE + " より後の日記は、3版目（\"format\": 3）で書いてください（2版目は " + DIARY_STORY_LAST_DATE + " まで）");
  }
  if (formatNumber === DIARY_FORMAT3_FORMAT && date <= DIARY_STORY_LAST_DATE) {
    problems.push("3版目（\"format\": 3）は " + DIARY_STORY_LAST_DATE + " より後の日付だけに使えます");
  }
}

/**
 * 日記1件の形を見分けて、形に合った検査をし、問題点を日本語の説明の一覧で返す。空の配列なら、正しい（表示・公開してよい）。
 * @param {*} entry 日記1件（JSONを読み込んだもの）
 * @param {string} fileDate ファイル名の日付（"YYYY-MM-DD"）
 * @returns {string[]} 問題点の説明の一覧
 * @example findEntryProblems({ format: 2, date: "2026-11-16", ... }, "2026-11-16") // []
 */
function findEntryProblems(entry, fileDate) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return ["日記のデータが { } の形になっていません"];
  }
  if (!Object.prototype.hasOwnProperty.call(entry, "format")) {
    const oldProblems = findDiaryProblems(entry, fileDate);
    checkDateForFormat(entry.date, null, oldProblems);
    return oldProblems;
  }
  if (entry.format === DIARY_STORY_FORMAT) {
    const storyProblems = findStoryProblems(entry, fileDate);
    checkDateForFormat(entry.date, DIARY_STORY_FORMAT, storyProblems);
    return storyProblems;
  }
  if (entry.format === DIARY_FORMAT3_FORMAT) {
    const format3Problems = findFormat3Problems(entry, fileDate);
    checkDateForFormat(entry.date, DIARY_FORMAT3_FORMAT, format3Problems);
    return format3Problems;
  }
  return ["「format」は数字の 2 か 3 だけが使えます（旧形式の日記には format を書きません）"];
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findEntryProblems, isStoryEntry, isFormat3Entry, DIARY_STORY_FIRST_DATE, DIARY_STORY_LAST_DATE };
}
