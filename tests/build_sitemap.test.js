/*
 * build_sitemap.test.js：tools/build_sitemap.js（日記の日付の一覧から sitemap.xml を作る）の自動テスト（requirements_seo.md 2-8 の7）
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildSitemapXml, writeSitemap } = require("../tools/build_sitemap.js");

const REAL_INDEX = path.join(__dirname, "..", "diary", "entries", "index.json");

/**
 * sitemap の中身から <loc> の URL を取り出す。
 * @param {string} xml sitemap の中身
 * @returns {string[]} URL の一覧
 */
function readLocations(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]*)<\/loc>/g)).map(function (match) {
    return match[1];
  });
}

test("AC-8：日付の一覧から、入口・一覧・日記1件・シミュレーター・動画診断・為替の学習ツールの URL と lastmod を作る", function () {
  const xml = buildSitemapXml(["2026-11-14", "2026-11-15"]);
  assert.ok(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"));
  assert.deepStrictEqual(readLocations(xml), [
    "https://yu-ceo.github.io/",
    "https://yu-ceo.github.io/diary/",
    "https://yu-ceo.github.io/contact.html",
    "https://yu-ceo.github.io/diary/entry.html?date=2026-11-14",
    "https://yu-ceo.github.io/diary/entry.html?date=2026-11-15",
    "https://yu-ceo.github.io/okane-simulator/",
    "https://yu-ceo.github.io/video-check/",
    "https://yu-ceo.github.io/fx-simulator/"
  ]);
  // 入口と一覧は一番新しい日記の日付、日記1件はその日付、シミュレーター・動画診断・為替の学習ツールは書かない
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/</loc><lastmod>2026-11-15</lastmod>"));
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/diary/entry.html?date=2026-11-14</loc><lastmod>2026-11-14</lastmod>"));
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/video-check/</loc></url>"));
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/fx-simulator/</loc></url>"));
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/okane-simulator/</loc></url>"));
  // 問い合わせページは日付を持たない
  assert.ok(xml.includes("<loc>https://yu-ceo.github.io/contact.html</loc></url>"));
  assert.ok(!/changefreq|priority/.test(xml));
});

test("日付が0件でも、入口・一覧・問い合わせ・シミュレーター・動画診断・為替の学習ツールの6件で作る", function () {
  const xml = buildSitemapXml([]);
  assert.strictEqual(readLocations(xml).length, 6);
  assert.ok(!xml.includes("<lastmod>"));
});

test("AC-11：形の違う日付・配列でない一覧は、どの値かを日本語で出して失敗する", function () {
  assert.throws(function () { buildSitemapXml(["2026-11-14", "2026-1-5"]); }, /YYYY-MM-DD の形でない値があります："2026-1-5"/);
  assert.throws(function () { buildSitemapXml(["2026-11-14&x=1"]); }, /YYYY-MM-DD の形でない値/);
  assert.throws(function () { buildSitemapXml([20261114]); }, /YYYY-MM-DD の形でない値/);
  assert.throws(function () { buildSitemapXml({}); }, /配列ではありません/);
});

test("AC-8：実際の index.json から作ると、日付の数＋6件になり、書き出したファイルも同じ中身", function () {
  const dates = JSON.parse(fs.readFileSync(REAL_INDEX, "utf8"));
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "sitemap-"));
  try {
    const outputFile = writeSitemap(folder);
    const xml = fs.readFileSync(outputFile, "utf8");
    assert.strictEqual(readLocations(xml).length, dates.length + 6);
    assert.strictEqual(xml, buildSitemapXml(dates));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("AC-9：sitemap.xml はリポジトリに置かない（公開の手順で作る）。CI の公開の手順で作り、robots.txt も公開する", function () {
  assert.ok(!fs.existsSync(path.join(__dirname, "..", "sitemap.xml")));
  const ci = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8");
  assert.ok(ci.includes("node tools/build_sitemap.js _site"));
  assert.ok(ci.includes("cp index.html contact.html robots.txt _site/"));
  assert.ok(ci.includes("cp ads.txt _site/"), "ads.txt（AdSense）を公開していません");
});
