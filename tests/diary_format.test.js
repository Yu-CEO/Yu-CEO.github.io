/*
 * diary_format.test.js：js/diary_format.js（日記の形の見分けと、形ごとの日付の決まり）の自動テスト
 * 例はテスト用の仮の日記（tests/fixtures/diary_entries/）。旧形式＝2026-11-14・15、新しい形＝2026-11-16・17。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findEntryProblems, isStoryEntry } = require("../js/diary_format.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");

/**
 * テスト用の日記を1件読む（毎回新しく読み、テスト同士で書き換え合わないようにする）。
 * @param {string} date 日付
 * @returns {object} 日記1件
 */
function readSample(date) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, date + ".json"), "utf8"));
}

/**
 * 問題点の一覧に、決まった文字を含むものがあるかを確かめる。
 * @param {string[]} problems 問題点の一覧
 * @param {RegExp} pattern 探す文字のパターン
 */
function assertHasProblem(problems, pattern) {
  const found = problems.some(function (problem) {
    return pattern.test(problem);
  });
  assert.ok(found, "見つからない問題：" + pattern + " ／ 出た問題：" + problems.join("／"));
}

test("AC-39：旧形式（format なし）の 2026-11-14・2026-11-15 は今までどおり検査を通る", function () {
  assert.deepStrictEqual(findEntryProblems(readSample("2026-11-14"), "2026-11-14"), []);
  assert.deepStrictEqual(findEntryProblems(readSample("2026-11-15"), "2026-11-15"), []);
});

test("AC-37：新しい形（format 2）の 2026-11-16 以降の日記は検査を通る", function () {
  assert.deepStrictEqual(findEntryProblems(readSample("2026-11-16"), "2026-11-16"), []);
  assert.deepStrictEqual(findEntryProblems(readSample("2026-11-17"), "2026-11-17"), []);
});

test("AC-38：format が 3 や文字の \"2\" なら「正しくない」になる", function () {
  [3, "2", null, 0].forEach(function (value) {
    const entry = readSample("2026-11-16");
    entry.format = value;
    assertHasProblem(findEntryProblems(entry, "2026-11-16"), /「format」は数字の 2 だけ/);
  });
});

test("AC-38：旧形式で日付が 2026-11-16 の日記は「正しくない」（新しい形で書くよう日本語で出る）", function () {
  const entry = readSample("2026-11-14");
  entry.date = "2026-11-16";
  assertHasProblem(findEntryProblems(entry, "2026-11-16"), /新しい形（"format": 2）で書いてください/);
});

test("AC-38：新しい形で日付が 2026-11-15 の日記は「正しくない」", function () {
  const entry = readSample("2026-11-16");
  entry.date = "2026-11-15";
  assertHasProblem(findEntryProblems(entry, "2026-11-15"), /2026-11-16 以降の日付だけ/);
});

test("形を見分ける：format が数字の 2 のときだけ新しい形", function () {
  assert.strictEqual(isStoryEntry(readSample("2026-11-16")), true);
  assert.strictEqual(isStoryEntry(readSample("2026-11-14")), false);
  assert.strictEqual(isStoryEntry({ format: "2" }), false);
  assert.strictEqual(isStoryEntry(null), false);
});

test("{ } の形でないデータは、形に関係なく「正しくない」", function () {
  assert.strictEqual(findEntryProblems(null, "2026-11-16").length, 1);
  assert.strictEqual(findEntryProblems([], "2026-11-16").length, 1);
  assert.strictEqual(findEntryProblems("文字", "2026-11-16").length, 1);
});
