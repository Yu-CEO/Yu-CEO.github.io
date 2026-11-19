/*
 * link_button.test.js：js/link_button.js（LINE・TikTokのボタンを出すかどうかの判定）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { shouldShowLinkButton, decideLineButtons } = require("../js/link_button.js");
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

test("AC-8：LINEのURLが2つとも正しいときは、2つのボタンとパネルを出す", function () {
  const decision = decideLineButtons("https://line.me/ti/g2/abc", "https://lin.ee/abc");
  assert.deepStrictEqual(decision, { showOpenchat: true, showOfficial: true, showPanel: true });
});

test("AC-8・AC-29：片方だけ空なら、そのボタンだけ出さない（パネルは出す）", function () {
  assert.deepStrictEqual(
    decideLineButtons("", "https://lin.ee/abc"),
    { showOpenchat: false, showOfficial: true, showPanel: true }
  );
  assert.deepStrictEqual(
    decideLineButtons("https://line.me/ti/g2/abc", ""),
    { showOpenchat: true, showOfficial: false, showPanel: true }
  );
});

test("AC-9：https:// で始まらない文字のボタンは出さない", function () {
  const decision = decideLineButtons("javascript:alert(1)", "https://lin.ee/abc");
  assert.strictEqual(decision.showOpenchat, false);
  assert.strictEqual(decision.showOfficial, true);
});

test("AC-30：2つとも空・正しくないときは、LINEパネルごと隠す", function () {
  assert.strictEqual(decideLineButtons("", "").showPanel, false);
  assert.strictEqual(decideLineButtons("http://line.me/x", "lin.ee/abc").showPanel, false);
  assert.strictEqual(decideLineButtons(undefined, null).showPanel, false);
});

test("AC-39・AC-40：ヒーローの「TikTokを見る」は、URLが https:// で始まるときだけ出す", function () {
  assert.strictEqual(shouldShowLinkButton("https://www.tiktok.com/@yu_from_l2w"), true);
  assert.strictEqual(shouldShowLinkButton(""), false);
  assert.strictEqual(shouldShowLinkButton("www.tiktok.com/@yu_from_l2w"), false);
});

test("AC-41・AC-43：ZENN_URL は https://zenn.dev/yuceo で表示され、空や javascript: なら出さない", function () {
  assert.strictEqual(SITE_CONFIG.ZENN_URL, "https://zenn.dev/yuceo");
  assert.strictEqual(shouldShowLinkButton(SITE_CONFIG.ZENN_URL), true);
  assert.strictEqual(shouldShowLinkButton(""), false);
  assert.strictEqual(shouldShowLinkButton("javascript:alert(1)"), false);
});
