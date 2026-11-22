/*
 * diary_story_view.test.js：新しい形（format 2）の日記の表示（js/diary_story_view.js・js/diary_figure_view.js）と、
 * 旧形式と新しい形が混ざったときの一覧・入口のパネルの自動テスト
 * Node.js にはブラウザの画面がないので、tests/helpers/fake_dom.js の「にせの画面」で確かめる。
 * 日記はテスト用の仮のデータ（tests/fixtures/diary_entries/。2026-11-16＝図なし、2026-11-17＝図あり）を使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, findByClass, installFakeDocument } = require("./helpers/fake_dom.js");
const { showStoryEntry, showEntryByFormat } = require("../js/diary_story_view.js");
const { createDiaryFigure } = require("../js/diary_figure_view.js");
const { showDiaryList } = require("../js/diary_list_view.js");
const { showLatestDiary } = require("../js/diary_latest_panel.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const ENTRY_PATHS = { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/" };
const LIST_PATHS = { faceFile: "../assets/speakers.svg", entryPage: "entry.html", homePage: "../", listPage: "./" };
const HTML_TRICK = "<img src=x onerror=alert(1)>";

/**
 * テスト用の日記を1件読む（毎回新しく読み、テスト同士で書き換え合わないようにする）。
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
    // 顔の丸（avatar）の中の立体の絵は、図・入口画像の検査の対象外（顔は飾りの絵）
    if (!/avatar/.test(child.className || "")) {
      found = found.concat(findAllByTag(child, tagName));
    }
  });
  return found;
}

/**
 * 新しい形の日記を、にせの画面に表示する。
 * @param {object} entry 日記1件
 * @returns {{ area: object, doc: object }} 表示した場所と、にせの document
 */
function renderStory(entry) {
  const doc = installFakeDocument({});
  const area = createFakeElement("main");
  showStoryEntry(area, entry, ENTRY_PATHS);
  return { area: area, doc: doc };
}

/**
 * 本文（d-body）の中の、すぐ下の部品のクラス名を順に並べる（並び順の確認用）。
 * @param {object} area 表示した場所
 * @returns {string[]} クラス名の一覧
 */
function bodyOrder(area) {
  return findByClass(area, "d-body").children.map(function (child) {
    return child.className;
  });
}

test("AC-41：新しい形の1件のページは、帯（今日の一言・Yuの決定・今日の参加）→ 道しるべ → 01〜03 → 図 → 04 → 出口 の順。タブの題名も決まった形", function () {
  const entry = readSample("2026-11-17");
  const shown = renderStory(entry);
  const head = shown.area.children[0];
  assert.strictEqual(findByClass(head, "d-day-big").textContent, "AI会社を始めて4日目");
  assert.strictEqual(findByClass(head, "d-h1").textContent, entry.title);
  const hookParts = findByClass(head, "d-hook").children.map(function (child) {
    return child.className.split(" ")[0];
  });
  assert.deepStrictEqual(hookParts, ["d-pick", "d-dec", "d-who-came"]);
  assert.strictEqual(findByClass(head, "d-dec").textContent, "Yuの決定" + entry.decision);
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-fig", "d-sec"]);
  const titles = findAllByClass(shown.area, "d-sec-title").map(function (title) {
    return title.textContent;
  });
  assert.deepStrictEqual(titles, ["01何が問題だったか", "02役員の意見", "03Yuの決定", "04結果と学び"]);
  assert.ok(findByClass(shown.area.children[2], "d-cta-box"));
  assert.strictEqual(shown.doc.title, "4日目 " + entry.title + "｜経営会議の日記");
});

test("AC-41：道しるべは「問題 › 意見 › 決定 › 結果」の4つで、「決定」だけ紺。読み上げでは流れの説明だけを読む", function () {
  const shown = renderStory(readSample("2026-11-16"));
  const flow = findByClass(shown.area, "d-flow");
  assert.strictEqual(flow.getAttribute("aria-label"), "この日記の流れ：問題、意見、決定、結果");
  const steps = findAllByClass(flow, "flow-step");
  assert.deepStrictEqual(steps.map(function (step) { return step.textContent; }), ["問題", "意見", "決定", "結果"]);
  assert.deepStrictEqual(findAllByClass(flow, "is-decision").map(function (step) { return step.textContent; }), ["決定"]);
  flow.children.forEach(function (item) {
    assert.strictEqual(item.getAttribute("aria-hidden"), "true");
  });
});

test("AC-41：problem は段落、result は箇条書き、03 は Yu の顔つきの紺の箱に「DECISION」と決定の文", function () {
  const entry = readSample("2026-11-17");
  const shown = renderStory(entry);
  const paragraphs = findByClass(shown.area, "d-story").children.map(function (child) {
    return child.textContent;
  });
  assert.deepStrictEqual(paragraphs, entry.problem);
  const decision = findByClass(shown.area, "d-decision");
  assert.strictEqual(findByClass(decision, "decision-label").textContent, "DECISION");
  assert.strictEqual(findAllByTag(decision, "p")[0].textContent, entry.decision);
  assert.strictEqual(findByClass(decision, "avatar").children[0].children[0].getAttribute("href"), "../assets/speakers.svg#yu");
  const results = findAllByTag(findByClass(shown.area, "d-results"), "li").map(function (item) {
    return item.textContent;
  });
  assert.deepStrictEqual(results, entry.result);
});

test("AC-41：図がない日は、図の場所を作らない", function () {
  const shown = renderStory(readSample("2026-11-16"));
  assert.strictEqual(findByClass(shown.area, "d-fig"), undefined);
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-sec", "d-sec"]);
});

test("AC-43：pick の決まり・「話者：セリフ」の読み上げとコピー・Yu の右寄せが旧形式と同じように動く", function () {
  const noPick = readSample("2026-11-16");
  let shown = renderStory(noPick);
  // pick がない日は、秘書・Yu 以外で最初のセリフ（2つ目の CMO）
  assert.strictEqual(findByClass(shown.area, "pick-quote").textContent, noPick.lines[1].text);
  const rows = findAllByClass(shown.area, "d-line");
  assert.strictEqual(findByClass(rows[1], "bubble").textContent, "CMO：" + noPick.lines[1].text);
  assert.match(rows[3].className, /is-yu/);
  assert.doesNotMatch(rows[1].className, /is-yu/);
  const withPick = readSample("2026-11-17");
  shown = renderStory(withPick);
  assert.strictEqual(findByClass(shown.area, "pick-quote").textContent, withPick.lines[0].text);
});

test("AC-45・AC-47：図は <img> で、場所は確認済みの日付から figures/<日付>.svg と組み立てる。alt は属性、caption は文字", function () {
  const entry = readSample("2026-11-17");
  const shown = renderStory(entry);
  const figure = findByClass(shown.area, "d-fig");
  const images = findAllByTag(figure, "img");
  assert.strictEqual(images.length, 1);
  assert.strictEqual(images[0].src, "figures/2026-11-17.svg");
  assert.strictEqual(images[0].alt, entry.figure.alt);
  const caption = findAllByTag(figure, "figcaption")[0];
  assert.strictEqual(caption.textContent, "図" + entry.figure.caption);
  assert.strictEqual(findAllByTag(shown.area, "object").length + findAllByTag(shown.area, "embed").length + findAllByTag(shown.area, "iframe").length, 0);
});

test("AC-47：日付が YYYY-MM-DD の形でないときは、図を作らず何も読みに行かない", function () {
  installFakeDocument({});
  const entry = readSample("2026-11-17");
  entry.date = "../js/main";
  assert.strictEqual(createDiaryFigure(entry, "figures/"), null);
});

test("AC-46：図を読み込めないときは、図と caption の場所だけ隠し、本文はそのまま", function () {
  installFakeDocument({});
  let onError = null;
  const originalCreate = document.createElement;
  document.createElement = function (tagName) {
    const element = originalCreate(tagName);
    if (tagName === "img") {
      element.addEventListener = function (type, handler) {
        if (type === "error") {
          onError = handler;
        }
      };
    }
    return element;
  };
  const area = createFakeElement("main");
  showStoryEntry(area, readSample("2026-11-17"), ENTRY_PATHS);
  const figure = findByClass(area, "d-fig");
  assert.strictEqual(figure.hidden, false);
  onError();
  assert.strictEqual(figure.hidden, true);
  assert.ok(findByClass(area, "d-results"));
  assert.strictEqual(findAllByClass(area, "d-sec").length, 4);
});

test("AC-42：problem・decision・result・figure.caption にHTMLのような文字があっても、文字のまま入り、要素にならない", function () {
  const entry = readSample("2026-11-17");
  entry.problem[0] = HTML_TRICK;
  entry.decision = HTML_TRICK;
  entry.result[0] = HTML_TRICK;
  entry.figure.caption = HTML_TRICK;
  const shown = renderStory(entry);
  assert.strictEqual(findByClass(shown.area, "d-story").children[0].textContent, HTML_TRICK);
  assert.strictEqual(findAllByTag(findByClass(shown.area, "d-decision"), "p")[0].textContent, HTML_TRICK);
  assert.strictEqual(findAllByTag(findByClass(shown.area, "d-results"), "li")[0].textContent, HTML_TRICK);
  assert.match(findAllByTag(shown.area, "figcaption")[0].textContent, /<img src=x onerror=alert\(1\)>/);
  // <img> は図の1つだけ（データの文字から <img> が作られていない）
  assert.strictEqual(findAllByTag(shown.area, "img").length, 1);
});

test("AC-39・AC-41：形を見て表示を呼び分ける（旧形式は今までの並び、新しい形は1トピックの並び）", function () {
  installFakeDocument({});
  const oldArea = createFakeElement("main");
  showEntryByFormat(oldArea, readSample("2026-11-15"), ENTRY_PATHS);
  const oldTitles = findAllByClass(oldArea, "d-sec-title").map(function (title) { return title.textContent; });
  assert.deepStrictEqual(oldTitles, ["01今日の議題", "02役員の一言", "03今日の決定", "04今日の失敗・学び"]);
  assert.strictEqual(findByClass(oldArea, "d-flow"), undefined);
  const newArea = createFakeElement("main");
  showEntryByFormat(newArea, readSample("2026-11-16"), ENTRY_PATHS);
  assert.ok(findByClass(newArea, "d-flow"));
});

test("AC-40：旧形式と新しい形が混ざっても、一覧は同じ見た目のカードで並び、図は出さない", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const entries = ["2026-11-17", "2026-11-16", "2026-11-15", "2026-11-14"].map(readSample);
  showDiaryList(area, createFakeElement("p"), entries, LIST_PATHS);
  const links = findAllByTag(area, "a");
  assert.deepStrictEqual(links.map(function (link) { return link.href; }), [
    "entry.html?date=2026-11-17", "entry.html?date=2026-11-16", "entry.html?date=2026-11-15", "entry.html?date=2026-11-14"
  ]);
  const cardShapes = links.map(function (link) {
    return link.children.map(function (child) { return child.className; }).join(",");
  });
  assert.strictEqual(new Set(cardShapes).size, 1, "カードの形が日記の形によって違います");
  assert.strictEqual(findAllByTag(area, "img").length, 0);
});

test("AC-40：入口のパネルは、形に関係なく最新の1件（新しい形の 2026-11-17）を出す", async function () {
  const parts = {
    "diary-latest": createFakeElement("section"),
    "diary-latest-card": createFakeElement("article"),
    "diary-latest-read": createFakeElement("a"),
    "hero-main": createFakeElement("a"),
    "hero-tools": createFakeElement("a"),
    "hero-tools-pill": createFakeElement("a")
  };
  installFakeDocument(parts);
  global.fetch = function (url) {
    let body = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17"];
    if (!url.endsWith("index.json")) {
      body = readSample(url.slice(-15, -5));
    }
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(body); } });
  };
  const shown = await showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html", heroFolder: "diary/heroes/", today: "2026-11-21" });
  assert.strictEqual(shown, true);
  assert.strictEqual(parts["diary-latest-read"].href, "diary/entry.html?date=2026-11-17");
  assert.strictEqual(findByClass(parts["diary-latest-card"], "d-day").textContent, "4日目");
  assert.strictEqual(findAllByTag(parts["diary-latest-card"], "img").length, 0);
});

test("AC-42：Zenn の説明と文字リンクが出口の枠にある（新しいタブ・noopener・最初は隠れる）", function () {
  const shown = renderStory(readSample("2026-11-16"));
  const note = findByClass(findByClass(shown.area, "d-cta-box"), "d-zenn");
  assert.strictEqual(note.hidden, true);
  const link = findByClass(note, "text-link");
  assert.strictEqual(link.textContent, "作り方の記事を読む（Zenn）");
  assert.strictEqual(link.target, "_blank");
  assert.strictEqual(link.rel, "noopener");
});
