/*
 * build_sitemap.js：検索エンジン向けのページの一覧（sitemap.xml）を、公開している日記の日付の一覧から作る（requirements_seo.md 2-6）
 * 使い方：portal フォルダで `node tools/build_sitemap.js <書き出すフォルダ>`（CI の公開の手順で `_site` を渡す）
 * 主な関数：buildSitemapXml（日付の一覧から XML の文字を作る。ファイルに触れない）、readDiaryDates（diary/entries/index.json を読む）、
 *   writeSitemap（読んで作って書き出す）
 * sitemap.xml はリポジトリには置かない（日記が増えるたびに手で直さなくてよいように、公開のたびに作る）。
 * .github/workflows/ci.yml の deploy から呼ばれる。tests/build_sitemap.test.js でテストする。外部ライブラリは使わない。
 */
const fs = require("node:fs");
const path = require("node:path");

const SITE_URL = "https://yu-ceo.github.io/";
// 入口と同じホストにある、別のリポジトリのページ（日付は分からないので lastmod は書かない）
const SIMULATOR_URL = SITE_URL + "okane-simulator/";
const VIDEO_CHECK_URL = SITE_URL + "video-check/";
const FX_SIMULATOR_URL = SITE_URL + "fx-simulator/";
const DIARY_INDEX_FILE = path.join(__dirname, "..", "diary", "entries", "index.json");
const SITEMAP_FILE_NAME = "sitemap.xml";
// 載せてよい日付の形（YYYY-MM-DD）。ほかの値はURLに入れず、失敗にする
const SITEMAP_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// URL に入っていたら失敗にする文字（XML で特別な意味を持つため。今のURLには含まれない）
const XML_SPECIAL_CHARACTERS = /[&<>"']/;

/**
 * 1つの URL の <url> の行を作る。
 * @param {string} location ページの URL
 * @param {string} lastModified 最後に変わった日（YYYY-MM-DD。書かないときは ""）
 * @returns {string} <url>…</url> の文字
 * @example buildUrlElement("https://yu-ceo.github.io/", "2026-11-16")
 */
function buildUrlElement(location, lastModified) {
  if (XML_SPECIAL_CHARACTERS.test(location)) {
    throw new Error("sitemap に入れられない記号を含む URL です：" + location);
  }
  let element = "  <url><loc>" + location + "</loc>";
  if (lastModified !== "") {
    element += "<lastmod>" + lastModified + "</lastmod>";
  }
  return element + "</url>";
}

/**
 * 日付の一覧が sitemap に載せられる形かを確かめる。1つでも違えば、どの値が正しくないかを日本語で出して失敗にする。
 * @param {*} dates diary/entries/index.json の中身
 * @returns {string[]} 確かめた日付の一覧
 * @example checkSitemapDates(["2026-11-14"]) // ["2026-11-14"]
 */
function checkSitemapDates(dates) {
  if (!Array.isArray(dates)) {
    throw new Error("diary/entries/index.json が配列ではありません");
  }
  dates.forEach(function (date) {
    if (typeof date !== "string" || !SITEMAP_DATE_PATTERN.test(date)) {
      throw new Error("diary/entries/index.json に YYYY-MM-DD の形でない値があります：" + JSON.stringify(date));
    }
  });
  return dates;
}

/**
 * 日付の一覧から sitemap.xml の中身を作る。載せるのは入口・日記の一覧・日記1件（日付の数）・シミュレーター・動画診断・為替の学習ツール。
 * 入口と一覧の lastmod は一番新しい日記の日付、日記1件はその日付。日記が0件なら入口と一覧の lastmod は書かない。
 * @param {string[]} dates 公開している日記の日付
 * @returns {string} sitemap.xml の中身（UTF-8 の XML）
 * @example buildSitemapXml(["2026-11-14", "2026-11-15"])
 */
function buildSitemapXml(dates) {
  const checked = checkSitemapDates(dates);
  const newest = checked.slice().sort().pop() || "";
  const elements = [
    buildUrlElement(SITE_URL, newest),
    buildUrlElement(SITE_URL + "diary/", newest)
  ];
  checked.forEach(function (date) {
    elements.push(buildUrlElement(SITE_URL + "diary/entry.html?date=" + date, date));
  });
  elements.push(buildUrlElement(SIMULATOR_URL, ""));
  elements.push(buildUrlElement(VIDEO_CHECK_URL, ""));
  elements.push(buildUrlElement(FX_SIMULATOR_URL, ""));
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">",
    elements.join("\n"),
    "</urlset>",
    ""
  ].join("\n");
}

/**
 * diary/entries/index.json を読む。
 * @param {string} indexFile index.json の場所
 * @returns {*} 中身
 * @example readDiaryDates(DIARY_INDEX_FILE) // ["2026-11-14", …]
 */
function readDiaryDates(indexFile) {
  return JSON.parse(fs.readFileSync(indexFile, "utf8"));
}

/**
 * sitemap.xml を作って、決まったフォルダに書き出す。
 * @param {string} outputFolder 書き出すフォルダ（CI では _site）
 * @param {string} [indexFile] index.json の場所（テストで差しかえる）
 * @returns {string} 書き出したファイルの場所
 * @example writeSitemap("_site")
 */
function writeSitemap(outputFolder, indexFile) {
  const xml = buildSitemapXml(readDiaryDates(indexFile || DIARY_INDEX_FILE));
  const outputFile = path.join(outputFolder, SITEMAP_FILE_NAME);
  fs.writeFileSync(outputFile, xml, "utf8");
  return outputFile;
}

if (require.main === module) {
  const outputFolder = process.argv[2];
  if (!outputFolder) {
    console.error("書き出すフォルダを指定してください（例：node tools/build_sitemap.js _site）");
    process.exitCode = 1;
  } else {
    try {
      console.log("sitemap を作りました：" + writeSitemap(outputFolder));
    } catch (error) {
      console.error("sitemap を作れませんでした：" + error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { buildSitemapXml, checkSitemapDates, readDiaryDates, writeSitemap, SITE_URL };
