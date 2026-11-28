/*
 * diary_views.test.js：日記の表示（一覧・1件のページ・入口の「最新の日記」パネル）の自動テスト
 * Node.js にはブラウザの画面がないので、tests/helpers/fake_dom.js の「にせの画面」で確かめる。
 * 日記はテスト用の仮のデータ（tests/fixtures/diary_entries/）を使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, findByClass, installFakeDocument } = require("./helpers/fake_dom.js");
const { showDiaryList } = require("../js/diary_list_view.js");
const { showDiaryEntry, showDiaryNotFound } = require("../js/diary_entry_view.js");
const { showLatestDiary } = require("../js/diary_latest_panel.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const LIST_PATHS = { faceFile: "../assets/speakers.svg", entryPage: "entry.html", homePage: "../", listPage: "./" };

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
 * 決まった日記の一覧を返す、にせの fetch を用意する。
 * @param {*} index index.json の中身（null なら読めない）
 * @param {object} entries 日付と日記の組
 */
function installFakeFetch(index, entries) {
  global.fetch = function (url) {
    let body = null;
    if (url.endsWith("index.json")) {
      body = index;
    } else {
      const date = url.slice(-15, -5);
      if (Object.prototype.hasOwnProperty.call(entries, date)) {
        body = entries[date];
      }
    }
    return Promise.resolve({ ok: body !== null, json: function () { return Promise.resolve(body); } });
  };
}

/**
 * 入口ページの日記の区画の部品（状態の箱・札・本数・前の日記の列）を、にせの画面に用意する。
 * @returns {object} 部品の組
 */
function setUpLatestPanel() {
  const parts = {};
  ["diary-ok", "diary-loading", "diary-failed", "diary-empty", "diary-latest-card", "diary-count-area", "diary-count", "diary-recent-list"].forEach(function (id) {
    parts[id] = createFakeElement("div");
  });
  installFakeDocument(parts);
  return parts;
}

// 4つの状態の箱のうち、出ているものの id の一覧
function shownStates(parts) {
  return ["diary-ok", "diary-loading", "diary-failed", "diary-empty"].filter(function (id) {
    return parts[id].hidden === false;
  });
}

test("AC-4：一覧は渡した順（新しい順）にカードが並び、カード全体がその日のページへのリンクになる", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const count = createFakeElement("p");
  showDiaryList(area, count, [readSample("2026-11-16"), readSample("2026-11-15")], LIST_PATHS);
  const links = findAllByTag(area, "a");
  assert.deepStrictEqual(links.map(function (link) { return link.href; }), ["entry.html?date=2026-11-16", "entry.html?date=2026-11-15"]);
  const first = links[0];
  assert.strictEqual(findByClass(first, "d-day").textContent, "3日目");
  assert.ok(findByClass(first, "d-summary"));
  assert.ok(findAllByClass(first, "avatar-small").length > 0);
  assert.strictEqual(findByClass(first, "read-label").textContent, "読む");
  assert.strictEqual(count.textContent, "全2件・新しい順");
});

test("AC-6：日記が0件なら「まだ日記はありません」、読み込めないなら「日記を読み込めませんでした」", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const count = createFakeElement("p");
  showDiaryList(area, count, [], LIST_PATHS);
  assert.match(area.textContent, /まだ日記はありません/);
  assert.strictEqual(count.hidden, true);
  showDiaryList(area, count, null, LIST_PATHS);
  assert.match(area.textContent, /日記を読み込めませんでした/);
});

test("AC-2：登場した話者が6人以上なら、顔は5人分と「+N」", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryList(area, createFakeElement("p"), [readSample("2026-11-14")], LIST_PATHS);
  assert.strictEqual(findAllByClass(area, "avatar-small").length, 5);
  assert.strictEqual(findByClass(area, "faces-more").textContent, "+1");
});

test("AC-7：1件のページは決まった順に並び、タブの題名が「N日目 見出し｜経営会議の日記」になる", function () {
  const doc = installFakeDocument({});
  const area = createFakeElement("main");
  const entry = readSample("2026-11-14");
  showDiaryEntry(area, entry, LIST_PATHS);
  const head = area.children[0];
  assert.strictEqual(findByClass(head, "d-day-big").textContent, "AI会社を始めて1日目");
  assert.strictEqual(findByClass(head, "d-h1").textContent, entry.title);
  assert.ok(findByClass(head, "d-hook"));
  const sectionTitles = findAllByClass(area, "d-sec-title").map(function (title) { return title.textContent; });
  assert.deepStrictEqual(sectionTitles, ["01今日の議題", "02役員の一言", "03今日の決定", "04今日の失敗・学び"]);
  assert.ok(findByClass(area.children[2], "d-cta-box"));
  assert.strictEqual(doc.title, "1日目 " + entry.title + "｜経営会議の日記");
});

test("AC-7：セリフは名前が吹き出しの上に出て、読み上げ・コピーでは「話者：セリフ」になる", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const entry = readSample("2026-11-14");
  showDiaryEntry(area, entry, LIST_PATHS);
  const rows = findAllByClass(area, "d-line");
  assert.strictEqual(rows.length, entry.lines.length);
  assert.strictEqual(findByClass(rows[2], "speaker-name").textContent, "アオイ");
  assert.strictEqual(findByClass(rows[2], "bubble").textContent, "アオイ：" + entry.lines[2].text);
});

test("AC-32：Yu の吹き出しは右寄せの紺（is-yu）、ほかは左寄せ。顔は話者ごとの決まった絵", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-14"), LIST_PATHS);
  const rows = findAllByClass(area, "d-line");
  assert.match(rows[1].className, /is-yu/);
  assert.doesNotMatch(rows[2].className, /is-yu/);
  const face = findByClass(rows[1], "avatar");
  assert.strictEqual(face.children[0].children[0].getAttribute("href"), "../assets/speakers.svg#yu");
});

test("AC-30：今日の一言は pick の番号のセリフ（pick が 3 なら3番目）を、顔（大）・名前・役の説明つきで出す", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const entry = readSample("2026-11-14");
  showDiaryEntry(area, entry, LIST_PATHS);
  const pick = findByClass(area, "d-pick");
  assert.strictEqual(findByClass(pick, "pick-quote").textContent, entry.lines[2].text);
  assert.strictEqual(findByClass(pick, "pick-speaker").textContent, "アオイ（リスナー代表）");
  assert.ok(findByClass(pick, "avatar-large"));
});

test("AC-31：今日の参加は、話した人の小さな顔が重複なく登場順に並ぶ", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-15"), LIST_PATHS);
  const faces = findByClass(findByClass(area, "d-who-came"), "faces");
  assert.strictEqual(faces.getAttribute("aria-label"), "登場：秘書・プロデューサー・ブランドディレクター・CFO・Yu");
});

test("AC-8：決定が3つの日は、冒頭に1つ目と「ほか2件は下の『今日の決定』に」が出る", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-14"), LIST_PATHS);
  const decision = findByClass(area, "d-dec");
  assert.match(decision.textContent, /日記は1〜3分で読める長さにする/);
  assert.strictEqual(findByClass(decision, "decision-rest").textContent, "ほか2件は下の「今日の決定」に");
});

test("AC-8：決定がない日は「今日は決定なし」と出て、冒頭の「今日の決定」は出ない", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-15"), LIST_PATHS);
  assert.strictEqual(findByClass(area, "d-dec"), undefined);
  assert.strictEqual(findByClass(area, "d-none").textContent, "今日は決定なし");
});

test("AC-33：本文の最後に「見るだけの参加もOK。」・オープンチャットのボタン・一覧へ戻るがある", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-14"), LIST_PATHS);
  const box = findByClass(area, "d-cta-box");
  assert.match(box.textContent, /見るだけの参加もOK。/);
  const openchat = findByClass(box, "btn-line");
  assert.strictEqual(openchat.id, "diary-openchat");
  assert.strictEqual(openchat.textContent, "オープンチャットで続きを話そう");
  assert.strictEqual(openchat.rel, "noopener");
  assert.strictEqual(findByClass(box, "btn-sub").href, "./");
});

test("AC-42：出口の枠に、Zenn の説明の1行と文字のリンク（新しいタブ・noopener・最初は隠れる）があり、ボタンは2つのまま", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryEntry(area, readSample("2026-11-14"), LIST_PATHS);
  const box = findByClass(area, "d-cta-box");
  const note = findByClass(box, "d-zenn");
  assert.strictEqual(note.id, "diary-zenn-box");
  assert.strictEqual(note.hidden, true);
  assert.match(note.textContent, /会議で決めたことの作り方は、記事にまとめています。/);
  const link = findByClass(note, "text-link");
  assert.strictEqual(link.id, "diary-zenn");
  assert.strictEqual(link.textContent, "作り方の記事を読む（Zenn）");
  assert.strictEqual(link.target, "_blank");
  assert.strictEqual(link.rel, "noopener");
  assert.strictEqual(findAllByClass(findByClass(box, "actions"), "btn").length, 2);
});

test("AC-10・AC-35：HTMLの記号や表にない話者のデータでも、文字のまま表示し、絵の場所には使わない", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  const entry = readSample("2026-11-14");
  entry.lines[2].text = "<img src=x onerror=alert(1)>";
  showDiaryEntry(area, entry, LIST_PATHS);
  const bubble = findByClass(findAllByClass(area, "d-line")[2], "bubble");
  assert.strictEqual(bubble.textContent, "アオイ：<img src=x onerror=alert(1)>");
  assert.strictEqual(findAllByTag(bubble, "img").length, 0);
});

test("AC-9：見つからないときは「この日の日記は見つかりませんでした」と一覧へのリンクを出す", function () {
  const doc = installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryNotFound(area, LIST_PATHS);
  assert.match(area.textContent, /この日の日記は見つかりませんでした/);
  assert.strictEqual(findByClass(area, "btn-main").href, "./");
  assert.strictEqual(doc.title, "見つかりませんでした｜経営会議の日記");
});

test("AC-1・AC-29：入口ページに最新の日記（新しい日付）を出し、札は同じタブでその日のページへ。本数も出る", async function () {
  const parts = setUpLatestPanel();
  installFakeFetch(["2026-11-15", "2026-11-16"], { "2026-11-15": readSample("2026-11-15"), "2026-11-16": readSample("2026-11-16") });
  assert.strictEqual(await showLatestDiary("diary/entries/", { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" }), true);
  assert.deepStrictEqual(shownStates(parts), ["diary-ok"]);
  const card = parts["diary-latest-card"];
  assert.strictEqual(card.getAttribute("href"), "diary/entry.html?date=2026-11-16");
  assert.strictEqual(card.target, undefined);
  assert.strictEqual(findByClass(card, "meta").textContent, "最新｜2026.11.16");
  assert.ok(findByClass(card, "d-summary"));
  assert.strictEqual(parts["diary-count"].textContent, "2");
  assert.strictEqual(parts["diary-count-area"].hidden, false);
});

test("AC-3：日記が0件なら「最初の日記は…」と0本。読み込めない・最新の日記の形が壊れているときは失敗の表示で、本数は出さない", async function () {
  const broken = readSample("2026-11-16");
  delete broken.title;
  const cases = [
    { index: [], entries: {}, state: "diary-empty", countHidden: false },
    { index: null, entries: {}, state: "diary-failed", countHidden: true },
    { index: ["2026-11-15", "2026-11-16"], entries: { "2026-11-15": readSample("2026-11-15"), "2026-11-16": broken }, state: "diary-failed", countHidden: true }
  ];
  const originalWarn = console.warn;
  console.warn = function () {};
  try {
    for (const item of cases) {
      const parts = setUpLatestPanel();
      installFakeFetch(item.index, item.entries);
      assert.strictEqual(await showLatestDiary("diary/entries/", { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" }), false);
      assert.deepStrictEqual(shownStates(parts), [item.state]);
      assert.strictEqual(parts["diary-count-area"].hidden, item.countHidden);
    }
  } finally {
    console.warn = originalWarn;
  }
});

test("AC-3：ファイルを直接開いたときのように fetch が使えなくても、止まらずに失敗の表示になる", async function () {
  const parts = setUpLatestPanel();
  delete global.fetch;
  assert.strictEqual(await showLatestDiary("diary/entries/", { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" }), false);
  assert.deepStrictEqual(shownStates(parts), ["diary-failed"]);
});
