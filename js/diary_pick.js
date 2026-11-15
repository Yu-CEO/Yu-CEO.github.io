/*
 * diary_pick.js：日記1件から「今日の一言」のセリフと「今日の参加」の話者の並びを選ぶ。画面には触れない
 * 主な関数：choosePickLine（今日の一言を選ぶ）、listSpeakers（話した人を重複なし・登場順に並べる）
 * 日記の表示のファイルから使われる。tests/diary_pick.test.js でテストする。
 * 話者の名前（秘書・Yu）は diary_speakers.js の NARRATOR_SPEAKER・HUMAN_SPEAKER を使う。
 */

// Node.js（テスト）では、diary_speakers.js の値を require で読み込んで、ブラウザと同じ名前で使えるようにする
// （ブラウザでは、先に読み込んだ diary_speakers.js の値がそのまま使える）
if (typeof module !== "undefined" && module.exports) {
  globalThis.NARRATOR_SPEAKER = require("./diary_speakers.js").NARRATOR_SPEAKER;
  globalThis.HUMAN_SPEAKER = require("./diary_speakers.js").HUMAN_SPEAKER;
}

/**
 * 冒頭の「今日の一言」に出すセリフを選ぶ。
 * 選び方：pick（1から数えた番号）があればそのセリフ → なければ秘書・Yu 以外で最初のセリフ → それもなければ最初のセリフ。
 * @param {{ lines: { speaker: string, text: string }[], pick?: number }} entry 検査を通った日記1件
 * @returns {{ speaker: string, text: string }} 選んだセリフ
 * @example choosePickLine({ lines: [{ speaker: "秘書", text: "a" }, { speaker: "CMO", text: "b" }] }) // CMO のセリフ
 */
function choosePickLine(entry) {
  if (Number.isInteger(entry.pick)) {
    // pick は人が数える「何番目」なので、配列の番号（0から）に合わせて1を引く
    return entry.lines[entry.pick - 1];
  }
  const firstOfficerLine = entry.lines.find(function (line) {
    return line.speaker !== NARRATOR_SPEAKER && line.speaker !== HUMAN_SPEAKER;
  });
  if (firstOfficerLine !== undefined) {
    return firstOfficerLine;
  }
  return entry.lines[0];
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
  module.exports = { choosePickLine, listSpeakers };
}
