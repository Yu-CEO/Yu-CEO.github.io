/*
 * toolbox_link.test.js：js/toolbox_link.js（リンクの種類ごとの出し方）の自動テスト
 * 紹介リンク・計測用画像のURLは、テスト用のダミーを使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { planToolboxLink } = require("../js/toolbox_link.js");

const AFFILIATE_ITEM = {
  genre: "money", name: "テスト口座", note: "テスト用に使っています", linkType: "affiliate", asp: "a8",
  url: "https://px.a8.net/svt/ejp?a8mat=TEST", beaconUrl: "https://www10.a8.net/0.gif?a8mat=TEST"
};
const OFFICIAL_ITEM = { genre: "ai", name: "VS Code", note: "このサイトは、AIと一緒にVS Codeで作っています", linkType: "official", url: "https://code.visualstudio.com/" };
const NONE_ITEM = { genre: "life", name: "テスト", note: "使っています", linkType: "none" };

test("AC-6：紹介リンクは新しいタブ・rel に sponsored noopener・PRの印・計測用画像つき", function () {
  const plan = planToolboxLink(AFFILIATE_ITEM);
  assert.strictEqual(plan.showLink, true);
  assert.strictEqual(plan.url, AFFILIATE_ITEM.url);
  assert.strictEqual(plan.target, "_blank");
  assert.strictEqual(plan.rel, "sponsored noopener");
  assert.strictEqual(plan.showPr, true);
  assert.strictEqual(plan.beaconUrl, AFFILIATE_ITEM.beaconUrl);
  assert.ok(plan.ariaLabel.includes("広告"));
});

test("AC-6・AC-27：計測用画像がない紹介リンクは、PRの印とリンクだけ出す", function () {
  const item = Object.assign({}, AFFILIATE_ITEM);
  delete item.beaconUrl;
  const plan = planToolboxLink(item);
  assert.strictEqual(plan.showPr, true);
  assert.strictEqual(plan.beaconUrl, "");
});

test("AC-8：公式リンクは rel が noopener だけで sponsored を含まず、PRの印・計測用画像なし", function () {
  const plan = planToolboxLink(OFFICIAL_ITEM);
  assert.strictEqual(plan.showLink, true);
  assert.strictEqual(plan.target, "_blank");
  assert.strictEqual(plan.rel, "noopener");
  assert.ok(!plan.rel.includes("sponsored"));
  assert.strictEqual(plan.showPr, false);
  assert.strictEqual(plan.beaconUrl, "");
});

test("AC-9：リンクなしはボタン・PRの印・計測用画像を出さない", function () {
  const plan = planToolboxLink(NONE_ITEM);
  assert.strictEqual(plan.showLink, false);
  assert.strictEqual(plan.showPr, false);
  assert.strictEqual(plan.beaconUrl, "");
});

test("AC-11：ボタンの文言は label があればそれ、なければ公式は「公式サイト」、紹介は「詳しく見る」", function () {
  assert.strictEqual(planToolboxLink(OFFICIAL_ITEM).label, "公式サイト");
  assert.strictEqual(planToolboxLink(AFFILIATE_ITEM).label, "詳しく見る");
  assert.strictEqual(planToolboxLink(Object.assign({}, OFFICIAL_ITEM, { label: "サイトを見る" })).label, "サイトを見る");
});

test("AC-26：もしもアフィリエイトの紹介リンクも、A8.net と同じ出し方になる", function () {
  const moshimo = Object.assign({}, AFFILIATE_ITEM, {
    asp: "moshimo", url: "https://af.moshimo.com/af/c/click?a_id=TEST", beaconUrl: "https://i.moshimo.com/af/i/impression?a_id=TEST"
  });
  const plan = planToolboxLink(moshimo);
  assert.strictEqual(plan.rel, "sponsored noopener");
  assert.strictEqual(plan.showPr, true);
  assert.strictEqual(plan.beaconUrl, moshimo.beaconUrl);
});
