/*
 * diary_markup_view.test.js：js/diary_markup_view.js（強調つきの文を strong・mark の要素で入れる）の自動テスト
 * にせの画面（tests/helpers/fake_dom.js）で確かめる。作られる要素が strong・mark と文字だけであること、HTML が文字のまま入ることが要点。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, installFakeDocument } = require("./helpers/fake_dom.js");
const { appendMarkedText, writePlainText } = require("../js/diary_markup_view.js");

/**
 * 要素の中のすぐ下の部品について、タグの名前と文字の組を並べる。
 * @param {object} element 要素
 * @returns {string[]} 「タグ名:文字」の一覧
 */
function describeChildren(element) {
  return element.children.map(function (child) {
    return child.tagName + ":" + child.textContent;
  });
}

test("AC-63：** は strong、== は mark の要素になり、それ以外は文字の部品になる。画面に記号は出ない", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  appendMarkedText(paragraph, "これは**大事**で、==芯==です");
  assert.deepStrictEqual(describeChildren(paragraph), ["#text:これは", "strong:大事", "#text:で、", "mark:芯", "#text:です"]);
  assert.strictEqual(paragraph.textContent, "これは大事で、芯です");
});

test("AC-69：** の中の <img src=x onerror=alert(1)> は、strong の中の文字としてそのまま入り、要素にならない", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  appendMarkedText(paragraph, "**<img src=x onerror=alert(1)>**");
  assert.deepStrictEqual(describeChildren(paragraph), ["strong:<img src=x onerror=alert(1)>"]);
  assert.strictEqual(paragraph.children[0].children.length, 0);
});

test("AC-69：== の中の <script>alert(1)</script> も、mark の中の文字としてそのまま入る", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  appendMarkedText(paragraph, "==<script>alert(1)</script>==");
  assert.deepStrictEqual(describeChildren(paragraph), ["mark:<script>alert(1)</script>"]);
});

test("AC-69：作られる要素は strong・mark・文字の部品だけ。属性・class は付かない", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  appendMarkedText(paragraph, "a**b**c==d==e");
  paragraph.children.forEach(function (child) {
    assert.ok(["#text", "strong", "mark"].includes(child.tagName), child.tagName);
    assert.strictEqual(child.className, "");
    assert.deepStrictEqual(child.attributes, {});
  });
});

test("形の誤りがある文は、強調として読まず、そのまま文字として入る（安全側）", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  appendMarkedText(paragraph, "**閉じていない");
  assert.strictEqual(paragraph.children.length, 0);
  assert.strictEqual(paragraph.textContent, "**閉じていない");
});

test("AC-61：writePlainText は、** が入っていても強調にせず、記号のまま文字として入れる（2版目・旧形式用）", function () {
  installFakeDocument({});
  const paragraph = createFakeElement("p");
  writePlainText(paragraph, "**大事**");
  assert.strictEqual(paragraph.children.length, 0);
  assert.strictEqual(paragraph.textContent, "**大事**");
});

test("AC-69：コードに、日記の文字を HTML として入れる書き方（innerHTML など）がない", function () {
  const files = ["diary_markup_view.js", "diary_takeaway_view.js", "diary_story3_view.js", "diary_markup.js"];
  files.forEach(function (fileName) {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", fileName), "utf8");
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(code), fileName);
  });
});
