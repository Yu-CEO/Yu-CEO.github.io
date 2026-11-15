/*
 * diary_pick.test.js：js/diary_pick.js（今日の一言の選び方・今日の参加の並び）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { choosePickLine, listSpeakers } = require("../js/diary_pick.js");

const LINES = [
  { speaker: "秘書", text: "a" },
  { speaker: "Yu", text: "b" },
  { speaker: "アオイ", text: "c" },
  { speaker: "CMO", text: "d" },
  { speaker: "秘書", text: "e" }
];

test("AC-30：pick があれば、その番号（1から数える）のセリフを選ぶ", function () {
  assert.strictEqual(choosePickLine({ lines: LINES, pick: 3 }).text, "c");
  assert.strictEqual(choosePickLine({ lines: LINES, pick: 1 }).text, "a");
});

test("AC-30：pick がなければ、秘書・Yu 以外で最初のセリフを選ぶ", function () {
  assert.strictEqual(choosePickLine({ lines: LINES }).speaker, "アオイ");
});

test("AC-30：役員のセリフがない日は、最初のセリフを選ぶ", function () {
  const lines = [{ speaker: "Yu", text: "x" }, { speaker: "秘書", text: "y" }];
  assert.strictEqual(choosePickLine({ lines: lines }).text, "x");
});

test("AC-31：今日の参加は、重複なし・登場順", function () {
  assert.deepStrictEqual(listSpeakers({ lines: LINES }), ["秘書", "Yu", "アオイ", "CMO"]);
});
