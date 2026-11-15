/*
 * toolbox_data.test.js：実際の道具箱のデータ（js/toolbox_data.js）と ASP_LIST（js/site_config.js）が、全部の項目で検査を通るかのテスト
 * データを書き換えたときの書き間違いを、公開する前に見つけるためのもの。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { TOOLBOX_DATA } = require("../js/toolbox_data.js");
const { ASP_LIST } = require("../js/site_config.js");
const { validateToolbox, validateAspList } = require("../js/toolbox_validate.js");

// 証券口座の文面に書かない言い切り・比べる言い回し（AC-16）
const SECURITIES_FORBIDDEN = ["一番お得", "始めるならここ", "より", "比べ"];
// 酸素ルームの文面に書かない、効き目の言葉（AC-16）
const OXYGEN_FORBIDDEN = ["効果", "効く", "改善", "回復", "美容", "健康"];

/**
 * 名前で道具を探す。
 * @param {string} name 道具の名前
 * @returns {object|undefined} 見つかった道具
 */
function findByName(name) {
  return TOOLBOX_DATA.find(function (item) {
    return item.name === name;
  });
}

test("AC-23：ASP_LIST の全部のASPが検査を通る", function () {
  const result = validateAspList(ASP_LIST);
  assert.deepStrictEqual(result.problemReports, []);
  assert.strictEqual(result.validAsps.length, ASP_LIST.length);
});

test("AC-23：toolbox_data.js の全部の道具が検査を通る（計測用画像も含む）", function () {
  const result = validateToolbox(TOOLBOX_DATA, ASP_LIST);
  assert.deepStrictEqual(result.problemReports, []);
  assert.deepStrictEqual(result.noticeReports, []);
  assert.strictEqual(result.validItems.length, TOOLBOX_DATA.length);
});

test("公開時の状態：紹介リンクは本の1件だけ（もしもアフィリエイト・計測用画像つき）、ほかは公式リンク", function () {
  const affiliates = TOOLBOX_DATA.filter(function (item) {
    return item.linkType === "affiliate";
  });
  assert.strictEqual(affiliates.length, 1);
  assert.strictEqual(affiliates[0].name, "田中渓『億までの人 億からの人』");
  assert.strictEqual(affiliates[0].asp, "moshimo");
  assert.ok(affiliates[0].beaconUrl.startsWith("https://i.moshimo.com/"));
  TOOLBOX_DATA.filter(function (item) {
    return item.linkType !== "affiliate";
  }).forEach(function (item) {
    assert.strictEqual(item.linkType, "official", item.name);
    assert.strictEqual(item.beaconUrl, undefined, item.name);
  });
});

test("AC-1：7つの道具が決まったジャンルに入っている", function () {
  const expected = {
    "SBI証券": "money", "楽天証券": "money", "Gemini": "ai", "Microsoft Copilot": "ai", "VS Code": "ai",
    "田中渓『億までの人 億からの人』": "life", "FIT-EASYの酸素ルーム": "life"
  };
  Object.keys(expected).forEach(function (name) {
    const item = findByName(name);
    assert.ok(item, name + " がデータにありません");
    assert.strictEqual(item.genre, expected[name], name);
  });
});

test("AC-16：証券口座に言い切り・比較の言葉、酸素ルームに効き目の言葉がない", function () {
  ["SBI証券", "楽天証券"].forEach(function (name) {
    SECURITIES_FORBIDDEN.forEach(function (word) {
      assert.ok(!findByName(name).note.includes(word), name + " に「" + word + "」があります");
    });
  });
  OXYGEN_FORBIDDEN.forEach(function (word) {
    assert.ok(!findByName("FIT-EASYの酸素ルーム").note.includes(word), "酸素ルームに「" + word + "」があります");
  });
});

test("AC-16：どの道具の文面にも「おすすめ」（オススメ・お勧め）がない", function () {
  TOOLBOX_DATA.forEach(function (item) {
    ["おすすめ", "オススメ", "お勧め"].forEach(function (word) {
      assert.ok(!(item.name + item.note + (item.label || "")).includes(word), item.name);
    });
  });
});
