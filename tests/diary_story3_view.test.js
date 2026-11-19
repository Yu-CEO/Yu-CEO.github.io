/*
 * diary_story3_view.test.js：3版目（format 3）の日記1件のページの表示（js/diary_story3_view.js・diary_takeaway_view.js・diary_figure_view.js の2枚目）の自動テスト
 * にせの画面（tests/helpers/fake_dom.js）で確かめる。日記はテスト用の仮のデータ（tests/fixtures/diary_entries/2026-11-20.json）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, findByClass, installFakeDocument } = require("./helpers/fake_dom.js");
const { showEntryByFormat } = require("../js/diary_story_view.js");
const { showLatestDiary } = require("../js/diary_latest_panel.js");
const { showDiaryList } = require("../js/diary_list_view.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const ENTRY_PATHS = { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/" };
const LIST_PATHS = { faceFile: "../assets/speakers.svg", entryPage: "entry.html", homePage: "../", listPage: "./" };

/**
 * テスト用の日記を1件読む。
 * @param {string} date 日付
 * @returns {object} 日記1件
 */
function readSample(date) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, date + ".json"), "utf8"));
}

/**
 * 部品の中の、決まったタグの部品をすべて探す。
 * @param {object} element 探す場所
 * @param {string} tagName タグの名前
 * @returns {object[]} 見つかった部品
 */
function findAllByTag(element, tagName) {
  let found = [];
  element.children.forEach(function (child) {
    if (child.tagName === tagName) {
      found.push(child);
    }
    found = found.concat(findAllByTag(child, tagName));
  });
  return found;
}

/**
 * 日記を、にせの画面に表示する（形を見て表示を呼び分ける入口から）。
 * @param {object} entry 日記1件
 * @returns {{ area: object, doc: object }} 表示した場所と、にせの document
 */
function render(entry) {
  const doc = installFakeDocument({});
  const area = createFakeElement("main");
  showEntryByFormat(area, entry, ENTRY_PATHS);
  return { area: area, doc: doc };
}

/**
 * 本文（d-body）の中の、すぐ下の部品のクラス名を順に並べる。
 * @param {object} area 表示した場所
 * @returns {string[]} クラス名の一覧
 */
function bodyOrder(area) {
  return findByClass(area, "d-body").children.map(function (child) {
    return child.className;
  });
}

test("AC-71・AC-73：3版目は、01 → 02 → 03 → 04 → 2枚目の図 → 今日の学び → 出口 の順。1枚目の図は 01 の中（問題のすぐ下）。タブの題名も決まった形", function () {
  const entry = readSample("2026-11-20");
  const shown = render(entry);
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-sec", "d-fig", "d-take"]);
  const titles = findAllByClass(shown.area, "d-sec-title").map(function (title) {
    return title.textContent;
  });
  assert.deepStrictEqual(titles, ["01何が問題だったか", "02役員の意見", "03Yuの決定", "04結果"]);
  const problemSection = findByClass(shown.area, "d-body").children[1];
  assert.deepStrictEqual(problemSection.children.map(function (child) { return child.className; }), ["d-sec-title", "d-story", "d-fig"]);
  assert.strictEqual(shown.area.children[2].className, "d-cta");
  assert.strictEqual(shown.doc.title, "Day 7 " + entry.title + "｜経営会議の日記");
  assert.match(shown.area.className, /\bf3\b/);
});

test("AC-73：図の場所は確認済みの日付から作られる（1枚目 figures/<日付>.svg・2枚目 figures/<日付>-2.svg）。alt・caption・札も入る", function () {
  const entry = readSample("2026-11-20");
  const shown = render(entry);
  const images = findAllByTag(shown.area, "img");
  assert.deepStrictEqual(images.map(function (image) { return image.src; }), ["figures/2026-11-20.svg", "figures/2026-11-20-2.svg"]);
  assert.deepStrictEqual(images.map(function (image) { return image.alt; }), [entry.figure.alt, entry.figure2.alt]);
  const tags = findAllByClass(shown.area, "fig-tag");
  assert.deepStrictEqual(tags.map(function (tag) { return tag.textContent; }), ["図", "まとめ"]);
  assert.match(tags[1].className, /is-summary/);
  const captions = findAllByTag(shown.area, "figcaption").map(function (caption) { return caption.children[1].textContent; });
  assert.deepStrictEqual(captions, [entry.figure.caption, entry.figure2.caption]);
});

test("AC-73：片方の図が読み込めないときは、その図だけが隠れる（もう片方と本文はそのまま）", function () {
  const shown = render(readSample("2026-11-20"));
  const figures = findAllByTag(shown.area, "figure");
  assert.strictEqual(figures.length, 2);
  // にせの要素は addEventListener を空で持つので、error のあとの処理は、ここでは図の部品の hidden の初期値だけ確かめる
  assert.strictEqual(figures[0].hidden, false);
  assert.strictEqual(figures[1].hidden, false);
});

test("AC-73：figure2 だけの日は、2枚目だけが出る。図がない日は図の場所を作らない", function () {
  const onlySecond = readSample("2026-11-20");
  delete onlySecond.figure;
  const shownSecond = render(onlySecond);
  assert.deepStrictEqual(bodyOrder(shownSecond.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-sec", "d-fig", "d-take"]);
  assert.deepStrictEqual(findAllByTag(shownSecond.area, "img").map(function (image) { return image.src; }), ["figures/2026-11-20-2.svg"]);
  const none = readSample("2026-11-20");
  delete none.figure;
  delete none.figure2;
  const shownNone = render(none);
  assert.deepStrictEqual(bodyOrder(shownNone.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-sec", "d-take"]);
  assert.strictEqual(findByClass(shownNone.area, "d-fig"), undefined);
});

test("AC-71：takeaway がない日は、枠ごと出ない（空の余白も残らない）。道しるべにも「学び」は出ない", function () {
  const entry = readSample("2026-11-20");
  delete entry.takeaway;
  const shown = render(entry);
  assert.strictEqual(findByClass(shown.area, "d-take"), undefined);
  const flow = findByClass(shown.area, "d-flow");
  assert.strictEqual(flow.getAttribute("aria-label"), "この日記の流れ：問題、意見、決定、結果");
  assert.strictEqual(findAllByClass(flow, "flow-step").length, 4);
});

test("AC-71：takeaway があれば、最後の枠に「今日の学び」の小見出しと1文が出る。道しるべに「学び」が足される", function () {
  const entry = readSample("2026-11-20");
  const shown = render(entry);
  const box = findByClass(shown.area, "d-take");
  assert.strictEqual(findByClass(box, "take-label").textContent, "今日の学び");
  assert.strictEqual(findByClass(box, "take-text").textContent, entry.takeaway);
  assert.strictEqual(box.getAttribute("aria-label"), "今日の学び");
  const flow = findByClass(shown.area, "d-flow");
  assert.strictEqual(flow.getAttribute("aria-label"), "この日記の流れ：問題、意見、決定、結果、学び");
  assert.deepStrictEqual(findAllByClass(flow, "is-decision").map(function (step) { return step.textContent; }), ["決定"]);
});

test("AC-63：太字は strong、ハイライトは mark で表示され、画面に ** と == は出ない。吹き出しの中も同じ。コピー・読み上げは「話者：セリフ」", function () {
  const entry = readSample("2026-11-20");
  const shown = render(entry);
  const strongTexts = findAllByTag(shown.area, "strong").map(function (element) { return element.textContent; });
  assert.ok(strongTexts.includes("最後まで読まれない"));
  assert.ok(strongTexts.includes("長い文章は途中で閉じちゃう"));
  const markTexts = findAllByTag(shown.area, "mark").map(function (element) { return element.textContent; });
  assert.ok(markTexts.includes("短くする"));
  assert.ok(!shown.area.textContent.includes("**"));
  assert.ok(!shown.area.textContent.includes("=="));
  const bubble = findByClass(findAllByClass(shown.area, "d-line")[0], "bubble");
  assert.ok(bubble.textContent.startsWith("アオイ："));
  assert.ok(bubble.textContent.includes("長い文章は途中で閉じちゃう"));
});

test("AC-63：紺の帯の「Yuの決定」と「今日の一言」にも強調が付く", function () {
  const entry = readSample("2026-11-20");
  const shown = render(entry);
  const head = shown.area.children[0];
  assert.ok(findAllByTag(findByClass(head, "d-dec"), "mark").length === 1);
  assert.strictEqual(findByClass(head, "d-dec").textContent, "Yuの決定（テスト用）長い説明は図にして、文章は短くする");
  // pick: 4 は Yu のセリフ（強調なし）。記号が出ないことだけ確かめる
  assert.ok(!findByClass(head, "pick-quote").textContent.includes("**"));
});

test("AC-69：検査を外した状態で、セリフに <img ...>・今日の学びに <script> を ** や == で包んで入れても、文字のまま strong・mark の中に入り、要素にならない", function () {
  const entry = readSample("2026-11-20");
  entry.lines[1].text = "**<img src=x onerror=alert(1)>**";
  entry.takeaway = "==<script>alert(1)</script>==";
  const shown = render(entry);
  assert.strictEqual(findAllByTag(shown.area, "img").length, 2, "img は図の2枚だけ");
  assert.strictEqual(findAllByTag(shown.area, "script").length, 0);
  const strongs = findAllByTag(shown.area, "strong").filter(function (element) {
    return element.textContent === "<img src=x onerror=alert(1)>";
  });
  assert.strictEqual(strongs.length, 1);
  assert.strictEqual(strongs[0].children.length, 0);
  const takeMark = findAllByTag(findByClass(shown.area, "d-take"), "mark")[0];
  assert.strictEqual(takeMark.textContent, "<script>alert(1)</script>");
  assert.strictEqual(takeMark.children.length, 0);
});

test("AC-61：2版目（format 2）の文字に ** が入っていても、記号のまま文字で出て、strong にならない", function () {
  const entry = readSample("2026-11-17");
  entry.problem[0] = "（テスト用）**大事**な話です";
  entry.decision = "（テスト用）==芯==を決める";
  const shown = render(entry);
  assert.strictEqual(findAllByTag(shown.area, "strong").length, 0);
  assert.strictEqual(findAllByTag(shown.area, "mark").length, 0);
  assert.ok(shown.area.textContent.includes("**大事**な話です"));
  assert.ok(shown.area.textContent.includes("==芯==を決める"));
  assert.doesNotMatch(shown.area.className, /\bf3\b/);
});

test("AC-60：2版目の図の位置は決定と結果のあいだのまま（見出しも「結果と学び」のまま）", function () {
  const shown = render(readSample("2026-11-17"));
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-fig", "d-sec"]);
  const titles = findAllByClass(shown.area, "d-sec-title").map(function (title) { return title.textContent; });
  assert.strictEqual(titles[3], "04結果と学び");
});

test("AC-62：旧形式・2版目・3版目が混ざっても、一覧は新しい順に同じ形のカードで並び、記号は出ない", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const dates = ["2026-11-20", "2026-11-17", "2026-11-16", "2026-11-15", "2026-11-14"];
  showDiaryList(area, createFakeElement("p"), dates.map(readSample), LIST_PATHS);
  const links = findAllByTag(area, "a");
  assert.deepStrictEqual(links.map(function (link) { return link.href; }), dates.map(function (date) { return "entry.html?date=" + date; }));
  const cardShapes = links.map(function (link) {
    return link.children.map(function (child) { return child.className; }).join(",");
  });
  assert.strictEqual(new Set(cardShapes).size, 1, "カードの形が日記の形によって違います");
  assert.ok(!area.textContent.includes("**") && !area.textContent.includes("=="));
  assert.strictEqual(findAllByTag(area, "img").length, 0);
});

test("AC-62：入口のパネルは、形に関係なく最新の1件（3版目の 2026-11-20）を出し、記号も図も出さない", async function () {
  const parts = {
    "diary-latest": createFakeElement("section"),
    "diary-latest-card": createFakeElement("article"),
    "diary-latest-read": createFakeElement("a"),
    "hero-diary": createFakeElement("a")
  };
  installFakeDocument(parts);
  global.fetch = function (url) {
    let body = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-20"];
    if (!url.endsWith("index.json")) {
      body = readSample(url.slice(-15, -5));
    }
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(body); } });
  };
  const shown = await showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html" });
  assert.strictEqual(shown, true);
  assert.strictEqual(parts["diary-latest-read"].href, "diary/entry.html?date=2026-11-20");
  assert.strictEqual(findByClass(parts["diary-latest-card"], "d-day").textContent, "Day 7");
  assert.ok(!parts["diary-latest-card"].textContent.includes("**") && !parts["diary-latest-card"].textContent.includes("=="));
  assert.strictEqual(findAllByTag(parts["diary-latest-card"], "img").length, 0);
});

test("AC-42：Zenn の説明と文字リンクが出口の枠にある（新しいタブ・noopener・最初は隠れる）", function () {
  const shown = render(readSample("2026-11-20"));
  const note = findByClass(findByClass(shown.area, "d-cta-box"), "d-zenn");
  assert.strictEqual(note.hidden, true);
  const link = findByClass(note, "text-link");
  assert.strictEqual(link.textContent, "作り方の記事を読む（Zenn）");
  assert.strictEqual(link.target, "_blank");
  assert.strictEqual(link.rel, "noopener");
});
