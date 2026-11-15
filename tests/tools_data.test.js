/*
 * tools_data.test.js：実際のツール一覧のデータ（js/tools_data.js）が、全部の項目で検査を通るかのテスト
 * データを足したときの書き間違いを、公開する前に見つけるためのもの。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { TOOLS_DATA } = require("../js/tools_data.js");
const { validateTools } = require("../js/tools_validate.js");

// 一言説明に使わない、投資を勧める言い回し（AC-15 の確認用）
const FORBIDDEN_WORDS = ["おすすめ", "オススメ", "儲かる", "買うべき"];

test("AC-13：tools_data.js の全項目が検査を通る", function () {
  const result = validateTools(TOOLS_DATA);
  assert.deepStrictEqual(result.problemReports, []);
  assert.strictEqual(result.validTools.length, TOOLS_DATA.length);
});

test("AC-3：おかね収支シミュレーターが「公開中」で、決まったURLで載っている", function () {
  const simulator = TOOLS_DATA.find(function (tool) {
    return tool.name === "おかね収支シミュレーター";
  });
  assert.ok(simulator, "おかね収支シミュレーターが一覧のデータにありません");
  assert.strictEqual(simulator.status, "公開中");
  assert.strictEqual(simulator.url, "https://yu-ceo.github.io/okane-simulator/");
});

test("AC-15：一言説明に、投資を勧める言い回しが入っていない", function () {
  TOOLS_DATA.forEach(function (tool) {
    FORBIDDEN_WORDS.forEach(function (word) {
      assert.ok(!tool.description.includes(word), tool.name + " の説明に「" + word + "」が入っています");
    });
  });
});
