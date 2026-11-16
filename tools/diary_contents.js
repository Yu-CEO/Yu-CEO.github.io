/*
 * diary_contents.js：自動公開の前に、その日の日記・index.json・図の中身を確かめる（requirements_diary.md 2-5 の②(b)）
 * 主な関数：checkDiaryContents（日付・index.json の変更・日記の検査・figure と図・図の検査をまとめて行う）、
 *   readRepoFile・readRepoText（リポジトリの中のファイルを読む。無いときをはっきり扱う）
 * 検査は js/diary_format.js・js/diary_svg_check.js（画面・CI と同じもの）を使う。
 * tools/diary_publish.js から使われる。tests/diary_publish.test.js で、練習用のリポジトリを使って確かめる。
 */
const fs = require("node:fs");
const path = require("node:path");
const changesRule = require("./diary_changes.js");
const git = require("./diary_git.js");
const { findEntryProblems } = require("../js/diary_format.js");
const { findSvgProblems } = require("../js/diary_svg_check.js");

// JSON の「\u と16進数4文字」の書き方（例：ファイルに \u3042 と書くと、読み込んだあとは「あ」になる）。ファイルの文字のままの照合では「あ」と見えないので、すり抜けうる。
// 日記ではこの書き方を使わず、日本語はそのまま書く決まりにする（機密の言葉の照合を確実にするため）
const UNICODE_ESCAPE_PATTERN = /\\u[0-9a-fA-F]{4}/;
const UNICODE_ESCAPE_PROBLEM = "日記の JSON に \\uXXXX の書き方があります。日本語や記号はそのまま書いてください（機密の言葉の照合をすり抜けないため）";

/**
 * JSON の文字に「\u と16進数4文字」の書き方があるかを確かめる。
 * @param {string} text JSON の文字
 * @returns {boolean} あれば true
 * @example hasUnicodeEscape('{"a":"\\u3042"}') // true
 */
function hasUnicodeEscape(text) {
  return UNICODE_ESCAPE_PATTERN.test(text);
}

/**
 * リポジトリの中のファイルを読む。無ければ null。
 * @param {object} context 動かす場所
 * @param {string} filePath リポジトリの中の場所
 * @returns {Buffer|null} 中身
 * @example readRepoFile(context, "diary/entries/index.json")
 */
function readRepoFile(context, filePath) {
  const fullPath = path.join(context.repoDir, filePath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath) : null;
}

/**
 * JSON の文字を読み、読めなければ undefined を返す。
 * @param {string} text JSON の文字
 * @returns {*} 読んだ中身
 * @example parseJson("[1]") // [1]
 */
function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return undefined;
  }
}

/**
 * リポジトリの中の文字のファイルを読む。無いときは、中身の代わりに「ありません」という問題を返す。
 * @param {object} context 動かす場所
 * @param {string} filePath リポジトリの中の場所
 * @returns {{ text: string, problems: string[] }} 中身（無ければ ""）と問題点（あれば1つ）
 * @example readRepoText(context, "diary/entries/index.json") // { text: "[...]", problems: [] }
 */
function readRepoText(context, filePath) {
  const content = readRepoFile(context, filePath);
  if (content === null) {
    return { text: "", problems: [filePath + " がありません"] };
  }
  return { text: content.toString("utf8"), problems: [] };
}

/**
 * index.json が「前の commit の一覧の最後に、その日の日付を1つ足しただけ」かを確かめる。
 * @param {object} context 動かす場所・run
 * @param {string} date 日記の日付
 * @returns {string[]} 問題点（なければ空）
 * @example checkIndexFile(context, "2026-11-16")
 */
function checkIndexFile(context, date) {
  const current = readRepoText(context, "diary/entries/index.json");
  if (current.problems.length > 0) {
    return current.problems;
  }
  const previousIndex = parseJson(git.readCommittedFile(context.run, "diary/entries/index.json"));
  return changesRule.checkIndexChange(previousIndex, parseJson(current.text), date);
}

/**
 * その日の日記の JSON を読み、検査（画面・CI と同じもの）と、figure と図のファイルが合うかを確かめる。
 * @param {object} context 動かす場所
 * @param {{ date: string, hasFigure: boolean }} plan 変更の判定の結果
 * @returns {string[]} 問題点（なければ空）
 * @example checkEntryFile(context, { date: "2026-11-16", hasFigure: false })
 */
function checkEntryFile(context, plan) {
  const file = readRepoText(context, "diary/entries/" + plan.date + ".json");
  if (file.problems.length > 0) {
    return file.problems;
  }
  if (hasUnicodeEscape(file.text)) {
    return [UNICODE_ESCAPE_PROBLEM];
  }
  const entry = parseJson(file.text);
  if (entry === undefined) {
    return ["日記の JSON を読めません（書き方を確かめてください）"];
  }
  return findEntryProblems(entry, plan.date).concat(changesRule.checkFigureMatch(entry, plan.hasFigure));
}

/**
 * その日の図（SVG）を読み、図の検査をする。図が無い日は何もしない。
 * @param {object} context 動かす場所
 * @param {{ date: string, hasFigure: boolean }} plan 変更の判定の結果
 * @returns {string[]} 問題点（なければ空）
 * @example checkFigureFile(context, { date: "2026-11-16", hasFigure: true })
 */
function checkFigureFile(context, plan) {
  if (!plan.hasFigure) {
    return [];
  }
  const file = readRepoText(context, "diary/figures/" + plan.date + ".svg");
  if (file.problems.length > 0) {
    return file.problems;
  }
  return findSvgProblems(file.text).map(function (problem) {
    return "図：" + problem;
  });
}

/**
 * その日の日記・index.json・図の中身を確かめる（日付・index の変更・日記の検査・figure と図・図の検査）。
 * @param {object} context 動かす場所・run・today
 * @param {{ date: string, hasFigure: boolean }} plan 変更の判定の結果
 * @returns {string[]} 問題点（なければ空）
 * @example checkDiaryContents(context, { date: "2026-11-16", hasFigure: false })
 */
function checkDiaryContents(context, plan) {
  return changesRule.checkPublishDate(plan.date, context.today)
    .concat(checkIndexFile(context, plan.date))
    .concat(checkEntryFile(context, plan))
    .concat(checkFigureFile(context, plan));
}

module.exports = { readRepoFile, readRepoText, checkDiaryContents, hasUnicodeEscape };
