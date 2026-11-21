/*
 * diary_file_match.js：日記の JSON の figure・figure2・hero と、図・入口画像のファイルの有無が合っているかを確かめる（計算だけ。ファイルには触れない）
 * 主な関数：checkFigureMatch（figure・figure2 と図のファイル）、checkHeroMatch（hero と入口画像のファイル）
 * 足りないファイルは足せばそのまま出せるので、その場合は「通常の /dev フロー」の文を付けない。ファイルが余っているときは付ける。
 * tools/diary_contents.js から使われる。tests/diary_changes.test.js・tests/diary_hero.test.js でテストする。
 */
const { NEEDS_DEV_FLOW_MESSAGE } = require("./diary_changes.js");

/**
 * 日記の JSON の figure・figure2 と、図のファイル（<日付>.svg・<日付>-2.svg）があるかが合っているかを確かめる。
 * @param {object} entry 日記のデータ
 * @param {boolean} hasFigureFile 図（1枚目）のファイルがあるか
 * @param {boolean} [hasFigure2File] 2枚目の図のファイルがあるか（書かなければ「ない」）
 * @returns {string[]} 問題点（なければ空）
 * @example checkFigureMatch({ figure: { alt: "a", caption: "b" } }, false) // ["日記に figure があるのに、図のファイルがありません"]
 */
function checkFigureMatch(entry, hasFigureFile, hasFigure2File) {
  const hasFigureItem = Boolean(entry) && entry.figure !== undefined;
  const hasFigure2Item = Boolean(entry) && entry.figure2 !== undefined;
  const problems = [];
  // 図のファイルを足せば、このまま自動で出せる（ほかの変更ではない）ので、足りないときは「通常の /dev フロー」の文は付けない
  if (hasFigureItem && !hasFigureFile) {
    problems.push("日記に figure があるのに、図のファイルがありません");
  }
  if (!hasFigureItem && hasFigureFile) {
    problems.push("日記に figure がないのに、図のファイルがあります", NEEDS_DEV_FLOW_MESSAGE);
  }
  if (hasFigure2Item && !hasFigure2File) {
    problems.push("日記に figure2 があるのに、2枚目の図のファイル（-2.svg）がありません");
  }
  if (!hasFigure2Item && hasFigure2File) {
    problems.push("日記に figure2 がないのに、2枚目の図のファイル（-2.svg）があります", NEEDS_DEV_FLOW_MESSAGE);
  }
  return problems;
}

/**
 * 日記の JSON の hero と、入口画像のファイル（<日付>.jpg）があるかが合っているかを確かめる。
 * @param {object} entry 日記のデータ
 * @param {boolean} hasHeroFile 入口画像のファイルがあるか
 * @returns {string[]} 問題点（なければ空）
 * @example checkHeroMatch({ hero: { alt: "a" } }, false) // ["日記に hero があるのに、入口画像のファイル（heroes/<日付>.jpg）がありません"]
 */
function checkHeroMatch(entry, hasHeroFile) {
  const hasHeroItem = Boolean(entry) && entry.hero !== undefined;
  const problems = [];
  // ファイルを足せば、このまま自動で出せるので、足りないときは「通常の /dev フロー」の文は付けない（図と同じ）
  if (hasHeroItem && !hasHeroFile) {
    problems.push("日記に hero があるのに、入口画像のファイル（heroes/<日付>.jpg）がありません");
  }
  if (!hasHeroItem && hasHeroFile) {
    problems.push("日記に hero がないのに、入口画像のファイルがあります", NEEDS_DEV_FLOW_MESSAGE);
  }
  return problems;
}

module.exports = { checkFigureMatch, checkHeroMatch };
