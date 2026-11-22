/*
 * diary_story3_view.js：3版目（"format": 3・太字とハイライト・図3枚・今日の学び）の日記1件のページの表示
 * 並び：紺の帯（一覧へ戻る・N日目・日付・見出し・まとめ・読む目安・今日の一言・Yuの決定・今日の参加）→ 入口画像（hero がある日だけ）→ 道しるべ（問題›意見›決定›結果›学び。画面の上に付いてくる）
 *       → 01 何が問題だったか → 1枚目の図 → 02 役員の意見 → 3枚目の図（比べる） → 03 Yuの決定 → 04 結果 → 2枚目の図 → 今日の学び → オープンチャットへの出口
 * 主な関数：showStory3Entry（3版目の1件を表示）
 * 使うもの：diary_entry_view.js の部品（紺の帯・節・吹き出し・出口）・diary_figure_view.js・diary_hero_view.js（一番上の入口画像）・diary_takeaway_view.js・diary_markup_view.js・diary_flow_sticky.js。
 * diary_story_view.js の showEntryByFormat から呼ばれる。日記の文字は textContent / createTextNode だけで入れる（HTMLとしては読ませない）。
 * tests/diary_story3_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  const entryParts = require("./diary_entry_view.js");
  globalThis.createEntryHead = entryParts.createEntryHead;
  globalThis.createDiarySection = entryParts.createDiarySection;
  globalThis.createLinesSection = entryParts.createLinesSection;
  globalThis.createExitBox = entryParts.createExitBox;
  globalThis.DIARY_TITLE_SUFFIX = entryParts.DIARY_TITLE_SUFFIX;
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
  globalThis.HUMAN_SPEAKER = require("./diary_speakers.js").HUMAN_SPEAKER;
  globalThis.createDiaryFigure = require("./diary_figure_view.js").createDiaryFigure;
  globalThis.createDiaryHero = require("./diary_hero_view.js").createDiaryHero;
  globalThis.appendMarkedText = require("./diary_markup_view.js").appendMarkedText;
  globalThis.createTakeawayBox = require("./diary_takeaway_view.js").createTakeawayBox;
  globalThis.startFlowSticky = require("./diary_flow_sticky.js").startFlowSticky;
}

// 3版目の日だけ、強調の見た目（太字・ハイライト）を効かせるための印（css/diary_entry.css の .f3）
const STORY3_PAGE_CLASS = "f3";
// 話の流れの道しるべの札（押せない飾り）。決定の札だけ紺にする。「学び」は takeaway がある日だけ足す
const STORY3_FLOW_STEPS = ["問題", "意見", "決定", "結果"];
const STORY3_FLOW_DECISION_STEP = "決定";
const STORY3_FLOW_TAKEAWAY_STEP = "学び";

/**
 * 話の流れの道しるべ（問題 › 意見 › 決定 › 結果 ›（あれば）学び）を作る。押せない飾りで、読み上げでは流れの説明だけを読む。
 * @param {boolean} hasTakeaway 今日の学びがある日か
 * @returns {HTMLElement} 道しるべの要素
 * @example createStory3Flow(true)
 */
function createStory3Flow(hasTakeaway) {
  let steps = STORY3_FLOW_STEPS.slice();
  if (hasTakeaway) {
    steps = steps.concat([STORY3_FLOW_TAKEAWAY_STEP]);
  }
  const flow = makeDiaryElement("ol", "d-flow", "");
  flow.setAttribute("aria-label", "この日記の流れ：" + steps.join("、"));
  steps.forEach(function (stepName) {
    const item = makeDiaryElement("li", "", "");
    item.setAttribute("aria-hidden", "true");
    let stepClass = "flow-step";
    if (stepName === STORY3_FLOW_DECISION_STEP) {
      stepClass += " is-decision";
    }
    item.appendChild(makeDiaryElement("span", stepClass, stepName));
    flow.appendChild(item);
  });
  return flow;
}

/**
 * 図の部品を作って、あれば足す（図の説明がない・日付の形が違うときは何もしない）。
 * @param {HTMLElement} parent 足す先
 * @param {object} entry 検査を通った3版目の日記
 * @param {string} figureFolder diary/figures/ の場所
 * @param {number} figureNumber 何枚目か（1・2・3）
 * @returns {void}
 * @example appendFigure(section, entry, "figures/", 1)
 */
function appendFigure(parent, entry, figureFolder, figureNumber) {
  const figure = createDiaryFigure(entry, figureFolder, figureNumber);
  if (figure !== null) {
    parent.appendChild(figure);
  }
}

/**
 * 「01 何が問題だったか」を作る（problem を強調つきの段落として並べ、1枚目の図があればすぐ下に置く）。
 * @param {object} entry 検査を通った3版目の日記
 * @param {string} figureFolder diary/figures/ の場所
 * @returns {HTMLElement} 節の要素
 * @example createStory3Problem(entry, "figures/")
 */
function createStory3Problem(entry, figureFolder) {
  const section = createDiarySection("01", "何が問題だったか");
  const story = makeDiaryElement("div", "d-story", "");
  entry.problem.forEach(function (text) {
    const paragraph = makeDiaryElement("p", "", "");
    appendMarkedText(paragraph, text);
    story.appendChild(paragraph);
  });
  section.appendChild(story);
  appendFigure(section, entry, figureFolder, 1);
  return section;
}

/**
 * 「03 Yuの決定」を作る（夜の紺の箱に、Yu の顔＋「DECISION」＋強調つきの決定の文）。
 * @param {string} decision Yu の決定
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} 節の要素
 * @example createStory3Decision("短く書く", "../assets/speakers.svg")
 */
function createStory3Decision(decision, faceFile) {
  const section = createDiarySection("03", "Yuの決定");
  const box = makeDiaryElement("div", "d-decision", "");
  box.appendChild(createSpeakerFace(HUMAN_SPEAKER, "", faceFile));
  const words = makeDiaryElement("div", "", "");
  words.appendChild(makeDiaryElement("span", "decision-label", "DECISION"));
  const sentence = makeDiaryElement("p", "", "");
  appendMarkedText(sentence, decision);
  words.appendChild(sentence);
  box.appendChild(words);
  section.appendChild(box);
  return section;
}

/**
 * 「04 結果」を作る（強調つきの短い文の並び）。3版目は見出しを「結果」にする（学びは最後の枠に出すため）。
 * @param {string[]} results 結果
 * @returns {HTMLElement} 節の要素
 * @example createStory3Results(["結果1"])
 */
function createStory3Results(results) {
  const section = createDiarySection("04", "結果");
  const list = makeDiaryElement("ul", "d-lessons d-results", "");
  results.forEach(function (text) {
    const item = makeDiaryElement("li", "", "");
    appendMarkedText(item, text);
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

/**
 * 付いてくる道しるべを動かす。画面（window）があるブラウザのときだけ動かす（テストの偽の画面では何もしない）。
 * @param {HTMLElement} flow 道しるべ
 * @param {HTMLElement[]} targets 札ごとの節の要素
 * @param {HTMLElement} body 本文全体
 * @returns {void}
 * @example startStory3FlowIfPossible(flow, [section1, section2], body)
 */
function startStory3FlowIfPossible(flow, targets, body) {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return;
  }
  startFlowSticky(flow, targets, body);
}

/**
 * 3版目の日記1件を、決まった並びで表示し、タブの題名を「N日目 見出し｜経営会議の日記」にする。
 * 図は3枚とも、読み込めなければその図と caption だけが隠れる（ほかの図と本文は出る）。
 * @param {HTMLElement} area 表示する場所
 * @param {object} entry 検査を通った3版目の日記1件
 * @param {{ faceFile: string, listPage: string, figureFolder: string, heroFolder: string }} paths 場所の設定
 * @returns {void}
 * @example showStory3Entry(area, entry, { faceFile: "../assets/speakers.svg", listPage: "./", figureFolder: "figures/", heroFolder: "heroes/" })
 */
function showStory3Entry(area, entry, paths) {
  area.textContent = "";
  area.className = (area.className + " " + STORY3_PAGE_CLASS).trim();
  area.appendChild(createEntryHead(entry, paths));
  const body = makeDiaryElement("div", "d-body", "");
  // 入口画像は本文の一番上（道しるべより前）。hero のない日は何も足さない
  const heroImage = createDiaryHero(entry, paths.heroFolder, "page");
  if (heroImage !== null) {
    body.appendChild(heroImage);
  }
  const flow = createStory3Flow(typeof entry.takeaway === "string");
  body.appendChild(flow);
  // 道しるべの札と結ぶ節（札と同じ順：問題・意見・決定・結果・（あれば）学び）
  const flowTargets = [];
  const problemSection = createStory3Problem(entry, paths.figureFolder);
  const linesSection = createLinesSection(entry.lines, paths.faceFile, "役員の意見", appendMarkedText);
  const decisionSection = createStory3Decision(entry.decision, paths.faceFile);
  const resultSection = createStory3Results(entry.result);
  body.appendChild(problemSection);
  body.appendChild(linesSection);
  // 3枚目の図は、意見のあとの「何と何で迷ったか」を決定の前に整理する位置
  appendFigure(body, entry, paths.figureFolder, 3);
  body.appendChild(decisionSection);
  body.appendChild(resultSection);
  appendFigure(body, entry, paths.figureFolder, 2);
  flowTargets.push(problemSection, linesSection, decisionSection, resultSection);
  const takeawayBox = createTakeawayBox(entry.takeaway);
  if (takeawayBox !== null) {
    body.appendChild(takeawayBox);
    flowTargets.push(takeawayBox);
  }
  area.appendChild(body);
  area.appendChild(createExitBox(paths.listPage));
  startStory3FlowIfPossible(flow, flowTargets, body);
  document.title = formatDayShort(entry.date) + " " + entry.title + DIARY_TITLE_SUFFIX;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showStory3Entry };
}
