/*
 * build_bundle.js：公開する直前に、ページごとの CSS と JS をそれぞれ1つのファイルにまとめて、通信の回数を減らす
 * 使い方：portal フォルダで `node tools/build_bundle.js <公開するフォルダ>`（CI の公開の手順で `_site` を渡す）
 * 主な関数：findStylesheets・findScripts（HTML から読み込みの一覧を取り出す）、joinFiles（中身をつなぐ）、
 *   rewritePage（1ページ分をまとめて HTML を書き換える）、bundleSite（全ページ分）
 * リポジトリの css/・js/ は機能ごとに分けたまま（読みやすさのため）。まとめたファイルは公開用のフォルダにだけ作る。
 * .github/workflows/ci.yml の deploy から呼ばれる。tests/build_bundle.test.js でテストする。外部ライブラリは使わない。
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

// まとめる対象のページ（公開するフォルダの中の場所）
const PAGE_FILES = ["index.html", "diary/index.html", "diary/entry.html", "contact.html"];
// アクセス解析の JS は、ほかとは別の1ファイルにまとめる。
// 理由：ページの表示の JS がエラーで止まっても、計測は動かす（今の「最後に別に読み込む」の決まりを守る）。4ページで同じ中身なので、2ページ目からはブラウザに保存された物を使える
const ANALYTICS_PREFIX = "analytics_";
// まとめたファイルの名前に入れる、中身から作った印（ハッシュ）の長さ。中身が変わると名前も変わるので、古いファイルが使われ続けない
const HASH_LENGTH = 10;
// まとめたファイルを置く場所（元のファイルと同じフォルダ。CSS の中の相対の場所がずれないように）
const CSS_FOLDER = "css";
const JS_FOLDER = "js";
// HTML の中の読み込みのタグ（1行に1つずつ書いてある前提）
const STYLESHEET_LINE = /^[ \t]*<link rel="stylesheet" href="([^"]+)">[ \t]*\r?\n/gm;
const SCRIPT_LINE = /^[ \t]*<script src="([^"]+)"( defer)?><\/script>[ \t]*\r?\n/gm;

/**
 * HTML から、CSS の読み込み（<link rel="stylesheet">）の場所を、書いてある順に取り出す。
 * @param {string} html HTML の文字
 * @returns {string[]} href の一覧
 * @example findStylesheets('<link rel="stylesheet" href="css/a.css">\n') // ["css/a.css"]
 */
function findStylesheets(html) {
  return Array.from(html.matchAll(STYLESHEET_LINE)).map(function (match) {
    return match[1];
  });
}

/**
 * HTML から、JS の読み込み（<script src>）の場所を、書いてある順に取り出す。
 * @param {string} html HTML の文字
 * @returns {string[]} src の一覧
 * @example findScripts('<script src="js/a.js" defer></script>\n') // ["js/a.js"]
 */
function findScripts(html) {
  return Array.from(html.matchAll(SCRIPT_LINE)).map(function (match) {
    return match[1];
  });
}

/**
 * JS の一覧を「表示の JS」と「アクセス解析の JS」に分ける（順番はそのまま）。
 * @param {string[]} sources src の一覧
 * @returns {{ page: string[], analytics: string[] }} 分けた結果
 * @example splitScripts(["js/main.js", "js/analytics_main.js"]) // { page: ["js/main.js"], analytics: ["js/analytics_main.js"] }
 */
function splitScripts(sources) {
  const result = { page: [], analytics: [] };
  sources.forEach(function (source) {
    if (path.posix.basename(source).startsWith(ANALYTICS_PREFIX)) {
      result.analytics.push(source);
    } else {
      result.page.push(source);
    }
  });
  return result;
}

/**
 * ファイルの中身を、書いてある順につなぐ。どの部分がどのファイルから来たかを、区切りのコメントで残す。
 * JS は区切りに「;」を入れる（前のファイルの最後に「;」がなくても、次のファイルとくっつかないように）。
 * @param {string} siteFolder 公開するフォルダ
 * @param {string} pageFile ページの場所（例：diary/index.html）。href はこのページから見た場所
 * @param {string[]} references href・src の一覧
 * @param {string} separator ファイルの間に入れる文字（JS は ";\n"、CSS は "\n"）
 * @returns {string} つないだ中身
 * @example joinFiles("_site", "index.html", ["js/a.js", "js/b.js"], ";\n")
 */
function joinFiles(siteFolder, pageFile, references, separator) {
  const pageFolder = path.posix.dirname(pageFile);
  const parts = references.map(function (reference) {
    const filePath = path.join(siteFolder, path.posix.join(pageFolder, reference));
    if (!fs.existsSync(filePath)) {
      throw new Error(pageFile + " が読み込む " + reference + " が見つかりません。ファイル名とHTMLの書き方を確かめてください");
    }
    const sourceName = path.posix.normalize(path.posix.join(pageFolder, reference));
    return "/* ---- " + sourceName + " ---- */\n" + fs.readFileSync(filePath, "utf8");
  });
  return parts.join(separator) + "\n";
}

/**
 * つないだ中身を、中身から作った名前のファイルに書き出す。同じ中身なら同じ名前になる（2ページで共有できる）。
 * @param {string} siteFolder 公開するフォルダ
 * @param {string} folder 置くフォルダ（css か js）
 * @param {string} extension 拡張子（.css か .js）
 * @param {string} content 中身
 * @returns {string} 公開するフォルダから見た場所（例：js/bundle.0123456789.js）
 */
function writeBundle(siteFolder, folder, extension, content) {
  const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, HASH_LENGTH);
  const bundlePath = folder + "/bundle." + hash + extension;
  fs.writeFileSync(path.join(siteFolder, bundlePath), content, "utf8");
  return bundlePath;
}

/**
 * HTML の中の、決まった形の行をまとめて1行にする。先頭の行を新しい行に置き換え、残りの行は消す。
 * @param {string} html HTML の文字
 * @param {RegExp} linePattern 対象の行の形（g つき）
 * @param {function(string): boolean} isTarget href・src を受け取り、この置き換えの対象なら true を返す
 * @param {string} newLine 置き換える1行（改行つき）
 * @returns {string} 書き換えた HTML
 */
function replaceLines(html, linePattern, isTarget, newLine) {
  let replaced = false;
  return html.replace(linePattern, function (line, reference) {
    if (!isTarget(reference)) {
      return line;
    }
    if (replaced) {
      return "";
    }
    replaced = true;
    return newLine;
  });
}

/**
 * 公開するフォルダから見た場所を、ページから見た場所に直す。
 * @param {string} pageFile ページの場所（例：diary/index.html）
 * @param {string} sitePath 公開するフォルダから見た場所（例：js/bundle.x.js）
 * @returns {string} ページから見た場所（例：../js/bundle.x.js）
 */
function relativeFromPage(pageFile, sitePath) {
  return path.posix.relative(path.posix.dirname(pageFile), sitePath);
}

/**
 * 1ページ分の CSS・JS をまとめ、HTML の読み込みの行を書き換える。
 * CSS は1つ、JS は「表示の JS」と「アクセス解析の JS」の2つにする。JS には defer（HTML を読み終えてから順に動かす）を付ける。
 * @param {string} siteFolder 公開するフォルダ
 * @param {string} pageFile ページの場所
 * @returns {{ stylesheets: number, scripts: number }} まとめる前の CSS・JS の数（ログ用）
 */
function rewritePage(siteFolder, pageFile) {
  const htmlPath = path.join(siteFolder, pageFile);
  let html = fs.readFileSync(htmlPath, "utf8");
  const stylesheets = findStylesheets(html);
  const scripts = splitScripts(findScripts(html));
  if (stylesheets.length > 0) {
    const cssPath = writeBundle(siteFolder, CSS_FOLDER, ".css", joinFiles(siteFolder, pageFile, stylesheets, "\n"));
    const cssLine = '<link rel="stylesheet" href="' + relativeFromPage(pageFile, cssPath) + '">\n';
    html = replaceLines(html, STYLESHEET_LINE, function () { return true; }, cssLine);
  }
  [scripts.page, scripts.analytics].forEach(function (group) {
    if (group.length === 0) {
      return;
    }
    const jsPath = writeBundle(siteFolder, JS_FOLDER, ".js", joinFiles(siteFolder, pageFile, group, ";\n"));
    const scriptLine = '<script src="' + relativeFromPage(pageFile, jsPath) + '" defer></script>\n';
    html = replaceLines(html, SCRIPT_LINE, function (source) { return group.includes(source); }, scriptLine);
  });
  fs.writeFileSync(htmlPath, html, "utf8");
  return { stylesheets: stylesheets.length, scripts: scripts.page.length + scripts.analytics.length };
}

/**
 * 公開するフォルダの全ページ（PAGE_FILES）をまとめる。
 * @param {string} siteFolder 公開するフォルダ
 * @returns {void}
 * @example bundleSite("_site")
 */
function bundleSite(siteFolder) {
  PAGE_FILES.forEach(function (pageFile) {
    const counts = rewritePage(siteFolder, pageFile);
    console.log(pageFile + "：CSS " + counts.stylesheets + " 個・JS " + counts.scripts + " 個をまとめました");
  });
}

// コマンドとして動かしたとき（node tools/build_bundle.js _site）だけ実行する。テストで require したときは動かさない
if (require.main === module) {
  const siteFolder = process.argv[2];
  if (!siteFolder || !fs.existsSync(siteFolder)) {
    console.error("公開するフォルダを指定してください（例：node tools/build_bundle.js _site）");
    process.exit(1);
  }
  bundleSite(siteFolder);
}

module.exports = { findStylesheets, findScripts, splitScripts, joinFiles, replaceLines, relativeFromPage, rewritePage, bundleSite, PAGE_FILES };
