/*
 * diary_pick.js：日記1件から「今日の一言」のセリフと「今日の参加」の話者の並びを選ぶ。画面には触れない
 * 主な関数：choosePickLine（今日の一言を選ぶ）、findPickLengthProblems（〔v5〕3版目の今日の一言が60字以内かの検査）、
 *   listSpeakers（話した人を重複なし・登場順に並べる）
 * 日記の表示のファイルと、3版目の検査（diary_validate_format3.js）から使われる。tests/diary_pick.test.js でテストする。
 * 話者の名前（秘書・Yu）は diary_speakers.js の NARRATOR_SPEAKER・HUMAN_SPEAKER を使う。
 */

// Node.js（テスト）では、diary_speakers.js の値を require で読み込んで、ブラウザと同じ名前で使えるようにする
// （ブラウザでは、先に読み込んだ diary_speakers.js の値がそのまま使える）
if (typeof module !== "undefined" && module.exports) {
  globalThis.NARRATOR_SPEAKER = require("./diary_speakers.js").NARRATOR_SPEAKER;
  globalThis.HUMAN_SPEAKER = require("./diary_speakers.js").HUMAN_SPEAKER;
  // 3版目は強調の記号を除いた文字数で「60字以内」を数えるため
  globalThis.countVisibleCharacters = require("./diary_markup.js").countVisibleCharacters;
}

// 3版目の format の数字
const PICK_FORMAT3 = 3;
// 〔v5〕3版目の今日の一言に使えるセリフの長さの上限（記号を除く文字数）。長い吹き出しが紺の帯で約6行になって重くなるのを防ぐため
const PICK_MAX_LENGTH_FORMAT3 = 60;

/**
 * 3版目かどうか。
 * @param {object} entry 日記1件
 * @returns {boolean} 3版目なら true
 * @example isPickFormat3({ format: 3 }) // true
 */
function isPickFormat3(entry) {
  return entry.format === PICK_FORMAT3;
}

/**
 * 秘書・Yu 以外で最初のセリフ → なければ最初のセリフ、の順で選ぶ。
 * @param {{ speaker: string, text: string }[]} candidates 選び先のセリフ（1つ以上）
 * @returns {{ speaker: string, text: string }} 選んだセリフ
 * @example pickFirstOfficerLine([{ speaker: "秘書", text: "a" }, { speaker: "CMO", text: "b" }]) // CMO のセリフ
 */
function pickFirstOfficerLine(candidates) {
  const firstOfficerLine = candidates.find(function (line) {
    return line.speaker !== NARRATOR_SPEAKER && line.speaker !== HUMAN_SPEAKER;
  });
  if (firstOfficerLine !== undefined) {
    return firstOfficerLine;
  }
  return candidates[0];
}

/**
 * 〔v5〕3版目で、今日の一言に使える（記号を除いて60字以内の）セリフだけを返す。
 * @param {{ lines: { text: string }[] }} entry 3版目の日記1件
 * @returns {{ speaker: string, text: string }[]} 60字以内のセリフ（登場順）
 * @example listShortLines({ lines: [{ speaker: "CMO", text: "短い" }] }).length // 1
 */
function listShortLines(entry) {
  return entry.lines.filter(function (line) {
    return countVisibleCharacters(line.text) <= PICK_MAX_LENGTH_FORMAT3;
  });
}

/**
 * 冒頭の「今日の一言」に出すセリフを選ぶ。
 * 選び方：pick（1から数えた番号）があればそのセリフ → なければ秘書・Yu 以外で最初のセリフ → それもなければ最初のセリフ。
 * 〔v5〕3版目は、pick がない日は60字以内のセリフの中だけから選ぶ（2版目・旧形式は今までどおり全セリフから）。
 * @param {{ lines: { speaker: string, text: string }[], pick?: number }} entry 検査を通った日記1件
 * @returns {{ speaker: string, text: string }} 選んだセリフ
 * @example choosePickLine({ lines: [{ speaker: "秘書", text: "a" }, { speaker: "CMO", text: "b" }] }) // CMO のセリフ
 */
function choosePickLine(entry) {
  if (Number.isInteger(entry.pick)) {
    // pick は人が数える「何番目」なので、配列の番号（0から）に合わせて1を引く
    return entry.lines[entry.pick - 1];
  }
  let candidates = entry.lines;
  if (isPickFormat3(entry)) {
    // 〔v5〕3版目は60字以内のセリフの中だけから選ぶ。1つもない日は検査で止まるので、念のため全セリフに戻す
    const shortLines = listShortLines(entry);
    if (shortLines.length > 0) {
      candidates = shortLines;
    }
  }
  return pickFirstOfficerLine(candidates);
}

/**
 * 〔v5〕3版目の今日の一言が60字以内かを調べる。形が正しい3版目の日記だけに使う。
 * pick を書いた日は選んだセリフの長さを、書かない日は60字以内のセリフがあるかを調べる。
 * @param {{ lines: { text: string }[], pick?: number }} entry 3版目の日記1件
 * @returns {string[]} 問題点（なければ空）
 * @example findPickLengthProblems({ lines: [{ speaker: "CMO", text: "短い" }] }) // []
 */
function findPickLengthProblems(entry) {
  if (Number.isInteger(entry.pick)) {
    const length = countVisibleCharacters(entry.lines[entry.pick - 1].text);
    if (length > PICK_MAX_LENGTH_FORMAT3) {
      return ["今日の一言（pick）に選んだセリフが " + PICK_MAX_LENGTH_FORMAT3 + " 文字を超えています（今は " + length + " 文字）"];
    }
    return [];
  }
  if (listShortLines(entry).length === 0) {
    return ["今日の一言に使える " + PICK_MAX_LENGTH_FORMAT3 + " 文字以内のセリフがありません"];
  }
  return [];
}

/**
 * その日に話した話者を、重複なし・登場した順に並べる。
 * @param {{ lines: { speaker: string }[] }} entry 日記1件
 * @returns {string[]} 話者の名前の一覧
 * @example listSpeakers({ lines: [{ speaker: "秘書" }, { speaker: "Yu" }, { speaker: "秘書" }] }) // ["秘書", "Yu"]
 */
function listSpeakers(entry) {
  const names = [];
  entry.lines.forEach(function (line) {
    if (!names.includes(line.speaker)) {
      names.push(line.speaker);
    }
  });
  return names;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { choosePickLine, findPickLengthProblems, listSpeakers };
}
