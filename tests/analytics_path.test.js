/*
 * analytics_path.test.js：アクセス解析の「送ってよいか」と送信用URL（js/analytics_path.js）と、
 * 送り方（js/analytics_beacon.js：1回だけ・ページに置かない・例外で止まらない）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  planPageView, isValidAnalyticsHost, buildPagePath, buildReferrerSite, buildCountUrl, ANALYTICS_HOST_WARNING
} = require("../js/analytics_path.js");
const { startAnalytics, resetAnalyticsForTest } = require("../js/analytics_beacon.js");
const { SITE_CONFIG } = require("../js/site_config.js");

// テスト用の仮の送り先（実際のサイトコードではない）
const TEST_HOST = "test-site.goatcounter.com";
const TEST_CONFIG = { ANALYTICS_ENABLED: true, ANALYTICS_HOST: TEST_HOST, ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io" };

/**
 * 公開サイトの入口を開いたときのページの情報を作る（変えたい項目だけを上書きする）。
 * @param {object} overrides 上書きする項目
 * @returns {object} planPageView に渡すページの情報
 */
function makePage(overrides) {
  return Object.assign({
    protocol: "https:", hostname: "yu-ceo.github.io", pathname: "/", search: "", referrer: "",
    doNotTrack: undefined, globalPrivacyControl: undefined, randomValue: "abc123"
  }, overrides);
}

/**
 * 送信用URLから、送る値（クエリ）を名前と値の組にして取り出す。
 * @param {string} url 送信用URL
 * @returns {object} 名前 → 値
 */
function readSentValues(url) {
  return Object.fromEntries(new URL(url).searchParams.entries());
}

/**
 * startAnalytics に渡す、にせのブラウザを作る（作った画像・ページに置いた物・コンソールの文を記録する）。
 * @param {object} locationValues location の値
 * @returns {object} にせのブラウザ
 */
function makeFakeBrowser(locationValues) {
  const record = { images: [], appended: [], warnings: [] };
  const fakeDocument = {
    referrer: "",
    createElement: function (tagName) {
      const element = { tagName: tagName, src: "" };
      record.images.push(element);
      return element;
    },
    body: { appendChild: function (child) { record.appended.push(child); } }
  };
  return {
    record: record,
    location: Object.assign({ protocol: "https:", hostname: "yu-ceo.github.io", pathname: "/", search: "", hash: "" }, locationValues),
    document: fakeDocument,
    navigator: {},
    console: { warn: function (text) { record.warnings.push(text); } }
  };
}

test("AC-1：公開サイトの入口では送り、ページの場所は / 。#toolbox は送らない", function () {
  const plan = planPageView(TEST_CONFIG, makePage({ pathname: "/" }));
  assert.strictEqual(plan.send, true);
  assert.ok(plan.url.startsWith("https://" + TEST_HOST + "/count?"));
  assert.strictEqual(readSentValues(plan.url).p, "/");
  assert.ok(!plan.url.includes("toolbox"));
});

test("AC-1：入口を開くと、画像の読み込みが1回だけ起きる（2回呼んでも1回）", function () {
  resetAnalyticsForTest();
  const browser = makeFakeBrowser({ hash: "#toolbox" });
  assert.strictEqual(startAnalytics(TEST_CONFIG, browser), true);
  assert.strictEqual(startAnalytics(TEST_CONFIG, browser), false);
  assert.strictEqual(browser.record.images.length, 1);
  assert.strictEqual(readSentValues(browser.record.images[0].src).p, "/");
});

test("AC-2：日記1件は正しい形の日付だけを付け、ほかのクエリ（utm_ など）は送らない", function () {
  assert.strictEqual(buildPagePath("/diary/entry.html", "?date=2026-11-15"), "/diary/entry.html?date=2026-11-15");
  assert.strictEqual(buildPagePath("/diary/entry.html", "?date=abc"), "/diary/entry.html");
  assert.strictEqual(buildPagePath("/diary/entry.html", "?date=2026-11-15&utm_source=x"), "/diary/entry.html?date=2026-11-15");
  assert.strictEqual(buildPagePath("/diary/entry.html", ""), "/diary/entry.html");
  // 日記1件のページ以外では、クエリを送らない
  assert.strictEqual(buildPagePath("/diary/", "?date=2026-11-15"), "/diary/");
  const plan = planPageView(TEST_CONFIG, makePage({ pathname: "/diary/entry.html", search: "?date=2026-11-15&utm_source=x" }));
  assert.strictEqual(readSentValues(plan.url).p, "/diary/entry.html?date=2026-11-15");
  assert.ok(!plan.url.includes("utm_"));
});

test("AC-3：参照元はサイト名だけ。無いときは空", function () {
  assert.strictEqual(buildReferrerSite("https://www.tiktok.com/@yu_from_l2w/video/123?lang=ja"), "https://www.tiktok.com");
  assert.strictEqual(buildReferrerSite(""), "");
  assert.strictEqual(buildReferrerSite("読めない文字"), "");
  const withReferrer = planPageView(TEST_CONFIG, makePage({ referrer: "https://www.tiktok.com/@yu_from_l2w/video/123?lang=ja" }));
  assert.strictEqual(readSentValues(withReferrer.url).r, "https://www.tiktok.com");
  assert.ok(!withReferrer.url.includes("video"));
  const withoutReferrer = planPageView(TEST_CONFIG, makePage({ referrer: "" }));
  assert.strictEqual(readSentValues(withoutReferrer.url).r, "");
});

test("AC-4：手元のサーバー（localhost）や file:// では送らない", function () {
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ protocol: "http:", hostname: "localhost" })).send, false);
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ protocol: "file:", hostname: "" })).send, false);
  // 公開サイトの名前でも https でなければ送らない
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ protocol: "http:" })).send, false);
  resetAnalyticsForTest();
  const browser = makeFakeBrowser({ protocol: "http:", hostname: "localhost" });
  assert.strictEqual(startAnalytics(TEST_CONFIG, browser), false);
  assert.strictEqual(browser.record.images.length, 0);
});

test("AC-5：ANALYTICS_ENABLED が false なら送らず、コンソールにも何も出さない", function () {
  const config = Object.assign({}, TEST_CONFIG, { ANALYTICS_ENABLED: false });
  const plan = planPageView(config, makePage({}));
  assert.deepStrictEqual(plan, { send: false, url: "", warning: "" });
});

test("AC-6：送り先の形が正しくないと送らず、コンソールに日本語で直し方を出す", function () {
  ["example.com", "evil.goatcounter.com.example.com", "", "SITE.goatcounter.com", "a.b.goatcounter.com", "goatcounter.com", undefined]
    .forEach(function (host) {
      assert.strictEqual(isValidAnalyticsHost(host), false, String(host));
      const config = Object.assign({}, TEST_CONFIG, { ANALYTICS_HOST: host });
      const plan = planPageView(config, makePage({}));
      assert.strictEqual(plan.send, false);
      assert.strictEqual(plan.warning, ANALYTICS_HOST_WARNING);
    });
  assert.ok(ANALYTICS_HOST_WARNING.includes("site_config.js の ANALYTICS_HOST を確認してください"));
  assert.strictEqual(isValidAnalyticsHost(TEST_HOST), true);
  resetAnalyticsForTest();
  const browser = makeFakeBrowser({});
  startAnalytics(Object.assign({}, TEST_CONFIG, { ANALYTICS_HOST: "example.com" }), browser);
  assert.strictEqual(browser.record.images.length, 0);
  assert.deepStrictEqual(browser.record.warnings, [ANALYTICS_HOST_WARNING]);
});

test("AC-7：「トラッキングしない」（doNotTrack が \"1\"・globalPrivacyControl が true）のときは送らない", function () {
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ doNotTrack: "1" })).send, false);
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ globalPrivacyControl: true })).send, false);
  assert.strictEqual(planPageView(TEST_CONFIG, makePage({ doNotTrack: "0" })).send, true);
});

test("AC-8：送信用URLには、ページの場所（p）・参照元（r）・乱数（rnd）以外の値がない", function () {
  const plan = planPageView(TEST_CONFIG, makePage({ pathname: "/diary/", referrer: "https://line.me/R/x?y=1" }));
  assert.deepStrictEqual(Object.keys(readSentValues(plan.url)).sort(), ["p", "r", "rnd"]);
  assert.strictEqual(buildCountUrl(TEST_HOST, "/", "", "k3x"), "https://" + TEST_HOST + "/count?p=%2F&r=&rnd=k3x");
});

test("AC-10：計測の画像はページに置かない", function () {
  resetAnalyticsForTest();
  const browser = makeFakeBrowser({});
  startAnalytics(TEST_CONFIG, browser);
  assert.strictEqual(browser.record.images.length, 1);
  assert.strictEqual(browser.record.appended.length, 0);
});

test("AC-9：送るときに例外が起きても受け止め、ほかのJSを止めない", function () {
  resetAnalyticsForTest();
  const browser = makeFakeBrowser({});
  browser.document.createElement = function () {
    throw new Error("画像を作れない");
  };
  assert.doesNotThrow(function () {
    startAnalytics(TEST_CONFIG, browser);
  });
});

test("2-4：設定の送り先は、空か決まった形のサイトコードだけ", function () {
  const host = SITE_CONFIG.ANALYTICS_HOST;
  assert.ok(host === "" || isValidAnalyticsHost(host), "ANALYTICS_HOST の形が正しくありません");
  assert.strictEqual(typeof SITE_CONFIG.ANALYTICS_ENABLED, "boolean");
  assert.strictEqual(SITE_CONFIG.ANALYTICS_PUBLIC_HOST, "yu-ceo.github.io");
});
