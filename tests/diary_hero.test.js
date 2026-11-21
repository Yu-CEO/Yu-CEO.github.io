/*
 * diary_hero.test.js：日記の入口画像（hero）の自動テスト
 * 対象：js/diary_hero_view.js（表示の部品）・3つの表示場所（日記1件のページ・入口の最新カード・日記一覧のカード）・
 *   js/diary_validate_format3.js の hero の検査・tools/diary_changes.js と tools/diary_contents.js（自動公開の判定と画像の検査）
 * 日記はテスト用の仮のデータ（tests/fixtures/diary_entries/2026-11-20.json）に hero を足して使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, findByClass, installFakeDocument } = require("./helpers/fake_dom.js");
const { showEntryByFormat } = require("../js/diary_story_view.js");
const { fillLatestCard } = require("../js/diary_latest_panel.js");
const { showDiaryList } = require("../js/diary_list_view.js");
const { createDiaryHero } = require("../js/diary_hero_view.js");
const { findEntryProblems } = require("../js/diary_format.js");
const { judgeDiaryChanges, NEEDS_DEV_FLOW_MESSAGE } = require("../tools/diary_changes.js");
const { checkHeroMatch } = require("../tools/diary_file_match.js");
const { main } = require("../tools/diary_publish.js");
const {
  FIXTURES, SKIP_REASON, writeFile, makeContext, withWorld, assertStoppedWithoutPush
} = require("./helpers/practice_repo.js");

const HERO_DATE = "2026-11-20";
const HERO_ALT = "テスト用の画像の説明";
const ENTRY_PATHS = { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/", heroFolder: "heroes/" };
const LIST_PATHS = { faceFile: "../assets/speakers.svg", entryPage: "entry.html", homePage: "../", heroFolder: "heroes/" };
// JPEG の先頭の印（FF D8 FF）と、その次の1バイト
const JPEG_HEAD = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
// 入口画像の大きさの上限（400KB）
const HERO_LIMIT_BYTES = 400 * 1024;

/**
 * 仮の3版目の日記を読み、hero を足す（withHero が false なら足さない）。
 * @param {boolean} withHero hero を足すか
 * @returns {object} 日記1件
 */
function readEntry(withHero) {
  const entry = JSON.parse(fs.readFileSync(path.join(FIXTURES, "diary_entries", HERO_DATE + ".json"), "utf8"));
  if (withHero) {
    entry.hero = { alt: HERO_ALT };
  }
  return entry;
}

/**
 * 部品の中の、<img> をすべて探す。
 * @param {object} element 探す場所
 * @returns {object[]} 見つかった img
 */
function findImages(element) {
  let found = [];
  element.children.forEach(function (child) {
    if (child.tagName === "img") {
      found.push(child);
    }
    found = found.concat(findImages(child));
  });
  return found;
}

/**
 * 日記1件のページを、にせの画面に表示する。
 * @param {object} entry 日記1件
 * @returns {object} 表示した場所
 */
function renderEntryPage(entry) {
  installFakeDocument({});
  const area = createFakeElement("main");
  showEntryByFormat(area, entry, ENTRY_PATHS);
  return area;
}

test("入口画像：1件のページは、本文の一番上（道しるべより前）に hero.alt つきの画像が出る（16:9・lazy にしない）", function () {
  const area = renderEntryPage(readEntry(true));
  const body = findByClass(area, "d-body");
  const first = body.children[0];
  assert.strictEqual(first.tagName, "img");
  assert.strictEqual(first.className, "d-hero");
  assert.strictEqual(first.src, "heroes/" + HERO_DATE + ".jpg");
  assert.strictEqual(first.alt, HERO_ALT);
  assert.strictEqual(first.width * 9, first.height * 16);
  assert.notStrictEqual(first.loading, "lazy");
  assert.strictEqual(body.children[1].className, "d-flow");
});

test("入口画像：hero のない日のページは、今までどおり（画像が増えない）", function () {
  const area = renderEntryPage(readEntry(false));
  const body = findByClass(area, "d-body");
  assert.strictEqual(body.children[0].className, "d-flow");
  assert.ok(findImages(body).every(function (image) { return image.className !== "d-hero"; }));
});

test("入口画像：場所は検査済みの日付と決まった文字 .jpg から作る。日付の形が違う・使う場所の名前が違えば何も作らない", function () {
  installFakeDocument({});
  const entry = readEntry(true);
  assert.strictEqual(createDiaryHero(entry, "heroes/", "page").src, "heroes/2026-11-20.jpg");
  entry.date = "../../evil";
  assert.strictEqual(createDiaryHero(entry, "heroes/", "page"), null);
  assert.strictEqual(createDiaryHero(readEntry(true), "heroes/", "unknown"), null);
});

test("入口画像：読み込めない（error）ときは、画像だけが隠れる", function () {
  const document = installFakeDocument({});
  const originalCreate = document.createElement;
  const listeners = {};
  let createdImage = null;
  // 画像の要素に登録された error の処理を取り出すため、作った要素の addEventListener を差し替える
  document.createElement = function (tagName) {
    const element = originalCreate(tagName);
    if (tagName === "img") {
      createdImage = element;
      element.addEventListener = function (name, handler) {
        listeners[name] = handler;
      };
    }
    return element;
  };
  createDiaryHero(readEntry(true), "heroes/", "page");
  document.createElement = originalCreate;
  assert.strictEqual(typeof listeners.error, "function");
  assert.notStrictEqual(createdImage.hidden, true);
  listeners.error();
  assert.strictEqual(createdImage.hidden, true);
});

test("入口画像：入口の「最新の日記」カードは、一番上に飾り扱い（alt なし）の画像。hero なしなら出さない", function () {
  installFakeDocument({});
  const card = createFakeElement("article");
  fillLatestCard(card, readEntry(true), "assets/speakers.svg", "diary/heroes/");
  assert.strictEqual(card.children[0].tagName, "img");
  assert.strictEqual(card.children[0].src, "diary/heroes/" + HERO_DATE + ".jpg");
  assert.strictEqual(card.children[0].alt, "");
  assert.strictEqual(card.children[0].className, "d-card-hero");
  fillLatestCard(card, readEntry(false), "assets/speakers.svg", "diary/heroes/");
  assert.strictEqual(findImages(card).filter(function (image) { return image.className === "d-card-hero"; }).length, 0);
  assert.strictEqual(card.children[0].className, "d-meta");
});

test("入口画像：日記一覧のカードは、一番上に飾り扱い（alt なし）の lazy な画像。hero のない日のカードは今までどおり", function () {
  installFakeDocument({});
  const area = createFakeElement("main");
  showDiaryList(area, createFakeElement("p"), [readEntry(true), readEntry(false)], LIST_PATHS);
  const links = findAllByClass(area, "d-item").map(function (item) { return item.children[0]; });
  const heroImage = links[0].children[0];
  assert.strictEqual(heroImage.tagName, "img");
  assert.strictEqual(heroImage.src, "heroes/" + HERO_DATE + ".jpg");
  assert.strictEqual(heroImage.alt, "");
  assert.strictEqual(heroImage.loading, "lazy");
  assert.strictEqual(links[1].children[0].className, "d-meta");
});

test("入口画像：検査は { alt } だけ書ける。強調の記号・別の項目・長すぎる alt・空の alt・{ } でない値は止める", function () {
  assert.deepStrictEqual(findEntryProblems(readEntry(true), HERO_DATE), []);
  assert.deepStrictEqual(findEntryProblems(readEntry(false), HERO_DATE), []);
  const withMark = readEntry(true);
  withMark.hero.alt = "**強調**";
  assert.match(findEntryProblems(withMark, HERO_DATE).join("／"), /hero.*強調の記号/);
  const withExtra = readEntry(true);
  withExtra.hero.caption = "余計";
  assert.match(findEntryProblems(withExtra, HERO_DATE).join("／"), /「hero」に、/);
  const tooLong = readEntry(true);
  tooLong.hero.alt = "あ".repeat(201);
  assert.match(findEntryProblems(tooLong, HERO_DATE).join("／"), /hero.*200文字/);
  const empty = readEntry(true);
  empty.hero = {};
  assert.match(findEntryProblems(empty, HERO_DATE).join("／"), /hero.*alt/);
  const notObject = readEntry(true);
  notObject.hero = "x.jpg";
  assert.match(findEntryProblems(notObject, HERO_DATE).join("／"), /「hero」が/);
});

const NEW_ENTRY = { state: "??", path: "diary/entries/2026-11-16.json" };
const INDEX_CHANGE = { state: " M", path: "diary/entries/index.json" };

test("入口画像：その日の heroes/<日付>.jpg（0〜1つ）は上げてよいファイルに入る", function () {
  const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/heroes/2026-11-16.jpg" }]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.hasHero, true);
  assert.ok(result.files.includes("diary/heroes/2026-11-16.jpg"));
  assert.strictEqual(judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE]).hasHero, false);
});

test("入口画像：別の日・別の拡張子・別の名前・既にあるファイルの変更・2つ目は止める", function () {
  const stoppers = [
    { state: "??", path: "diary/heroes/2026-11-15.jpg" },
    { state: "??", path: "diary/heroes/2026-11-16.png" },
    { state: "??", path: "diary/heroes/2026-11-16.jpeg" },
    { state: "??", path: "diary/heroes/2026-11-16-2.jpg" },
    { state: " M", path: "diary/heroes/2026-11-16.jpg" }
  ];
  stoppers.forEach(function (change) {
    const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE, change]);
    assert.strictEqual(result.ok, false, change.path);
    assert.ok(result.problems.includes(NEEDS_DEV_FLOW_MESSAGE));
  });
  const twice = judgeDiaryChanges([
    NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/heroes/2026-11-16.jpg" }, { state: "A ", path: "diary/heroes/2026-11-16.jpg" }
  ]);
  assert.strictEqual(twice.ok, false);
});

test("入口画像：JSON の hero とファイルの有無が合わないと止める（あるのにファイルなし・ファイルがあるのに hero なし）", function () {
  assert.match(checkHeroMatch({ hero: { alt: "a" } }, false).join("／"), /hero があるのに/);
  const extra = checkHeroMatch({}, true);
  assert.match(extra.join("／"), /hero がないのに/);
  assert.ok(extra.includes(NEEDS_DEV_FLOW_MESSAGE));
  assert.deepStrictEqual(checkHeroMatch({ hero: { alt: "a" } }, true), []);
  assert.deepStrictEqual(checkHeroMatch({}, false), []);
});

/**
 * 3版目の日の練習用リポジトリに、日記と index.json・図2枚・（任意で）入口画像を置く。
 * @param {object} world makeWorld の結果
 * @param {Buffer|null} heroBytes 入口画像の中身（置かないなら null）
 * @param {boolean} withHero 日記に hero を書くか
 * @param {string} [heroFile] 画像の置き場所（既定は diary/heroes/<日付>.jpg）
 */
function addHeroEntry(world, heroBytes, withHero, heroFile) {
  const entry = readEntry(withHero);
  writeFile(world.repo, "diary/entries/" + HERO_DATE + ".json", JSON.stringify(entry, null, 2) + "\n");
  writeFile(world.repo, "diary/entries/index.json", "[\"2026-11-15\", \"" + HERO_DATE + "\"]\n");
  ["", "-2"].forEach(function (suffix) {
    const svg = fs.readFileSync(path.join(FIXTURES, "diary_figures", HERO_DATE + suffix + ".svg"), "utf8");
    writeFile(world.repo, "diary/figures/" + HERO_DATE + suffix + ".svg", svg);
  });
  if (heroBytes !== null) {
    const target = path.join(world.repo, heroFile || "diary/heroes/" + HERO_DATE + ".jpg");
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, heroBytes);
  }
}

/**
 * --check を動かして、終了コードと記録を返す（今日の日付を日記の日に合わせる）。
 * @param {object} world makeWorld の結果
 * @returns {{ code: number, run: object }} 結果
 */
function runCheck(world) {
  const run = makeContext(world);
  run.context.today = HERO_DATE;
  return { code: main(["--check"], run.context), run: run };
}

test("入口画像：hero あり＋JPEG の画像（400KB 以下）なら --check は PASS", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addHeroEntry(world, Buffer.concat([JPEG_HEAD, Buffer.alloc(1000)]), true);
    const result = runCheck(world);
    assert.strictEqual(result.code, 0, result.run.record.logs.join("\n"));
  });
});

test("入口画像：JPEG の印で始まらない・400KB を超える・日記に hero がない・画像がない、は止まる", { skip: SKIP_REASON }, function () {
  const cases = [
    { bytes: Buffer.from("not a jpeg at all"), withHero: true, reason: /JPEG の画像ではありません/ },
    { bytes: Buffer.concat([JPEG_HEAD, Buffer.alloc(HERO_LIMIT_BYTES)]), withHero: true, reason: /400KB を超えています/ },
    { bytes: Buffer.concat([JPEG_HEAD, Buffer.alloc(100)]), withHero: false, reason: /hero がないのに/ },
    { bytes: null, withHero: true, reason: /hero があるのに/ }
  ];
  cases.forEach(function (item) {
    withWorld(function (world) {
      addHeroEntry(world, item.bytes, item.withHero);
      const result = runCheck(world);
      assertStoppedWithoutPush(world, result.run, result.code, item.reason);
    });
  });
});

test("入口画像：別の日の画像・.png の画像は、自動公開では止まる", { skip: SKIP_REASON }, function () {
  ["diary/heroes/2026-11-15.jpg", "diary/heroes/" + HERO_DATE + ".png"].forEach(function (heroFile) {
    withWorld(function (world) {
      addHeroEntry(world, Buffer.concat([JPEG_HEAD, Buffer.alloc(100)]), true, heroFile);
      const result = runCheck(world);
      assertStoppedWithoutPush(world, result.run, result.code, /通常の \/dev フローとCEO承認が必要です/);
    });
  });
});
