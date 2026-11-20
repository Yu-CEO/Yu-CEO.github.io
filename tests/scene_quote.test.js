/*
 * scene_quote.test.js：名言の吹き出しの文字づくり（js/scene_quote.js）と、入口の組み込みのテスト
 * 受け入れ基準：AC-2（Day N の会議から・出典リンク）・AC-5（動きは1回だけ・動きを減らす設定）・AC-6（「LIVE」などの言葉がない）・
 *   CSP を緩めていないこと
 * 実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

global.getDayNumber = require("../js/diary_day.js").getDayNumber;
global.getSpeakerInfo = require("../js/diary_speakers.js").getSpeakerInfo;
global.stripMarkup = require("../js/diary_markup.js").stripMarkup;
global.computeSceneLayout = require("../js/scene_layout.js").computeSceneLayout;
global.HERO_SCENE_SEATS = ["Yu", "秘書", "CMO", "プロデューサー", "ブランドディレクター", "アオイ", "CFO", "CTO", "CISO"];
const { formatQuoteText, buildQuoteTexts, computeTailPercent, readBoardQuotes } = require("../js/scene_quote.js");

const PORTAL_FOLDER = path.join(__dirname, "..");

// ファイルの中身を読む
function read(file) {
  return fs.readFileSync(path.join(PORTAL_FOLDER, file), "utf8");
}

test("AC-2：「Day N の会議から」は名言の日付の Day、リンクはその日の entry.html", function () {
  const texts = buildQuoteTexts({ speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16" });
  assert.strictEqual(texts.dayLabel, "Day 3 の会議から");
  assert.strictEqual(texts.href, "diary/entry.html?date=2026-11-16");
  assert.strictEqual(texts.speaker, "CFO");
  assert.strictEqual(texts.role, "お金の管理");
});

test("2-1：太字・ハイライトの記号を外し、80字を超えたら末尾を「…」にする", function () {
  assert.strictEqual(formatQuoteText("**大事**な==所==です"), "大事な所です");
  const long = formatQuoteText("あ".repeat(100));
  assert.strictEqual(Array.from(long).length, 80);
  assert.ok(long.endsWith("…"));
  assert.strictEqual(formatQuoteText("あ".repeat(80)), "あ".repeat(80));
});

test("2-1：吹き出しの三角の位置は役員の席の位置（0〜100%）。席がなければ null", function () {
  const percent = computeTailPercent("CMO");
  assert.ok(percent > 0 && percent < 100);
  assert.strictEqual(computeTailPercent("部長"), null);
});

test("2-1：入口に吹き出しの入れ物（最初は隠す）と必要な部品があり、script は読み込み順どおり", function () {
  const html = read("index.html");
  assert.ok(/id="hero-quote-wrap" hidden/.test(html), "入れ物は最初は隠す（空の吹き出しを残さない）");
  assert.ok(html.includes('class="quote-link"') && html.includes("この日の話を読む"));
  const order = ["diary_markup.js", "board_quotes_data.js", "board_quote_pick.js", "scene_quote.js", "main.js"].map(function (name) {
    return html.indexOf('src="js/' + name + '"');
  });
  order.forEach(function (position) {
    assert.ok(position > 0);
  });
  assert.deepStrictEqual(order.slice().sort(function (a, b) { return a - b; }), order);
});

test("CSP を緩めていない：style 属性・HTML 直書きの挿入がない", function () {
  const html = read("index.html");
  assert.ok(html.includes("script-src 'self' https://www.googletagmanager.com; style-src 'self';"));
  assert.ok(!/<[a-z][^>]* style="/.test(html));
  const source = read("js/scene_quote.js");
  assert.ok(!/innerHTML|setAttribute\("style"|\.cssText/.test(source));
});

test("AC-5・AC-6：吹き出しの動きは1回だけ（くり返さない）・動きを減らす設定で止める・「LIVE」などの言葉がない", function () {
  const css = read("css/meeting_scene.css");
  assert.ok(!/infinite/.test(css));
  assert.ok(/prefers-reduced-motion:reduce[\s\S]*\.play \.quote/.test(css));
  ["js/scene_quote.js", "js/board_quotes_data.js", "css/meeting_scene.css"].forEach(function (file) {
    assert.ok(!/LIVE|いま会議中/.test(read(file)), file);
  });
});

test("AC-4：名言の一覧が読めていなくても readBoardQuotes は止まらず null を返し、main.js は一覧を直書きしない", function () {
  assert.strictEqual(readBoardQuotes(), null);
  global.BOARD_QUOTES = [1];
  assert.deepStrictEqual(readBoardQuotes(), [1]);
  delete global.BOARD_QUOTES;
  assert.ok(!/BOARD_QUOTES/.test(read("js/main.js")));
});
