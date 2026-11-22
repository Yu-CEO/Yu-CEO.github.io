/*
 * diary_validate_format3_parts.js：3版目の日記の検査を「項目の名前」「文章の項目」「図と入口画像」「強調の数・合計・今日の一言」に分けて呼ぶ組み立て部分と、そこで使う定数
 * 主な関数：checkFormat3Fields・checkFormat3Texts・checkFormat3Media・checkFormat3Counts
 * 使うもの：diary_validate_format3.js の検査の部品（checkMarkedText など。ブラウザでは同じ名前が共有され、呼ばれるときに探す）・
 *   diary_validate_format3_media.js・diary_format3_counts.js・diary_pick.js・diary_validate.js。
 * diary_validate_format3.js（findFormat3Problems）から使われる。tests/diary_validate_format3.test.js・tests/diary_v5.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.checkPick = require("./diary_validate.js").checkPick;
  globalThis.findPickLengthProblems = require("./diary_pick.js").findPickLengthProblems;
  const mediaParts = require("./diary_validate_format3_media.js");
  globalThis.checkFigureDescription = mediaParts.checkFigureDescription;
  globalThis.checkHeroDescription = mediaParts.checkHeroDescription;
  const countParts = require("./diary_format3_counts.js");
  globalThis.checkMarkupCounts = countParts.checkMarkupCounts;
  globalThis.checkFormat3Total = countParts.checkFormat3Total;
}

// 3版目の日記に書いてよい項目の名前。これ以外の項目があると形の誤りにする
const FORMAT3_ALLOWED_FIELDS = [
  "format", "date", "title", "summary", "problem", "lines", "decision", "result", "takeaway", "pick", "figure", "figure2", "figure3", "hero"
];
// 旧形式だけの項目。3版目に混ざっていたら、分かりやすい理由で止める
const FORMAT3_OLD_ONLY_FIELDS = ["agenda", "decisions", "lessons"];
// 文字の長さの上限（記号を除いた、読者に見える文字数）
const FORMAT3_MAX_TITLE = 40;
const FORMAT3_MAX_SUMMARY = 120;
// 〔v5〕decision は 200 字（決定＋理由を2〜3文で書ける長さ。2版目の 120 字は変えない）
const FORMAT3_MAX_DECISION = 200;
// 文の配列の決まり：min〜max 個・1つあたり maxLength 文字まで
// 〔v5〕長めの日記のため広げた値（requirements_diary.md 2-2-5）。2版目・旧形式の上限は別のファイルにあり、変えない
const FORMAT3_LIST_RULES = {
  problem: { min: 1, max: 5, maxLength: 300 },
  result: { min: 1, max: 4, maxLength: 200 }
};

/**
 * 項目の名前が決まったものだけかを調べる。旧形式の項目は「混ざっている」という理由にする。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Fields({ format: 3, agenda: [] }, problems)
 */
function checkFormat3Fields(entry, problems) {
  Object.keys(entry).forEach(function (fieldName) {
    if (FORMAT3_OLD_ONLY_FIELDS.includes(fieldName)) {
      problems.push("3版目の日記に、旧形式の項目「" + fieldName + "」が混ざっています");
    } else if (!FORMAT3_ALLOWED_FIELDS.includes(fieldName)) {
      problems.push("決まっていない項目「" + fieldName + "」があります");
    }
  });
}

/**
 * 見出し・抜粋・問題・意見・決定・結果・今日の学び・今日の一言の番号を調べる。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Texts(entry, problems)
 */
function checkFormat3Texts(entry, problems) {
  checkPlainText(entry.title, "「title」", FORMAT3_MAX_TITLE, problems);
  checkPlainText(entry.summary, "「summary」", FORMAT3_MAX_SUMMARY, problems);
  checkMarkedList(entry.problem, "problem", FORMAT3_LIST_RULES.problem, problems);
  checkMarkedLines(entry.lines, problems);
  checkMarkedText(entry.decision, "「decision」", FORMAT3_MAX_DECISION, problems);
  checkMarkedList(entry.result, "result", FORMAT3_LIST_RULES.result, problems);
  checkTakeaway(entry.takeaway, problems);
  checkPick(entry.pick, entry.lines, problems);
}

/**
 * 図（3枚まで）と入口画像の説明を調べる。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Media(entry, problems)
 */
function checkFormat3Media(entry, problems) {
  checkFigureDescription(entry.figure, "figure", problems);
  checkFigureDescription(entry.figure2, "figure2", problems);
  checkFigureDescription(entry.figure3, "figure3", problems);
  checkHeroDescription(entry.hero, problems);
}

/**
 * 強調の数・本文の合計・今日の一言の長さを調べる。形が正しい日記だけに使う。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Counts(entry, problems)
 */
function checkFormat3Counts(entry, problems) {
  checkMarkupCounts(entry, problems);
  checkFormat3Total(entry, problems);
  // 〔v5〕今日の一言は60字以内（セリフの文字が確かに文字列だと分かってから数える）
  findPickLengthProblems(entry).forEach(function (problem) {
    problems.push(problem);
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkFormat3Fields, checkFormat3Texts, checkFormat3Media, checkFormat3Counts };
}
