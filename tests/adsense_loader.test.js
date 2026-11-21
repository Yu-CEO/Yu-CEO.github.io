/*
 * adsense_loader.test.js：Google AdSense を読み込む条件と、所有権の確認（meta・ads.txt）の ID がそろっているかを確かめる
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { planAdsense, startAdsense } = require("../js/adsense_loader.js");
const { SITE_CONFIG } = require("../js/site_config.js");

const CONFIG = { ADSENSE_CLIENT: "ca-pub-1234567890123456", ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io" };
const PUBLIC_PAGE = { protocol: "https:", hostname: "yu-ceo.github.io" };
const PAGE_FILES = ["index.html", "diary/index.html", "diary/entry.html"];
const PORTAL_FOLDER = path.join(__dirname, "..");

test("AdSense：公開サイトで開いたときだけ、AdSense の公式の場所を読み込む", function () {
  assert.strictEqual(planAdsense(CONFIG, PUBLIC_PAGE),
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456");
  assert.strictEqual(planAdsense(CONFIG, { protocol: "http:", hostname: "localhost" }), null);
  assert.strictEqual(planAdsense(CONFIG, { protocol: "file:", hostname: "" }), null);
  assert.strictEqual(planAdsense(CONFIG, { protocol: "https:", hostname: "evil.example.com" }), null);
});

test("AdSense：ID が空・形が違うときは読み込まない", function () {
  assert.strictEqual(planAdsense(Object.assign({}, CONFIG, { ADSENSE_CLIENT: "" }), PUBLIC_PAGE), null);
  assert.strictEqual(planAdsense(Object.assign({}, CONFIG, { ADSENSE_CLIENT: "ca-pub-12\"><x" }), PUBLIC_PAGE), null);
  assert.strictEqual(planAdsense(null, PUBLIC_PAGE), null);
});

test("AdSense：site_config.js の ADSENSE_CLIENT が正しい形で、3ページの meta・ads.txt と同じ ID", function () {
  assert.ok(planAdsense(SITE_CONFIG, PUBLIC_PAGE), "ADSENSE_CLIENT の形が正しくありません");
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    assert.ok(html.includes('<meta name="google-adsense-account" content="' + SITE_CONFIG.ADSENSE_CLIENT + '">'),
      pageFile + " に AdSense の確認用の meta がありません");
  });
  const adsTxt = fs.readFileSync(path.join(PORTAL_FOLDER, "ads.txt"), "utf8");
  const publisherId = SITE_CONFIG.ADSENSE_CLIENT.replace(/^ca-/, "");
  assert.ok(adsTxt.includes("google.com, " + publisherId + ", DIRECT, f08c47fec0942fa0"), "ads.txt の ID が違います");
});

test("AdSense：読み込むときは script を1つだけ async・crossorigin つきで足し、手元では何もしない", function () {
  const added = [];
  const win = {
    location: PUBLIC_PAGE,
    document: {
      createElement: function () { return {}; },
      head: { appendChild: function (el) { added.push(el); } }
    }
  };
  startAdsense(CONFIG, win);
  assert.strictEqual(added.length, 1);
  assert.strictEqual(added[0].async, true);
  assert.strictEqual(added[0].crossOrigin, "anonymous");
  startAdsense(CONFIG, Object.assign({}, win, { location: { protocol: "http:", hostname: "localhost" } }));
  assert.strictEqual(added.length, 1);
});
