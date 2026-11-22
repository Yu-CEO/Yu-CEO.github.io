/*
 * build_bundle.test.js：公開を軽くする工夫の自動テスト
 *   - tools/build_bundle.js（公開するときに CSS・JS をページごとにまとめる）
 *   - ヒーローの画像（assets/yu.webp と index.html の書き方）と、script の defer
 * 本物の index.html・diary/ のページと css/・js/ を一時フォルダにコピーし、CI の公開の手順と同じようにまとめて確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { findStylesheets, findScripts, splitScripts, bundleSite, PAGE_FILES } = require("../tools/build_bundle.js");

const PORTAL_FOLDER = path.join(__dirname, "..");
// CI の公開の手順（.github/workflows/ci.yml）で _site にコピーするもののうち、このテストに要るもの
const COPIED_ITEMS = ["index.html", "contact.html", "css", "js", "diary"];
// まとめたあとの数：CSS は1つ、JS は「表示用」と「アクセス解析用」の2つ
const EXPECTED_STYLESHEETS = 1;
const EXPECTED_SCRIPTS = 2;

/**
 * 本物のファイルを一時フォルダ（公開するフォルダの代わり）にコピーする。
 * @returns {string} 一時フォルダの場所
 */
function makeSiteCopy() {
  const siteFolder = fs.mkdtempSync(path.join(os.tmpdir(), "portal-bundle-"));
  COPIED_ITEMS.forEach(function (item) {
    fs.cpSync(path.join(PORTAL_FOLDER, item), path.join(siteFolder, item), { recursive: true });
  });
  return siteFolder;
}

/**
 * ページから見た場所のファイルを読む。
 * @param {string} folder 公開するフォルダ（またはリポジトリ）
 * @param {string} pageFile ページの場所
 * @param {string} reference ページから見た場所
 * @returns {string} 中身
 */
function readFromPage(folder, pageFile, reference) {
  return fs.readFileSync(path.join(folder, path.posix.dirname(pageFile), reference), "utf8");
}

/**
 * HTML から CSS・JS の読み込みの行を消す（まとめる前後で「ほかの部分が変わっていない」ことを比べるため）。
 * @param {string} html HTML の文字
 * @returns {string} 読み込みの行を除いた HTML
 */
function withoutLoadLines(html) {
  return html.split("\n").filter(function (line) {
    return !/^\s*<(link rel="stylesheet"|script src=)/.test(line);
  }).join("\n");
}

/**
 * まとめたファイルの中に、元のファイルの中身が書いた順で全部入っているかを確かめる。
 * @param {string} bundle まとめたファイルの中身
 * @param {string[]} originals 元のファイルの中身（順番どおり）
 * @param {string} label 失敗したときの表示
 */
function assertContainsInOrder(bundle, originals, label) {
  let position = 0;
  originals.forEach(function (original, index) {
    const found = bundle.indexOf(original, position);
    assert.ok(found >= position, label + " の " + (index + 1) + " 番目のファイルが、順番どおりに入っていません");
    position = found + original.length;
  });
}

test("軽量化：まとめたあと、3ページとも CSS は1つ・JS は2つ（表示用→アクセス解析用）で、すべて defer", function () {
  const siteFolder = makeSiteCopy();
  bundleSite(siteFolder);
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(siteFolder, pageFile), "utf8");
    assert.strictEqual(findStylesheets(html).length, EXPECTED_STYLESHEETS, pageFile);
    const scripts = findScripts(html);
    assert.strictEqual(scripts.length, EXPECTED_SCRIPTS, pageFile);
    const scriptTags = html.match(/<script[^>]*>/g);
    scriptTags.forEach(function (tag) {
      assert.ok(/ defer>$/.test(tag), pageFile + " に defer のない script があります：" + tag);
    });
    // CSP（script-src 'self'）に合うように、同じサイトの js/・css/ に置く
    assert.ok(/^(\.\.\/)?js\/bundle\.[0-9a-f]+\.js$/.test(scripts[0]), scripts[0]);
    assert.ok(/^(\.\.\/)?css\/bundle\.[0-9a-f]+\.css$/.test(findStylesheets(html)[0]));
  });
});

test("軽量化：まとめたファイルに、元の CSS・JS が書いた順で全部入り、JS は文法として正しい", function () {
  const siteFolder = makeSiteCopy();
  const originalPages = {};
  PAGE_FILES.forEach(function (pageFile) {
    originalPages[pageFile] = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
  });
  bundleSite(siteFolder);
  PAGE_FILES.forEach(function (pageFile) {
    const before = originalPages[pageFile];
    const after = fs.readFileSync(path.join(siteFolder, pageFile), "utf8");
    const cssBundle = readFromPage(siteFolder, pageFile, findStylesheets(after)[0]);
    const cssOriginals = findStylesheets(before).map(function (href) {
      return readFromPage(PORTAL_FOLDER, pageFile, href);
    });
    assertContainsInOrder(cssBundle, cssOriginals, pageFile + " の CSS");
    const groups = splitScripts(findScripts(before));
    const bundles = findScripts(after);
    [groups.page, groups.analytics].forEach(function (group, index) {
      const jsBundle = readFromPage(siteFolder, pageFile, bundles[index]);
      const originals = group.map(function (src) {
        return readFromPage(PORTAL_FOLDER, pageFile, src);
      });
      assertContainsInOrder(jsBundle, originals, pageFile + " の JS");
      // 文法の誤りがあればここで失敗する（ブラウザでは動かさない。読み込めるかだけを確かめる）
      assert.doesNotThrow(function () {
        new vm.Script(jsBundle, { filename: bundles[index] });
      });
    });
  });
});

test("軽量化：まとめても、読み込みの行のほか（CSP・説明文・本文）は変わらない。計測の JS は3ページで同じファイル", function () {
  const siteFolder = makeSiteCopy();
  bundleSite(siteFolder);
  const analyticsBundles = PAGE_FILES.map(function (pageFile) {
    const before = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const after = fs.readFileSync(path.join(siteFolder, pageFile), "utf8");
    assert.strictEqual(withoutLoadLines(after), withoutLoadLines(before), pageFile);
    return path.posix.basename(findScripts(after)[1]);
  });
  assert.strictEqual(new Set(analyticsBundles).size, 1, "計測の JS がページごとに別のファイルになっています");
});

test("軽量化：HTML が読み込むファイルが見つからないときは、公開せずに日本語で止まる", function () {
  const siteFolder = makeSiteCopy();
  fs.rmSync(path.join(siteFolder, "js", "main.js"));
  assert.throws(function () {
    bundleSite(siteFolder);
  }, /js\/main\.js が見つかりません/);
});

test("軽量化：リポジトリの3ページは、すべての script に defer が付いている", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const tags = html.match(/<script[^>]*>/g) || [];
    assert.ok(tags.length > 0, pageFile);
    tags.forEach(function (tag) {
      assert.ok(/ defer>$/.test(tag), pageFile + " に defer のない script があります：" + tag);
    });
  });
});

test("軽量化：ヒーローの肖像は WebP を先に使い（jpg は予備）、幅・高さと fetchpriority=\"high\" が付いている", function () {
  const html = fs.readFileSync(path.join(PORTAL_FOLDER, "index.html"), "utf8");
  assert.ok(/<picture>\s*<source srcset="assets\/yu\.webp" type="image\/webp">\s*<img id="hero-image" src="assets\/yu\.jpg"/.test(html));
  const heroTag = html.match(/<img id="hero-image"[^>]*>/)[0];
  assert.ok(heroTag.includes('width="787"') && heroTag.includes('height="1400"'), heroTag);
  assert.ok(heroTag.includes('fetchpriority="high"'), heroTag);
  assert.ok(!heroTag.includes('loading="lazy"'), "最初に見える画像を後回しにしています");
});

test("軽量化：assets/yu.webp は yu.jpg と同じ 787×1400 で、yu.jpg より小さく、EXIF・XMP などの埋め込み情報がない", function () {
  const webp = fs.readFileSync(path.join(PORTAL_FOLDER, "assets", "yu.webp"));
  const jpg = fs.readFileSync(path.join(PORTAL_FOLDER, "assets", "yu.jpg"));
  assert.strictEqual(webp.toString("ascii", 0, 4), "RIFF");
  assert.strictEqual(webp.toString("ascii", 8, 12), "WEBP");
  // 単純な形（VP8 のチャンクだけ）なら、EXIF・XMP を入れる場所（VP8X の拡張）がない
  assert.strictEqual(webp.toString("ascii", 12, 16), "VP8 ", "拡張つきの WebP です。埋め込み情報を入れずに作り直してください");
  assert.ok(!/EXIF|XMP /.test(webp.toString("latin1")), "埋め込み情報があります");
  // VP8 の画像の大きさは、チャンクの始まり（20バイト目）から 6 バイト後に、幅・高さの順で 14 ビットずつ入っている
  const VP8_SIZE_OFFSET = 26;
  const SIZE_MASK = 0x3fff;
  assert.strictEqual(webp.readUInt16LE(VP8_SIZE_OFFSET) & SIZE_MASK, 787);
  assert.strictEqual(webp.readUInt16LE(VP8_SIZE_OFFSET + 2) & SIZE_MASK, 1400);
  assert.ok(webp.length < jpg.length, "yu.webp が yu.jpg より大きくなっています");
});
