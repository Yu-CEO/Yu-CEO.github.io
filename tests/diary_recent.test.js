/*
 * diary_recent.test.js：入口の「最新の日記」の〔第3回〕の追加分のテスト
 * 対象：js/diary_recent_view.js（これまでの会議＝最新を除いた3件の小カード）・js/diary_latest_panel.js（今日の学び・主役ボタンの文字）
 * 受け入れ基準：第3回（最新の下に直近3件・今日の学びは1行・主役ボタン「今日の会議を読む」／「最新の会議を読む」）
 * 日記はテスト用の仮のデータ（tests/fixtures/diary_entries/）を使う。実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, findByClass, installFakeDocument } = require("./helpers/fake_dom.js");
const { showLatestDiary, fillLatestCard, getHeroMainLabel, RECENT_DIARY_COUNT } = require("../js/diary_latest_panel.js");
const { createRecentCard, showRecentDiaries } = require("../js/diary_recent_view.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const PATHS = { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html", heroFolder: "diary/heroes/", today: "2026-11-20" };
const WITHOUT_HERO_DATES = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-20"];

// テスト用の日記1日分を読む（毎回新しく読むので、書き換えても他のテストに影響しない）
function readSample(date) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, date + ".json"), "utf8"));
}

/**
 * 入口の部品（にせの要素）を用意して、にせの document に登録する。
 * @returns {Object<string,object>} id → 要素の表
 */
function setUpPanel() {
  const parts = {
    "diary-latest": createFakeElement("section"),
    "diary-latest-card": createFakeElement("article"),
    "diary-latest-read": createFakeElement("a"),
    "diary-recent": createFakeElement("div"),
    "diary-recent-list": createFakeElement("ol"),
    "hero-main": createFakeElement("a"),
    "hero-tools": createFakeElement("a"),
    "hero-tools-pill": createFakeElement("a")
  };
  parts["diary-latest"].hidden = true;
  parts["diary-recent"].hidden = true;
  parts["hero-main"].hidden = true;
  parts["hero-tools-pill"].hidden = true;
  installFakeDocument(parts);
  return parts;
}

/**
 * 日記の読み込み（fetch）を、テスト用のデータでまねる。index は与えた順のまま返す。
 * @param {string[]} dates 公開する日付
 * @param {Function} [edit] 日記のデータを書き換える関数（日付と中身を受け取る）
 * @returns {void}
 */
function installFetch(dates, edit) {
  global.fetch = function (url) {
    let body = dates;
    if (!url.endsWith("index.json")) {
      const date = url.slice(-15, -5);
      body = readSample(date);
      if (edit) {
        edit(date, body);
      }
    }
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve(body); } });
  };
}

test("第3回：最新の下に、最新を除いた新しい順の3件が小カードで並ぶ（最新と同じ日記を2回出さない）", async function () {
  const parts = setUpPanel();
  installFetch(WITHOUT_HERO_DATES);
  assert.strictEqual(await showLatestDiary("diary/entries/", PATHS), true);
  assert.strictEqual(RECENT_DIARY_COUNT, 3);
  assert.strictEqual(parts["diary-recent"].hidden, false);
  const links = findAllByClass(parts["diary-recent-list"], "d-day");
  assert.deepStrictEqual(links.map(function (day) { return day.textContent; }), ["4日目", "3日目", "2日目"]);
  const hrefs = parts["diary-recent-list"].children.map(function (item) { return item.children[0].href; });
  assert.deepStrictEqual(hrefs, [
    "diary/entry.html?date=2026-11-17", "diary/entry.html?date=2026-11-16", "diary/entry.html?date=2026-11-15"
  ]);
  assert.strictEqual(parts["diary-latest-read"].href, "diary/entry.html?date=2026-11-20");
});

test("第3回：日記が1件だけ・2件だけのときは、小カードの欄を出さない／1枚だけ出す", async function () {
  let parts = setUpPanel();
  installFetch(["2026-11-20"]);
  assert.strictEqual(await showLatestDiary("diary/entries/", PATHS), true);
  assert.strictEqual(parts["diary-recent"].hidden, true);
  parts = setUpPanel();
  installFetch(["2026-11-17", "2026-11-20"]);
  await showLatestDiary("diary/entries/", PATHS);
  assert.strictEqual(parts["diary-recent"].hidden, false);
  assert.strictEqual(parts["diary-recent-list"].children.length, 1);
});

test("第3回：前の日の日記が1件読めなくても、その日だけ飛ばして残りの小カードと最新は出る", async function () {
  const parts = setUpPanel();
  installFetch(WITHOUT_HERO_DATES, function (date, body) {
    if (date === "2026-11-16") {
      delete body.title;
    }
  });
  const originalWarn = console.warn;
  console.warn = function () {};
  try {
    assert.strictEqual(await showLatestDiary("diary/entries/", PATHS), true);
  } finally {
    console.warn = originalWarn;
  }
  assert.strictEqual(parts["diary-recent-list"].children.length, 2);
});

test("第3回：小カードは、入口画像がある日は画像つき（読み込めないときは消える）、ない日は紺の札の「N日目」だけ。見出しと日付（2026.11.17）が出る", function () {
  installFakeDocument({});
  const plain = readSample("2026-11-17");
  const withHero = Object.assign(readSample("2026-11-20"), { hero: { alt: "テスト用の画像の説明" } });
  const paths = { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" };
  const plainCard = createRecentCard(plain, paths);
  const heroCard = createRecentCard(withHero, paths);
  assert.strictEqual(findAllByClass(plainCard, "rc-thumb")[0].textContent, "4日目");
  assert.strictEqual(plainCard.children[0].children[0].children.length, 0);
  assert.strictEqual(findAllByClass(plainCard, "rc-title")[0].textContent, plain.title);
  assert.strictEqual(findAllByClass(plainCard, "d-meta")[0].children[1].textContent, "2026.11.17");
  const image = findAllByClass(heroCard, "rc-thumb")[0].children[0];
  assert.strictEqual(image.src, "diary/heroes/2026-11-20.jpg");
  assert.strictEqual(image.alt, "");
  assert.strictEqual(plainCard.children[0].getAttribute("aria-label"), "4日目 " + plain.title + " を読む");
});

test("第3回：小カードの欄は、0件・部品なしのとき何もしない（隠したまま）", function () {
  installFakeDocument({});
  assert.strictEqual(showRecentDiaries([readSample("2026-11-17")], {}), false);
  const parts = setUpPanel();
  assert.strictEqual(showRecentDiaries([], {}), false);
  assert.strictEqual(parts["diary-recent"].hidden, true);
});

test("第3回：今日の学び（takeaway）がある日は、カードに1文を出し（記号は外す）、無い日は枠ごと出さない。抜粋は残る", function () {
  installFakeDocument({});
  const entry = readSample("2026-11-20");
  entry.takeaway = "**先に答え**を置く。";
  const card = createFakeElement("article");
  fillLatestCard(card, entry, "assets/speakers.svg", "diary/heroes/");
  const take = findByClass(card, "take-mini");
  assert.strictEqual(take.children[0].textContent, "今日の学び");
  assert.strictEqual(take.children[1].textContent, "先に答えを置く。");
  assert.match(card.className, /has-take/);
  assert.ok(findByClass(card, "d-summary"));
  delete entry.takeaway;
  fillLatestCard(card, entry, "assets/speakers.svg", "diary/heroes/");
  assert.strictEqual(findByClass(card, "take-mini"), undefined);
  assert.ok(!/has-take/.test(card.className));
});

test("第3回：主役ボタンの文字は、最新が今日なら「今日の会議を読む」、昨日以前なら「最新の会議を読む」", function () {
  assert.strictEqual(getHeroMainLabel("2026-11-21", "2026-11-21"), "今日の会議を読む");
  assert.strictEqual(getHeroMainLabel("2026-11-20", "2026-11-21"), "最新の会議を読む");
});

test("第3回：最新が今日の日付なら主役ボタンは「今日の会議を読む」で最新の日記へ。大きな「無料ツールを見る」は隠れ、丸ボタンが出る", async function () {
  const parts = setUpPanel();
  installFetch(WITHOUT_HERO_DATES);
  await showLatestDiary("diary/entries/", PATHS);
  assert.strictEqual(parts["hero-main"].hidden, false);
  assert.strictEqual(parts["hero-main"].textContent, "今日の会議を読む");
  assert.strictEqual(parts["hero-main"].href, "diary/entry.html?date=2026-11-20");
  assert.match(parts["hero-main"].getAttribute("aria-label"), /AI会社を始めて7日目/);
  assert.strictEqual(parts["hero-tools"].hidden, true);
  assert.strictEqual(parts["hero-tools-pill"].hidden, false);
});

test("第3回：入口の並びは ヒーロー → 日記 → 無料ツール → LINE → 道具箱。丸ボタンは「TikTok」と「無料ツールを見る」で、「会議の日記」の丸ボタンは無い", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const order = ['id="top"', 'id="diary-latest"', 'id="tool-area"', 'id="line-panel"', 'id="toolbox"'].map(function (mark) {
    return html.indexOf(mark);
  });
  order.forEach(function (position) {
    assert.ok(position > 0);
  });
  assert.deepStrictEqual(order.slice().sort(function (a, b) { return a - b; }), order);
  assert.ok(/id="hero-tools-pill"[^>]*>無料ツールを見る</.test(html));
  assert.ok(!html.includes("pill-diary") && !html.includes("hero-diary"));
  assert.ok(/id="hero-main"[^>]*hidden>今日の会議を読む</.test(html));
  assert.ok(/id="diary-recent"[^>]*hidden>/.test(html));
});
