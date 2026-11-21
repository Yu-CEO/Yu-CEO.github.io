/*
 * hero_advice.test.js：ヒーローの「役員が Yu に提案・指摘する場面」（js/hero_advice.js）と、入口への組み込みのテスト
 * 受け入れ基準：AC-2（出典リンク・名言の表示）・AC-4（名言が選べないときの表示）・AC-5（動きは1回だけ・動きを減らす設定）・
 *   AC-6（「LIVE」などの言葉がない）・第3回（提案／指摘のラベル・「N日目」・役員の絵の場所が1か所・Yu の写真）
 * 実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, findAllByClass, installFakeDocument } = require("./helpers/fake_dom.js");

const {
  formatQuoteText, buildQuoteTexts, readBoardQuotes, showHeroAdvice, showHeroDays, HERO_BOARD_SPEAKERS
} = require("../js/hero_advice.js");
const { BOARD_QUOTES } = require("../js/board_quotes_data.js");
const { SITE_CONFIG } = require("../js/site_config.js");

const PORTAL_FOLDER = path.join(__dirname, "..");
const FACE_FILE = "assets/speakers.svg";

// ファイルの中身を読む
function read(file) {
  return fs.readFileSync(path.join(PORTAL_FOLDER, file), "utf8");
}

/**
 * 場面の部品（にせの要素）を id つきで用意して、にせの document に登録する。
 * @returns {Object<string,object>} id → 要素の表
 */
function setUpAdvice() {
  const ids = {
    "hero-talk": "div", "talk-eyebrow": "p", "talk-face-holder": "span", "talk-name": "span",
    "talk-text": "p", "talk-tag": "span", "talk-board": "div", "hero-quote-link": "a"
  };
  const parts = {};
  Object.keys(ids).forEach(function (id) {
    parts[id] = createFakeElement(ids[id]);
  });
  parts["hero-talk"].className = "advice no-quote";
  installFakeDocument(parts);
  return parts;
}

// 乱数の代わりに、決まった数を順に返す関数
function fixedRand(values) {
  let index = 0;
  return function () {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

test("AC-2：出す文字は、名言の日付の「N日目の会議で（日付）」・役員名・役の説明・その日の entry.html へのリンク", function () {
  const texts = buildQuoteTexts({ speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16", kind: "teian" });
  assert.strictEqual(texts.eyebrow, "3日目の会議で（2026.11.16）");
  assert.strictEqual(texts.href, "diary/entry.html?date=2026-11-16");
  assert.strictEqual(texts.speaker, "CFO");
  assert.strictEqual(texts.role, "お金の管理");
  assert.ok(!texts.eyebrow.includes("Day"));
});

test("第3回：種類は「→ Yu へ提案」「→ Yu へ指摘」のラベルになり、長い名前は名札用に短くする", function () {
  const base = { speaker: "ブランドディレクター", text: "あ", date: "2026-11-14" };
  assert.strictEqual(buildQuoteTexts(Object.assign({ kind: "teian" }, base)).kindLabel, "→ Yu へ提案");
  assert.strictEqual(buildQuoteTexts(Object.assign({ kind: "shiteki" }, base)).kindLabel, "→ Yu へ指摘");
  assert.strictEqual(buildQuoteTexts(Object.assign({ kind: "teian" }, base)).shortName, "ブランド");
  assert.strictEqual(buildQuoteTexts({ speaker: "CTO", text: "あ", date: "2026-11-14", kind: "teian" }).shortName, "CTO");
});

test("2-1：太字・ハイライトの記号を外し、80字を超えたら末尾を「…」にする", function () {
  assert.strictEqual(formatQuoteText("**大事**な==所==です"), "大事な所です");
  const long = formatQuoteText("あ".repeat(100));
  assert.strictEqual(Array.from(long).length, 80);
  assert.ok(long.endsWith("…"));
  assert.strictEqual(formatQuoteText("あ".repeat(80)), "あ".repeat(80));
});

test("第3回：名言を選ぶと、大きな顔・名札・吹き出し・ラベル・リンクが入り、「no-quote」の印が外れて場面が出る", function () {
  const parts = setUpAdvice();
  const shown = showHeroAdvice({ quotes: BOARD_QUOTES, rand: fixedRand([0, 0]), faceFile: FACE_FILE });
  assert.strictEqual(shown, true);
  // 一覧の最初の役員（CMO）の最初の名言（提案）
  assert.strictEqual(parts["talk-name"].children[0].textContent, "発信の作戦");
  assert.match(parts["talk-text"].textContent, /^金額を出さないなら/);
  assert.strictEqual(parts["talk-tag"].textContent, "→ Yu へ提案");
  assert.match(parts["talk-tag"].className, /k-teian/);
  assert.strictEqual(parts["hero-quote-link"].getAttribute("href"), "diary/entry.html?date=2026-11-14");
  assert.strictEqual(parts["talk-eyebrow"].textContent, "1日目の会議で（2026.11.14）");
  assert.ok(!/no-quote/.test(parts["hero-talk"].className));
  const face = parts["talk-face-holder"].children[0];
  assert.match(face.className, /talk-face/);
  assert.strictEqual(face.children[0].children[0].getAttribute("href"), FACE_FILE + "#cmo");
});

test("第3回：「指摘」の名言は黄色のラベル（k-shiteki）と「→ Yu へ指摘」になる", function () {
  const parts = setUpAdvice();
  // 役員は一覧に初めて出た順：CMO・CFO・CTO・CISO・ブランド・プロデューサー。0.2 → CFO、0.99 → CFO の最後の名言（指摘）
  showHeroAdvice({ quotes: BOARD_QUOTES, rand: fixedRand([0.2, 0.99]), faceFile: FACE_FILE });
  assert.strictEqual(parts["talk-tag"].textContent, "→ Yu へ指摘");
  assert.match(parts["talk-tag"].className, /k-shiteki/);
});

test("第3回：AI役員8人の小さな顔の列が出て、話した役員の顔だけ「on」（黄色い輪）になる。Yu は並ばない", function () {
  const parts = setUpAdvice();
  showHeroAdvice({ quotes: BOARD_QUOTES, rand: fixedRand([0, 0]), faceFile: FACE_FILE });
  const faces = findAllByClass(parts["talk-board"], "avatar");
  assert.strictEqual(faces.length, 8);
  assert.strictEqual(HERO_BOARD_SPEAKERS.includes("Yu"), false);
  const lit = faces.filter(function (face) {
    return face.className.split(" ").includes("on");
  });
  assert.strictEqual(lit.length, 1);
  assert.strictEqual(lit[0].getAttribute("title"), "CMO（発信の作戦）");
});

test("AC-4：名言が選べない（0件・一覧が読めない）ときは、顔の列だけ出し、名言の部分は隠したまま（no-quote の印が残る）", function () {
  [[], null, [{ speaker: "Yu", text: "あ", date: "2026-11-14", kind: "teian" }]].forEach(function (quotes) {
    const parts = setUpAdvice();
    const originalWarn = console.warn;
    console.warn = function () {};
    let shown = true;
    try {
      shown = showHeroAdvice({ quotes: quotes, rand: Math.random, faceFile: FACE_FILE });
    } finally {
      console.warn = originalWarn;
    }
    assert.strictEqual(shown, false);
    assert.match(parts["hero-talk"].className, /no-quote/);
    assert.strictEqual(parts["talk-text"].textContent, "");
    assert.strictEqual(findAllByClass(parts["talk-board"], "avatar").length, 8);
  });
});

test("部品が index.html に無いときは、止まらずに false を返し、日本語の警告を出す", function () {
  installFakeDocument({});
  const originalWarn = console.warn;
  const messages = [];
  console.warn = function (message) {
    messages.push(message);
  };
  try {
    assert.strictEqual(showHeroAdvice({ quotes: BOARD_QUOTES, rand: Math.random, faceFile: FACE_FILE }), false);
  } finally {
    console.warn = originalWarn;
  }
  assert.match(messages[0], /index\.html/);
});

test("第3回：「今日で、AI会社を始めて N 日目」の数字は端末の今日の日数で、段落が表示される", function () {
  const paragraph = createFakeElement("p");
  paragraph.hidden = true;
  const number = createFakeElement("b");
  installFakeDocument({ "hero-days": paragraph, "hero-days-number": number });
  assert.strictEqual(showHeroDays({ paragraphId: "hero-days", numberId: "hero-days-number", now: new Date(2026, 10, 21, 12, 0) }), true);
  assert.strictEqual(number.textContent, "8");
  assert.strictEqual(paragraph.hidden, false);
  installFakeDocument({});
  assert.strictEqual(showHeroDays({ paragraphId: "hero-days", numberId: "hero-days-number", now: new Date() }), false);
});

test("AC-4：名言の一覧が読めていなくても readBoardQuotes は止まらず null を返し、main.js は一覧を直書きしない", function () {
  assert.strictEqual(readBoardQuotes(), null);
  global.BOARD_QUOTES = [1];
  assert.deepStrictEqual(readBoardQuotes(), [1]);
  delete global.BOARD_QUOTES;
  assert.ok(!/BOARD_QUOTES/.test(read("js/main.js")));
});

test("第3回：役員の絵の場所は js/site_config.js の SPEAKER_FACE_FILE の1か所で、main.js はそれを使い、場所を直書きしない", function () {
  assert.strictEqual(SITE_CONFIG.SPEAKER_FACE_FILE, FACE_FILE);
  const main = read("js/main.js");
  assert.ok(main.includes("SITE_CONFIG.SPEAKER_FACE_FILE"));
  assert.ok(!main.includes("speakers.svg"), "main.js に絵の場所が直書きされています");
  assert.ok(fs.existsSync(path.join(PORTAL_FOLDER, SITE_CONFIG.SPEAKER_FACE_FILE)));
});

test("第3回：入口に場面の部品が全部あり、最初は no-quote（空の吹き出しを残さない）。Yu の写真は WebP を先に使い、背景画像（url）を使わない", function () {
  const html = read("index.html");
  assert.ok(/class="talk no-quote" id="hero-talk"/.test(html));
  ["talk-eyebrow", "talk-face-holder", "talk-name", "talk-text", "talk-tag", "talk-board", "hero-quote-link", "hero-days", "hero-days-number"].forEach(function (id) {
    assert.ok(html.includes('id="' + id + '"'), id);
  });
  assert.ok(html.includes("この日の話を読む") && html.includes("人間・社長"));
  assert.ok(html.includes('srcset="assets/yu.webp"') && html.includes('src="assets/yu.jpg"'));
  assert.ok(!/url\(/.test(read("css/hero_advice.css")));
  assert.ok(html.includes("役員とアオイはAIのキャラクター。人間はYuだけです。"));
});

test("script は読み込み順どおり（日記の部品 → 名言の一覧 → 選ぶ処理 → 場面 → これまでの会議 → 最新の日記 → main.js）", function () {
  const html = read("index.html");
  const order = ["diary_markup.js", "board_quotes_data.js", "board_quote_pick.js", "diary_parts.js", "hero_advice.js", "diary_recent_view.js", "diary_latest_panel.js", "main.js"].map(function (name) {
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
  ["js/hero_advice.js", "js/diary_recent_view.js", "js/diary_latest_panel.js"].forEach(function (file) {
    assert.ok(!/innerHTML|setAttribute\("style"|\.cssText/.test(read(file)), file);
  });
});

test("AC-5・AC-6：場面の動きは1回だけ（くり返さない）・動きを減らす設定で止める・「LIVE」などの言葉がない", function () {
  const css = read("css/hero_advice.css");
  assert.ok(!/infinite/.test(css));
  assert.ok(/prefers-reduced-motion:reduce[\s\S]*\.talk-who/.test(css));
  // 吹き出しは動かさない（iPhone の Safari で中の文字が出なくなったため）
  assert.ok(!/\.talk-bubble[^{]*\{[^}]*animation/.test(css));
  ["js/hero_advice.js", "js/board_quotes_data.js", "css/hero_advice.css"].forEach(function (file) {
    assert.ok(!/LIVE|いま会議中/.test(read(file)), file);
  });
});

test("第3回：古い机の場面（meeting_scene・scene_layout・scene_quote）は残っていない", function () {
  ["js/meeting_scene.js", "js/scene_layout.js", "js/scene_quote.js", "css/meeting_scene.css"].forEach(function (file) {
    assert.ok(!fs.existsSync(path.join(PORTAL_FOLDER, file)), file);
  });
  assert.ok(!read("index.html").includes("meeting_scene"));
});
