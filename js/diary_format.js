/*
 * diary_format.js：日記1件の「形」を見分け、形に合った検査を呼び分ける入口。画面には触れない
 * 形の見分け：format がない＝旧形式（2026-11-15 以前だけ）／format が数字の 2＝新しい形（2026-11-16 以降だけ）／それ以外＝誤り
 * 主な関数：findEntryProblems（形を見分けて日記1件を検査する。空なら正しい）、isStoryEntry（新しい形か）
 * 使うもの：diary_validate.js（旧形式）・diary_validate_story.js（新しい形）。
 * diary_load.js（画面）と tests/diary_data.test.js（CI）が同じこの関数を使う。tests/diary_format.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.findDiaryProblems = require("./diary_validate.js").findDiaryProblems;
  globalThis.findStoryProblems = require("./diary_validate_story.js").findStoryProblems;
}

// 新しい形の印（"format": 2）。文字の "2" は認めない（書き間違いをそのまま通さないため）
const DIARY_STORY_FORMAT = 2;
// 新しい形を使い始める日。これより前は旧形式だけ、この日から後は新しい形だけを通す（古い形で書き続けるのを防ぐ）
const DIARY_STORY_FIRST_DATE = "2026-11-16";

/**
 * 新しい形（"format": 2）の日記かを調べる。
 * @param {*} entry 日記1件
 * @returns {boolean} 新しい形なら true
 * @example isStoryEntry({ format: 2 }) // true
 * @example isStoryEntry({ title: "旧形式" }) // false
 */
function isStoryEntry(entry) {
  return entry !== null && typeof entry === "object" && entry.format === DIARY_STORY_FORMAT;
}

/**
 * 日付が、その形で使ってよい範囲かを調べ、問題を problems に足す（日付の形そのものは各形の検査が調べる）。
 * YYYY-MM-DD の形なら、文字の大小の比べ方がそのまま日付の前後になる。
 * @param {*} date 日記の日付
 * @param {boolean} isStory 新しい形なら true
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkDateForFormat("2026-11-16", false, problems) // 旧形式なので問題が足される
 */
function checkDateForFormat(date, isStory, problems) {
  if (!isDiaryDate(date)) {
    return;
  }
  if (isStory && date < DIARY_STORY_FIRST_DATE) {
    problems.push("新しい形（\"format\": 2）は " + DIARY_STORY_FIRST_DATE + " 以降の日付だけに使えます");
  }
  if (!isStory && date >= DIARY_STORY_FIRST_DATE) {
    problems.push(DIARY_STORY_FIRST_DATE + " 以降の日記は、新しい形（\"format\": 2）で書いてください（旧形式は 2026-11-15 以前だけ）");
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
    checkDateForFormat(entry.date, false, oldProblems);
    return oldProblems;
  }
  if (entry.format !== DIARY_STORY_FORMAT) {
    return ["「format」は数字の 2 だけが使えます（旧形式の日記には format を書きません）"];
  }
  const storyProblems = findStoryProblems(entry, fileDate);
  checkDateForFormat(entry.date, true, storyProblems);
  return storyProblems;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findEntryProblems, isStoryEntry, DIARY_STORY_FIRST_DATE };
}
