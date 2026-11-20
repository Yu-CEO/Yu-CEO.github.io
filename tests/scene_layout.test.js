/*
 * scene_layout.test.js：ヒーローの会議の場面の配置（js/scene_layout.js）のテスト
 * 確かめること：席の数・Yu が左の端・上下の振り分け・机の中に収まる・写真の重ね位置（%）・今日の Day N・場面の文字と動きの約束
 * 受け入れ基準：AC-1（机を囲む顔・Day N）・AC-5（動きは1回だけ・動きを減らす設定）・AC-6（「LIVE」などの言葉がない）・AC-7（360px で横に伸びない）。
 * 実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// scene_layout.js は diary_day.js の getDayNumber を使う
global.getDayNumber = require("../js/diary_day.js").getDayNumber;
const { computeSceneLayout, getTodayDayNumber, computeRowXs, toPercentBox } = require("../js/scene_layout.js");

const PORTAL_FOLDER = path.join(__dirname, "..");
const NINE = ["Yu", "秘書", "CMO", "プロデューサー", "ブランドディレクター", "アオイ", "CFO", "CTO", "CISO"];

test("AC-1：9人なら席が9つで、Yu は左の端（机より左）、上4・下4に分かれる", function () {
  const layout = computeSceneLayout(NINE);
  assert.strictEqual(layout.seats.length, 9);
  const yu = layout.seats.find(function (seat) { return seat.isYu; });
  assert.ok(yu.x + yu.radius <= layout.table.x, "Yu の席が机にかぶっています");
  const others = layout.seats.filter(function (seat) { return !seat.isYu; });
  const upper = others.filter(function (seat) { return seat.y < layout.table.y; });
  const lower = others.filter(function (seat) { return seat.y > layout.table.y + layout.table.height; });
  assert.strictEqual(upper.length, 4);
  assert.strictEqual(lower.length, 4);
});

test("AC-1：すべての席は絵（viewBox）の中に収まり、並びの順番（order）は0から連番", function () {
  const layout = computeSceneLayout(NINE);
  layout.seats.forEach(function (seat, index) {
    assert.ok(seat.x - seat.radius >= 0 && seat.x + seat.radius <= layout.width, seat.name);
    assert.ok(seat.y - seat.radius >= 0 && seat.y + seat.radius <= layout.height, seat.name);
    assert.strictEqual(seat.order, index);
  });
});

test("AC-1：Yu がいない（日記の場面など）と、机が左に詰まり、席は他の人だけ", function () {
  const layout = computeSceneLayout(["CFO", "CTO", "CISO"]);
  assert.strictEqual(layout.seats.length, 3);
  assert.ok(layout.seats.every(function (seat) { return !seat.isYu; }));
  assert.ok(layout.table.x < 20);
});

test("AC-1：人数が0でも壊れない（机だけ）", function () {
  const layout = computeSceneLayout([]);
  assert.strictEqual(layout.seats.length, 0);
  assert.ok(layout.width > 0 && layout.table.width >= 150);
});

test("AC-1：1列の席は机の中で左右対称に並ぶ", function () {
  const xs = computeRowXs(2, 0, 200);
  assert.strictEqual(xs.length, 2);
  assert.strictEqual(xs[0] + xs[1], 200);
});

test("写真の重ね位置：席の丸を、絵全体に対する % の四角に直す", function () {
  const box = toPercentBox({ x: 50, y: 50, radius: 10 }, { width: 100, height: 100 });
  assert.deepStrictEqual(box, { left: 40, top: 40, width: 20, height: 20 });
  const layout = computeSceneLayout(NINE);
  const yu = layout.seats[0];
  const real = toPercentBox(yu, layout);
  assert.ok(real.left >= 0 && real.left + real.width <= 100);
  assert.ok(real.top >= 0 && real.top + real.height <= 100);
});

test("AC-1：今日の Day N（Day 1 ＝ 2026-11-14）。2026-11-20 は Day 7、夜中の23:59でも同じ日", function () {
  assert.strictEqual(getTodayDayNumber(new Date(2026, 10, 14)), 1);
  assert.strictEqual(getTodayDayNumber(new Date(2026, 10, 20, 23, 59)), 7);
  assert.strictEqual(getTodayDayNumber(new Date(2027, 1, 11)), 90);
});

test("AC-6：場面のコード・CSS・HTML に、今この瞬間を表す言葉（LIVE・いま会議中・配信中）がない", function () {
  const files = ["js/meeting_scene.js", "js/scene_layout.js", "css/meeting_scene.css", "index.html"];
  files.forEach(function (file) {
    const text = fs.readFileSync(path.join(PORTAL_FOLDER, file), "utf8");
    // 日記の注意書きにある「22時ライブ」（プロフィール文・変更なし）は対象外。場面の言葉だけを確かめる
    const sceneText = file === "index.html" ? text.slice(text.indexOf('id="hero-stage"'), text.indexOf("</header>")) : text;
    assert.ok(!/LIVE|いま会議中|今会議中|配信中|会議中/.test(sceneText), file);
  });
});

test("AC-5：動きは1回だけ（infinite を使わない）で、動きを減らす設定では animation:none になる", function () {
  const css = fs.readFileSync(path.join(PORTAL_FOLDER, "css", "meeting_scene.css"), "utf8");
  assert.ok(!/infinite/.test(css), "くり返しの動きがあります");
  const reduce = css.match(/@media \(prefers-reduced-motion:reduce\)\{[^}]*\{[^}]*\}[^}]*\}/);
  assert.ok(reduce !== null && /animation:none/.test(reduce[0]), "動きを減らす設定の指定がありません");
});

test("AC-7：場面の入れ物は幅100%で、最大幅を変数で止めている（横に伸びない）", function () {
  const css = fs.readFileSync(path.join(PORTAL_FOLDER, "css", "meeting_scene.css"), "utf8");
  assert.ok(/\.hero-stage\{[^}]*width:100%;[^}]*max-width:var\(--scene-max\)/.test(css));
});

test("AC-22：場面は外部から何も読み込まない（http の文字がない・speakers.svg は同じサイトのもの）", function () {
  ["js/meeting_scene.js", "js/scene_layout.js", "css/meeting_scene.css"].forEach(function (file) {
    const text = fs.readFileSync(path.join(PORTAL_FOLDER, file), "utf8");
    assert.ok(!/https?:\/\//.test(text.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, "")), file);
  });
});
