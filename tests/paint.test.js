/*
 * paint.test.js：最初の画面の塗れる絵（js/paint_data.js・paint_view.js）と、前回と違う番号を選ぶ処理（js/daily_pick.js）のテスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, installFakeDocument } = require("./helpers/fake_dom.js");
const { PAINT_PALETTES, PAINT_SCENES } = require("../js/paint_data.js");
const { buildPaintHint, drawPaintScene, paintRegion } = require("../js/paint_view.js");
const { pickNewIndex } = require("../js/daily_pick.js");

// 絵の状態（にせの部品つき）を作り、線画を描く
function setUpPaint() {
  installFakeDocument({});
  const state = {
    svg: createFakeElement("svg"), hint: createFakeElement("span"), autoButton: createFakeElement("button"),
    done: createFakeElement("div"), scene: PAINT_SCENES[0], palette: PAINT_PALETTES[1], regions: [], touched: false, timers: []
  };
  drawPaintScene(state);
  return state;
}

test("絵は3種・色は5組で、塗る色の番号は組の中に収まる。色の組の数は CSS の theme と同じ", function () {
  assert.strictEqual(PAINT_SCENES.length, 3);
  assert.strictEqual(PAINT_PALETTES.length, 5);
  PAINT_SCENES.forEach(function (scene) {
    scene.parts.forEach(function (part) {
      assert.ok(/^M/.test(part[0]) && !/NaN|undefined/.test(part[0]), scene.name);
      assert.ok(part[1] >= -1 && part[1] < 5, scene.name);
    });
  });
  const css = fs.readFileSync(path.join(__dirname, "..", "css", "home_base.css"), "utf8");
  PAINT_PALETTES.forEach(function (palette, index) {
    assert.ok(css.includes("body.theme-" + index + "{"), palette.name);
  });
});

test("案内の文：開いた直後・塗り途中・全部塗れたとき", function () {
  assert.strictEqual(buildPaintHint(12, 12, false, "ラムネ"), "指でさわると色がつく（今日はラムネ）");
  assert.strictEqual(buildPaintHint(5, 12, true, "ラムネ"), "いいね。あと5か所");
  assert.strictEqual(buildPaintHint(0, 12, true, "ラムネ"), "12か所ぜんぶ塗れました");
});

test("線画は白で始まり、触った所だけ色がつく。全部塗ると「ほら、意外とやれた。」が出て、ボタンは「もう一度」", function () {
  const state = setUpPaint();
  let celebrated = 0;
  global.dropConfetti = function () { celebrated += 1; };
  assert.ok(state.regions.every(function (region) { return region.getAttribute("fill") === "#ffffff"; }));
  paintRegion(state, state.regions[0], true);
  assert.strictEqual(state.regions[0].getAttribute("fill"), PAINT_PALETTES[1].sky);
  assert.strictEqual(state.done.hidden, true);
  paintRegion(state, createFakeElement("path"), true);
  state.regions.forEach(function (region) { paintRegion(state, region, true); });
  assert.strictEqual(state.done.hidden, false);
  assert.strictEqual(state.autoButton.textContent, "もう一度");
  assert.strictEqual(celebrated, 1);
  delete global.dropConfetti;
});

test("開くたびの番号は前回と違い、保存できない端末でも止まらない", function () {
  const saved = {};
  const storage = {
    getItem: function (key) { return key in saved ? saved[key] : null; },
    setItem: function (key, value) { saved[key] = value; }
  };
  const zero = function () { return 0; };
  const get = function () { return storage; };
  assert.strictEqual(pickNewIndex("k", 5, zero, get), 0);
  assert.strictEqual(pickNewIndex("k", 5, zero, get), 1);
  assert.strictEqual(pickNewIndex("k", 5, zero, function () { throw new Error("使えない"); }), 0);
});

test("入口の自前のコードは style 属性を書かず、確認用の部品がない", function () {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  assert.ok(!/<[a-z][^>]* style=/.test(html));
  assert.ok(!/<style[\s>]/.test(html));
  assert.ok(!/dev-open|v-pal|v-scene/.test(html));
  ["paint_view.js", "confetti.js", "officer_view.js", "main.js"].forEach(function (file) {
    const code = fs.readFileSync(path.join(__dirname, "..", "js", file), "utf8");
    assert.ok(!/\.style\b|setAttribute\("style"|cssText/.test(code), file);
  });
});
