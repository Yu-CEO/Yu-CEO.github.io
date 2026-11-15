/*
 * diary_validate.test.js：js/diary_validate.js（日記1件の形と書き方の検査）の自動テスト
 * 例文はすべてテスト用の仮の文（実際の日記・実際の数字ではない）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { findDiaryProblems } = require("../js/diary_validate.js");

const SAMPLE_PATH = "./fixtures/diary_entries/2026-11-16.json";

/**
 * テスト用の正しい日記を1件作る（毎回新しく写し、テスト同士で書き換え合わないようにする）。
 * @returns {object} 正しい日記1件
 */
function makeValidEntry() {
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

test("正しい日記は、問題なし", function () {
  assert.deepStrictEqual(findDiaryProblems(makeValidEntry(), "2026-11-16"), []);
});

test("AC-5：title がない日記は、title の問題として報告される", function () {
  const entry = makeValidEntry();
  delete entry.title;
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /「title」/);
});

test("文字数の上限を超えると止まる", function () {
  const entry = makeValidEntry();
  entry.title = "あ".repeat(41);
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /「title」が40文字/);
});

test("AC-12：決まった名前以外の話者（例：部長）は止まる", function () {
  const entry = makeValidEntry();
  entry.lines[1].speaker = "部長";
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /2つ目の話者/);
});

test("AC-12：決まった項目以外の項目は止まる（日記・セリフのどちらでも）", function () {
  const entry = makeValidEntry();
  entry.color = "red";
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /「color」/);
  const entry2 = makeValidEntry();
  entry2.lines[0].html = "x";
  assertHasProblem(findDiaryProblems(entry2, "2026-11-16"), /「html」/);
});

test("AC-12：本文の合計が1,500文字を超えると止まる", function () {
  const entry = makeValidEntry();
  entry.title = "見".repeat(40);
  entry.summary = "抜".repeat(120);
  entry.agenda = ["議", "題", "だ"].map(function (character) {
    return character.repeat(60);
  });
  entry.lines = ["秘書", "Yu", "アオイ", "CMO", "CFO", "CTO", "CISO", "プロデューサー"].map(function (speaker) {
    return { speaker: speaker, text: "長".repeat(80) };
  });
  entry.decisions = ["決", "定", "だ", "よ", "ね"].map(function (character) {
    return character.repeat(80);
  });
  entry.lessons = ["学", "び", "だ"].map(function (character) {
    return character.repeat(100);
  });
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /本文の合計/);
});

test("本文の合計が300文字に足りないときも止まる", function () {
  const entry = makeValidEntry();
  entry.lines = [{ speaker: "秘書", text: "短い" }, { speaker: "Yu", text: "短い" }];
  entry.lessons = ["短い"];
  entry.decisions = [];
  entry.agenda = ["短い"];
  entry.summary = "短い";
  delete entry.pick;
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /本文の合計/);
});

test("日付がファイル名と違う・実在しない日付のときは止まる", function () {
  assertHasProblem(findDiaryProblems(makeValidEntry(), "2026-11-17"), /ファイル名の日付と違います/);
  const entry = makeValidEntry();
  entry.date = "2026-11-31";
  assertHasProblem(findDiaryProblems(entry, "2026-11-31"), /「date」/);
});

test("AC-34：pick が 0・セリフの数より大きい・小数・文字のときは止まる", function () {
  [0, 7, 1.5, "2"].forEach(function (pick) {
    const entry = makeValidEntry();
    entry.pick = pick;
    assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /「pick」/);
  });
});

test("AC-34：pick がないときと、1〜セリフの数のときは通る", function () {
  const entry = makeValidEntry();
  delete entry.pick;
  assert.deepStrictEqual(findDiaryProblems(entry, "2026-11-16"), []);
  [1, 6].forEach(function (pick) {
    const withPick = makeValidEntry();
    withPick.pick = pick;
    assert.deepStrictEqual(findDiaryProblems(withPick, "2026-11-16"), []);
  });
});

test("AC-10・AC-11：本文に書いてはいけない書き方があると、場所と理由が日本語で出る", function () {
  const entry = makeValidEntry();
  entry.lines[2].text = "<img src=x onerror=alert(1)>";
  assertHasProblem(findDiaryProblems(entry, "2026-11-16"), /「lines」の3つ目のセリフに、公開してはいけない書き方（HTMLの記号/);
  const money = makeValidEntry();
  money.summary = "（テスト用）3万の話です。";
  assertHasProblem(findDiaryProblems(money, "2026-11-16"), /「summary」に、公開してはいけない書き方（金額の書き方）/);
});

test("AC-27：伏せ字の「〇万円」「数万円」「ある金額」を使った日記は通る", function () {
  const entry = makeValidEntry();
  entry.lessons = ["（テスト用）〇万円か数万円かで迷ったが、ある金額の話は外すことにした。削るのも仕事だと分かった"];
  assert.deepStrictEqual(findDiaryProblems(entry, "2026-11-16"), []);
});

test("{ } の形でないデータでも止まらずに報告する", function () {
  assert.strictEqual(findDiaryProblems(null, "2026-11-16").length, 1);
  assert.strictEqual(findDiaryProblems([], "2026-11-16").length, 1);
  assert.ok(findDiaryProblems({ lines: "x" }, "2026-11-16").length > 0);
});
