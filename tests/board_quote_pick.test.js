/*
 * board_quote_pick.test.js：名言の検査と、ランダムの選び方（js/board_quote_pick.js）のテスト
 * 受け入れ基準：AC-31（rand=0 で1人目の1件目、0.999 で最後の役員の最後の件、役員を等確率で選ぶ、0件は null）
 * 実行：node --test
 */
const test = require("node:test");
const assert = require("node:assert");

global.isDiaryDate = require("../js/diary_day.js").isDiaryDate;
const { isValidBoardQuote, filterValidBoardQuotes, pickBoardQuote } = require("../js/board_quote_pick.js");

// 3件ある役員（CMO）と1件の役員（CFO）だけの一覧
const SAMPLE = [
  { speaker: "CMO", text: "ひとつめ。", date: "2026-11-14", kind: "teian" },
  { speaker: "CMO", text: "ふたつめ。", date: "2026-11-15", kind: "teian" },
  { speaker: "CMO", text: "みっつめ。", date: "2026-11-16", kind: "teian" },
  { speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16", kind: "teian" }
];

// 呼ばれるたびに、決めた値を順に返す乱数の代わり
function fixedRand(values) {
  let index = 0;
  return function () {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

// 検査のときのコンソール表示を、テストの出力に出さない
function silenceWarnings(run) {
  const original = console.warn;
  console.warn = function () {};
  try {
    return run();
  } finally {
    console.warn = original;
  }
}

test("AC-31：rand が常に 0 なら1人目の役員の1件目", function () {
  assert.deepStrictEqual(pickBoardQuote(SAMPLE, fixedRand([0])), SAMPLE[0]);
});

test("AC-31：rand が常に 0.999 なら最後の役員の最後の件", function () {
  assert.deepStrictEqual(pickBoardQuote(SAMPLE, fixedRand([0.999])), SAMPLE[3]);
});

test("AC-31：役員は等確率（1回目が 0.0〜0.49 なら CMO、0.5〜0.99 なら CFO）", function () {
  assert.strictEqual(pickBoardQuote(SAMPLE, fixedRand([0.49, 0])).speaker, "CMO");
  assert.strictEqual(pickBoardQuote(SAMPLE, fixedRand([0.5, 0])).speaker, "CFO");
  assert.strictEqual(pickBoardQuote(SAMPLE, fixedRand([0.99, 0])).speaker, "CFO");
});

test("AC-31：2回目の rand でその役員の名言から選ぶ", function () {
  assert.strictEqual(pickBoardQuote(SAMPLE, fixedRand([0, 0.5])).text, "ふたつめ。");
});

test("AC-31：空の一覧・全件が正しくない一覧・配列でない値では null", function () {
  silenceWarnings(function () {
    assert.strictEqual(pickBoardQuote([], Math.random), null);
    assert.strictEqual(pickBoardQuote([{ speaker: "Yu", text: "あ", date: "2026-11-14", kind: "teian" }], Math.random), null);
    assert.strictEqual(pickBoardQuote(null, Math.random), null);
  });
});

test("2-1-1：役員でない者（アオイ・Yu・秘書）・空の文・80字超・日付の形違いは正しくない件として飛ばす", function () {
  const bad = [
    { speaker: "アオイ", text: "あ", date: "2026-11-14", kind: "teian" },
    { speaker: "Yu", text: "あ", date: "2026-11-14", kind: "teian" },
    { speaker: "秘書", text: "あ", date: "2026-11-14", kind: "teian" },
    { speaker: "CFO", text: "", date: "2026-11-14", kind: "teian" },
    { speaker: "CFO", text: "あ".repeat(81), date: "2026-11-14", kind: "teian" },
    { speaker: "CFO", text: "あ", date: "2026-1-4" },
    { speaker: "CFO", text: "あ", date: "2026-02-30" },
    null
  ];
  bad.forEach(function (quote) {
    assert.strictEqual(isValidBoardQuote(quote), false);
  });
  assert.strictEqual(isValidBoardQuote({ speaker: "CFO", text: "あ".repeat(80), date: "2026-11-14", kind: "teian" }), true);
});

test("2-1-1：正しくない件だけ飛ばし、残りは選べる", function () {
  const mixed = [{ speaker: "Yu", text: "あ", date: "2026-11-14", kind: "teian" }, SAMPLE[3]];
  silenceWarnings(function () {
    assert.deepStrictEqual(filterValidBoardQuotes(mixed), [SAMPLE[3]]);
    assert.deepStrictEqual(pickBoardQuote(mixed, fixedRand([0])), SAMPLE[3]);
  });
});
