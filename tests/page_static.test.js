/*
 * page_static.test.js：index.html・css/ の全ファイル・js/ の中身を文字として読んで、決まった文言や約束が守られているかを確かめる
 * （ブラウザを使わずに確かめられる部分だけ。見た目そのものはQAが画面で確認する）
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const PORTAL_FOLDER = path.join(__dirname, "..");
const INDEX_HTML = fs.readFileSync(path.join(PORTAL_FOLDER, "index.html"), "utf8");
const CSS_FOLDER = path.join(PORTAL_FOLDER, "css");
// css/ の全ファイルの中身を1つにつなげたもの（変数・共通・ヒーローに分けているため）
const STYLE_CSS = fs.readdirSync(CSS_FOLDER)
  .filter(function (fileName) {
    return fileName.endsWith(".css");
  })
  .map(function (fileName) {
    return fs.readFileSync(path.join(CSS_FOLDER, fileName), "utf8");
  })
  .join(" ");
const JS_FOLDER = path.join(PORTAL_FOLDER, "js");

const DISPLAY_NAME = "Yu｜AI仮想会社の社長";
const PROFILE_TEXT = "会社員エンジニア（国家資格あり）。AI役員と、自分の会社を作る実録です。うまくいかない日も記録しています。";
const DISCLAIMER_TEXT = "このサイトのツールは、入力された数字をもとに計算するだけのものです。特定の商品や売買をすすめるものではなく、将来の結果を約束するものでもありません。計算は端末の中だけで行い、入力内容はどこにも送信されません。実際の判断はご自身の責任で、必要に応じて専門家にご相談ください。";

/**
 * HTMLのタグを取り除き、文字だけをつなげる（途中に <span> が入った文言も、そのままの文で比べられるようにする）。
 * @param {string} html HTMLの文字
 * @returns {string} タグを除いた文字
 */
function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * js/ フォルダの全部のJSファイルの中身を読む。
 * @returns {{ fileName: string, code: string }[]} 各ファイルの名前と中身
 */
function readAllScripts() {
  return fs.readdirSync(JS_FOLDER)
    .filter(function (fileName) {
      return fileName.endsWith(".js");
    })
    .map(function (fileName) {
      return { fileName: fileName, code: fs.readFileSync(path.join(JS_FOLDER, fileName), "utf8") };
    });
}

/**
 * HTMLの中の、ファイルを読み込むタグ（script・link・img）の src・href が、外部（http や //）でないかを確かめる。
 * @param {string} html HTMLの文字
 * @param {string} fileName 結果の表示に使うファイル名
 */
function assertNoExternalLoads(html, fileName) {
  const loadTags = html.match(/<(script|link|img)[^>]*>/g) || [];
  loadTags.forEach(function (tag) {
    // <link rel="canonical">（検索用の正式なURLの印）は何も読み込まないので対象外（requirements_seo.md 2-2）
    if (/rel="canonical"/.test(tag)) {
      return;
    }
    assert.ok(!/(src|href)="(https?:)?\/\//.test(tag), fileName + " で外部を読み込んでいます：" + tag);
  });
}

test("AC-1：タブの名前・小見出し・表示名・プロフィール文が文言どおり", function () {
  assert.ok(INDEX_HTML.includes("<title>" + DISPLAY_NAME + "</title>"));
  const text = stripTags(INDEX_HTML);
  assert.ok(text.includes("@yu_from_l2w"));
  assert.ok(text.includes(DISPLAY_NAME));
  assert.ok(text.includes(PROFILE_TEXT));
});

test("AC-10：注意書きが文言どおりある", function () {
  assert.ok(stripTags(INDEX_HTML).includes(DISCLAIMER_TEXT));
});

test("AC-36：LINEパネルの見出し・説明が文言どおりで、仮の文言は残っていない", function () {
  const text = stripTags(INDEX_HTML);
  assert.ok(text.includes("AI役員会議の、その先へ。"));
  assert.ok(text.includes("会議の裏側や新しいツールのお知らせを届けます。見るだけの参加もOK。"));
  assert.ok(!text.includes("LINEで、つづきを。"));
});

test("AC-37：LINEの緑は濃い緑 #00843d で、以前の明るい緑は残っていない", function () {
  assert.ok(STYLE_CSS.includes("#00843d"));
  assert.ok(!STYLE_CSS.toLowerCase().includes("#06c755"));
});

test("AC-12・AC-18：外部のファイル・背景画像を読み込まず、外部への通信もしない", function () {
  // src・href で外部（http）を読み込んでいるのは <a>（押したときの移動）以外にないこと
  assertNoExternalLoads(INDEX_HTML, "index.html");
  // CSSは画像・フォントを読み込まない（ヒーローの背景はCSSのグラデーションだけで描く）
  assert.ok(!STYLE_CSS.includes("url("), "CSSでファイルを読み込んでいます");
  assert.ok(!STYLE_CSS.includes("@import"), "CSSで別のファイルを読み込んでいます");
  // 読み込み（fetch）を使ってよいのは、同じサイトの日記のデータを読む js/diary_load.js だけ
  readAllScripts().forEach(function (script) {
    assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket/.test(script.code), script.fileName + " に外部へ通信する処理があります");
    if (script.fileName !== "diary_load.js") {
      assert.ok(!/\bfetch\s*\(/.test(script.code), script.fileName + " で fetch を使っています");
    }
  });
  const loader = fs.readFileSync(path.join(JS_FOLDER, "diary_load.js"), "utf8");
  assert.ok(!/https?:/.test(loader), "diary_load.js に外部の場所が書かれています");
});

test("AC-10：画面の文字は textContent で入れ、innerHTML などHTMLとして入れる書き方がない", function () {
  readAllScripts().forEach(function (script) {
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write/.test(script.code), script.fileName + " にHTMLとして入れる書き方があります");
  });
});

test("ページで一緒に読み込むJSファイルどうしで、同じ名前の関数・定数がない（ブラウザで上書きし合わないように）", function () {
  const seen = {};
  readAllScripts().forEach(function (script) {
    const names = script.code.match(/^(?:function|const|let)\s+([A-Za-z_$][\w$]*)/gm) || [];
    names.forEach(function (declaration) {
      const name = declaration.split(/\s+/)[1];
      assert.ok(!seen[name], "「" + name + "」が " + seen[name] + " と " + script.fileName + " の両方にあります");
      seen[name] = script.fileName;
    });
  });
});

test("AC-22・AC-23：日記のページに注意書き2段落があり、外部を読み込まない", function () {
  const diaryNote = "この日記は、AIを使った役員会議の記録を、公開用に書き直したものです。金額などの数字は伏せています。登場する役員はAIのキャラクターです。特定の商品や売買をすすめるものではありません。";
  ["index.html", "entry.html"].forEach(function (fileName) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, "diary", fileName), "utf8");
    const text = stripTags(html);
    assert.ok(text.includes(DISCLAIMER_TEXT), "diary/" + fileName + " にツールの注意書きがありません");
    assert.ok(text.includes(diaryNote), "diary/" + fileName + " に日記の注意書きがありません");
    assertNoExternalLoads(html, "diary/" + fileName);
    assert.ok(!html.includes("確認用"), "diary/" + fileName + " に確認用の部品があります");
  });
});

test("AC-38：デザイン確認用のスイッチが入っていない", function () {
  assert.ok(!INDEX_HTML.includes("proto"));
  assert.ok(!INDEX_HTML.includes("確認用"));
  assert.ok(!STYLE_CSS.includes(".proto"));
});

test("AC-2・AC-39・AC-29：外部へのリンクはすべて新しいタブ・rel=\"noopener\" つき", function () {
  const blankLinks = INDEX_HTML.match(/<a [^>]*target="_blank"[^>]*>/g) || [];
  assert.ok(blankLinks.length >= 5, "固定バー・ヒーロー・LINEのリンクが足りません");
  blankLinks.forEach(function (tag) {
    assert.ok(tag.includes('rel="noopener"'), "rel=\"noopener\" がありません：" + tag);
  });
});

test("道具箱 AC-1・AC-2：道具箱パネルは LINE パネルの次・注意書きの前にあり、見出しは決まった文言。ヒーローと固定バーに道具箱へのリンクがない", function () {
  const linePosition = INDEX_HTML.indexOf('id="line-panel"');
  const toolboxPosition = INDEX_HTML.indexOf('id="toolbox"');
  const notePosition = INDEX_HTML.indexOf('id="note"');
  assert.ok(linePosition > 0 && toolboxPosition > linePosition && notePosition > toolboxPosition, "道具箱の置き場所が違います");
  assert.ok(stripTags(INDEX_HTML).includes("実際に使っている物だけ。"));
  assert.ok(stripTags(INDEX_HTML).includes("この区画には広告（PR）を含みます"));
  assert.ok(!INDEX_HTML.includes('href="#toolbox"'), "道具箱へのリンクがあります");
  // 道具箱パネルは最初は隠しておく（表示できる道具があるときだけ toolbox_view.js が出す）
  assert.ok(/<section [^>]*id="toolbox"[^>]*hidden/.test(INDEX_HTML));
  assert.ok(INDEX_HTML.includes('href="css/toolbox.css"'));
});

test("道具箱 AC-18：外部の <script>・<iframe> がなく、計測用画像はHTMLに直接書かない（JSが検査のあとで置く）", function () {
  const htmlFiles = [INDEX_HTML,
    fs.readFileSync(path.join(PORTAL_FOLDER, "diary", "index.html"), "utf8"),
    fs.readFileSync(path.join(PORTAL_FOLDER, "diary", "entry.html"), "utf8")];
  htmlFiles.forEach(function (html) {
    assert.ok(!/<iframe/i.test(html), "<iframe> があります");
    (html.match(/<script[^>]*>/g) || []).forEach(function (tag) {
      // 日記のページは1つ上のフォルダの js/ を読む（../js/）
      assert.ok(/src="(\.\.\/)?js\//.test(tag), "js/ 以外の <script> があります：" + tag);
    });
    // CSP の meta（読み込んでよい場所の一覧）には ASP のホストを書くので、それを除いた部分で確かめる（アクセス解析の仕様 2-5）
    const htmlWithoutCsp = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g, "");
    assert.ok(!/a8\.net|moshimo\.com/.test(htmlWithoutCsp), "HTMLにASPの場所が書かれています");
  });
  readAllScripts().forEach(function (script) {
    // 例外：gtm_loader.js だけは Google タグマネージャーの本体を読み込むために script を作る（仕様 2-10。CSP で読み込み先を限る）
    // adsense_loader.js も同じく Google AdSense の本体を読み込むために script を作る（CSP で読み込み先を限る）
    if (script.fileName === "gtm_loader.js" || script.fileName === "adsense_loader.js") {
      return;
    }
    assert.ok(!/createElement\(\s*["'](script|iframe)/.test(script.code), script.fileName + " で script・iframe を作っています");
  });
});

test("道具箱 AC-3：日記のページは道具箱のファイルを読み込まない", function () {
  ["index.html", "entry.html"].forEach(function (fileName) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, "diary", fileName), "utf8");
    assert.ok(!html.includes("toolbox"), "diary/" + fileName + " に道具箱があります");
  });
});

// アクセス解析（requirements_analytics.md）を入れる3ページ
const ANALYTICS_PAGE_FILES = ["index.html", "diary/index.html", "diary/entry.html"];

test("アクセス解析 AC-16：3ページの注意書きの最後に、アクセス解析の説明の段落がある", function () {
  const privacyText = "このサイトでは、ページごとの閲覧数と、どのサイトから来たかを知るために、アクセス解析サービス（GoatCounter と、Google タグマネージャー・Google アナリティクス）を使っています。";
  ANALYTICS_PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const footer = html.slice(html.indexOf("<footer"), html.indexOf("</footer>"));
    const paragraphs = footer.match(/<p>[^<]*<\/p>/g) || [];
    assert.ok(paragraphs.length >= 2, pageFile + " の注意書きの段落が足りません");
    assert.ok(paragraphs[paragraphs.length - 1].includes(privacyText), pageFile + " の注意書きの最後にアクセス解析の説明がありません");
    assert.ok(paragraphs[paragraphs.length - 1].includes("トラッキングしない"));
  });
});

test("アクセス解析 2-2：計測のJSは各ページの <script> の最後に、path → beacon → main の順で読み込む", function () {
  ANALYTICS_PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const sources = (html.match(/<script src="[^"]*"/g) || []).map(function (tag) {
      return tag.split("/").pop().replace("\"", "");
    });
    assert.deepStrictEqual(sources.slice(-3), ["analytics_path.js", "analytics_beacon.js", "analytics_main.js"], pageFile);
    assert.ok(sources.indexOf("site_config.js") === 0, pageFile + " で site_config.js が先に読み込まれていません");
  });
});
