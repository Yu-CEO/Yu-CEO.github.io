/*
 * toolbox_view.test.js：js/toolbox_view.js・js/toolbox_beacon.js（道具箱のカードの表示・PR表示・注意書き・計測用画像）の自動テスト
 * Node.js にはブラウザの画面がないので、tests/helpers/fake_dom.js の「にせの画面」で確かめる。
 * 紹介リンク・計測用画像のURLは、テスト用のダミーを使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { createFakeElement, findAllByClass, installFakeDocument } = require("./helpers/fake_dom.js");

// ブラウザでは先に読み込まれている検査・リンク・計測用画像の関数を、テストでも global に置いておく
global.validateToolbox = require("../js/toolbox_validate.js").validateToolbox;
global.planToolboxLink = require("../js/toolbox_link.js").planToolboxLink;
global.addBeaconImage = require("../js/toolbox_beacon.js").addBeaconImage;
const { showToolbox, buildToolboxDisclaimer, groupToolboxByGenre } = require("../js/toolbox_view.js");
const { TOOLBOX_DATA } = require("../js/toolbox_data.js");
const { ASP_LIST } = require("../js/site_config.js");

const OFFICIAL_ITEM = { genre: "ai", name: "VS Code", note: "このサイトは、AIと一緒にVS Codeで作っています", linkType: "official", url: "https://code.visualstudio.com/" };
const NONE_ITEM = { genre: "life", name: "テスト", note: "使っています", linkType: "none" };
const A8_ITEM = {
  genre: "money", name: "テスト口座", note: "テスト用に使っています", linkType: "affiliate", asp: "a8",
  url: "https://px.a8.net/svt/ejp?a8mat=TEST", beaconUrl: "https://www18.a8.net/0.gif?a8mat=TEST"
};
const MOSHIMO_ITEM = {
  genre: "life", name: "テストの本", note: "愛読書です", linkType: "affiliate", asp: "moshimo",
  url: "https://af.moshimo.com/af/c/click?a_id=TEST", beaconUrl: "https://i.moshimo.com/af/i/impression?a_id=TEST"
};

/**
 * にせの画面に道具箱パネルの部品を用意して、showToolbox を動かす。
 * @param {*} items 道具の一覧
 * @returns {{ shown: number, panel: object, pr: object, genres: object, disclaimer: object }}
 */
function render(items) {
  const parts = {
    panel: createFakeElement("section"),
    pr: createFakeElement("p"),
    genres: createFakeElement("div"),
    disclaimer: createFakeElement("p")
  };
  parts.panel.hidden = true;
  parts.pr.hidden = true;
  installFakeDocument({ "toolbox": parts.panel, "toolbox-pr": parts.pr, "toolbox-genres": parts.genres, "toolbox-disclaimer": parts.disclaimer });
  // 正しくない道具のコンソールの表示は、テストの結果を見やすくするため止めておく
  const originalWarn = console.warn;
  console.warn = function () {};
  parts.shown = showToolbox(items, ASP_LIST);
  console.warn = originalWarn;
  return parts;
}

/**
 * 部品の中から、決まったタグの部品をすべて探す。
 * @param {object} element 探す場所
 * @param {string} tagName タグの名前
 * @returns {object[]} 見つかった部品
 */
function findAllByTag(element, tagName) {
  let found = [];
  element.children.forEach(function (child) {
    if (child.tagName === tagName) found.push(child);
    found = found.concat(findAllByTag(child, tagName));
  });
  return found;
}

test("AC-1：ジャンルはお金・NISA → AI・開発の道具 → ふだん使いの順で、カードに名前と一言が出る", function () {
  const parts = render(TOOLBOX_DATA);
  assert.strictEqual(parts.panel.hidden, false);
  const titles = findAllByClass(parts.genres, "tb-genre-title").map(function (title) { return title.textContent; });
  assert.deepStrictEqual(titles, ["お金・NISA", "AI・開発の道具", "ふだん使い"]);
  const names = findAllByClass(parts.genres, "tb-name").map(function (name) { return name.textContent; });
  assert.deepStrictEqual(names, TOOLBOX_DATA.map(function (item) { return item.name; }));
  assert.strictEqual(findAllByClass(parts.genres, "tb-note").length, TOOLBOX_DATA.length);
});

test("AC-4：表示できる道具が0件なら、パネルごと隠す（エラーにならない）", function () {
  assert.strictEqual(render([]).panel.hidden, true);
  assert.strictEqual(render([{ genre: "stock" }]).panel.hidden, true);
});

test("AC-5：1件足すと、そのジャンルの最後にカードが1枚増える", function () {
  const added = { genre: "ai", name: "追加の道具", note: "使っています", linkType: "none" };
  const parts = render(TOOLBOX_DATA.concat([added]));
  const aiGroup = groupToolboxByGenre(TOOLBOX_DATA.concat([added]))[1];
  assert.strictEqual(aiGroup.items[aiGroup.items.length - 1].name, "追加の道具");
  assert.strictEqual(findAllByClass(parts.genres, "tb-card").length, TOOLBOX_DATA.length + 1);
});

test("AC-6・AC-7・AC-20：紹介リンクのカードに PR の印・sponsored noopener・1×1で alt が空の計測用画像。パネル上部のPR表示が出る", function () {
  const parts = render([A8_ITEM]);
  assert.strictEqual(parts.pr.hidden, false);
  assert.strictEqual(findAllByClass(parts.genres, "tb-pr").length, 1);
  const button = findAllByClass(parts.genres, "tb-btn")[0];
  assert.strictEqual(button.href, A8_ITEM.url);
  assert.strictEqual(button.target, "_blank");
  assert.strictEqual(button.rel, "sponsored noopener");
  const beacons = findAllByClass(parts.genres, "tb-beacon");
  assert.strictEqual(beacons.length, 1);
  assert.strictEqual(beacons[0].src, A8_ITEM.beaconUrl);
  assert.strictEqual(beacons[0].width, 1);
  assert.strictEqual(beacons[0].height, 1);
  assert.strictEqual(beacons[0].alt, "");
});

test("AC-8：公式リンクのカードは noopener だけで、PRの印・計測用画像なし", function () {
  const parts = render([OFFICIAL_ITEM]);
  const button = findAllByClass(parts.genres, "tb-btn")[0];
  assert.strictEqual(button.rel, "noopener");
  assert.strictEqual(button.textContent, "公式サイト");
  assert.strictEqual(findAllByClass(parts.genres, "tb-pr").length, 0);
  assert.strictEqual(findAllByTag(parts.genres, "img").length, 0);
});

test("AC-9：リンクなしのカードは名前と一言だけで、下の行（ボタンの場所）も作らない", function () {
  const parts = render([NONE_ITEM]);
  assert.strictEqual(findAllByClass(parts.genres, "tb-foot").length, 0);
  assert.strictEqual(findAllByTag(parts.genres, "a").length, 0);
  assert.strictEqual(findAllByTag(parts.genres, "img").length, 0);
});

test("AC-10：提携前（公式・なしだけ）は、PR表示・PRの印・計測用画像・注意書きの後半2文が出ない", function () {
  const parts = render([OFFICIAL_ITEM, NONE_ITEM]);
  assert.strictEqual(parts.panel.hidden, false);
  assert.strictEqual(parts.pr.hidden, true);
  assert.strictEqual(findAllByClass(parts.genres, "tb-pr").length, 0);
  assert.strictEqual(findAllByTag(parts.genres, "img").length, 0);
  assert.strictEqual(parts.disclaimer.textContent, buildToolboxDisclaimer(0, []));
  assert.ok(!parts.disclaimer.textContent.includes("アフィリエイト"));
});

test("AC-15：実際のデータ（紹介リンク3件・計測用画像2件）では、注意書きに広告の文と「A8.net・もしもアフィリエイト」の計測の文が入る", function () {
  const parts = render(TOOLBOX_DATA);
  assert.strictEqual(parts.pr.hidden, false);
  assert.strictEqual(findAllByClass(parts.genres, "tb-pr").length, 3);
  assert.strictEqual(findAllByClass(parts.genres, "tb-beacon").length, 2);
  const text = parts.disclaimer.textContent;
  assert.ok(text.startsWith("ここで紹介しているのは、Yuが実際に使っている（使ったことがある）物です。"));
  assert.ok(text.includes("リンクの一部はアフィリエイト広告（PR）で"));
  assert.ok(text.includes("このページを開くと、アフィリエイトサービス（A8.net・もしもアフィリエイト）の計測用の画像を読み込み、その会社と通信します"));
});

test("AC-26：A8.net ともしもアフィリエイトの両方に計測用画像があると、注意書きに2つの名前が入る", function () {
  const parts = render([A8_ITEM, MOSHIMO_ITEM]);
  assert.ok(parts.disclaimer.textContent.includes("アフィリエイトサービス（A8.net・もしもアフィリエイト）"));
});

test("AC-27：計測用画像が正しくない紹介リンクは、画像なしでPRの印とボタンは出る。注意書きに計測の文は出ない", function () {
  const parts = render([Object.assign({}, A8_ITEM, { beaconUrl: "https://example.com/0.gif" })]);
  assert.strictEqual(findAllByTag(parts.genres, "img").length, 0);
  assert.strictEqual(findAllByClass(parts.genres, "tb-pr").length, 1);
  assert.strictEqual(findAllByClass(parts.genres, "tb-btn").length, 1);
  assert.ok(!parts.disclaimer.textContent.includes("計測用の画像"));
  assert.ok(parts.disclaimer.textContent.includes("アフィリエイト広告（PR）"));
});

test("AC-14：名前・一言にHTMLのような文字があっても、文字のまま入る", function () {
  const tricky = Object.assign({}, NONE_ITEM, { name: "<img src=x onerror=alert(1)>", note: "<b>使っています</b>" });
  const parts = render([tricky]);
  assert.strictEqual(findAllByClass(parts.genres, "tb-name")[0].textContent, tricky.name);
  assert.strictEqual(findAllByTag(parts.genres, "img").length, 0);
});

test("AC-20：計測用画像の読み込みに失敗したら、画像を取り除く（隠す）", function () {
  const { addBeaconImage } = require("../js/toolbox_beacon.js");
  installFakeDocument({});
  const card = createFakeElement("li");
  let onError = null;
  const originalCreate = document.createElement;
  document.createElement = function (tagName) {
    const element = originalCreate(tagName);
    element.addEventListener = function (type, handler) {
      if (type === "error") onError = handler;
    };
    return element;
  };
  const image = addBeaconImage(card, "https://i.moshimo.com/af/i/impression?a_id=TEST");
  onError();
  assert.strictEqual(image.hidden, true);
});
