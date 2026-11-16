/*
 * diary_validate_story.test.js：js/diary_validate_story.js（新しい形＝1トピックの話の日記の検査）の自動テスト
 * 例文はすべてテスト用の仮の文（実際の日記・実際の数字ではない）。もとは tests/fixtures/diary_entries/2026-11-17.json（図あり）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { findStoryProblems, countStoryCharacters } = require("../js/diary_validate_story.js");

const SAMPLE_PATH = "./fixtures/diary_entries/2026-11-17.json";
const SAMPLE_DATE = "2026-11-17";

/**
 * テスト用の正しい日記を1件作る（毎回新しく写し、テスト同士で書き換え合わないようにする）。
 * @returns {object} 正しい日記1件
 */
function makeValidStory() {
  return JSON.parse(JSON.stringify(require(SAMPLE_PATH)));
}

/**
 * 問題点の一覧に、決まった文字を含むものがあるかを確かめる。
 * @param {string[]} problems 問題点の一覧
 * @param {RegExp} pattern 探す文字のパターン
 */
function assertHasProblem(problems, pattern) {
  const found = problems.some(function (problem) {
    return pattern.test(problem);
  });
  assert.ok(found, "見つからない問題：" + pattern + " ／ 出た問題：" + problems.join("／"));
}

test("AC-37：決まった項目をすべて正しく書いた新しい形の日記は、問題なし（図なし・pick なしでも通る）", function () {
  assert.deepStrictEqual(findStoryProblems(makeValidStory(), SAMPLE_DATE), []);
  const withoutOptions = makeValidStory();
  delete withoutOptions.figure;
  delete withoutOptions.pick;
  assert.deepStrictEqual(findStoryProblems(withoutOptions, SAMPLE_DATE), []);
});

test("AC-37：decision がない・空なら止まる", function () {
  const entry = makeValidStory();
  delete entry.decision;
  assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), /「decision」がないか、空です/);
  entry.decision = " ";
  assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), /「decision」がないか、空です/);
});

test("AC-37：problem が4個、result が空なら止まる", function () {
  const entry = makeValidStory();
  entry.problem = ["段落", "段落", "段落", "段落"];
  assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), /「problem」の数が 1〜3 個/);
  const empty = makeValidStory();
  empty.result = [];
  assertHasProblem(findStoryProblems(empty, SAMPLE_DATE), /「result」の数が 1〜3 個/);
});

test("AC-37：旧形式の項目（agenda・decisions・lessons）が混ざる、知らない項目がある、のどれでも止まる", function () {
  ["agenda", "decisions", "lessons"].forEach(function (fieldName) {
    const entry = makeValidStory();
    entry[fieldName] = ["旧形式の項目"];
    assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), new RegExp("旧形式の項目「" + fieldName + "」"));
  });
  const unknown = makeValidStory();
  unknown.color = "red";
  assertHasProblem(findStoryProblems(unknown, SAMPLE_DATE), /決まっていない項目「color」/);
});

test("AC-37：文字数の上限（problem 200・decision 120・result 120・figure の alt 200・caption 60）を超えると止まる", function () {
  const entry = makeValidStory();
  entry.problem[0] = "あ".repeat(201);
  entry.decision = "あ".repeat(121);
  entry.result[0] = "あ".repeat(121);
  entry.figure.alt = "あ".repeat(201);
  entry.figure.caption = "あ".repeat(61);
  const problems = findStoryProblems(entry, SAMPLE_DATE);
  assertHasProblem(problems, /「problem」の1つ目が200文字/);
  assertHasProblem(problems, /「decision」が120文字/);
  assertHasProblem(problems, /「result」の1つ目が120文字/);
  assertHasProblem(problems, /「alt」が200文字/);
  assertHasProblem(problems, /「caption」が60文字/);
});

test("AC-37：figure の alt がない、figure に知らない項目がある、figure が { } でない、のどれでも止まる", function () {
  const noAlt = makeValidStory();
  delete noAlt.figure.alt;
  assertHasProblem(findStoryProblems(noAlt, SAMPLE_DATE), /「figure」の「alt」がないか、空です/);
  const extra = makeValidStory();
  extra.figure.src = "../js/main.js";
  assertHasProblem(findStoryProblems(extra, SAMPLE_DATE), /「figure」に、決まっていない項目「src」/);
  const notObject = makeValidStory();
  notObject.figure = "図";
  assertHasProblem(findStoryProblems(notObject, SAMPLE_DATE), /「figure」が \{ \} の形/);
});

test("AC-43：pick の決まりは旧形式と同じ（0・範囲外・小数・文字は止まる）。話者は決まった名前だけ", function () {
  [0, 5, 1.5, "1"].forEach(function (value) {
    const entry = makeValidStory();
    entry.pick = value;
    assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), /「pick」/);
  });
  const entry = makeValidStory();
  entry.lines[0].speaker = "部長";
  assertHasProblem(findStoryProblems(entry, SAMPLE_DATE), /1つ目の話者/);
});

test("AC-44：本文の合計が300文字未満・1,500文字超なら止まる。図の説明（alt・caption）は数えない", function () {
  const short = makeValidStory();
  short.problem = ["短い"];
  short.result = ["短い"];
  assertHasProblem(findStoryProblems(short, SAMPLE_DATE), /本文の合計が 300〜1500 文字/);
  const long = makeValidStory();
  long.problem = ["あ".repeat(200), "あ".repeat(200), "あ".repeat(200)];
  long.result = ["あ".repeat(120), "あ".repeat(120), "あ".repeat(120)];
  long.lines = long.lines.concat(long.lines).map(function (line) {
    return { speaker: line.speaker, text: "あ".repeat(80) };
  });
  assertHasProblem(findStoryProblems(long, SAMPLE_DATE), /本文の合計が 300〜1500 文字/);
  const before = countStoryCharacters(makeValidStory());
  const longFigure = makeValidStory();
  longFigure.figure.alt = "あ".repeat(200);
  assert.strictEqual(countStoryCharacters(longFigure), before);
});

test("AC-49：figure の alt・caption に 3万・二億・2室・おすすめ・https:// を書くと止まり、伏せ字の「〇万円」は通る", function () {
  ["3万", "二億", "2室", "おすすめ", "https://"].forEach(function (word) {
    const altEntry = makeValidStory();
    altEntry.figure.alt += word;
    assertHasProblem(findStoryProblems(altEntry, SAMPLE_DATE), /「figure」の「alt」に、公開してはいけない書き方/);
    const captionEntry = makeValidStory();
    captionEntry.figure.caption += word;
    assertHasProblem(findStoryProblems(captionEntry, SAMPLE_DATE), /「figure」の「caption」に、公開してはいけない書き方/);
  });
  const masked = makeValidStory();
  masked.figure.caption = "（テスト用）〇万円の話";
  assert.deepStrictEqual(findStoryProblems(masked, SAMPLE_DATE), []);
});

test("problem・decision・result にも、公開してはいけない書き方の検査がかかる", function () {
  const entry = makeValidStory();
  entry.problem[0] += "<script>";
  entry.decision += "100円";
  entry.result[0] += "www.example";
  const problems = findStoryProblems(entry, SAMPLE_DATE);
  assertHasProblem(problems, /「problem」の1つ目に、公開してはいけない書き方（HTMLの記号/);
  assertHasProblem(problems, /「decision」に、公開してはいけない書き方（金額の書き方）/);
  assertHasProblem(problems, /「result」の1つ目に、公開してはいけない書き方（URL）/);
});

test("date がファイル名と違う・実在しない日付なら止まる。{ } でないデータも止まる", function () {
  assertHasProblem(findStoryProblems(makeValidStory(), "2026-11-18"), /ファイル名の日付と違います/);
  const entry = makeValidStory();
  entry.date = "2026-11-31";
  assertHasProblem(findStoryProblems(entry, "2026-11-31"), /「date」/);
  assert.strictEqual(findStoryProblems(null, SAMPLE_DATE).length, 1);
});
