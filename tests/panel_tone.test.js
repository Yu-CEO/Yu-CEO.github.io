/*
 * panel_tone.test.js：js/panel_tone.js（明るいパネルの背景を交互の色にする処理）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { chooseTone } = require("../js/panel_tone.js");

test("AC-22：隣り合うパネルの背景は、グレー → 白 → グレー…と交互になる", function () {
  assert.strictEqual(chooseTone(0), "tone-gray");
  assert.strictEqual(chooseTone(1), "tone-white");
  assert.strictEqual(chooseTone(2), "tone-gray");
  for (let index = 0; index < 5; index += 1) {
    assert.notStrictEqual(chooseTone(index), chooseTone(index + 1));
  }
});
