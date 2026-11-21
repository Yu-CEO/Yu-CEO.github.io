/*
 * diary_day.test.js：js/diary_day.js（日付の形・何日目か・表示用の日付・「N日目」の言い方）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { isDiaryDate, getDayNumber, formatDateJa, formatDayShort, formatDayLong, formatLocalDate, getTodayDayNumber, formatDateDot } = require("../js/diary_day.js");

test("何日目かは 2026-11-14 を1日目として数える", function () {
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

test("第3回：画面の言い方は「Day N」ではなく、短い所は「8日目」・長い所は「AI会社を始めて8日目」", function () {
  assert.strictEqual(formatDayShort("2026-11-21"), "8日目");
  assert.strictEqual(formatDayLong("2026-11-21"), "AI会社を始めて8日目");
  assert.strictEqual(formatDayShort("2026-11-14"), "1日目");
  assert.ok(!formatDayShort("2026-11-14").includes("Day"));
});

test("第3回：端末の今日は何日目か（2026-11-20 は7日目。夜中の23:59でも同じ日）", function () {
  assert.strictEqual(getTodayDayNumber(new Date(2026, 10, 20, 0, 0)), 7);
  assert.strictEqual(getTodayDayNumber(new Date(2026, 10, 20, 23, 59)), 7);
  assert.strictEqual(getTodayDayNumber(new Date(2026, 10, 21, 0, 0)), 8);
  assert.strictEqual(formatLocalDate(new Date(2026, 10, 5, 23, 59)), "2026-11-05");
});

test("第3回：日付を「2026.11.16」の形にする", function () {
  assert.strictEqual(formatDateDot("2026-11-16"), "2026.11.16");
});
