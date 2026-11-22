/*
 * diary_v5.test.js：日記 v5（長めの日記・3枚目の図・今日の一言60字・読む目安・付いてくる道しるべ・3版目の見た目）の自動テスト（AC-79〜AC-94）
 * 内容：3版目の新しい上限・figure3 の検査・今日の一言の長さ・読む目安の計算・道しるべの計算・3枚目の図の表示と並び・CSS の決まり。
 * 例はテスト用の仮の日記（tests/fixtures/diary_entries/2026-11-20.json・2026-11-17.json）。実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findEntryProblems } = require("../js/diary_format.js");
const { countFormat3Characters } = require("../js/diary_validate_format3.js");
const { choosePickLine } = require("../js/diary_pick.js");
const { calcReadMinutes } = require("../js/diary_read_time.js");
const { findCurrentStepIndex, calcReadRatio } = require("../js/diary_flow_sticky.js");
const { findAllByClass, findByClass, createFakeElement, installFakeDocument } = require("./helpers/fake_dom.js");
const { showEntryByFormat } = require("../js/diary_story_view.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");
const CSS_FOLDER = path.join(__dirname, "..", "css");
const SAMPLE_DATE = "2026-11-20";
const ENTRY_PATHS = { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/", heroFolder: "heroes/" };
// 吹き出しに使う話者（検査を通る名前）
const SPEAKERS = ["アオイ", "CMO", "CFO", "Yu"];

/**
 * テスト用の日記を1件読む（毎回新しく読む）。
 * @param {string} date 日付
 * @returns {object} 日記1件
 */
function readSample(date) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURE_FOLDER, date + ".json"), "utf8"));
}

/**
 * 強調の記号を全部外した3版目の見本を作る（強調の数の上限に当たらない土台）。
 * @returns {object} 日記1件
 */
function readPlainSample() {
  const entry = readSample(SAMPLE_DATE);
  const strip = function (text) { return text.replace(/\*\*|==/g, ""); };
  entry.problem = entry.problem.map(strip);
  entry.lines.forEach(function (line) { line.text = strip(line.text); });
  entry.decision = strip(entry.decision);
  entry.result = entry.result.map(strip);
  entry.takeaway = strip(entry.takeaway);
  return entry;
}

/**
 * 3版目の日記を検査して、問題点の一覧を返す。
 * @param {object} entry 日記1件
 * @returns {string[]} 問題点
 */
function check(entry) {
  return findEntryProblems(entry, SAMPLE_DATE);
}

/**
 * 問題点の一覧に、決まった文字を含むものがあるかを確かめる。
 * @param {string[]} problems 問題点
 * @param {RegExp} pattern 探す文字のパターン
 */
function assertHasProblem(problems, pattern) {
  const found = problems.some(function (problem) { return pattern.test(problem); });
  assert.ok(found, "見つからない問題：" + pattern + " ／ 出た問題：" + problems.join("／"));
}

/**
 * 本文の合計がちょうど target 文字になる3版目の日記を作る（最後の result の長さで合わせる）。
 * @param {number} target 合計の文字数
 * @returns {object} 日記1件
 */
function buildEntryWithTotal(target) {
  const entry = readPlainSample();
  delete entry.pick;
  delete entry.takeaway;
  entry.problem = ["あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300)];
  entry.lines = [];
  for (let index = 0; index < 10; index += 1) {
    entry.lines.push({ speaker: SPEAKERS[index % SPEAKERS.length], text: "い".repeat(100) });
  }
  // 今日の一言に使える短いセリフを1つ入れておく（3版目は60字以内のセリフが必要）
  entry.lines[0].text = "短い一言";
  entry.decision = "う".repeat(200);
  if (target < 1500) {
    entry.problem = ["あ"];
    entry.lines = entry.lines.slice(0, 2);
    entry.decision = "う";
  }
  entry.result = ["お"];
  let need = target - countFormat3Characters(entry) + 1;
  if (need < 1) {
    // 合計が大きすぎるときは、最後の problem を短くして合わせる
    const shortage = 1 - need;
    entry.problem[entry.problem.length - 1] = "あ".repeat(300 - shortage);
    need = 1;
    need = target - countFormat3Characters(entry) + 1;
  }
  assert.ok(need >= 1 && need <= 400, "合わせる長さが範囲外：" + need);
  // result は1つ200字まで。足りない分は2つ目に入れる
  entry.result = ["お".repeat(Math.min(need, 200))];
  if (need > 200) {
    entry.result.push("お".repeat(need - 200));
  }
  assert.strictEqual(countFormat3Characters(entry), target);
  return entry;
}

/**
 * 日記を、にせの画面に表示する。
 * @param {object} entry 日記1件
 * @returns {{ area: object, doc: object }} 表示した場所と、にせの document
 */
function render(entry) {
  const doc = installFakeDocument({});
  const area = createFakeElement("main");
  showEntryByFormat(area, entry, ENTRY_PATHS);
  return { area: area, doc: doc };
}

/**
 * 部品の中の、決まったタグの部品をすべて探す（顔の丸の中は除く）。
 * @param {object} element 探す場所
 * @param {string} tagName タグの名前
 * @returns {object[]} 見つかった部品
 */
function findAllByTag(element, tagName) {
  let found = [];
  element.children.forEach(function (child) {
    if (child.tagName === tagName) {
      found.push(child);
    }
    if (!/avatar/.test(child.className || "")) {
      found = found.concat(findAllByTag(child, tagName));
    }
  });
  return found;
}

/**
 * 本文（d-body）の中の、すぐ下の部品のクラス名を順に並べる。
 * @param {object} area 表示した場所
 * @returns {string[]} クラス名の一覧
 */
function bodyOrder(area) {
  return findByClass(area, "d-body").children.map(function (child) { return child.className; });
}

/**
 * 3枚目の図の説明つきの見本を作る。
 * @returns {object} 日記1件
 */
function readSampleWithFigure3() {
  const entry = readSample(SAMPLE_DATE);
  entry.figure3 = { alt: "（テスト用）二つの案を比べた図", caption: "（テスト用）何と何で迷ったか" };
  return entry;
}

// ===== AC-79：本文の合計の上限 =====
test("AC-79：本文の合計が3,000字ちょうどなら通り、3,001字・299字なら止まる。約2,500字は通る", function () {
  assert.deepStrictEqual(check(buildEntryWithTotal(3000)), []);
  assertHasProblem(check(buildEntryWithTotal(3001)), /本文の合計が 300〜3000 文字になっていません（今は 3001 文字）/);
  assertHasProblem(check(buildEntryWithTotal(299)), /本文の合計が 300〜3000 文字になっていません（今は 299 文字）/);
  assert.deepStrictEqual(check(buildEntryWithTotal(2500)), []);
});

test("AC-79：図の説明文は本文の合計に数えない", function () {
  const entry = readSampleWithFigure3();
  const before = countFormat3Characters(entry);
  entry.figure3.alt = "あ".repeat(200);
  assert.strictEqual(countFormat3Characters(entry), before);
});

// ===== AC-80：各欄の上限 =====
test("AC-80：problem 5個・各300字、lines 10個・各100字、decision 200字、result 4個・各200字は通る", function () {
  const problem = readPlainSample();
  problem.problem = ["あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300)];
  assert.deepStrictEqual(check(problem), []);
  const lines = readPlainSample();
  lines.lines = [];
  for (let index = 0; index < 10; index += 1) {
    lines.lines.push({ speaker: SPEAKERS[index % SPEAKERS.length], text: "い".repeat(index === 0 ? 10 : 100) });
  }
  delete lines.pick;
  assert.deepStrictEqual(check(lines), []);
  const result = readPlainSample();
  result.result = ["え".repeat(200), "え".repeat(200), "え".repeat(200), "え".repeat(200)];
  assert.deepStrictEqual(check(result), []);
});

test("AC-80：problem 6個・301字、lines 11個・101字、result 5個・201字は、どの項目かが日本語で出て止まる", function () {
  const sixProblems = readPlainSample();
  sixProblems.problem = ["あ", "あ", "あ", "あ", "あ", "あ"];
  assertHasProblem(check(sixProblems), /「problem」の数が 1〜5 個/);
  const longProblem = readPlainSample();
  longProblem.problem = ["あ".repeat(301)];
  assertHasProblem(check(longProblem), /「problem」の1つ目が（記号を除いて）300文字を超えています/);
  const elevenLines = readPlainSample();
  delete elevenLines.pick;
  elevenLines.lines = [];
  for (let index = 0; index < 11; index += 1) {
    elevenLines.lines.push({ speaker: SPEAKERS[index % SPEAKERS.length], text: "短い" });
  }
  assertHasProblem(check(elevenLines), /「lines」の数が 2〜10 個/);
  const longLine = readPlainSample();
  delete longLine.pick;
  longLine.lines[0].text = "い".repeat(101);
  assertHasProblem(check(longLine), /「lines」の1つ目のセリフが（記号を除いて）100文字を超えています/);
  const fiveResults = readPlainSample();
  fiveResults.result = ["え", "え", "え", "え", "え"];
  assertHasProblem(check(fiveResults), /「result」の数が 1〜4 個/);
  const longResult = readPlainSample();
  longResult.result = ["え".repeat(201)];
  assertHasProblem(check(longResult), /「result」の1つ目が（記号を除いて）200文字を超えています/);
});

// ===== AC-81：2版目・旧形式は上限が変わらない =====
test("AC-81：2版目は problem 4個・decision 121字で今までどおり止まり、figure3 は知らない項目として止まる", function () {
  const story = readSample("2026-11-17");
  assert.deepStrictEqual(findEntryProblems(story, "2026-11-17"), []);
  const fourProblems = readSample("2026-11-17");
  fourProblems.problem = ["（テスト用）あ", "あ", "あ", "あ"];
  assertHasProblem(findEntryProblems(fourProblems, "2026-11-17"), /problem/);
  const longDecision = readSample("2026-11-17");
  longDecision.decision = "あ".repeat(121);
  assertHasProblem(findEntryProblems(longDecision, "2026-11-17"), /decision/);
  const withFigure3 = readSample("2026-11-17");
  withFigure3.figure3 = { alt: "a", caption: "b" };
  assertHasProblem(findEntryProblems(withFigure3, "2026-11-17"), /figure3/);
});

// ===== AC-84：figure3 の検査 =====
test("AC-84：figure3 の alt・caption の空・長すぎ・知らない項目・記号・金額・おすすめ・URL は止まる。正しい形は通る", function () {
  assert.deepStrictEqual(check(readSampleWithFigure3()), []);
  const cases = [
    function (entry) { entry.figure3.alt = ""; },
    function (entry) { entry.figure3.alt = "あ".repeat(201); },
    function (entry) { entry.figure3.caption = ""; },
    function (entry) { entry.figure3.caption = "あ".repeat(61); },
    function (entry) { entry.figure3.src = "x.svg"; },
    function (entry) { entry.figure3.alt = "**強調**の説明"; },
    function (entry) { entry.figure3.caption = "==強調==の説明"; },
    function (entry) { entry.figure3.alt = "3万の比べ図"; },
    function (entry) { entry.figure3.caption = "おすすめの案"; },
    function (entry) { entry.figure3.alt = "https://example.com の図"; }
  ];
  cases.forEach(function (edit, index) {
    const entry = readSampleWithFigure3();
    edit(entry);
    assertHasProblem(check(entry), /figure3/);
    assert.ok(check(entry).length > 0, "ケース " + index + " が止まりませんでした");
  });
});

// ===== AC-86：強調の数の決まりは変わらない =====
test("AC-86：problem 全体・lines 全体・result 全体の太字は1か所まで、ハイライトは記事全体で1か所まで", function () {
  const problem = readPlainSample();
  problem.problem = ["**一つ**目", "あ", "あ", "**二つ**目", "あ"];
  assertHasProblem(check(problem), /「problem」の太字が 2 か所/);
  const lines = readPlainSample();
  delete lines.pick;
  lines.lines[0].text = "**一つ**目";
  lines.lines[1].text = "**二つ**目";
  assertHasProblem(check(lines), /「lines」の太字が 2 か所/);
  const marks = readPlainSample();
  marks.problem[0] = "==一つ==目";
  marks.result[0] = "==二つ==目";
  assertHasProblem(check(marks), /ハイライトが 2 か所/);
  const fine = readPlainSample();
  fine.problem[0] = "**" + fine.problem[0] + "**";
  fine.result[0] = "==" + fine.result[0] + "==";
  assert.deepStrictEqual(check(fine), []);
});

// ===== AC-94：今日の一言は60字以内 =====
test("AC-94：pick に選んだセリフが記号を除いて61字なら止まり、60字なら通る", function () {
  const over = readPlainSample();
  over.lines[1].text = "あ".repeat(61);
  over.pick = 2;
  assertHasProblem(check(over), /今日の一言（pick）に選んだセリフが 60 文字を超えています（今は 61 文字）/);
  const exact = readPlainSample();
  exact.lines[1].text = "あ".repeat(60);
  exact.pick = 2;
  assert.deepStrictEqual(check(exact), []);
  const marked = readPlainSample();
  marked.lines[1].text = "あ".repeat(55) + "**ああああ**";
  marked.pick = 2;
  assert.deepStrictEqual(check(marked), [], "記号は数えない（記号を除いて59字）");
});

test("AC-94：pick がない日は、60字以内のセリフの中から（秘書・Yu 以外で最初 → なければ最初）選ばれ、画面と検査で同じになる。1つもなければ止まる", function () {
  const entry = readPlainSample();
  delete entry.pick;
  entry.lines = [
    { speaker: "アオイ", text: "あ".repeat(61) },
    { speaker: "Yu", text: "短い決め" },
    { speaker: "CMO", text: "い".repeat(60) },
    { speaker: "CFO", text: "短い" }
  ];
  assert.strictEqual(choosePickLine(entry).speaker, "CMO");
  entry.lines[2].text = "い".repeat(61);
  assert.strictEqual(choosePickLine(entry).speaker, "CFO");
  entry.lines = [{ speaker: "アオイ", text: "あ".repeat(61) }, { speaker: "Yu", text: "い".repeat(61) }];
  assertHasProblem(check(entry), /今日の一言に使える 60 文字以内のセリフがありません/);
  // 紺の帯に出るセリフも、同じ関数で選ばれた短いセリフ
  const shown = render(readSample(SAMPLE_DATE));
  assert.ok(findByClass(shown.area, "pick-quote").textContent.length <= 60);
});

test("AC-94：2版目は61〜80字のセリフを pick に選んでも今までどおり通る。公開済みの3版目の今日の一言は変わらない", function () {
  const story = readSample("2026-11-17");
  story.lines[1].text = "あ".repeat(70);
  story.pick = 2;
  assert.deepStrictEqual(findEntryProblems(story, "2026-11-17"), []);
  assert.strictEqual(choosePickLine(story).text.length, 70);
  const folder = path.join(__dirname, "..", "diary", "entries");
  fs.readdirSync(folder).filter(function (name) { return name !== "index.json"; }).forEach(function (name) {
    const entry = JSON.parse(fs.readFileSync(path.join(folder, name), "utf8"));
    if (entry.format !== 3) {
      return;
    }
    let expected = entry.lines[0];
    if (Number.isInteger(entry.pick)) {
      expected = entry.lines[entry.pick - 1];
    } else {
      const officer = entry.lines.find(function (line) { return line.speaker !== "秘書" && line.speaker !== "Yu"; });
      expected = officer === undefined ? entry.lines[0] : officer;
    }
    assert.strictEqual(choosePickLine(entry), expected, name + " の今日の一言が変わっています");
  });
});

// ===== AC-90：読む目安 =====
test("AC-90：読む目安は ÷500 の四捨五入・最小1分", function () {
  assert.strictEqual(calcReadMinutes(2500), 5);
  assert.strictEqual(calcReadMinutes(600), 1);
  assert.strictEqual(calcReadMinutes(1240), 2);
  assert.strictEqual(calcReadMinutes(1260), 3);
  assert.strictEqual(calcReadMinutes(0), 1);
});

test("AC-90：3版目の紺の帯に「読む目安 約N分」が出る。2版目・旧形式には出ない", function () {
  const shown = render(buildEntryWithTotal(2500));
  assert.strictEqual(findByClass(shown.area, "d-readtime").textContent, "読む目安 約5分");
  const short = render(readSample(SAMPLE_DATE));
  assert.match(findByClass(short.area, "d-readtime").textContent, /^読む目安 約[1-9]分$/);
  assert.strictEqual(findByClass(render(readSample("2026-11-17")).area, "d-readtime"), undefined);
  assert.strictEqual(findByClass(render(readSample("2026-11-15")).area, "d-readtime"), undefined);
});

// ===== AC-91：道しるべ =====
test("AC-91：今読んでいる節は「基準の線より上に出ている最後の節」。読んだ量は0〜1に収まる", function () {
  assert.strictEqual(findCurrentStepIndex([-300, 20, 500], 100), 1);
  assert.strictEqual(findCurrentStepIndex([200, 400], 100), 0);
  assert.strictEqual(findCurrentStepIndex([-900, -500, -100, -10], 100), 3);
  assert.strictEqual(calcReadRatio(500, 3000, 100, 800), 0);
  assert.strictEqual(calcReadRatio(-5000, 3000, 100, 800), 1);
  const middle = calcReadRatio(-1000, 3000, 100, 800);
  assert.ok(middle > 0 && middle < 1);
});

test("AC-91：道しるべは押せない飾り（リンク・ボタンを含まない）。札は読み上げず、流れの説明を1回だけ読む", function () {
  const shown = render(readSample(SAMPLE_DATE));
  const flow = findByClass(shown.area, "d-flow");
  assert.strictEqual(flow.tagName, "ol");
  assert.strictEqual(findAllByTag(flow, "a").length, 0);
  assert.strictEqual(findAllByTag(flow, "button").length, 0);
  assert.ok(flow.getAttribute("aria-label").startsWith("この日記の流れ："));
  assert.ok(!flow.getAttribute("aria-live"), "節が変わるたびの読み上げを増やさない");
  findAllByTag(flow, "li").forEach(function (item) {
    assert.strictEqual(item.getAttribute("aria-hidden"), "true");
  });
});

// ===== AC-85・AC-93：3枚目の図の表示 =====
test("AC-85：3枚の図は、1枚目が問題の下・3枚目が意見と決定のあいだ・2枚目が結果の下に並ぶ", function () {
  const entry = readSampleWithFigure3();
  const shown = render(entry);
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-fig", "d-sec", "d-sec", "d-fig", "d-take"]);
  const images = findAllByTag(shown.area, "img");
  assert.deepStrictEqual(images.map(function (image) { return image.src; }), [
    "figures/2026-11-20.svg", "figures/2026-11-20-3.svg", "figures/2026-11-20-2.svg"
  ]);
  assert.deepStrictEqual(images.map(function (image) { return image.alt; }), [entry.figure.alt, entry.figure3.alt, entry.figure2.alt]);
  const captions = findAllByTag(shown.area, "figcaption").map(function (caption) { return caption.children[1].textContent; });
  assert.deepStrictEqual(captions, [entry.figure.caption, entry.figure3.caption, entry.figure2.caption]);
});

test("AC-93：3枚目の札は「比べる」（is-compare）。読み込み前から場所が取られる（300×312）。1枚目・2枚目の場所は変わらない", function () {
  const shown = render(readSampleWithFigure3());
  const tags = findAllByClass(shown.area, "fig-tag");
  assert.deepStrictEqual(tags.map(function (tag) { return tag.textContent; }), ["図", "比べる", "まとめ"]);
  assert.match(tags[1].className, /is-compare/);
  const images = findAllByTag(shown.area, "img");
  assert.deepStrictEqual(images.map(function (image) { return image.width + "x" + image.height; }), ["300x300", "300x312", "300x232"]);
});

test("AC-85：figure3 だけの日・3枚目がない日・図がない日でも並びが崩れない", function () {
  const onlyThird = readSampleWithFigure3();
  delete onlyThird.figure;
  delete onlyThird.figure2;
  const shown = render(onlyThird);
  assert.deepStrictEqual(bodyOrder(shown.area), ["d-flow", "d-sec", "d-sec", "d-fig", "d-sec", "d-sec", "d-take"]);
  assert.deepStrictEqual(findAllByTag(shown.area, "img").map(function (image) { return image.src; }), ["figures/2026-11-20-3.svg"]);
  const without = render(readSample(SAMPLE_DATE));
  assert.deepStrictEqual(findAllByTag(without.area, "img").length, 2);
});

test("AC-85：3枚目の図の場所は確認済みの日付から作られる（日付の形が違えば何も読みに行かない）", function () {
  const { createDiaryFigure } = require("../js/diary_figure_view.js");
  installFakeDocument({});
  const entry = readSampleWithFigure3();
  entry.date = "../js/main";
  assert.strictEqual(createDiaryFigure(entry, "figures/", 3), null);
  const source = fs.readFileSync(path.join(__dirname, "..", "js", "diary_figure_view.js"), "utf8");
  assert.ok(source.includes('3: "-3.svg"'));
});

// ===== AC-89・AC-92：見た目（CSS の決まり） =====
test("AC-89：v5 の見た目は 3版目（.f3）の中だけに効く。2版目・旧形式には番号の札・読む目安・付いてくる道しるべが出ない", function () {
  const css = fs.readFileSync(path.join(CSS_FOLDER, "diary_format3.css"), "utf8");
  const v5Part = css.slice(css.indexOf("/* ===== 〔v5〕案A"));
  const withoutComments = v5Part.replace(/\/\*[\s\S]*?\*\//g, "");
  // @media の中の規則も含め、{ の前の選択子がすべて .f3 か .d-readtime で始まる
  const selectors = withoutComments.match(/[^{}]+(?=\{)/g).map(function (text) { return text.trim(); });
  selectors.forEach(function (selector) {
    if (selector.startsWith("@media")) {
      return;
    }
    assert.ok(/^(\.f3|\.d-readtime)/.test(selector), "3版目の外に効く規則があります：" + selector);
  });
  const oldShown = render(readSample("2026-11-17"));
  assert.doesNotMatch(oldShown.area.className, /\bf3\b/);
  assert.strictEqual(findByClass(oldShown.area, "flow-step") === undefined, false, "2版目の道しるべ（今までのもの）は残る");
});

test("AC-89・AC-91：3版目の節の見出しに番号の札（section-number）がある。CSS が使う変数はすべて variables.css に定義がある", function () {
  const shown = render(readSample(SAMPLE_DATE));
  assert.strictEqual(findAllByClass(shown.area, "section-number").length, 4);
  const css = fs.readFileSync(path.join(CSS_FOLDER, "diary_format3.css"), "utf8");
  const variables = fs.readFileSync(path.join(CSS_FOLDER, "variables.css"), "utf8");
  const used = Array.from(new Set(css.match(/var\((--[a-z0-9-]+)/g).map(function (text) { return text.slice(4); })));
  used.forEach(function (name) {
    if (name === "--read") {
      return; // 読んだ量の線の長さ。js/diary_flow_sticky.js が入れる
    }
    const isDefined = variables.includes(name + ":") || fs.readFileSync(path.join(CSS_FOLDER, "style.css"), "utf8").includes(name + ":");
    assert.ok(isDefined || /--(color|bar|gutter)/.test(name), name + " の定義が見つかりません");
  });
});

test("AC-92：幅480px以下で吹き出しの顔は34px・反対側の空きは12px。PC幅の決まり（40px・28px）は変えない", function () {
  const css = fs.readFileSync(path.join(CSS_FOLDER, "diary_format3.css"), "utf8");
  const variables = fs.readFileSync(path.join(CSS_FOLDER, "variables.css"), "utf8");
  assert.match(variables, /--av-size-line-sm:34px/);
  assert.match(variables, /--diary-line-indent-sm:12px/);
  assert.match(variables, /--av-size:40px/);
  assert.match(variables, /--diary-line-indent:28px/);
  assert.match(css, /@media \(max-width:480px\)\{\s*\.f3 \.d-line\{/);
});
