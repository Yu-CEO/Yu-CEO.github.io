/*
 * diary_format.test.js：js/diary_format.js（日記の形の見分けと、形ごとの日付の決まり）の自動テスト
 * 例はテスト用の仮の日記（tests/fixtures/diary_entries/）。旧形式＝2026-11-14・15、2版目＝2026-11-16・17、3版目＝2026-11-20。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findEntryProblems, isStoryEntry, isFormat3Entry, DIARY_STORY_LAST_DATE } = require("../js/diary_format.js");

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

test("AC-38・AC-59：format が 4・文字の \"2\"・文字の \"3\"・null・0 なら「正しくない」になる", function () {
  [4, "2", "3", null, 0].forEach(function (value) {
    const entry = readSample("2026-11-16");
    entry.format = value;
    assertHasProblem(findEntryProblems(entry, "2026-11-16"), /「format」は数字の 2 か 3 だけ/);
  });
});

test("AC-38：旧形式で日付が 2026-11-16 の日記は「正しくない」（新しい形で書くよう日本語で出る）", function () {
  const entry = readSample("2026-11-14");
  entry.date = "2026-11-16";
  assertHasProblem(findEntryProblems(entry, "2026-11-16"), /新しい形（"format": 2 か 3）で書いてください/);
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

test("AC-59：3版目（format 3）の日記は、2版目の最後の日の次の日以降なら検査を通る", function () {
  assert.deepStrictEqual(findEntryProblems(readSample("2026-11-20"), "2026-11-20"), []);
});

test("AC-59：3版目で日付が「2版目の最後の日」以前なら止まる。2版目で日付が最後の日の次の日以降でも止まる", function () {
  const early = readSample("2026-11-20");
  early.date = DIARY_STORY_LAST_DATE;
  assertHasProblem(findEntryProblems(early, DIARY_STORY_LAST_DATE), /3版目（"format": 3）は .* より後の日付だけ/);
  const late = readSample("2026-11-17");
  late.date = "2026-11-19";
  assertHasProblem(findEntryProblems(late, "2026-11-19"), /3版目（"format": 3）で書いてください/);
});

test("AC-60：公開済みの2版目（2026-11-16・17）と旧形式は、3版目の追加のあとも今までどおり検査を通る", function () {
  ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"].forEach(function (date) {
    assert.deepStrictEqual(findEntryProblems(readSample(date), date), []);
  });
  assert.strictEqual(DIARY_STORY_LAST_DATE, "2026-11-18");
});

test("AC-61：2版目の文字に ** が入っていても検査では強調として扱わない（記号のまま文字）", function () {
  const entry = readSample("2026-11-17");
  entry.decision = "（テスト用）**大事**な決定";
  assert.deepStrictEqual(findEntryProblems(entry, "2026-11-17"), []);
});

test("形を見分ける：3版目は format が数字の 3 のときだけ", function () {
  assert.strictEqual(isFormat3Entry(readSample("2026-11-20")), true);
  assert.strictEqual(isFormat3Entry(readSample("2026-11-17")), false);
  assert.strictEqual(isFormat3Entry({ format: "3" }), false);
  assert.strictEqual(isFormat3Entry(null), false);
});
