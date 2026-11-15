/*
 * diary_data.test.js：実際の日記のデータ（diary/entries/）が全部検査を通るか、一覧のファイルと過不足がないかのテスト
 * 形の正しくない日記を入れた変更は、ここで CI が失敗し、公開されない。
 * テスト用の仮の日記（tests/fixtures/diary_entries/）も、同じ検査を通ることを確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findDiaryProblems } = require("../js/diary_validate.js");

// 調べるフォルダ（名前は結果の表示に使う）
const ENTRY_FOLDERS = [
  { label: "公開する日記", folder: path.join(__dirname, "..", "diary", "entries") },
  { label: "テスト用の日記", folder: path.join(__dirname, "fixtures", "diary_entries") }
];

/**
 * フォルダの中の index.json と、日付の名前のJSONファイルの一覧を読む。
 * @param {string} folder フォルダの場所
 * @returns {{ index: *, files: string[] }} 一覧の中身と、ファイル名から取った日付の一覧
 */
function readEntryFolder(folder) {
  const index = JSON.parse(fs.readFileSync(path.join(folder, "index.json"), "utf8"));
  const files = fs.readdirSync(folder)
    .filter(function (fileName) {
      return fileName.endsWith(".json") && fileName !== "index.json";
    })
    .map(function (fileName) {
      return fileName.replace(/\.json$/, "");
    });
  return { index: index, files: files };
}

ENTRY_FOLDERS.forEach(function (target) {
  test("AC-18：" + target.label + "の index.json は日付の配列で、重複がなく、ファイルと過不足なく一致する", function () {
    const data = readEntryFolder(target.folder);
    assert.ok(Array.isArray(data.index), "index.json が配列になっていません");
    assert.strictEqual(new Set(data.index).size, data.index.length, "index.json に同じ日付が2回あります");
    assert.deepStrictEqual(data.index.slice().sort(), data.files.slice().sort());
  });

  test("AC-18：" + target.label + "の全ファイルが検査を通る", function () {
    readEntryFolder(target.folder).files.forEach(function (date) {
      const entry = JSON.parse(fs.readFileSync(path.join(target.folder, date + ".json"), "utf8"));
      assert.deepStrictEqual(findDiaryProblems(entry, date), [], date + ".json が正しくありません");
    });
  });
});
