/*
 * diary_hook_view.js：日記1件のページの「冒頭のつかみ」（紺の帯の中）を作る
 * 中身：①今日の一言（顔・セリフ・名前と役の説明）②今日の決定（1つ目＋ほかN件。決定がない日は出さない）③今日の参加（小さな顔）
 * 主な関数：createDiaryHook（つかみ全体を作る）
 * 使うもの：diary_pick.js・diary_speakers.js・diary_parts.js。diary_entry_view.js から使われる。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.choosePickLine = require("./diary_pick.js").choosePickLine;
  globalThis.getSpeakerInfo = require("./diary_speakers.js").getSpeakerInfo;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createFacesRow = require("./diary_parts.js").createFacesRow;
}

/**
 * 「今日の一言」の箱を作る（顔48px・セリフ・「名前（役の説明）」）。
 * @param {object} entry 検査を通った日記1件
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} 箱の要素
 * @example createPickBox(entry, "../assets/speakers.svg")
 */
function createPickBox(entry, faceFile) {
  const line = choosePickLine(entry);
  const info = getSpeakerInfo(line.speaker);
  const box = makeDiaryElement("div", "d-pick " + info.className, "");
  box.appendChild(createSpeakerFace(line.speaker, "avatar-large", faceFile));
  const words = makeDiaryElement("div", "", "");
  words.appendChild(makeDiaryElement("span", "hook-label", "今日の一言"));
  words.appendChild(makeDiaryElement("p", "pick-quote", line.text));
  words.appendChild(makeDiaryElement("p", "pick-speaker", line.speaker + "（" + info.role + "）"));
  box.appendChild(words);
  return box;
}

/**
 * 「今日の決定」の箱を作る（1つ目の決定＋「ほかN件は下の『今日の決定』に」）。決定が1つだけなら補足なし。
 * @param {string[]} decisions その日の決定（1つ以上）
 * @returns {HTMLElement} 箱の要素
 * @example createFirstDecisionBox(["決定A", "決定B"])
 */
function createFirstDecisionBox(decisions) {
  const box = makeDiaryElement("div", "d-dec", "");
  const paragraph = makeDiaryElement("p", "", "");
  paragraph.appendChild(makeDiaryElement("span", "hook-label", "今日の決定"));
  paragraph.appendChild(makeDiaryElement("span", "", decisions[0]));
  if (decisions.length > 1) {
    paragraph.appendChild(makeDiaryElement("span", "decision-rest", "ほか" + (decisions.length - 1) + "件は下の「今日の決定」に"));
  }
  box.appendChild(paragraph);
  return box;
}

/**
 * 冒頭のつかみ全体を作る。決定がない日は「今日の決定」の箱を出さない。
 * @param {object} entry 検査を通った日記1件
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} つかみの要素
 * @example createDiaryHook(entry, "../assets/speakers.svg")
 */
function createDiaryHook(entry, faceFile) {
  const hook = makeDiaryElement("div", "d-hook", "");
  hook.appendChild(createPickBox(entry, faceFile));
  if (entry.decisions.length > 0) {
    hook.appendChild(createFirstDecisionBox(entry.decisions));
  }
  const participants = makeDiaryElement("div", "d-who-came", "");
  participants.appendChild(makeDiaryElement("span", "", "今日の参加"));
  participants.appendChild(createFacesRow(entry, faceFile));
  hook.appendChild(participants);
  return hook;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createDiaryHook };
}
