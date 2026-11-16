/*
 * diary_safety.test.js：js/diary_safety.js（公開してはいけない書き方の検出）の自動テスト
 * 例文の数字はすべて仮のもの（実際の金額などではない）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { findUnsafeWritings } = require("../js/diary_safety.js");

test("AC-11：HTMLの記号・URL・金額・部屋の数・勧める言い回しは止まる", function () {
  const unsafeTexts = [
    "<script>alert(1)</script>",
    "詳しくは https://example.com で",
    "www.example.com を見て",
    "連絡は test@example.com へ",
    "3万かかった",
    "100円だった",
    "二億をめざす",
    "2室ある",
    "この商品はおすすめです"
  ];
  unsafeTexts.forEach(function (text) {
    assert.ok(findUnsafeWritings(text).length > 0, "「" + text + "」が止まっていません");
  });
});

test("AC-11：フォロワー数と Day N は通る", function () {
  assert.deepStrictEqual(findUnsafeWritings("フォロワー129人になりました"), []);
  assert.deepStrictEqual(findUnsafeWritings("Day 2 の会議です"), []);
});

test("AC-27：伏せ字の「〇万円」「数万円」「ある金額」は通る", function () {
  assert.deepStrictEqual(findUnsafeWritings("〇万円の差が出た"), []);
  assert.deepStrictEqual(findUnsafeWritings("数万円の違い"), []);
  assert.deepStrictEqual(findUnsafeWritings("ある金額で手放す話"), []);
});

test("AC-27：「数十万円」「数百万円」「〇室」「5千円」は止まる", function () {
  ["数十万円", "数百万円", "〇室のうち", "5千円"].forEach(function (text) {
    assert.ok(findUnsafeWritings(text).length > 0, "「" + text + "」が止まっていません");
  });
});

test("止まった理由の名前を返し、当たった文字そのものは返さない", function () {
  const reasons = findUnsafeWritings("3万");
  assert.deepStrictEqual(reasons, ["金額の書き方"]);
});

test("N1：言葉の途中の目に見えない書式の文字（ゼロ幅スペース・単語結合子・ソフトハイフン）は止まる", function () {
  // 目に見えない文字はソースに直接書かず、文字の番号から作る（ソースの表示で消えたり化けたりしないように）
  [0x200b, 0x2060, 0x00ad, 0xfeff].forEach(function (codePoint) {
    const text = "ふつう" + String.fromCharCode(codePoint) + "の文";
    assert.deepStrictEqual(findUnsafeWritings(text), ["目に見えない書式の文字（ゼロ幅スペースなど）"], codePoint.toString(16));
  });
  assert.deepStrictEqual(findUnsafeWritings("ふつうの文"), []);
});
