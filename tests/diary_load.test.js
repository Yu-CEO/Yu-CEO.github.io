/*
 * diary_load.test.js：js/diary_load.js（日記のデータの読み込み）の自動テスト
 * ブラウザの fetch（ファイルを読み込む機能）は、テストの中では「にせの fetch」に置き換え、読みに行った場所を記録する。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const {
  parseDiaryIndex, sortNewestFirst, isUsableDate, loadEntryByDate, loadAllCheckedEntries
} = require("../js/diary_load.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");

/**
 * テスト用の日記のフォルダのファイルを返す、にせの fetch を用意する。読みに行った場所を記録する。
 * @param {object} overrides ファイル名と中身の組（テスト用のフォルダより優先する。null は「読めない」）
 * @returns {string[]} 読みに行った場所の一覧
 */
function installFakeFetch(overrides) {
  const requested = [];
  global.fetch = function (url) {
    requested.push(url);
    const fileName = url.replace(/^entries\//, "");
    let body = null;
    if (Object.prototype.hasOwnProperty.call(overrides, fileName)) {
      body = overrides[fileName];
    } else if (fs.existsSync(path.join(FIXTURE_FOLDER, fileName))) {
      body = JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, fileName), "utf8"));
    }
    return Promise.resolve({
      ok: body !== null,
      json: function () {
        return Promise.resolve(body);
      }
    });
  };
  return requested;
}

/**
 * 処理のあいだだけ console.warn の中身を集める（結果の表示にまざらないように）。
 * @param {function} action 実行する処理（Promise を返す）
 * @returns {Promise<{ result: *, messages: string[] }>} 処理の結果と、集めた文
 */
async function captureWarnings(action) {
  const messages = [];
  const originalWarn = console.warn;
  console.warn = function (message) {
    messages.push(message);
  };
  try {
    const result = await action();
    return { result: result, messages: messages };
  } finally {
    console.warn = originalWarn;
  }
}

test("日付の一覧から、使える日付だけを重複なしで取り出す。配列でなければ null", function () {
  assert.deepStrictEqual(parseDiaryIndex(["2026-11-15", "abc", "2026-11-15", "../x"]), ["2026-11-15"]);
  assert.strictEqual(parseDiaryIndex({}), null);
  assert.deepStrictEqual(parseDiaryIndex([]), []);
});

test("AC-4：新しい日付が先になるように並べる（元の配列は変えない）", function () {
  const dates = ["2026-11-14", "2026-11-16", "2026-11-15"];
  assert.deepStrictEqual(sortNewestFirst(dates), ["2026-11-16", "2026-11-15", "2026-11-14"]);
  assert.deepStrictEqual(dates, ["2026-11-14", "2026-11-16", "2026-11-15"]);
});

test("AC-9：形が違う・一覧にない日付は、読み込みの場所に使わない", function () {
  const known = ["2026-11-15"];
  assert.strictEqual(isUsableDate("2026-11-15", known), true);
  ["../x", "2026-1-5", "", null, "2099-01-01"].forEach(function (date) {
    assert.strictEqual(isUsableDate(date, known), false, String(date));
  });
});

test("AC-9：ない日付・../js/main・abc・空では、日付の一覧のほかは何も読みに行かない", async function () {
  for (const date of ["2099-01-01", "../js/main", "abc", "", null]) {
    const requested = installFakeFetch({});
    const entry = await loadEntryByDate("entries/", date);
    assert.strictEqual(entry, null);
    assert.deepStrictEqual(requested, ["entries/index.json"]);
  }
});

test("AC-7：一覧にある日付なら、その日の日記を読み込む", async function () {
  installFakeFetch({});
  const entry = await loadEntryByDate("entries/", "2026-11-16");
  assert.strictEqual(entry.date, "2026-11-16");
});

test("AC-5：形が正しくない日記は出さず、ほかは出す。どの日付のどの項目かを日本語で出す", async function () {
  const broken = JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, "2026-11-15.json"), "utf8"));
  delete broken.title;
  installFakeFetch({ "2026-11-15.json": broken });
  const captured = await captureWarnings(function () {
    return loadAllCheckedEntries("entries/");
  });
  const dates = captured.result.map(function (entry) {
    return entry.date;
  });
  assert.deepStrictEqual(dates, ["2026-11-20", "2026-11-17", "2026-11-16", "2026-11-14"]);
  assert.strictEqual(captured.messages.length, 1);
  assert.match(captured.messages[0], /2026-11-15/);
  assert.match(captured.messages[0], /「title」/);
});

test("AC-6：一覧が空なら0件、一覧が読み込めないなら null（エラーで止めない）", async function () {
  installFakeFetch({ "index.json": [] });
  assert.deepStrictEqual(await loadAllCheckedEntries("entries/"), []);
  installFakeFetch({ "index.json": null });
  assert.strictEqual(await loadAllCheckedEntries("entries/"), null);
  global.fetch = function () {
    return Promise.reject(new Error("通信できない"));
  };
  assert.strictEqual(await loadAllCheckedEntries("entries/"), null);
});
