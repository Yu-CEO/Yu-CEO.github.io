/*
 * diary_validate_format3.test.js：js/diary_validate_format3.js（3版目の検査）の自動テスト
 * 例はテスト用の仮の日記（tests/fixtures/diary_entries/2026-11-20.json）。1か所だけ書き換えて、決まりに当たると止まることを確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findEntryProblems } = require("../js/diary_format.js");
const { countFormat3Characters } = require("../js/diary_validate_format3.js");

const SAMPLE_PATH = path.join(__dirname, "fixtures", "diary_entries", "2026-11-20.json");
const SAMPLE_DATE = "2026-11-20";

/**
 * テスト用の3版目の日記を読む（毎回新しく読み、テスト同士で書き換え合わないようにする）。
 * @returns {object} 日記1件
 */
function readSample() {
  return JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf8"));
}

/**
 * 日記を検査して、問題点の一覧を返す。
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
  const found = problems.some(function (problem) {
    return pattern.test(problem);
  });
  assert.ok(found, "見つからない問題：" + pattern + " ／ 出た問題：" + problems.join("／"));
}

/**
 * 強調を全部外し、強調の数の上限に当たらない土台の日記を作る。
 * @returns {object} 日記1件
 */
function readPlainSample() {
  const entry = readSample();
  entry.problem = entry.problem.map(function (text) { return text.replace(/\*\*/g, ""); });
  entry.lines.forEach(function (line) { line.text = line.text.replace(/\*\*/g, ""); });
  entry.decision = entry.decision.replace(/==/g, "");
  entry.result = entry.result.map(function (text) { return text.replace(/\*\*/g, ""); });
  return entry;
}

test("AC-59：3版目の項目をすべて正しく書いた日記は検査を通る", function () {
  assert.deepStrictEqual(check(readSample()), []);
});

test("AC-59：takeaway・figure・figure2・pick は書かなくてもよい。figure2 だけの日も通る", function () {
  const entry = readSample();
  delete entry.takeaway;
  delete entry.pick;
  delete entry.figure;
  assert.deepStrictEqual(check(entry), []);
});

test("AC-59：決まっていない項目・旧形式の項目が混ざっていると止まる", function () {
  const unknown = readSample();
  unknown.color = "red";
  assertHasProblem(check(unknown), /決まっていない項目「color」/);
  const old = readSample();
  old.agenda = ["議題"];
  assertHasProblem(check(old), /旧形式の項目「agenda」/);
});

test("AC-64：閉じていない・入れ子・重なり・空・3つ以上続く記号は、どの項目の問題かつきで止まる", function () {
  ["**大事", "**大事な==所==**", "**a==b**c==", "****", "** **", "a***b", "a===b"].forEach(function (broken) {
    const entry = readPlainSample();
    entry.decision = "（テスト用）" + broken;
    assertHasProblem(check(entry), /「decision」：/);
  });
});

test("AC-64：強調を書ける5つの項目（problem・lines の text・decision・result・takeaway）すべてで形の誤りを止める", function () {
  const problem = readPlainSample();
  problem.problem[0] = "**閉じていない";
  assertHasProblem(check(problem), /「problem」の1つ目：/);
  const line = readPlainSample();
  line.lines[0].text = "==閉じていない";
  assertHasProblem(check(line), /「lines」の1つ目のセリフ：/);
  const result = readPlainSample();
  result.result[0] = "**閉じていない";
  assertHasProblem(check(result), /「result」の1つ目：/);
  const takeaway = readPlainSample();
  takeaway.takeaway = "**閉じていない。";
  assertHasProblem(check(takeaway), /「takeaway」：/);
});

test("AC-64：1つだけの * や =（A=B）は通る", function () {
  const entry = readPlainSample();
  entry.decision = "（テスト用）A=B の形にそろえる";
  assert.deepStrictEqual(check(entry), []);
});

test("AC-65：title・summary・speaker・figure／figure2 の alt・caption に ** か == があると止まる", function () {
  const title = readSample();
  title.title = "（テスト用）**大事**な日";
  assertHasProblem(check(title), /「title」に、強調の記号/);
  const summary = readSample();
  summary.summary = summary.summary + "==まとめ==";
  assertHasProblem(check(summary), /「summary」に、強調の記号/);
  const speaker = readSample();
  speaker.lines[0].speaker = "**アオイ**";
  assertHasProblem(check(speaker), /話者に、強調の記号/);
  ["figure", "figure2"].forEach(function (fieldName) {
    ["alt", "caption"].forEach(function (itemName) {
      const entry = readSample();
      entry[fieldName][itemName] = "（テスト用）**説明**";
      assertHasProblem(check(entry), new RegExp("「" + fieldName + "」の「" + itemName + "」に、強調の記号"));
    });
  });
});

test("AC-66：ハイライトが2か所あると止まる。1か所なら通る", function () {
  const two = readSample();
  two.takeaway = "（テスト用）==ここ==も強調する。";
  assertHasProblem(check(two), /ハイライトが 2 か所/);
  assert.deepStrictEqual(check(readSample()), []);
});

test("AC-66：同じブロック（problem 全体・lines 全体・result 全体）に太字が2か所あると止まる。ブロックごとに1か所なら通る", function () {
  const problem = readSample();
  problem.problem[1] = "（テスト用）**ここも**強調する。";
  assertHasProblem(check(problem), /「problem」の太字が 2 か所/);
  const lines = readSample();
  lines.lines[1].text = "（テスト用）**ここも**強調する。";
  assertHasProblem(check(lines), /「lines」の太字が 2 か所/);
  const result = readSample();
  result.result[1] = "（テスト用）**ここも**強調する。";
  assertHasProblem(check(result), /「result」の太字が 2 か所/);
  const decision = readPlainSample();
  decision.decision = "（テスト用）**一つ**と**二つ**";
  assertHasProblem(check(decision), /「decision」の太字が 2 か所/);
  assert.deepStrictEqual(check(readSample()), []);
});

test("AC-67：記号で区切って検査をすり抜ける書き方（3**万**・二**億**・2==室==・お**すすめ**・h**ttps://**）は止まる", function () {
  ["3**万**", "二**億**", "2==室==", "お**すすめ**", "h**ttps://**"].forEach(function (trick) {
    const entry = readPlainSample();
    entry.decision = "（テスト用）" + trick;
    const problems = check(entry);
    assertHasProblem(problems, /「decision」に、公開してはいけない書き方/);
  });
});

test("AC-68・AC-80：記号を除いて200文字ちょうどの decision は通り（記号込み204文字）、201文字なら止まる", function () {
  const exact = readPlainSample();
  exact.decision = "あ".repeat(196) + "**いうえお**";
  assert.strictEqual(Array.from(exact.decision).length, 204);
  assert.deepStrictEqual(check(exact), []);
  const over = readPlainSample();
  over.decision = "あ".repeat(196) + "**いうえおか**";
  assertHasProblem(check(over), /「decision」が（記号を除いて）200文字を超えています/);
});

test("AC-68：記号を含めたもとの長さが上限＋21文字以上なら止まる", function () {
  const entry = readPlainSample();
  // 記号を含めたもとの長さが 222 文字（上限200＋21 以上）。記号が多すぎるデータを止める
  entry.decision = "あ".repeat(180) + "==い==" + "**う**" + "あ".repeat(31);
  assert.ok(Array.from(entry.decision).length >= 221);
  assertHasProblem(check(entry), /記号を含めて 220 文字を超えています/);
});

test("AC-72：takeaway が空・61文字（記号を除く）・2文・改行つきなら止まる。60文字ちょうどの1文は通る", function () {
  const empty = readSample();
  empty.takeaway = "";
  assertHasProblem(check(empty), /「takeaway」がないか、空です/);
  const long = readSample();
  long.takeaway = "あ".repeat(60) + "。";
  assertHasProblem(check(long), /「takeaway」が（記号を除いて）60文字を超えています/);
  const twoSentences = readSample();
  twoSentences.takeaway = "Aだ。Bだ。";
  assertHasProblem(check(twoSentences), /1文にしてください/);
  const newline = readSample();
  newline.takeaway = "一行目\n二行目";
  assertHasProblem(check(newline), /改行は書けません/);
  const exact = readSample();
  exact.takeaway = "あ".repeat(59) + "。";
  assert.deepStrictEqual(check(exact), []);
  const noEnding = readSample();
  noEnding.takeaway = "終わりの記号がなくてもよい";
  assert.deepStrictEqual(check(noEnding), []);
});

test("AC-72：takeaway の途中に「！」「？」があっても2文として止まる", function () {
  const entry = readSample();
  entry.takeaway = "えっ？そうなのか。";
  assertHasProblem(check(entry), /1文にしてください/);
});

test("AC-64・AC-73：figure2 の形（alt がない・知らない項目）も 図1 と同じように検査される", function () {
  const noAlt = readSample();
  delete noAlt.figure2.alt;
  assertHasProblem(check(noAlt), /「figure2」の「alt」がないか、空です/);
  const extra = readSample();
  extra.figure2.src = "x.svg";
  assertHasProblem(check(extra), /「figure2」に、決まっていない項目「src」/);
});

test("AC-79：本文の合計（記号を除く）が300未満・3,000超なら止まる", function () {
  const short = readSample();
  short.problem = ["（テスト用）短い。"];
  short.result = ["（テスト用）短い。"];
  short.takeaway = "短い。";
  delete short.pick;
  short.lines = [{ speaker: "アオイ", text: "短い。" }, { speaker: "Yu", text: "短い。" }];
  assertHasProblem(check(short), /本文の合計が 300〜3000 文字/);
  const long = readPlainSample();
  long.problem = ["あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300), "あ".repeat(300)];
  long.result = ["あ".repeat(200), "あ".repeat(200), "あ".repeat(200), "あ".repeat(200)];
  long.lines.forEach(function (line) { line.text = "あ".repeat(100); });
  long.lines = long.lines.concat(long.lines).concat(long.lines).slice(0, 10);
  assertHasProblem(check(long), /本文の合計が 300〜3000 文字/);
});

test("本文の合計は記号を除いて数え、図の説明は数えない", function () {
  const entry = readSample();
  const withSymbols = countFormat3Characters(entry);
  const without = readPlainSample();
  without.takeaway = entry.takeaway;
  assert.strictEqual(countFormat3Characters(without), withSymbols);
  const longFigure = readSample();
  longFigure.figure.alt = "あ".repeat(200);
  assert.strictEqual(countFormat3Characters(longFigure), withSymbols);
});

test("AC-75：URL・金額・部屋の数・勧める言い回し・HTMLの記号は、強調を書ける項目でも止まる", function () {
  ["https://example.com", "3万", "2室", "おすすめ", "<b>"].forEach(function (bad) {
    const entry = readPlainSample();
    entry.result[0] = "（テスト用）" + bad;
    assertHasProblem(check(entry), /「result」の1つ目に、公開してはいけない書き方/);
  });
});
