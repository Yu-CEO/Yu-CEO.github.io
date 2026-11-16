/*
 * seo_meta.test.js：3ページの共有カードと検索用の説明（<head> の meta）・共有カードの画像・robots.txt・
 * 日記1件のページの meta の書きかえ（js/diary_page_meta.js）の自動テスト（requirements_seo.md 2-8 の1〜6・8）
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findUnsafeWritings } = require("../js/diary_safety.js");
const { chooseEntryDescription, updateEntryPageMeta } = require("../js/diary_page_meta.js");
const { createFakeElement } = require("./helpers/fake_dom.js");

const PORTAL = path.join(__dirname, "..");
const SITE_URL = "https://yu-ceo.github.io/";
const PAGE_FILES = ["index.html", "diary/index.html", "diary/entry.html"];
// 1つずつ必ずある meta（name か property の値）
const REQUIRED_META = [
  "description", "og:title", "og:description", "og:type", "og:site_name", "og:locale", "og:image",
  "og:image:width", "og:image:height", "og:image:alt", "twitter:card"
];
// 説明文の最大の文字数（requirements_seo.md 2-2）
const DESCRIPTION_MAX_LENGTH = 120;
// 共有カードの画像の決まり（1200×630・300KB 以内）
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_MAX_BYTES = 300 * 1024;
// CEO 確定版の説明文（requirements_seo.md 2-2）
const EXPECTED_DESCRIPTIONS = {
  "index.html": "会社員エンジニアのYuが、AIで作った仮想会社の役員にお金と人生を相談する実録。AI役員会議の日記と、無料の収支シミュレーターを置いています。",
  "diary/index.html": "AI役員会議で毎日いちばん盛り上がった話題を、1本の話にした日記です。何が問題で、AI役員がどう意見を言い、Yuが何を決めたか。金額などの数字は伏せています。",
  "diary/entry.html": "AI役員会議の1日を、1つの話題にしぼって読む日記です。問題・AI役員の意見・Yuの決定・結果を1〜3分で。"
};

/**
 * HTML の中の meta（name か property）を、名前 → content の一覧の組にする（同じ名前が2つあれば2つ入る）。
 * @param {string} html HTML の中身
 * @returns {object} 名前 → content の配列
 */
function readMeta(html) {
  const found = {};
  for (const match of html.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)">/g)) {
    found[match[1]] = (found[match[1]] || []).concat([match[2]]);
  }
  return found;
}

/**
 * HTML の中の canonical の URL の一覧を返す。
 * @param {string} html HTML の中身
 * @returns {string[]} URL の一覧
 */
function readCanonical(html) {
  return Array.from(html.matchAll(/<link rel="canonical" href="([^"]*)">/g)).map(function (match) {
    return match[1];
  });
}

/**
 * ページのファイルを読む。
 * @param {string} pageFile portal の中の場所
 * @returns {string} 中身
 */
function readPage(pageFile) {
  return fs.readFileSync(path.join(PORTAL, pageFile), "utf8");
}

test("2-8-1・AC-1：3ページに必須の meta が1つずつあり、説明文は確定版の文言", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const html = readPage(pageFile);
    const meta = readMeta(html);
    REQUIRED_META.forEach(function (name) {
      assert.strictEqual((meta[name] || []).length, 1, pageFile + " の " + name + " が1つではありません");
    });
    assert.strictEqual((html.match(/<title>/g) || []).length, 1, pageFile + " の <title> が1つではありません");
    assert.strictEqual(meta.description[0], EXPECTED_DESCRIPTIONS[pageFile]);
    assert.strictEqual(meta["og:description"][0], EXPECTED_DESCRIPTIONS[pageFile]);
    assert.strictEqual(meta["og:type"][0], "website");
    assert.strictEqual(meta["og:locale"][0], "ja_JP");
    assert.strictEqual(meta["og:site_name"][0], "Yu｜AI仮想会社の社長");
    assert.strictEqual(meta["twitter:card"][0], "summary_large_image");
    assert.strictEqual(meta.referrer[0], "strict-origin-when-cross-origin");
  });
});

test("2-8-2・AC-15：説明文は空でなく120文字以内で、金額・部屋の数・勧める言い回し・URL の書き方に当たらない", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const meta = readMeta(readPage(pageFile));
    ["description", "og:description", "og:title", "og:image:alt"].forEach(function (name) {
      const text = meta[name][0];
      assert.ok(text.length > 0, pageFile + " の " + name + " が空です");
      assert.deepStrictEqual(findUnsafeWritings(text), [], pageFile + " の " + name + " に公開してはいけない書き方があります");
    });
    assert.ok(meta.description[0].length <= DESCRIPTION_MAX_LENGTH, pageFile + " の description が120文字を超えています");
  });
});

test("2-8-3・AC-4：og:image は絶対URLで assets/og/ の PNG を指し、1200×630・300KB 以内・写真の情報なし", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const meta = readMeta(readPage(pageFile));
    assert.strictEqual(meta["og:image"][0], SITE_URL + "assets/og/og_default.png");
    assert.strictEqual(meta["og:image:width"][0], String(OG_IMAGE_WIDTH));
    assert.strictEqual(meta["og:image:height"][0], String(OG_IMAGE_HEIGHT));
  });
  const image = fs.readFileSync(path.join(PORTAL, "assets", "og", "og_default.png"));
  // PNG の先頭8バイトの印と、IHDR（最初の情報のかたまり）に書かれた幅・高さ（16〜23バイト目）を読む
  assert.strictEqual(image.subarray(1, 4).toString("ascii"), "PNG");
  assert.strictEqual(image.readUInt32BE(16), OG_IMAGE_WIDTH);
  assert.strictEqual(image.readUInt32BE(20), OG_IMAGE_HEIGHT);
  assert.ok(image.length <= OG_IMAGE_MAX_BYTES, "画像が300KBを超えています（" + image.length + " バイト）");
  // 撮影日時・位置などの情報（eXIf・tEXt・iTXt・zTXt のかたまり）を含めない
  assert.ok(!/eXIf|tEXt|iTXt|zTXt/.test(image.toString("latin1")), "画像に写真の情報や文字の情報が入っています");
});

test("2-8-4・AC-6：入口・一覧には正しい canonical・og:url があり、日記1件には無い", function () {
  const expected = { "index.html": SITE_URL, "diary/index.html": SITE_URL + "diary/" };
  Object.keys(expected).forEach(function (pageFile) {
    const html = readPage(pageFile);
    assert.deepStrictEqual(readCanonical(html), [expected[pageFile]]);
    assert.deepStrictEqual(readMeta(html)["og:url"], [expected[pageFile]]);
  });
  const entryHtml = readPage("diary/entry.html");
  assert.deepStrictEqual(readCanonical(entryHtml), []);
  assert.strictEqual(readMeta(entryHtml)["og:url"], undefined);
});

test("2-8-5・AC-10：google-site-verification は入口にだけ1つあり、値は英数字・-・_ だけ", function () {
  const values = readMeta(readPage("index.html"))["google-site-verification"] || [];
  assert.ok(values.length <= 1);
  values.forEach(function (value) {
    assert.match(value, /^[A-Za-z0-9_-]+$/);
  });
  ["diary/index.html", "diary/entry.html"].forEach(function (pageFile) {
    assert.ok(!readPage(pageFile).includes("google-site-verification"), pageFile + " に所有権の確認の meta があります");
  });
});

test("2-8-6・AC-7：robots.txt は決まった内容で、sitemap の場所を指す", function () {
  const robots = fs.readFileSync(path.join(PORTAL, "robots.txt"), "utf8");
  assert.strictEqual(robots, "User-agent: *\nAllow: /\nSitemap: https://yu-ceo.github.io/sitemap.xml\n");
});

test("2-8-8・AC-5：日記を表示できたら description をその日の summary にし、noindex は付けない", function () {
  const description = createFakeElement("meta");
  description.setAttribute("content", "共通の説明");
  const head = createFakeElement("head");
  const page = { description: description, head: head, documentObject: { createElement: createFakeElement } };
  updateEntryPageMeta({ summary: "<b>その日の抜粋</b>" }, page);
  // 文字として属性に入るだけ（HTMLとしては扱わない）
  assert.strictEqual(description.getAttribute("content"), "<b>その日の抜粋</b>");
  assert.strictEqual(head.children.length, 0);
  assert.strictEqual(chooseEntryDescription({}), "");
});

test("2-8-8・AC-5：日記が見つからないときは <meta name=\"robots\" content=\"noindex\"> を足し、説明文は変えない", function () {
  const description = createFakeElement("meta");
  description.setAttribute("content", "共通の説明");
  const head = createFakeElement("head");
  updateEntryPageMeta(null, { description: description, head: head, documentObject: { createElement: createFakeElement } });
  assert.strictEqual(head.children.length, 1);
  assert.strictEqual(head.children[0].getAttribute("name"), "robots");
  assert.strictEqual(head.children[0].getAttribute("content"), "noindex");
  assert.strictEqual(description.getAttribute("content"), "共通の説明");
});

test("2-4：日記1件のページは diary_page_meta.js を流れ（diary_entry_main.js）より前に読み込む", function () {
  const sources = (readPage("diary/entry.html").match(/<script src="[^"]*"/g) || []).map(function (tag) {
    return tag.split("/").pop().replace("\"", "");
  });
  assert.ok(sources.indexOf("diary_page_meta.js") >= 0);
  assert.ok(sources.indexOf("diary_page_meta.js") < sources.indexOf("diary_entry_main.js"));
});
