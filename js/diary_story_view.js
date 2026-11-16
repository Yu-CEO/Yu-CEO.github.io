/*
 * diary_story_view.js：新しい形（"format": 2・1トピックの話）の日記1件のページの表示
 * 並び：紺の帯（一覧へ戻る・Day N・日付・見出し・まとめ・今日の一言・Yuの決定・今日の参加）→ 話の流れの道しるべ（問題›意見›決定›結果）
 *       → 01 何が問題だったか → 02 役員の意見（顔つきの吹き出し）→ 03 Yuの決定 →（図がある日は図と説明）→ 04 結果と学び → オープンチャットへの出口
 * 主な関数：showStoryEntry（新しい形の1件を表示）、showEntryByFormat（形を見て、旧形式・新しい形の表示を呼び分ける）
 * 使うもの：diary_entry_view.js の部品・diary_figure_view.js・diary_format.js・diary_speakers.js。diary_entry_main.js から使われる。
 * 日記の文字はすべて textContent で入れる（HTMLとしては読ませない）。tests/diary_story_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  const entryParts = require("./diary_entry_view.js");
  globalThis.showDiaryEntry = entryParts.showDiaryEntry;
  globalThis.createEntryHead = entryParts.createEntryHead;
  globalThis.createDiarySection = entryParts.createDiarySection;
  globalThis.createTextList = entryParts.createTextList;
  globalThis.createLinesSection = entryParts.createLinesSection;
  globalThis.createExitBox = entryParts.createExitBox;
  globalThis.DIARY_TITLE_SUFFIX = entryParts.DIARY_TITLE_SUFFIX;
  globalThis.getDayNumber = require("./diary_day.js").getDayNumber;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
  globalThis.HUMAN_SPEAKER = require("./diary_speakers.js").HUMAN_SPEAKER;
  globalThis.createDiaryFigure = require("./diary_figure_view.js").createDiaryFigure;
  globalThis.isStoryEntry = require("./diary_format.js").isStoryEntry;
}

// 話の流れの道しるべの札（押せない飾り）。isDecision の札だけ紺にする（話の山場＝Yu の決定）
const STORY_FLOW_STEPS = [
  { text: "問題", isDecision: false },
  { text: "意見", isDecision: false },
  { text: "決定", isDecision: true },
  { text: "結果", isDecision: false }
];
// 道しるべの読み上げ用の説明（札そのものは読み上げない）
const STORY_FLOW_LABEL = "この日記の流れ：問題、意見、決定、結果";

/**
 * 話の流れの道しるべ（問題 › 意見 › 決定 › 結果）を作る。押せない飾りで、読み上げでは流れの説明だけを読む。
 * @returns {HTMLElement} 道しるべの要素
 * @example createStoryFlow()
 */
function createStoryFlow() {
  const flow = makeDiaryElement("ol", "d-flow", "");
  flow.setAttribute("aria-label", STORY_FLOW_LABEL);
  STORY_FLOW_STEPS.forEach(function (step) {
    const item = makeDiaryElement("li", "", "");
    item.setAttribute("aria-hidden", "true");
    let stepClass = "flow-step";
    if (step.isDecision) {
      stepClass += " is-decision";
    }
    item.appendChild(makeDiaryElement("span", stepClass, step.text));
    flow.appendChild(item);
  });
  return flow;
}

/**
 * 「01 何が問題だったか」を作る（problem を段落として並べる）。
 * @param {string[]} paragraphs 何が問題だったか（段落）
 * @returns {HTMLElement} 節の要素
 * @example createProblemSection(["段落1", "段落2"])
 */
function createProblemSection(paragraphs) {
  const section = createDiarySection("01", "何が問題だったか");
  const story = makeDiaryElement("div", "d-story", "");
  paragraphs.forEach(function (text) {
    story.appendChild(makeDiaryElement("p", "", text));
  });
  section.appendChild(story);
  return section;
}

/**
 * 「03 Yuの決定」を作る（夜の紺の箱に、Yu の顔＋「DECISION」＋決定の文）。
 * @param {string} decision Yu の決定
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} 節の要素
 * @example createYuDecisionSection("両方を試してから決める", "../assets/speakers.svg")
 */
function createYuDecisionSection(decision, faceFile) {
  const section = createDiarySection("03", "Yuの決定");
  const box = makeDiaryElement("div", "d-decision", "");
  box.appendChild(createSpeakerFace(HUMAN_SPEAKER, "", faceFile));
  const words = makeDiaryElement("div", "", "");
  words.appendChild(makeDiaryElement("span", "decision-label", "DECISION"));
  words.appendChild(makeDiaryElement("p", "", decision));
  box.appendChild(words);
  section.appendChild(box);
  return section;
}

/**
 * 新しい形の日記1件を、決まった並びで表示し、タブの題名を「Day N 見出し｜経営会議の日記」にする。
 * 図は「03 Yuの決定」と「04 結果と学び」のあいだに置く（決めた結果、何が変わったかを見せる位置。デザイン承認の案A）。
 * @param {HTMLElement} area 表示する場所
 * @param {object} entry 検査を通った新しい形の日記1件
 * @param {{ faceFile: string, listPage: string, figureFolder: string }} paths 場所の設定
 * @returns {void}
 * @example showStoryEntry(area, entry, { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/" })
 */
function showStoryEntry(area, entry, paths) {
  area.textContent = "";
  area.appendChild(createEntryHead(entry, paths));
  const body = makeDiaryElement("div", "d-body", "");
  body.appendChild(createStoryFlow());
  body.appendChild(createProblemSection(entry.problem));
  body.appendChild(createLinesSection(entry.lines, paths.faceFile, "役員の意見"));
  body.appendChild(createYuDecisionSection(entry.decision, paths.faceFile));
  if (entry.figure !== undefined) {
    const figure = createDiaryFigure(entry, paths.figureFolder);
    if (figure !== null) {
      body.appendChild(figure);
    }
  }
  const results = createDiarySection("04", "結果と学び");
  results.appendChild(createTextList("d-lessons d-results", entry.result));
  body.appendChild(results);
  area.appendChild(body);
  area.appendChild(createExitBox(paths.listPage));
  document.title = "Day " + getDayNumber(entry.date) + " " + entry.title + DIARY_TITLE_SUFFIX;
}

/**
 * 日記の形を見て、新しい形なら showStoryEntry、旧形式なら今までの showDiaryEntry で表示する。
 * @param {HTMLElement} area 表示する場所
 * @param {object} entry 検査を通った日記1件
 * @param {{ faceFile: string, listPage: string, figureFolder: string }} paths 場所の設定
 * @returns {void}
 * @example showEntryByFormat(area, entry, paths)
 */
function showEntryByFormat(area, entry, paths) {
  if (isStoryEntry(entry)) {
    showStoryEntry(area, entry, paths);
  } else {
    showDiaryEntry(area, entry, paths);
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showStoryEntry, showEntryByFormat };
}
