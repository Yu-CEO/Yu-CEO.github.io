/*
 * board_quotes_data.test.js：名言の一覧（js/board_quotes_data.js）の決まりのテスト
 * 受け入れ基準：AC-32（許可された役員・80字以内・date が index.json にある・日記の発言にそのまま含まれる・承認済みの表と1字も違わない）
 * 承認済みの表（design/portal_redesign/design_notes.md）は portal の外にあるので、ファイルがあるときだけ照合する。
 * 実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

global.isDiaryDate = require("../js/diary_day.js").isDiaryDate;
const { stripMarkup } = require("../js/diary_markup.js");
const { BOARD_QUOTES } = require("../js/board_quotes_data.js");
const { BOARD_QUOTE_SPEAKERS, BOARD_QUOTE_MAX_LENGTH, isValidBoardQuote } = require("../js/board_quote_pick.js");

const ENTRIES_FOLDER = path.join(__dirname, "..", "diary", "entries");
const DESIGN_NOTES = path.join(__dirname, "..", "..", "..", "design", "portal_redesign", "design_notes.md");
// 省略した名言の末尾の印
const ELLIPSIS = "…";

// 日記の1日分（JSON）を読む
function readEntry(date) {
  return JSON.parse(fs.readFileSync(path.join(ENTRIES_FOLDER, date + ".json"), "utf8"));
}

test("AC-32：全件が正しい形（許可された役員・80字以内・日付）で、アオイ・Yu・秘書がいない", function () {
  assert.strictEqual(BOARD_QUOTES.length, 12);
  BOARD_QUOTES.forEach(function (quote) {
    assert.ok(isValidBoardQuote(quote), quote.text);
    assert.ok(BOARD_QUOTE_SPEAKERS.includes(quote.speaker));
    assert.ok(Array.from(quote.text).length <= BOARD_QUOTE_MAX_LENGTH);
    assert.ok(!["アオイ", "Yu", "秘書"].includes(quote.speaker));
  });
});

test("AC-32：date が diary/entries/index.json にある", function () {
  const dates = JSON.parse(fs.readFileSync(path.join(ENTRIES_FOLDER, "index.json"), "utf8"));
  BOARD_QUOTES.forEach(function (quote) {
    assert.ok(dates.includes(quote.date), quote.date);
  });
});

test("AC-32：text がその日の日記のその役員の発言に（記号を外して）そのまま含まれる（省略の「…」は先頭一致）", function () {
  BOARD_QUOTES.forEach(function (quote) {
    const entry = readEntry(quote.date);
    const body = quote.text.endsWith(ELLIPSIS) ? quote.text.slice(0, -ELLIPSIS.length) : quote.text;
    const found = entry.lines.some(function (line) {
      return line.speaker === quote.speaker && stripMarkup(line.text).includes(body);
    });
    assert.ok(found, quote.speaker + "：" + quote.text);
  });
});

test("AC-32：一覧の文が承認済みの表（design_notes.md）と1字も違わない（ファイルがあるときだけ）", function (context) {
  if (!fs.existsSync(DESIGN_NOTES)) {
    context.skip("design_notes.md が portal の外にあり、ここでは見つからないため");
    return;
  }
  const rows = fs.readFileSync(DESIGN_NOTES, "utf8").split("\n").filter(function (line) {
    return /^\| (CMO|CFO|CTO|CISO|ブランドディレクター|プロデューサー) \|/.test(line);
  }).map(function (line) {
    const cells = line.split("|").map(function (cell) {
      return cell.trim();
    });
    // 出典の欄「2026-11-14（Day 1）・2」から日付だけ取り出す
    return { speaker: cells[1], text: cells[2], date: cells[4].slice(0, 10) };
  });
  // 種類（kind）は第3回で足した欄なので、表との照合では除く
  const withoutKind = BOARD_QUOTES.map(function (quote) {
    return { speaker: quote.speaker, text: quote.text, date: quote.date };
  });
  assert.deepStrictEqual(withoutKind, rows);
});

test("2-1-1：一覧に機密・投資を勧める言葉がない", function () {
  const forbidden = ["おすすめ", "儲かる", "買うべき", "今すぐ", "億", "万円"];
  BOARD_QUOTES.forEach(function (quote) {
    forbidden.forEach(function (word) {
      assert.ok(!quote.text.includes(word), quote.text + " に「" + word + "」");
    });
  });
});

// 第3回（2026-11-21 決定）：試作どおりの提案7・指摘6（役員・日付で指す）。同日、CTO 11-20 は誤った再生数にもとづくため外した → 指摘5
const SHITEKI_QUOTES = ["CFO 2026-11-20", "CTO 2026-11-18", "CISO 2026-11-15", "ブランドディレクター 2026-11-14", "プロデューサー 2026-11-16"];

test("第3回：全件に kind があり、提案7件・指摘5件で、試作どおりの振り分け", function () {
  const teian = BOARD_QUOTES.filter(function (quote) {
    return quote.kind === "teian";
  });
  const shiteki = BOARD_QUOTES.filter(function (quote) {
    return quote.kind === "shiteki";
  });
  assert.strictEqual(teian.length, 7);
  assert.strictEqual(shiteki.length, 5);
  const shitekiKeys = shiteki.map(function (quote) {
    return quote.speaker + " " + quote.date;
  });
  assert.deepStrictEqual(shitekiKeys.sort(), SHITEKI_QUOTES.slice().sort());
});

test("第3回：kind が teian・shiteki 以外の名言は正しくない扱いになる", function () {
  const sample = { speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16" };
  assert.strictEqual(isValidBoardQuote(sample), false);
  assert.strictEqual(isValidBoardQuote(Object.assign({ kind: "other" }, sample)), false);
  assert.strictEqual(isValidBoardQuote(Object.assign({ kind: "teian" }, sample)), true);
});
