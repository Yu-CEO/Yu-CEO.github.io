/*
 * diary_plain_text.js：3版目の日記から「記号（** と ==）を外した文字」を、照合用に一時フォルダへ書き出す（requirements_diary.md 2-5-1）
 * なぜ：言葉の途中に ** を挟むと、行ごとの機密の言葉の照合をすり抜けるため。記号を外した文字でも同じ一覧と照合する。
 * 書き出すのは、強調を書ける項目（problem・lines の text・decision・result・takeaway）だけ。1項目＝1ファイル（<日付>__<項目>-<番号>.txt）。
 *   こうすると照合の結果（ファイル名と行番号）から「どの日付の、どの項目か」だけが分かり、言葉は出ない。
 *   2版目・旧形式は ** を強調として読まず、もとの文字のまま照合されるので、書き出さない。
 * 書き出し先がリポジトリの中なら止める（照合用の文字を公開物に混ぜないため）。照合のあとは removePlainTexts で消す。
 * 使い方（CI）：node tools/diary_plain_text.js <書き出し先のフォルダ> ／ 手元は tools/diary_publish.js が使う。
 * 部品：js/diary_markup.js（記号を外す）・js/diary_format3_counts.js（強調を書けるブロックの一覧）。tests/diary_plain_text.test.js でテストする。
 */
const fs = require("node:fs");
const path = require("node:path");
const { stripMarkup } = require("../js/diary_markup.js");
const { listMarkedBlocks } = require("../js/diary_format3_counts.js");

const ENTRIES_FOLDER = path.join("diary", "entries");
const INDEX_FILE_NAME = "index.json";
// 3版目の印（"format": 3）
const FORMAT3_NUMBER = 3;

/**
 * 書き出し先がリポジトリの外かを確かめる（中なら照合用の文字が公開物に混ざるため止める）。
 * @param {string} repoDir リポジトリの場所
 * @param {string} outputDir 書き出し先のフォルダ
 * @returns {boolean} 外なら true
 * @example isOutsideRepository("/repo", "/tmp/x") // true
 */
function isOutsideRepository(repoDir, outputDir) {
  const relative = path.relative(path.resolve(repoDir), path.resolve(outputDir));
  return relative.startsWith("..") || path.isAbsolute(relative);
}

/**
 * フォルダの中の日記（JSON）を日付の順に読む。読めないものは飛ばす（形の検査は別の仕組みが行う）。
 * @param {string} repoDir リポジトリの場所
 * @returns {{ date: string, entry: object }[]} 日付と日記の一覧
 * @example readAllEntries("/repo") // [{ date: "2026-11-20", entry: {...} }]
 */
function readAllEntries(repoDir) {
  const folder = path.join(repoDir, ENTRIES_FOLDER);
  if (!fs.existsSync(folder)) {
    return [];
  }
  const entries = [];
  fs.readdirSync(folder).sort().forEach(function (fileName) {
    if (!fileName.endsWith(".json") || fileName === INDEX_FILE_NAME) {
      return;
    }
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(folder, fileName), "utf8"));
      entries.push({ date: fileName.replace(/\.json$/, ""), entry: entry });
    } catch (error) {
      // 読めない JSON は、日記の検査（diary_contents.js）が止めるので、ここでは飛ばす
    }
  });
  return entries;
}

/**
 * 3版目の日記1件から、書き出す項目（ファイル名の元と、記号を外した文字）の一覧を作る。
 * 形が崩れていて強調のブロックを作れないときは、安全側として、読める文字の項目をできるだけ書き出す。
 * @param {object} entry 日記1件
 * @returns {{ name: string, text: string }[]} 項目の名前（"problem-1" など）と文字
 * @example listPlainItems(entry)[0] // { name: "problem-1", text: "…" }
 */
function listPlainItems(entry) {
  const items = [];
  let blocks = [];
  try {
    blocks = listMarkedBlocks(entry);
  } catch (error) {
    return items;
  }
  blocks.forEach(function (block) {
    block.texts.forEach(function (text, index) {
      if (typeof text === "string") {
        items.push({ name: block.name + "-" + (index + 1), text: stripMarkup(text) });
      }
    });
  });
  return items;
}

/**
 * 3版目の日記すべてから、記号を外した文字を、1項目1ファイルで書き出し先に書く。
 * @param {string} repoDir リポジトリの場所
 * @param {string} outputDir 書き出し先のフォルダ（リポジトリの外）
 * @returns {{ ok: boolean, count: number, problems: string[] }} 結果（count は書いたファイルの数）
 * @example writePlainTexts("/repo", "/tmp/plain") // { ok: true, count: 7, problems: [] }
 */
function writePlainTexts(repoDir, outputDir) {
  if (!isOutsideRepository(repoDir, outputDir)) {
    return { ok: false, count: 0, problems: ["記号を外した文字の書き出し先がリポジトリの中です。リポジトリの外の一時フォルダを指定してください"] };
  }
  fs.mkdirSync(outputDir, { recursive: true });
  let count = 0;
  readAllEntries(repoDir).forEach(function (item) {
    if (item.entry === null || typeof item.entry !== "object" || item.entry.format !== FORMAT3_NUMBER) {
      return;
    }
    listPlainItems(item.entry).forEach(function (plainItem) {
      const fileName = item.date + "__" + plainItem.name + ".txt";
      fs.writeFileSync(path.join(outputDir, fileName), plainItem.text + "\n", "utf8");
      count += 1;
    });
  });
  return { ok: true, count: count, problems: [] };
}

/**
 * 書き出した一時フォルダを消す（照合のあとに一時ファイルを残さないため）。
 * @param {string} outputDir 書き出し先のフォルダ
 * @returns {void}
 * @example removePlainTexts("/tmp/plain")
 */
function removePlainTexts(outputDir) {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

/**
 * コマンドの入口（CI 用）。node tools/diary_plain_text.js <書き出し先>
 * @param {string[]} args 引数
 * @returns {number} 終了コード（0＝書けた／1＝止めた）
 * @example main(["/tmp/plain"])
 */
function main(args) {
  if (args.length !== 1) {
    console.log("使い方：node tools/diary_plain_text.js <書き出し先のフォルダ（リポジトリの外）>");
    return 1;
  }
  const result = writePlainTexts(path.join(__dirname, ".."), args[0]);
  if (!result.ok) {
    result.problems.forEach(function (problem) { console.log(problem); });
    return 1;
  }
  console.log("記号を外した文字を " + result.count + " ファイル書き出しました");
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { writePlainTexts, removePlainTexts, isOutsideRepository, listPlainItems };
