/*
 * diary_contents.js：自動公開の前に、その日の日記・index.json・図の中身を確かめる（requirements_diary.md 2-5 の②(b)）
 * 主な関数：checkDiaryContents（日付・index.json の変更・日記の検査・figure と図・図の検査・入口画像の検査をまとめて行う）、
 *   readRepoFile・readRepoText（リポジトリの中のファイルを読む。無いときをはっきり扱う）
 * 検査は js/diary_format.js・js/diary_svg_check.js（画面・CI と同じもの）を使う。
 * tools/diary_publish.js から使われる。tests/diary_publish.test.js で、練習用のリポジトリを使って確かめる。
 */
const fs = require("node:fs");
const path = require("node:path");
const changesRule = require("./diary_changes.js");
const fileMatch = require("./diary_file_match.js");
const git = require("./diary_git.js");
const { findEntryProblems } = require("../js/diary_format.js");
const { findSvgProblems } = require("../js/diary_svg_check.js");

// 入口画像（JPEG）の決まり。先頭3バイトが JPEG の印（FF D8 FF）であること・400KB 以下（ページを軽く保つため）
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const HERO_MAX_BYTES = 400 * 1024;

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
  return findEntryProblems(entry, plan.date)
    .concat(fileMatch.checkFigureMatch(entry, plan.hasFigure, plan.hasFigure2, plan.hasFigure3))
    .concat(fileMatch.checkHeroMatch(entry, plan.hasHero));
}

/**
 * 図1つ（SVG）を読み、図の検査をする。
 * @param {object} context 動かす場所
 * @param {string} filePath リポジトリの中の図の場所
 * @param {string} label 問題の頭につける名前（「図」「2枚目の図」）
 * @returns {string[]} 問題点（なければ空）
 * @example checkOneFigureFile(context, "diary/figures/2026-11-16.svg", "図")
 */
function checkOneFigureFile(context, filePath, label) {
  const file = readRepoText(context, filePath);
  if (file.problems.length > 0) {
    return file.problems;
  }
  return findSvgProblems(file.text).map(function (problem) {
    return label + "：" + problem;
  });
}

/**
 * その日の図（SVG。1枚目と、3版目は2・3枚目も）を読み、図の検査をする。図が無い日は何もしない。
 * @param {object} context 動かす場所
 * @param {{ date: string, hasFigure: boolean, hasFigure2: boolean, hasFigure3: boolean }} plan 変更の判定の結果
 * @returns {string[]} 問題点（なければ空）
 * @example checkFigureFile(context, { date: "2026-11-16", hasFigure: true, hasFigure2: false, hasFigure3: false })
 */
function checkFigureFile(context, plan) {
  let problems = [];
  if (plan.hasFigure) {
    problems = problems.concat(checkOneFigureFile(context, "diary/figures/" + plan.date + ".svg", "図"));
  }
  if (plan.hasFigure2) {
    problems = problems.concat(checkOneFigureFile(context, "diary/figures/" + plan.date + "-2.svg", "2枚目の図"));
  }
  if (plan.hasFigure3) {
    problems = problems.concat(checkOneFigureFile(context, "diary/figures/" + plan.date + "-3.svg", "3枚目の図"));
  }
  return problems;
}

/**
 * その日の入口画像（JPEG）の中身を確かめる（先頭が JPEG の印か・大きさが上限以内か）。入口画像が無い日は何もしない。
 * @param {object} context 動かす場所
 * @param {{ date: string, hasHero: boolean }} plan 変更の判定の結果
 * @returns {string[]} 問題点（なければ空）
 * @example checkHeroFile(context, { date: "2026-11-21", hasHero: true })
 */
function checkHeroFile(context, plan) {
  if (!plan.hasHero) {
    return [];
  }
  const filePath = "diary/heroes/" + plan.date + ".jpg";
  const content = readRepoFile(context, filePath);
  if (content === null) {
    return [filePath + " がありません"];
  }
  const problems = [];
  if (content.length < JPEG_SIGNATURE.length || !content.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) {
    problems.push("入口画像：JPEG の画像ではありません（先頭の印が違います）");
  }
  if (content.length > HERO_MAX_BYTES) {
    problems.push("入口画像：大きさが " + Math.floor(HERO_MAX_BYTES / 1024) + "KB を超えています（今は " + Math.ceil(content.length / 1024) + "KB）");
  }
  return problems;
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
    .concat(checkFigureFile(context, plan))
    .concat(checkHeroFile(context, plan));
}

module.exports = { readRepoFile, readRepoText, checkDiaryContents, hasUnicodeEscape };
