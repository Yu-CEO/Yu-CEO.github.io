/*
 * diary_validate_story.js：新しい形（"format": 2）の日記1件が決まった形か、公開してはいけない書き方がないかを調べる。画面には触れない
 * 新しい形＝「1トピックの話」（何が問題だったか → 役員の意見 → Yu の決定 → 結果・学び、図があれば図の説明）。
 * 主な関数：findStoryProblems（新しい形の日記1件の問題点を日本語の一覧で返す。空なら正しい）、countStoryCharacters（本文の合計の文字数）
 * 使うもの：diary_validate.js の部品（checkText など）・diary_day.js（日付）。diary_format.js から使われる。
 * tests/diary_validate_story.test.js でテストする。形の見分けと「2026-11-16 以降だけ」の決まりは diary_format.js が調べる。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
// （ブラウザでは、先に読み込んだ <script> の関数がそのまま使える）
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  const oldFormatParts = require("./diary_validate.js");
  globalThis.countCharacters = oldFormatParts.countCharacters;
  globalThis.checkText = oldFormatParts.checkText;
  globalThis.checkUnknownFields = oldFormatParts.checkUnknownFields;
  globalThis.checkTextList = oldFormatParts.checkTextList;
  globalThis.checkLines = oldFormatParts.checkLines;
  globalThis.checkPick = oldFormatParts.checkPick;
}

// 新しい形の日記に書いてよい項目の名前。これ以外の項目があると形の誤りにする
const STORY_ALLOWED_FIELDS = ["format", "date", "title", "summary", "problem", "lines", "decision", "result", "pick", "figure"];
// 旧形式だけの項目。新しい形に混ざっていたら、分かりやすい理由で止める（古い形で書きかけたまま出さないため）
const STORY_OLD_ONLY_FIELDS = ["agenda", "decisions", "lessons"];
// 図の説明に書いてよい項目の名前
const STORY_FIGURE_FIELDS = ["alt", "caption"];
// 文字の長さの上限（文字数）
const STORY_MAX_TITLE = 40;
const STORY_MAX_SUMMARY = 120;
const STORY_MAX_DECISION = 120;
const STORY_MAX_FIGURE_ALT = 200;
const STORY_MAX_FIGURE_CAPTION = 60;
// 文の配列の決まり：min〜max 個・1つあたり maxLength 文字まで
const STORY_LIST_RULES = {
  problem: { min: 1, max: 3, maxLength: 200 },
  result: { min: 1, max: 3, maxLength: 120 }
};
// 本文の合計の文字数（見出し・抜粋・問題・意見・決定・結果と学び）。1〜3分で読める量。図の説明は数えない
const STORY_MIN_TOTAL = 300;
const STORY_MAX_TOTAL = 1500;

/**
 * 項目が決まったものだけかを調べる。旧形式の項目は「旧形式の項目が混ざっている」という理由にする。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkStoryFields({ format: 2, agenda: [] }, problems) // 「旧形式の項目「agenda」」が足される
 */
function checkStoryFields(entry, problems) {
  Object.keys(entry).forEach(function (fieldName) {
    if (STORY_OLD_ONLY_FIELDS.includes(fieldName)) {
      problems.push("新しい形の日記に、旧形式の項目「" + fieldName + "」が混ざっています");
    } else if (!STORY_ALLOWED_FIELDS.includes(fieldName)) {
      problems.push("決まっていない項目「" + fieldName + "」があります");
    }
  });
}

/**
 * 図の説明 figure を調べる。書かなくてよいが、書くなら { alt, caption } の形にする。
 * @param {*} figure 調べる値
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkStoryFigure({ alt: "図の説明", caption: "図の下の説明" }, problems) // 問題なし
 */
function checkStoryFigure(figure, problems) {
  if (figure === undefined) {
    return;
  }
  if (figure === null || typeof figure !== "object" || Array.isArray(figure)) {
    problems.push("「figure」が { } の形になっていません");
    return;
  }
  checkUnknownFields(figure, STORY_FIGURE_FIELDS, "「figure」に、", problems);
  checkText(figure.alt, "「figure」の「alt」", STORY_MAX_FIGURE_ALT, problems);
  checkText(figure.caption, "「figure」の「caption」", STORY_MAX_FIGURE_CAPTION, problems);
}

/**
 * 本文の合計の文字数を数える（見出し・抜粋・問題・意見・決定・結果と学び）。図の説明は数えない。形が正しいデータだけに使う。
 * @param {object} entry 新しい形の日記1件
 * @returns {number} 合計の文字数
 * @example countStoryCharacters(entry) // 410（テスト用の仮の日記 2026-11-17 の場合）
 */
function countStoryCharacters(entry) {
  const texts = [entry.title, entry.summary, entry.decision]
    .concat(entry.problem, entry.result)
    .concat(entry.lines.map(function (line) {
      return line.text;
    }));
  return texts.reduce(function (total, text) {
    return total + countCharacters(text);
  }, 0);
}

/**
 * 新しい形の日記1件の問題点を、日本語の説明の一覧で返す。空の配列なら、正しい。
 * format が 2 かどうか・日付が 2026-11-16 以降かどうかは、呼び出す側（diary_format.js）が調べる。
 * @param {*} entry 日記1件（JSONを読み込んだもの）
 * @param {string} fileDate ファイル名の日付（"YYYY-MM-DD"）。date と同じでなければ誤りにする
 * @returns {string[]} 問題点の説明の一覧
 * @example findStoryProblems(entry, "2026-11-16") // []
 */
function findStoryProblems(entry, fileDate) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return ["日記のデータが { } の形になっていません"];
  }
  const problems = [];
  checkStoryFields(entry, problems);
  if (!isDiaryDate(entry.date)) {
    problems.push("「date」が YYYY-MM-DD の形（実在する日付）になっていません");
  } else if (entry.date !== fileDate) {
    problems.push("「date」がファイル名の日付と違います");
  }
  checkText(entry.title, "「title」", STORY_MAX_TITLE, problems);
  checkText(entry.summary, "「summary」", STORY_MAX_SUMMARY, problems);
  checkTextList(entry.problem, "problem", STORY_LIST_RULES.problem, problems);
  checkLines(entry.lines, problems);
  checkText(entry.decision, "「decision」", STORY_MAX_DECISION, problems);
  checkTextList(entry.result, "result", STORY_LIST_RULES.result, problems);
  checkPick(entry.pick, entry.lines, problems);
  checkStoryFigure(entry.figure, problems);
  // 合計の文字数は、ほかの形が正しいときだけ数える（形が崩れていると正しく数えられないため）
  if (problems.length === 0) {
    const total = countStoryCharacters(entry);
    if (total < STORY_MIN_TOTAL || total > STORY_MAX_TOTAL) {
      problems.push("本文の合計が " + STORY_MIN_TOTAL + "〜" + STORY_MAX_TOTAL + " 文字になっていません（今は " + total + " 文字）");
    }
  }
  return problems;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findStoryProblems, countStoryCharacters };
}
