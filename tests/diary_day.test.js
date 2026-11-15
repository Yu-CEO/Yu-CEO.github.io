/*
 * diary_day.test.js：js/diary_day.js（日付の形・Day N・表示用の日付）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { isDiaryDate, getDayNumber, formatDateJa } = require("../js/diary_day.js");

test("Day N は 2026-11-14 を Day 1 として数える", function () {
  assert.strictEqual(getDayNumber("2026-11-14"), 1);
  assert.strictEqual(getDayNumber("2026-11-15"), 2);
  assert.strictEqual(getDayNumber("2026-11-16"), 3);
  assert.strictEqual(getDayNumber("2027-02-11"), 90);
});

test("日付を「2026年11月16日（月）」の形にする", function () {
  assert.strictEqual(formatDateJa("2026-11-16"), "2026年11月16日（月）");
  assert.strictEqual(formatDateJa("2026-11-15"), "2026年11月15日（日）");
});

test("AC-9：YYYY-MM-DD の形で実在する日付だけを使える日付とする", function () {
  assert.strictEqual(isDiaryDate("2026-11-15"), true);
  ["2026-1-5", "../js/main", "abc", "", null, undefined, "2026-02-30", "2026-11-15.json"].forEach(function (value) {
    assert.strictEqual(isDiaryDate(value), false, String(value) + " を使える日付にしています");
  });
});
