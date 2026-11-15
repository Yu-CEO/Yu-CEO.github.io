/*
 * link_button.test.js：js/link_button.js（LINE・TikTokのボタンを出すかどうかの判定）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { shouldShowLinkButton } = require("../js/link_button.js");
const { SITE_CONFIG } = require("../js/site_config.js");

test("AC-8：URLが空なら、ボタンを出さない", function () {
  assert.strictEqual(shouldShowLinkButton(""), false);
  assert.strictEqual(shouldShowLinkButton(undefined), false);
  assert.strictEqual(shouldShowLinkButton(null), false);
});

test("AC-8：https:// で始まるURLなら、ボタンを出す", function () {
  assert.strictEqual(shouldShowLinkButton("https://lin.ee/abc"), true);
});

test("AC-9：https:// で始まらない文字なら、ボタンを出さない", function () {
  assert.strictEqual(shouldShowLinkButton("http://lin.ee/abc"), false);
  assert.strictEqual(shouldShowLinkButton("javascript:alert(1)"), false);
  assert.strictEqual(shouldShowLinkButton("lin.ee/abc"), false);
  assert.strictEqual(shouldShowLinkButton(" https://lin.ee/abc"), false);
});

test("AC-2・AC-8：設定ファイルの初期値は、3つのボタンとも表示される値になっている", function () {
  assert.strictEqual(SITE_CONFIG.TIKTOK_URL, "https://www.tiktok.com/@yu_from_l2w");
  assert.strictEqual(shouldShowLinkButton(SITE_CONFIG.TIKTOK_URL), true);
  assert.strictEqual(shouldShowLinkButton(SITE_CONFIG.LINE_OPENCHAT_URL), true);
  assert.strictEqual(shouldShowLinkButton(SITE_CONFIG.LINE_OFFICIAL_URL), true);
});
