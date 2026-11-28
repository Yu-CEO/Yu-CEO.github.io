/*
 * diary_recent.test.js：入口の「最新の日記」の〔第3回〕の追加分のテスト
 * 対象：js/diary_recent_view.js（最新を除いた前の3件の行）・js/diary_latest_panel.js（最新の下に並べる）・入口の区画の並び
 * 受け入れ基準：第3回（最新の下に直近3件）。2026-11-28 の刷新で、今日の学び・主役ボタンは入口からなくなった
 * 日記はテスト用の仮のデータ（tests/fixtures/diary_entries/）を使う。実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, installFakeDocument } = require("./helpers/fake_dom.js");
const { showLatestDiary, RECENT_DIARY_COUNT } = require("../js/diary_latest_panel.js");
const { createRecentCard, showRecentDiaries } = require("../js/diary_recent_view.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const PATHS = { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" };
const DATES = ["2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-20"];

// テスト用の日記1日分を読む（毎回新しく読むので、書き換えても他のテストに影響しない）
function readSample(date) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, date + ".json"), "utf8"));
}

// 入口の日記の区画の部品（にせの要素）を用意する
function setUpPanel() {
  const parts = {};
  ["diary-ok", "diary-loading", "diary-failed", "diary-empty", "diary-latest-card", "diary-count-area", "diary-count", "diary-recent-list"].forEach(function (id) {
    parts[id] = createFakeElement("div");
  });
  installFakeDocument(parts);
  return parts;
}

// 日記の読み込み（fetch）を、テスト用のデータでまねる
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

// 前の日記の列の、リンク先の一覧
function recentLinks(parts) {
  return parts["diary-recent-list"].children.map(function (item) { return item.children[0].href; });
}

test("第3回：最新の下に、最新を除いた新しい順の3件が並ぶ（最新と同じ日記を2回出さない）。読み直しても増えない", async function () {
  const parts = setUpPanel();
  installFetch(DATES);
  assert.strictEqual(await showLatestDiary("diary/entries/", PATHS), true);
  await showLatestDiary("diary/entries/", PATHS);
  assert.strictEqual(RECENT_DIARY_COUNT, 3);
  assert.deepStrictEqual(recentLinks(parts), [
    "diary/entry.html?date=2026-11-17", "diary/entry.html?date=2026-11-16", "diary/entry.html?date=2026-11-15"
  ]);
});

test("第3回：日記が1件だけなら前の列は空、2件なら1行だけ", async function () {
  let parts = setUpPanel();
  installFetch(["2026-11-20"]);
  assert.strictEqual(await showLatestDiary("diary/entries/", PATHS), true);
  assert.strictEqual(parts["diary-recent-list"].children.length, 0);
  parts = setUpPanel();
  installFetch(["2026-11-17", "2026-11-20"]);
  await showLatestDiary("diary/entries/", PATHS);
  assert.strictEqual(parts["diary-recent-list"].children.length, 1);
});

test("第3回：前の日の日記が1件読めなくても、その日だけ飛ばして残りと最新は出る", async function () {
  const parts = setUpPanel();
  installFetch(DATES, function (date, body) {
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

test("第3回：前の日記の1行は「N日目」と見出しで、全体がその日へのリンク。部品がなければ何もしない", function () {
  installFakeDocument({});
  const entry = readSample("2026-11-17");
  const link = createRecentCard(entry, PATHS).children[0];
  assert.strictEqual(link.href, "diary/entry.html?date=2026-11-17");
  assert.strictEqual(link.children[0].textContent, "4日目");
  assert.strictEqual(link.children[1].textContent, entry.title);
  assert.strictEqual(showRecentDiaries([entry], PATHS), false);
});

test("2026-11-28：入口の並びは 最初の画面 → AI役員 → 日記 → 道具 → LINE → 道具箱 → 締め → 注意書き", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const order = ['id="top"', 'id="officers"', 'id="diary-latest"', 'id="tool-list"', 'id="line-panel"', 'id="toolbox"', 'id="end-contact"', 'id="note"'].map(function (mark) {
    return html.indexOf(mark);
  });
  order.forEach(function (position) {
    assert.ok(position > 0);
  });
  assert.deepStrictEqual(order.slice().sort(function (a, b) { return a - b; }), order);
});
