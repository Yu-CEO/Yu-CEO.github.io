/*
 * diary_hook_view.js：日記1件のページの「冒頭のつかみ」（紺の帯の中）を作る
 * 中身：①今日の一言（顔・セリフ・名前と役の説明）②今日の決定（1つ目＋ほかN件。決定がない日は出さない）③今日の参加（小さな顔）
 * 〔v3〕新しい形（format 2）の日は、②の代わりに「Yuの決定」（decision の文。必ず1つあるので毎回出す）を出す
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
  globalThis.appendMarkedText = require("./diary_markup_view.js").appendMarkedText;
  globalThis.writePlainText = require("./diary_markup_view.js").writePlainText;
}

// 3版目（"format": 3）の印。この日だけ、今日の一言と Yu の決定に太字・ハイライトを付けて表示する（2版目の ** は記号のまま出す）
const HOOK_FORMAT3 = 3;

/**
 * 日記の文字の入れ方を選ぶ。3版目は強調つき、それ以外は文字をそのまま入れる。
 * @param {object} entry 日記1件
 * @returns {function(HTMLElement, string): void} 文字を入れる関数
 * @example chooseHookWriter({ format: 3 }) // appendMarkedText
 */
function chooseHookWriter(entry) {
  if (entry.format === HOOK_FORMAT3) {
    return appendMarkedText;
  }
  return writePlainText;
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
  const quote = makeDiaryElement("p", "pick-quote", "");
  chooseHookWriter(entry)(quote, line.text);
  words.appendChild(quote);
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
 * 〔v3〕新しい形の「Yuの決定」の箱を作る（決定の文1つ。「ほかN件」はない）。
 * @param {string} decision Yu の決定
 * @param {function(HTMLElement, string): void} writeText 文字を入れる関数
 * @returns {HTMLElement} 箱の要素
 * @example createYuDecisionBox("両方を試してから決める", writePlainText)
 */
function createYuDecisionBox(decision, writeText) {
  const box = makeDiaryElement("div", "d-dec", "");
  const paragraph = makeDiaryElement("p", "", "");
  paragraph.appendChild(makeDiaryElement("span", "hook-label", "Yuの決定"));
  const decisionText = makeDiaryElement("span", "", "");
  writeText(decisionText, decision);
  paragraph.appendChild(decisionText);
  box.appendChild(paragraph);
  return box;
}

/**
 * 冒頭のつかみ全体を作る。決定がない日は「今日の決定」の箱を出さない。
 * 〔v3〕新しい形（decision が文字の日）は「Yuの決定」の箱を出す。
 * @param {object} entry 検査を通った日記1件
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} つかみの要素
 * @example createDiaryHook(entry, "../assets/speakers.svg")
 */
function createDiaryHook(entry, faceFile) {
  const hook = makeDiaryElement("div", "d-hook", "");
  hook.appendChild(createPickBox(entry, faceFile));
  if (typeof entry.decision === "string") {
    hook.appendChild(createYuDecisionBox(entry.decision, chooseHookWriter(entry)));
  } else if (entry.decisions.length > 0) {
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
