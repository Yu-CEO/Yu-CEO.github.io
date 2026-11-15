/*
 * tools_data.test.js：実際のツール一覧のデータ（js/tools_data.js）が、全部の項目で検査を通るかのテスト
 * データを足したときの書き間違いを、公開する前に見つけるためのもの。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { TOOLS_DATA } = require("../js/tools_data.js");
const { validateTools } = require("../js/tools_validate.js");

// 一言説明に使わない、投資を勧める言い回し（AC-15 の確認用）
const FORBIDDEN_WORDS = ["おすすめ", "オススメ", "儲かる", "買うべき"];
// portal フォルダの場所（画像のファイルがあるかを確かめるため）
const PORTAL_FOLDER = path.join(__dirname, "..");

/**
 * データの中から、おかね収支シミュレーターの項目を探す。
 * @returns {object|undefined} 見つかった項目
 */
function findSimulator() {
  return TOOLS_DATA.find(function (tool) {
    return tool.name === "おかね収支シミュレーター";
  });
}

test("AC-13：tools_data.js の全項目が検査を通る（画像の項目も含む）", function () {
  const result = validateTools(TOOLS_DATA);
  assert.deepStrictEqual(result.problemReports, []);
  assert.deepStrictEqual(result.imageProblemReports, []);
  assert.strictEqual(result.validTools.length, TOOLS_DATA.length);
});

test("AC-3：おかね収支シミュレーターが「公開中」で、決まったURLで載っている", function () {
  const simulator = findSimulator();
  assert.ok(simulator, "おかね収支シミュレーターが一覧のデータにありません");
  assert.strictEqual(simulator.status, "公開中");
  assert.strictEqual(simulator.url, "https://yu-ceo.github.io/okane-simulator/");
});

test("AC-31・AC-32：おかね収支シミュレーターに、スクリーンショットと画像の説明が入っている", function () {
  const simulator = findSimulator();
  assert.strictEqual(simulator.image, "assets/tool_simulator.jpg");
  assert.strictEqual(simulator.imageAlt, "おかね収支シミュレーターの画面（NISA積立の計算例）");
});

test("データに書いた画像のファイルが、実際に assets/ にある", function () {
  TOOLS_DATA.forEach(function (tool) {
    if (tool.image) {
      assert.ok(fs.existsSync(path.join(PORTAL_FOLDER, tool.image)), tool.image + " がありません");
    }
  });
});

test("AC-15：一言説明に、投資を勧める言い回しが入っていない", function () {
  TOOLS_DATA.forEach(function (tool) {
    FORBIDDEN_WORDS.forEach(function (word) {
      assert.ok(!tool.description.includes(word), tool.name + " の説明に「" + word + "」が入っています");
    });
  });
});
