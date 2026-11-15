/*
 * toolbox_validate.test.js：js/toolbox_validate.js（道具箱のデータと ASP_LIST の検査）の自動テスト
 * 紹介リンク・計測用画像のURLは、テスト用のダミー（実在しない a8mat・a_id）を使う。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const { validateToolbox, validateAspList, findBeaconProblem } = require("../js/toolbox_validate.js");

// テスト用のASPの一覧（本番の ASP_LIST と同じ形）
const TEST_ASP_LIST = [
  { id: "a8", name: "A8.net", linkHosts: ["px.a8.net"], beaconHosts: ["www18.a8.net"] },
  { id: "moshimo", name: "もしもアフィリエイト", linkHosts: ["af.moshimo.com"], beaconHosts: ["i.moshimo.com"] }
];
// 正しい道具（公式リンク）の見本
const GOOD_OFFICIAL = { genre: "ai", name: "VS Code", note: "このサイトは、AIと一緒にVS Codeで作っています", linkType: "official", url: "https://code.visualstudio.com/" };
// 正しい道具（A8.net の紹介リンク・計測用画像つき）の見本。URLはテスト用のダミー
const GOOD_A8 = {
  genre: "money", name: "テスト口座", note: "テスト用に使っています", linkType: "affiliate", asp: "a8",
  url: "https://px.a8.net/svt/ejp?a8mat=TEST", beaconUrl: "https://www18.a8.net/0.gif?a8mat=TEST"
};

/**
 * 見本の道具の写しに、一部の項目を上書きした道具を作る。
 * @param {object} base 見本
 * @param {object} changes 上書きする項目
 * @returns {object} 新しい道具
 */
function withChanges(base, changes) {
  return Object.assign({}, base, changes);
}

/**
 * 正しい道具の間に、正しくない道具を1件はさんで検査し、その1件だけが止まることを確かめる。
 * @param {object} badItem 正しくない道具
 */
function assertOnlyThisIsExcluded(badItem) {
  const result = validateToolbox([GOOD_OFFICIAL, badItem, GOOD_A8], TEST_ASP_LIST);
  assert.strictEqual(result.validItems.length, 2, JSON.stringify(badItem) + " が表示されてしまいます");
  assert.strictEqual(result.problemReports.length, 1);
  assert.strictEqual(result.problemReports[0].position, 2);
  assert.ok(result.problemReports[0].problems.length > 0);
}

test("AC-12：正しくない道具はその1件だけ表示されず、何件目かと理由（日本語）が返る", function () {
  const noName = withChanges(GOOD_OFFICIAL, {});
  delete noName.name;
  const badItems = [
    noName,
    withChanges(GOOD_OFFICIAL, { genre: "stock" }),
    withChanges(GOOD_OFFICIAL, { linkType: "ad" }),
    withChanges(GOOD_OFFICIAL, { url: "javascript:alert(1)" }),
    withChanges(GOOD_A8, { url: "http://px.a8.net/svt/ejp?a8mat=TEST" }),
    withChanges(GOOD_A8, { asp: undefined }),
    withChanges(GOOD_A8, { asp: "xyz" }),
    withChanges(GOOD_A8, { url: "https://af.moshimo.com/af/c/click?a_id=TEST" }),
    withChanges(GOOD_A8, { url: "https://example.com/" }),
    withChanges(GOOD_OFFICIAL, { note: "あ".repeat(81) }),
    withChanges(GOOD_OFFICIAL, { urll: "https://example.com/" }),
    withChanges(GOOD_OFFICIAL, { note: "必ず儲かると思って使っています" }),
    withChanges(GOOD_OFFICIAL, { note: "おすすめの道具です" })
  ];
  badItems.forEach(assertOnlyThisIsExcluded);
});

test("AC-12：理由の文は日本語で、どの項目かがわかる", function () {
  const result = validateToolbox([withChanges(GOOD_OFFICIAL, { urll: "x" })], TEST_ASP_LIST);
  assert.ok(result.problemReports[0].problems[0].includes("urll"));
  const banned = validateToolbox([withChanges(GOOD_OFFICIAL, { note: "おすすめです" })], TEST_ASP_LIST);
  assert.ok(banned.problemReports[0].problems.join("").includes("おすすめ"));
});

test("AC-12：name・note・label の文字数の上限（40・80・20文字）ちょうどは通り、1文字超えると止まる", function () {
  const atLimit = withChanges(GOOD_OFFICIAL, { name: "あ".repeat(40), note: "い".repeat(80), label: "う".repeat(20) });
  assert.strictEqual(validateToolbox([atLimit], TEST_ASP_LIST).validItems.length, 1);
  const overLabel = withChanges(GOOD_OFFICIAL, { label: "う".repeat(21) });
  assert.strictEqual(validateToolbox([overLabel], TEST_ASP_LIST).validItems.length, 0);
});

test("AC-13：リンクなしなのに url がある道具は、リンクなしとして表示され、注意が返る", function () {
  const item = { genre: "life", name: "テスト", note: "使っています", linkType: "none", url: "https://example.com/" };
  const result = validateToolbox([item], TEST_ASP_LIST);
  assert.strictEqual(result.validItems.length, 1);
  assert.strictEqual(result.validItems[0].url, undefined);
  assert.strictEqual(result.noticeReports.length, 1);
  assert.strictEqual(result.noticeReports[0].position, 1);
  // 元のデータは書き換えない
  assert.strictEqual(item.url, "https://example.com/");
});

test("AC-27：正しくない計測用画像は取り除かれ、道具（リンク・PR）は残る", function () {
  const badBeacons = [
    "http://www18.a8.net/0.gif?a8mat=TEST",
    "javascript:alert(1)",
    "https://example.com/0.gif",
    "https://i.moshimo.com/af/i/impression?a_id=TEST"
  ];
  badBeacons.forEach(function (beaconUrl) {
    const result = validateToolbox([withChanges(GOOD_A8, { beaconUrl: beaconUrl })], TEST_ASP_LIST);
    assert.strictEqual(result.validItems.length, 1, beaconUrl);
    assert.strictEqual(result.validItems[0].beaconUrl, undefined, beaconUrl);
    assert.strictEqual(result.validItems[0].url, GOOD_A8.url);
    assert.strictEqual(result.noticeReports.length, 1, beaconUrl);
  });
});

test("AC-27：公式リンクの道具に計測用画像を書いても置かれず、注意が返る", function () {
  const result = validateToolbox([withChanges(GOOD_OFFICIAL, { beaconUrl: "https://www18.a8.net/0.gif" })], TEST_ASP_LIST);
  assert.strictEqual(result.validItems.length, 1);
  assert.strictEqual(result.validItems[0].beaconUrl, undefined);
  assert.strictEqual(result.noticeReports.length, 1);
});

test("AC-27：正しい計測用画像はそのまま残る", function () {
  assert.strictEqual(findBeaconProblem(GOOD_A8, TEST_ASP_LIST), "");
  assert.strictEqual(validateToolbox([GOOD_A8], TEST_ASP_LIST).validItems[0].beaconUrl, GOOD_A8.beaconUrl);
});

test("AC-26：もしもアフィリエイトの紹介リンクも通る。3つ目のASPを足すと、その id が使える", function () {
  const moshimo = withChanges(GOOD_A8, { asp: "moshimo", url: "https://af.moshimo.com/af/c/click?a_id=TEST", beaconUrl: "https://i.moshimo.com/af/i/impression?a_id=TEST" });
  assert.strictEqual(validateToolbox([moshimo], TEST_ASP_LIST).validItems[0].beaconUrl, moshimo.beaconUrl);
  const third = { id: "test3", name: "テストASP", linkHosts: ["link.test-asp.example"], beaconHosts: ["img.test-asp.example"] };
  const item = withChanges(GOOD_A8, { asp: "test3", url: "https://link.test-asp.example/x", beaconUrl: "https://img.test-asp.example/y" });
  assert.strictEqual(validateToolbox([item], TEST_ASP_LIST).validItems.length, 0);
  assert.strictEqual(validateToolbox([item], TEST_ASP_LIST.concat([third])).validItems.length, 1);
});

test("ASP_LIST の検査：id の重複・ホストの一覧が空・名前がないASPは、ないものとして扱う", function () {
  const result = validateAspList([
    TEST_ASP_LIST[0],
    { id: "a8", name: "重複", linkHosts: ["x.example"], beaconHosts: ["y.example"] },
    { id: "empty", name: "空", linkHosts: [], beaconHosts: ["y.example"] },
    { id: "noname", linkHosts: ["x.example"], beaconHosts: ["y.example"] }
  ]);
  assert.strictEqual(result.validAsps.length, 1);
  assert.deepStrictEqual(result.problemReports.map(function (report) { return report.position; }), [2, 3, 4]);
  // ないものとして扱ったASPの紹介リンクは表示しない
  const emptyAspItem = withChanges(GOOD_A8, { asp: "empty", url: "https://x.example/" });
  assert.strictEqual(validateToolbox([emptyAspItem], [{ id: "empty", name: "空", linkHosts: [], beaconHosts: [] }]).validItems.length, 0);
});

test("データ全体が配列でないときは、何も表示せず理由を返す（エラーで止まらない）", function () {
  const result = validateToolbox("こわれたデータ", TEST_ASP_LIST);
  assert.strictEqual(result.validItems.length, 0);
  assert.strictEqual(result.problemReports[0].position, 0);
  assert.strictEqual(validateToolbox([GOOD_OFFICIAL], null).validItems.length, 1);
});
