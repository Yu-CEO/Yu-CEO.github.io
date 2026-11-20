/*
 * gtm_loader.test.js：Google タグマネージャーを読み込む条件（requirements_analytics.md 2-10）を確かめる
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { planGtm, startGtm } = require("../js/gtm_loader.js");
const { SITE_CONFIG } = require("../js/site_config.js");

const CONFIG = { ANALYTICS_ENABLED: true, GTM_ID: "GTM-ABCD12", ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io" };
const PUBLIC_PAGE = { protocol: "https:", hostname: "yu-ceo.github.io" };

test("2-10：公開サイトで開いたときだけ、GTM の公式の場所を読み込む", function () {
  assert.strictEqual(planGtm(CONFIG, PUBLIC_PAGE), "https://www.googletagmanager.com/gtm.js?id=GTM-ABCD12");
  assert.strictEqual(planGtm(CONFIG, { protocol: "http:", hostname: "localhost" }), null);
  assert.strictEqual(planGtm(CONFIG, { protocol: "file:", hostname: "" }), null);
  assert.strictEqual(planGtm(CONFIG, { protocol: "https:", hostname: "evil.example.com" }), null);
});

test("2-10：計測を止めている・ID の形が違う・トラッキングしない のときは読み込まない", function () {
  assert.strictEqual(planGtm(Object.assign({}, CONFIG, { ANALYTICS_ENABLED: false }), PUBLIC_PAGE), null);
  assert.strictEqual(planGtm(Object.assign({}, CONFIG, { GTM_ID: "" }), PUBLIC_PAGE), null);
  assert.strictEqual(planGtm(Object.assign({}, CONFIG, { GTM_ID: "GTM-abc\"><x" }), PUBLIC_PAGE), null);
  assert.strictEqual(planGtm(CONFIG, Object.assign({ doNotTrack: "1" }, PUBLIC_PAGE)), null);
  assert.strictEqual(planGtm(CONFIG, Object.assign({ globalPrivacyControl: true }, PUBLIC_PAGE)), null);
});

test("2-10：site_config.js の GTM_ID が正しい形", function () {
  assert.ok(planGtm(SITE_CONFIG, PUBLIC_PAGE), "GTM_ID の形が正しくありません");
});

test("2-10：読み込むときは dataLayer に開始の印を入れ、script を1つだけ非同期で足す", function () {
  const added = [];
  const win = {
    location: PUBLIC_PAGE,
    navigator: {},
    document: {
      createElement: function () { return {}; },
      head: { appendChild: function (el) { added.push(el); } }
    }
  };
  startGtm(CONFIG, win);
  assert.strictEqual(added.length, 1);
  assert.strictEqual(added[0].async, true);
  assert.strictEqual(win.dataLayer[0].event, "gtm.js");
  // 手元で開いたときは何もしない
  const localWin = Object.assign({}, win, { location: { protocol: "http:", hostname: "localhost" }, dataLayer: undefined });
  startGtm(CONFIG, localWin);
  assert.strictEqual(added.length, 1);
  assert.strictEqual(localWin.dataLayer, undefined);
});
