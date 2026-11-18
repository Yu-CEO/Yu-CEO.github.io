/*
 * diary_markup.test.js：js/diary_markup.js（3版目の太字・ハイライトの読み取り）の自動テスト
 * 強調の形の誤り（閉じていない・入れ子・重なり・空・3つ以上続く）と、記号を外した文字・文字数・強調の数を確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { parseMarkup, stripMarkup, countVisibleCharacters, countMarkupUses, hasMarkupSymbols } = require("../js/diary_markup.js");

test("AC-63：** は太字、== はハイライトの区切りになり、前後の普通の文字も残る", function () {
  const parsed = parseMarkup("これは**大事**で、==芯==です");
  assert.deepStrictEqual(parsed.problems, []);
  assert.deepStrictEqual(parsed.segments, [
    { type: "plain", text: "これは" },
    { type: "strong", text: "大事" },
    { type: "plain", text: "で、" },
    { type: "mark", text: "芯" },
    { type: "plain", text: "です" }
  ]);
});

test("AC-64：閉じていない記号は形の誤りになる", function () {
  ["**大事", "大事**", "==芯", "芯=="].forEach(function (text) {
    assert.ok(parseMarkup(text).problems.length > 0, text);
  });
});

test("AC-64：入れ子・重なり（**大事な==所==**・**a==b**c==）は形の誤りになる", function () {
  ["**大事な==所==**", "**a==b**c==", "==a**b==c**"].forEach(function (text) {
    assert.ok(parseMarkup(text).problems.length > 0, text);
  });
});

test("AC-64：空の強調（****・====・** **）は形の誤りになる", function () {
  ["****", "====", "** **", "==　=="].forEach(function (text) {
    assert.ok(parseMarkup(text).problems.length > 0, text);
  });
});

test("AC-64：同じ記号が3つ以上続く（***・===）は形の誤りになる", function () {
  ["***", "a***b", "===", "**a***"].forEach(function (text) {
    assert.ok(parseMarkup(text).problems.length > 0, text);
  });
});

test("AC-64：1つだけの * や =（例：A=B）は普通の文字として通る", function () {
  ["A=B", "a*b", "1 = 1", "* 注"].forEach(function (text) {
    const parsed = parseMarkup(text);
    assert.deepStrictEqual(parsed.problems, [], text);
    assert.strictEqual(stripMarkup(text), text);
  });
});

test("記号を外した文字と文字数：記号は数えない。絵文字など2つ分の字も1文字", function () {
  assert.strictEqual(stripMarkup("**大事**な==所=="), "大事な所");
  assert.strictEqual(countVisibleCharacters("**大事**な==所=="), 4);
  assert.strictEqual(countVisibleCharacters("**😀**あ"), 2);
});

test("AC-67：記号で区切った言葉（3**万**・お**すすめ**）は、記号を外すと元の言葉になる", function () {
  assert.strictEqual(stripMarkup("3**万**"), "3万");
  assert.strictEqual(stripMarkup("お**すすめ**"), "おすすめ");
  assert.strictEqual(stripMarkup("h**ttps://**"), "https://");
});

test("形の誤りがある文は、記号をすべて取り除いた文字を返し、強調の数は 0 と数える（安全側）", function () {
  assert.strictEqual(stripMarkup("**大事"), "大事");
  assert.deepStrictEqual(countMarkupUses("**大事"), { strong: 0, mark: 0 });
});

test("AC-66：太字とハイライトの数を数える", function () {
  assert.deepStrictEqual(countMarkupUses("**a**と==b==と**c**"), { strong: 2, mark: 1 });
  assert.deepStrictEqual(countMarkupUses("記号なし"), { strong: 0, mark: 0 });
});

test("記号が入っているかを調べる", function () {
  assert.strictEqual(hasMarkupSymbols("**a**"), true);
  assert.strictEqual(hasMarkupSymbols("==a=="), true);
  assert.strictEqual(hasMarkupSymbols("A=B と a*b"), false);
});
