/*
 * board_quote_pick.js：名言の一覧の検査と、ランダムに1つ選ぶ処理（画面には触れない）
 * 主な関数：isValidBoardQuote（1件が正しいか・役員・文・日付・種類を見る）、filterValidBoardQuotes（正しい件だけ残す）、pickBoardQuote（役員を等確率で1人 → その人の名言から1つ）
 * 前提：diary_day.js の isDiaryDate が先に読み込まれている。
 * hero_advice.js から使われる。tests/board_quote_pick.test.js でテストする。
 */

// 名言を載せてよい役員（秘書・アオイ・Yu は載せない）
const BOARD_QUOTE_SPEAKERS = ["CMO", "プロデューサー", "ブランドディレクター", "CFO", "CTO", "CISO"];
// 名言の種類：Yu への「提案」（こうしよう）か「指摘」（ここが問題）か。吹き出しの下のラベルと枠の色に使う
const BOARD_QUOTE_KINDS = ["teian", "shiteki"];
// 名言の文字数の上限。吹き出しに収めるため（requirements_redesign.md 2-1-1）
const BOARD_QUOTE_MAX_LENGTH = 80;

/**
 * 名言1件が正しい形か調べる（役員の名前・文・日付・種類）。
 * @param {*} quote 調べる値
 * @returns {boolean} 正しければ true
 * @example isValidBoardQuote({ speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16", kind: "teian" }) // true
 */
function isValidBoardQuote(quote) {
  if (quote === null || typeof quote !== "object") {
    return false;
  }
  if (!BOARD_QUOTE_SPEAKERS.includes(quote.speaker)) {
    return false;
  }
  if (typeof quote.text !== "string" || quote.text === "") {
    return false;
  }
  if (Array.from(quote.text).length > BOARD_QUOTE_MAX_LENGTH) {
    return false;
  }
  if (!BOARD_QUOTE_KINDS.includes(quote.kind)) {
    return false;
  }
  return isDiaryDate(quote.date);
}

/**
 * 一覧から正しい件だけを残す。正しくない件は、その件だけ飛ばして理由をコンソールに日本語で出す。
 * @param {*} quotes 名言の一覧
 * @returns {{speaker:string,text:string,date:string,kind:string}[]} 正しい件（一覧でない値のときは空）
 * @example filterValidBoardQuotes([{ speaker: "Yu" }]) // []
 */
function filterValidBoardQuotes(quotes) {
  if (!Array.isArray(quotes)) {
    console.warn("名言の一覧が配列ではありません。js/board_quotes_data.js を確認してください。");
    return [];
  }
  return quotes.filter(function (quote, index) {
    const ok = isValidBoardQuote(quote);
    if (!ok) {
      console.warn("名言の" + (index + 1) + "件目は形が正しくないため出しません。js/board_quotes_data.js を確認してください。");
    }
    return ok;
  });
}

/**
 * 0 以上 1 未満の数を、0 から（count - 1）の番号に直す。1 に近い値でも範囲を超えないようにする。
 * @param {number} randomValue 0 以上 1 未満の数
 * @param {number} count 選び先の数（1以上）
 * @returns {number} 番号
 */
function toPickIndex(randomValue, count) {
  return Math.min(Math.floor(randomValue * count), count - 1);
}

/**
 * 名言を1つ選ぶ。まず役員を等しい確率で1人、次にその役員の名言から1つ（名言の多い役員に偏らないため）。
 * @param {*} quotes 名言の一覧
 * @param {function(): number} rand 0 以上 1 未満の数を返す関数（画面では Math.random、テストでは決まった値）
 * @returns {{speaker:string,text:string,date:string,kind:string}|null} 選んだ1件。正しい名言が0件なら null
 * @example pickBoardQuote(BOARD_QUOTES, Math.random)
 */
function pickBoardQuote(quotes, rand) {
  const validQuotes = filterValidBoardQuotes(quotes);
  if (validQuotes.length === 0) {
    return null;
  }
  // 役員の順は一覧に初めて出た順
  const speakers = [];
  validQuotes.forEach(function (quote) {
    if (!speakers.includes(quote.speaker)) {
      speakers.push(quote.speaker);
    }
  });
  const speaker = speakers[toPickIndex(rand(), speakers.length)];
  const mine = validQuotes.filter(function (quote) {
    return quote.speaker === speaker;
  });
  return mine[toPickIndex(rand(), mine.length)];
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOARD_QUOTE_SPEAKERS, BOARD_QUOTE_KINDS, BOARD_QUOTE_MAX_LENGTH, isValidBoardQuote, filterValidBoardQuotes, pickBoardQuote };
}
