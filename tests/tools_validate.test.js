/*
 * tools_validate.test.js：js/tools_validate.js（ツール一覧のデータの検査）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { isNonEmptyText, findToolProblems, validateTools } = require("../js/tools_validate.js");

/**
 * テスト用の、形が正しいツール1件を作る。毎回新しく作るのは、テスト同士で中身を書き換え合わないようにするため。
 * @param {string} name ツールの名前（URLの一部にも使う）
 * @returns {{ name: string, description: string, url: string, status: string }} 形が正しいツール1件
 */
function makeValidTool(name) {
  return {
    name: name,
    description: "テスト用の説明です",
    url: "https://example.com/" + name + "/",
    status: "公開中"
  };
}

test("正しい形の項目は、問題なしになる", function () {
  assert.deepStrictEqual(findToolProblems(makeValidTool("a")), []);
  const preparing = makeValidTool("b");
  preparing.status = "準備中";
  assert.deepStrictEqual(findToolProblems(preparing), []);
});

test("空白だけの文字・文字でない値は、空として扱う", function () {
  assert.strictEqual(isNonEmptyText("abc"), true);
  assert.strictEqual(isNonEmptyText("   "), false);
  assert.strictEqual(isNonEmptyText(""), false);
  assert.strictEqual(isNonEmptyText(undefined), false);
  assert.strictEqual(isNonEmptyText(123), false);
});

test("AC-6：name がない項目は、name の問題として報告される", function () {
  const tool = makeValidTool("a");
  delete tool.name;
  const problems = findToolProblems(tool);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /「name」/);
});

test("AC-6：状態が「公開予定」の項目は、status の問題として報告される", function () {
  const tool = makeValidTool("a");
  tool.status = "公開予定";
  const problems = findToolProblems(tool);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /「status」が「公開予定」/);
});

test("AC-6：URLが javascript: で始まる項目は、url の問題として報告される", function () {
  const tool = makeValidTool("a");
  tool.url = "javascript:alert(1)";
  const problems = findToolProblems(tool);
  assert.strictEqual(problems.length, 1);
  assert.match(problems[0], /「url」/);
});

test("http://（https でない）URLも認めない", function () {
  const tool = makeValidTool("a");
  tool.url = "http://example.com/";
  assert.strictEqual(findToolProblems(tool).length, 1);
});

test("AC-6：正しくない項目だけを除き、ほかの正しい項目は順番どおりに残す。何件目かを報告する", function () {
  const noName = makeValidTool("x");
  delete noName.name;
  const wrongStatus = makeValidTool("y");
  wrongStatus.status = "公開予定";
  const dangerousUrl = makeValidTool("z");
  dangerousUrl.url = "javascript:alert(1)";

  const first = makeValidTool("first");
  const last = makeValidTool("last");
  const result = validateTools([first, noName, wrongStatus, dangerousUrl, last]);

  assert.deepStrictEqual(result.validTools, [first, last]);
  const positions = result.problemReports.map(function (report) {
    return report.position;
  });
  assert.deepStrictEqual(positions, [2, 3, 4]);
});

test("AC-4：正しい項目を足すと、足した順に並ぶ", function () {
  const first = makeValidTool("first");
  const second = makeValidTool("second");
  const result = validateTools([first, second]);
  assert.deepStrictEqual(result.validTools, [first, second]);
});

test("AC-7：空の配列は、表示する項目0件・問題0件になる（エラーにならない）", function () {
  const result = validateTools([]);
  assert.deepStrictEqual(result.validTools, []);
  assert.deepStrictEqual(result.problemReports, []);
});

test("配列でないデータや、{ } でない項目でも止まらずに報告する", function () {
  const notArray = validateTools("abc");
  assert.deepStrictEqual(notArray.validTools, []);
  assert.strictEqual(notArray.problemReports[0].position, 0);

  const result = validateTools([null, "文字", makeValidTool("ok")]);
  assert.strictEqual(result.validTools.length, 1);
  assert.strictEqual(result.problemReports.length, 2);
});
