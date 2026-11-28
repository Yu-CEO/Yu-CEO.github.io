/*
 * contact_link.test.js：お問い合わせフォームのURLの判定・リンクの設定（js/contact_link.js）と、contact.html・ホームのボタンの中身の自動テスト
 * 受け入れ基準（docs/requirements_contact.md の AC-1〜AC-6・AC-8・AC-16）に対応する。実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { SITE_CONFIG } = require("../js/site_config.js");
const { isAllowedContactFormUrl, buildContactLink, CONTACT_URL_WARNING } = require("../js/contact_link.js");

const PORTAL_FOLDER = path.join(__dirname, "..");

/**
 * portal の中のファイルを文字として読む。
 * @param {string} relativePath portal からの場所
 * @returns {string} 中身
 */
function readPortalFile(relativePath) {
  return fs.readFileSync(path.join(PORTAL_FOLDER, relativePath), "utf8");
}

test("AC-3：設定のフォームのURLは認める形で、リンクに target=_blank と rel=noopener noreferrer が付く", function () {
  assert.strictEqual(SITE_CONFIG.CONTACT_FORM_URL, "https://forms.gle/GaWdwJchzSrcvLmZA");
  const link = buildContactLink(SITE_CONFIG.CONTACT_FORM_URL);
  assert.deepStrictEqual(link, {
    show: true, href: "https://forms.gle/GaWdwJchzSrcvLmZA", target: "_blank", rel: "noopener noreferrer", warning: ""
  });
});

test("AC-4：空・http・別のサイト・ホストの偽装・javascript: ・文字でない値は、ボタンを出さず日本語の直し方を返す", function () {
  const badUrls = ["", "http://forms.gle/x", "https://example.com/forms", "https://forms.gle.example.com/x",
    "javascript:alert(1)", "https://docs.google.com/spreadsheets/d/x", "https://user:pass" + "@" + "forms.gle/x", "forms.gle/x", null, undefined, 123];
  badUrls.forEach(function (url) {
    const link = buildContactLink(url);
    assert.strictEqual(link.show, false, String(url));
    assert.strictEqual(link.href, "");
    assert.ok(link.warning.includes("CONTACT_FORM_URL"), "直し方に設定名が入っていません：" + String(url));
    assert.strictEqual(link.warning, CONTACT_URL_WARNING);
  });
});

test("AC-5：https://docs.google.com/forms/ の形のURLは、ボタンを出す", function () {
  assert.strictEqual(isAllowedContactFormUrl("https://docs.google.com/forms/d/e/xxx/viewform"), true);
  assert.strictEqual(buildContactLink("https://docs.google.com/forms/d/e/xxx/viewform").show, true);
});

test("AC-2（案B）：contact.html に、仕様 2-3 の 1〜8 の文が全部ある（見出し・受け付けるもの・返事の目安・受け付けないもの・個人情報・送り先・ボタン・戻る）", function () {
  const html = readPortalFile("contact.html");
  [
    "<h1 class=\"d-h1\">お問い合わせ</h1>",
    "お仕事のご相談", "取材・コラボのご相談", "日記・動画・ツールへの感想や質問", "不具合のご報告",
    "3日以内を目安にお返事します", "投資・保険・不動産の個別のご相談", "お答えできません",
    "半年を目安に削除します", "第三者に渡すことはありません", "パスワードやカード番号",
    "Google フォームを使っています（Google のページが新しいタブで開きます）",
    "フォームを開く（Google フォーム）", "ホームに戻る"
  ].forEach(function (text) {
    assert.ok(html.includes(text), "contact.html に「" + text + "」がありません");
  });
  assert.ok(html.includes("id=\"contact-form-button\""));
});

test("AC-1：ホームの締めくくりに、contact.html（同じサイト）への「感想・仕事の相談を送る」ボタンがある", function () {
  const html = readPortalFile("index.html");
  assert.ok(/<a class="btn btn-ink" id="end-contact" href="contact\.html">感想・仕事の相談を送る ›<\/a>/.test(html));
  assert.ok(html.indexOf('id="end-contact"') > html.indexOf('id="toolbox"'));
});

test("AC-6：HTML・JS・CSS・README にメールアドレス・電話番号の形が無い", function () {
  const files = ["index.html", "contact.html", "diary/index.html", "diary/entry.html", "README.md"];
  ["js", "css"].forEach(function (folder) {
    fs.readdirSync(path.join(PORTAL_FOLDER, folder)).forEach(function (fileName) {
      files.push(folder + "/" + fileName);
    });
  });
  files.forEach(function (file) {
    // GitHub の公開用の匿名アドレス（users.noreply.github.com。作成者の設定手順に出てくる）は連絡先ではないので除く
    const text = readPortalFile(file).replace(/[A-Za-z0-9+]+@users\.noreply\.github\.com/g, "");
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(text), file + " にメールアドレスの形があります");
    assert.ok(!/0\d{1,4}-\d{1,4}-\d{3,4}/.test(text), file + " に電話番号の形があります");
  });
});

test("AC-8：contact.html は AdSense を読み込まず、計測の JS を最後（contact_main.js のあと）に読み込む", function () {
  const html = readPortalFile("contact.html");
  assert.ok(!html.includes("adsense_loader.js"));
  ["analytics_path.js", "analytics_beacon.js", "analytics_main.js", "gtm_loader.js"].forEach(function (fileName) {
    assert.ok(html.includes("js/" + fileName), "contact.html に " + fileName + " がありません");
  });
  assert.ok(html.indexOf("js/contact_main.js") < html.indexOf("js/analytics_main.js"));
});

test("AC-16：contact.html に、投資の助言になる言い回しが無い", function () {
  const html = readPortalFile("contact.html");
  ["おすすめ", "必ず儲", "儲かる", "利回り", "買うべき"].forEach(function (word) {
    assert.ok(!html.includes(word), "contact.html に「" + word + "」があります");
  });
});

test("2-3：contact.html に canonical・description・OGP があり、URL は contact.html を指す", function () {
  const html = readPortalFile("contact.html");
  assert.ok(html.includes("<link rel=\"canonical\" href=\"https://yu-ceo.github.io/contact.html\">"));
  assert.ok(html.includes("<meta property=\"og:url\" content=\"https://yu-ceo.github.io/contact.html\">"));
  assert.strictEqual((html.match(/<title>/g) || []).length, 1);
  assert.ok(/<meta name="description" content="[^"]+">/.test(html));
});
