/*
 * diary_changes.test.js：tools/diary_changes.js（その日の日記だけの変更か・index.json・figure と図・日付の決まり）の自動テスト
 * git もファイルも使わず、変更の一覧を直接渡して確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  parseGitStatus, judgeDiaryChanges, checkIndexChange, checkPublishDate, previousDate, NEEDS_DEV_FLOW_MESSAGE
} = require("../tools/diary_changes.js");
const { checkFigureMatch } = require("../tools/diary_file_match.js");

const NEW_ENTRY = { state: "??", path: "diary/entries/2026-11-16.json" };
const INDEX_CHANGE = { state: " M", path: "diary/entries/index.json" };
const NEW_FIGURE = { state: "??", path: "diary/figures/2026-11-16.svg" };

/**
 * 判定が「止める」で、決まった文が出ているかを確かめる。
 * @param {{ state: string, path: string }[]} changes 変更の一覧
 */
function assertStopped(changes) {
  const result = judgeDiaryChanges(changes);
  assert.strictEqual(result.ok, false);
  assert.ok(result.problems.includes(NEEDS_DEV_FLOW_MESSAGE), result.problems.join("／"));
}

test("git status（-z）の出力を一覧にする。名前の変更は元の場所も入る", function () {
  const output = "?? diary/entries/2026-11-16.json\0 M diary/entries/index.json\0R  js/b.js\0js/a.js\0";
  assert.deepStrictEqual(parseGitStatus(output), [
    { state: "??", path: "diary/entries/2026-11-16.json" },
    { state: " M", path: "diary/entries/index.json" },
    { state: "R ", path: "js/b.js" },
    { state: "R ", path: "js/a.js" }
  ]);
});

test("AC-13：新しい日記1件＋index.json の変更だけなら進む", function () {
  const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.date, "2026-11-16");
  assert.deepStrictEqual(result.files, ["diary/entries/2026-11-16.json", "diary/entries/index.json"]);
  assert.strictEqual(result.hasFigure, false);
});

test("AC-55：その日の図1つも一緒なら進み、上げるファイルに図が入る", function () {
  const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE, NEW_FIGURE]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.hasFigure, true);
  assert.ok(result.files.includes("diary/figures/2026-11-16.svg"));
  // git に足した（A）状態でも同じ
  assert.strictEqual(judgeDiaryChanges([{ state: "A ", path: NEW_ENTRY.path }, { state: "M ", path: INDEX_CHANGE.path }]).ok, true);
});

test("AC-14：js/main.js・ci.yml・過去の日記の変更が1つでも混ざると止める", function () {
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " M", path: "js/main.js" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " M", path: ".github/workflows/ci.yml" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " M", path: "diary/entries/2026-11-15.json" }]);
});

test("AC-14：2日分の追加・日記の削除・index.json の変更なし・日記なしは止める", function () {
  assertStopped([NEW_ENTRY, { state: "??", path: "diary/entries/2026-11-15.json" }, INDEX_CHANGE]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " D", path: "diary/entries/2026-11-14.json" }]);
  assertStopped([NEW_ENTRY]);
  assertStopped([INDEX_CHANGE]);
  assertStopped([NEW_ENTRY, { state: " D", path: "diary/entries/index.json" }]);
});

test("AC-55：図2つ・別の日の図・過去の図の変更・図以外の画像は止める", function () {
  assertStopped([NEW_ENTRY, INDEX_CHANGE, NEW_FIGURE, { state: "??", path: "diary/figures/2026-11-15.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/figures/2026-11-15.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " M", path: "diary/figures/2026-11-15.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/figures/2026-11-16.png" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "assets/new.svg" }]);
});

test("AC-55：figure のない日に図がある・figure があるのに図がない、は止める", function () {
  assert.ok(checkFigureMatch({}, true).includes(NEEDS_DEV_FLOW_MESSAGE));
  assert.strictEqual(checkFigureMatch({ figure: { alt: "a", caption: "b" } }, false).length, 1);
  assert.deepStrictEqual(checkFigureMatch({ figure: { alt: "a", caption: "b" } }, true), []);
  assert.deepStrictEqual(checkFigureMatch({}, false), []);
});

test("index.json は、最後にその日の日付を1つ足すだけ", function () {
  assert.deepStrictEqual(checkIndexChange(["2026-11-15"], ["2026-11-15", "2026-11-16"], "2026-11-16"), []);
  assert.ok(checkIndexChange(["2026-11-15"], ["2026-11-16"], "2026-11-16").length > 0);
  assert.ok(checkIndexChange(["2026-11-15"], ["2026-11-15", "2026-11-16", "2026-11-17"], "2026-11-16").length > 0);
  assert.ok(checkIndexChange(["2026-11-16"], ["2026-11-16", "2026-11-16"], "2026-11-16").length > 0);
  assert.ok(checkIndexChange({}, [], "2026-11-16").length > 0);
});

test("AC-16・AC-28：日付は今日か前の日だけ。未来・それより古い日付は止める", function () {
  assert.deepStrictEqual(checkPublishDate("2026-11-16", "2026-11-16"), []);
  assert.deepStrictEqual(checkPublishDate("2026-11-15", "2026-11-16"), []);
  // 月をまたぐ前の日
  assert.deepStrictEqual(checkPublishDate("2026-11-30", "2026-12-01"), []);
  assert.match(checkPublishDate("2026-11-17", "2026-11-16")[0], /未来/);
  assert.match(checkPublishDate("2026-11-14", "2026-11-16")[0], /古すぎます/);
});

test("前の日の日付：月・年・うるう年をまたいでも正しい", function () {
  assert.strictEqual(previousDate("2026-11-16"), "2026-11-15");
  assert.strictEqual(previousDate("2026-12-01"), "2026-11-30");
  assert.strictEqual(previousDate("2027-01-01"), "2026-12-31");
  assert.strictEqual(previousDate("2028-03-01"), "2028-02-29");
});

const NEW_FIGURE2 = { state: "??", path: "diary/figures/2026-11-16-2.svg" };

test("AC-76：日記＋index.json＋図＋2枚目の図（その日の -2.svg）なら進み、上げるファイルに2枚目も入る", function () {
  const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE, NEW_FIGURE, NEW_FIGURE2]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.hasFigure, true);
  assert.strictEqual(result.hasFigure2, true);
  assert.ok(result.files.includes("diary/figures/2026-11-16-2.svg"));
  assert.ok(result.files.includes("diary/figures/2026-11-16.svg"));
});

test("AC-76：2枚目だけ（figure なしの figure2 だけの日）も進む", function () {
  const result = judgeDiaryChanges([NEW_ENTRY, INDEX_CHANGE, NEW_FIGURE2]);
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.hasFigure, false);
  assert.strictEqual(result.hasFigure2, true);
});

test("AC-76：別の日の -2.svg・過去の -2.svg の変更・-3.svg・-1.svg・2枚目が2つ、は止まる", function () {
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/figures/2026-11-15-2.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: " M", path: "diary/figures/2026-11-16-2.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/figures/2026-11-16-3.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, { state: "??", path: "diary/figures/2026-11-16-1.svg" }]);
  assertStopped([NEW_ENTRY, INDEX_CHANGE, NEW_FIGURE2, { state: "A ", path: "diary/figures/2026-11-16-2.svg" }]);
});

test("AC-74・AC-76：figure2 と -2.svg の過不足（figure2 があるのに無い／figure2 が無いのに有る）を見つける", function () {
  const figure = { alt: "a", caption: "b" };
  assert.deepStrictEqual(checkFigureMatch({ figure2: figure }, false, true), []);
  assert.match(checkFigureMatch({ figure2: figure }, false, false).join("／"), /figure2 があるのに/);
  const extra = checkFigureMatch({ title: "x" }, false, true);
  assert.match(extra.join("／"), /figure2 がないのに/);
  assert.ok(extra.includes(NEEDS_DEV_FLOW_MESSAGE));
  // 今までの呼び方（2つ目の引数だけ）も同じ結果
  assert.deepStrictEqual(checkFigureMatch({ figure: figure }, true), []);
});
