/*
 * diary_entry_view.js：日記1件のページ（/diary/entry.html?date=YYYY-MM-DD）の表示
 * 並び：紺の帯（一覧へ戻る・Day N・日付・見出し・まとめ・冒頭のつかみ）→ 01 議題 → 02 役員の一言（顔つきの吹き出し）
 *       → 03 決定 → 04 失敗・学び → オープンチャットへの出口
 * 〔v3〕このファイルは旧形式（format なし）の日の表示。新しい形（format 2）の日は diary_story_view.js が、
 *       ここの部品（紺の帯・節・吹き出し・出口など）を使って表示する。
 * 主な関数：showDiaryEntry（1件を表示）、showDiaryNotFound（「この日の日記は見つかりませんでした」を表示）
 * 使うもの：diary_day.js・diary_parts.js・diary_hook_view.js・diary_speakers.js。diary_entry_main.js から使われる。
 * tests/diary_views.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.getDayNumber = require("./diary_day.js").getDayNumber;
  globalThis.formatDateJa = require("./diary_day.js").formatDateJa;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryHook = require("./diary_hook_view.js").createDiaryHook;
  globalThis.getSpeakerInfo = require("./diary_speakers.js").getSpeakerInfo;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
  globalThis.HUMAN_SPEAKER = require("./diary_speakers.js").HUMAN_SPEAKER;
}

// ブラウザのタブの題名の後ろにつける文字
const DIARY_TITLE_SUFFIX = "｜経営会議の日記";
// オープンチャットのボタンの id。URLは diary_entry_main.js が link_button.js で入れる（正しいURLのときだけ出す）
const DIARY_OPENCHAT_BUTTON_ID = "diary-openchat";
// 吹き出しの見分け方の説明（凡例）
const DIARY_LINES_LEGEND = "右の紺色の吹き出しはYu（人間）、左のグレーの吹き出しはAIの役員です。";

/**
 * 「戻る」リンクの行を作る。
 * @param {string} text リンクの文字
 * @param {string} href 行き先
 * @returns {HTMLElement} 行の要素
 * @example createBackRow("一覧へ戻る", "./")
 */
function createBackRow(text, href) {
  const row = makeDiaryElement("div", "back-row", "");
  const link = makeDiaryElement("a", "back-link", text);
  link.href = href;
  row.appendChild(link);
  return row;
}

/**
 * 紺の帯（一覧へ戻る・Day N・日付・見出し・まとめ・記録：秘書・冒頭のつかみ）を作る。
 * @param {object} entry 検査を通った日記1件
 * @param {{ faceFile: string, listPage: string }} paths 場所の設定
 * @returns {HTMLElement} 帯の要素
 * @example createEntryHead(entry, paths)
 */
function createEntryHead(entry, paths) {
  const head = makeDiaryElement("header", "night d-head d-entry-head", "");
  head.appendChild(createBackRow("一覧へ戻る", paths.listPage));
  const inner = makeDiaryElement("div", "d-head-inner", "");
  inner.appendChild(makeDiaryElement("p", "d-eyebrow", "BOARD MEETING DIARY"));
  inner.appendChild(makeDiaryElement("p", "d-day-big", "Day " + getDayNumber(entry.date)));
  inner.appendChild(makeDiaryElement("p", "d-date", formatDateJa(entry.date)));
  inner.appendChild(makeDiaryElement("h1", "d-h1", entry.title));
  inner.appendChild(makeDiaryElement("p", "d-lead", entry.summary));
  const byline = makeDiaryElement("p", "d-byline", "");
  byline.appendChild(makeDiaryElement("span", "", "記録："));
  byline.appendChild(makeDiaryElement("b", "", "秘書"));
  inner.appendChild(byline);
  inner.appendChild(createDiaryHook(entry, paths.faceFile));
  head.appendChild(inner);
  return head;
}

/**
 * 番号つきの節（例「01 今日の議題」）の入れ物を作る。
 * @param {string} number 番号（"01" など）
 * @param {string} title 節の名前
 * @returns {HTMLElement} 節の要素
 * @example createDiarySection("01", "今日の議題")
 */
function createDiarySection(number, title) {
  const section = makeDiaryElement("section", "d-sec", "");
  const heading = makeDiaryElement("h2", "d-sec-title", "");
  heading.appendChild(makeDiaryElement("span", "section-number", number));
  heading.appendChild(makeDiaryElement("span", "", title));
  section.appendChild(heading);
  return section;
}

/**
 * 文の箇条書き（ul）を作る。
 * @param {string} className リストのクラス名
 * @param {string[]} texts 並べる文
 * @returns {HTMLElement} リストの要素
 * @example createTextList("d-lessons", ["学び"])
 */
function createTextList(className, texts) {
  const list = makeDiaryElement("ul", className, "");
  texts.forEach(function (text) {
    list.appendChild(makeDiaryElement("li", "", text));
  });
  return list;
}

/**
 * 「01 今日の議題」を作る（丸の中に番号）。
 * @param {string[]} agenda 議題
 * @returns {HTMLElement} 節の要素
 * @example createAgendaSection(["議題A"])
 */
function createAgendaSection(agenda) {
  const section = createDiarySection("01", "今日の議題");
  const list = makeDiaryElement("ol", "d-agenda", "");
  agenda.forEach(function (text, index) {
    const item = makeDiaryElement("li", "", "");
    item.appendChild(makeDiaryElement("span", "agenda-number", String(index + 1)));
    item.appendChild(makeDiaryElement("span", "", text));
    list.appendChild(item);
  });
  section.appendChild(list);
  return section;
}

/**
 * セリフ1つの行（顔＋名前と役の説明＋吹き出し）を作る。Yu は右寄せの紺、ほかは左寄せのグレー。
 * 名前は吹き出しの上に出す。読み上げ・コピーでは「話者：セリフ」になるよう、見えない「名前：」を吹き出しの頭に入れる。
 * @param {{ speaker: string, text: string }} line セリフ1つ
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} 行の要素
 * @example createLineRow({ speaker: "アオイ", text: "読みたい" }, "../assets/speakers.svg")
 */
function createLineRow(line, faceFile) {
  const info = getSpeakerInfo(line.speaker);
  let rowClass = "d-line " + info.className;
  if (line.speaker === HUMAN_SPEAKER) {
    rowClass += " is-yu";
  }
  const row = makeDiaryElement("div", rowClass, "");
  row.appendChild(createSpeakerFace(line.speaker, "", faceFile));
  const say = makeDiaryElement("div", "speech", "");
  const nameRow = makeDiaryElement("p", "speaker-row", "");
  // 名前は下の見えない「名前：」で読み上げるので、こちらは読み上げない（同じ名前を2回読ませないため）
  nameRow.setAttribute("aria-hidden", "true");
  nameRow.appendChild(makeDiaryElement("span", "speaker-name", line.speaker));
  nameRow.appendChild(makeDiaryElement("span", "role", info.role));
  const bubble = makeDiaryElement("p", "bubble", "");
  bubble.appendChild(makeDiaryElement("span", "screen-reader-only", line.speaker + "："));
  bubble.appendChild(makeDiaryElement("span", "", line.text));
  say.appendChild(nameRow);
  say.appendChild(bubble);
  row.appendChild(say);
  return row;
}

/**
 * 「02 役員の一言」を作る（凡例＋顔つきの吹き出し）。
 * @param {object[]} lines セリフの一覧
 * @param {string} faceFile speakers.svg の場所
 * @param {string} [title] 節の名前（〔v3〕新しい形では「役員の意見」。書かなければ「役員の一言」）
 * @returns {HTMLElement} 節の要素
 * @example createLinesSection(entry.lines, "../assets/speakers.svg")
 */
function createLinesSection(lines, faceFile, title) {
  let sectionTitle = "役員の一言";
  if (typeof title === "string") {
    sectionTitle = title;
  }
  const section = createDiarySection("02", sectionTitle);
  section.appendChild(makeDiaryElement("p", "d-legend", DIARY_LINES_LEGEND));
  const list = makeDiaryElement("div", "d-lines", "");
  lines.forEach(function (line) {
    list.appendChild(createLineRow(line, faceFile));
  });
  section.appendChild(list);
  return section;
}

/**
 * 「03 今日の決定」を作る。決定がない日は「今日は決定なし」と出す。
 * @param {string[]} decisions その日の決定
 * @returns {HTMLElement} 節の要素
 * @example createDecisionsSection([])
 */
function createDecisionsSection(decisions) {
  const section = createDiarySection("03", "今日の決定");
  if (decisions.length === 0) {
    section.appendChild(makeDiaryElement("p", "d-none", "今日は決定なし"));
  } else {
    section.appendChild(createTextList("d-decisions", decisions));
  }
  return section;
}

/**
 * 本文の最後のオープンチャットへの出口（「見るだけの参加もOK。」・緑のボタン・一覧へ戻る）を作る。
 * 緑のボタンは最初は隠しておき、正しいURLがあるときだけ diary_entry_main.js が出す。
 * @param {string} listPage 一覧ページの場所
 * @returns {HTMLElement} 出口の要素
 * @example createExitBox("./")
 */
function createExitBox(listPage) {
  const wrap = makeDiaryElement("div", "d-cta", "");
  const box = makeDiaryElement("div", "d-cta-box", "");
  box.appendChild(makeDiaryElement("p", "", "見るだけの参加もOK。"));
  const actions = makeDiaryElement("div", "actions", "");
  const openchat = makeDiaryElement("a", "btn btn-line", "オープンチャットで続きを話そう");
  openchat.id = DIARY_OPENCHAT_BUTTON_ID;
  openchat.target = "_blank";
  openchat.rel = "noopener";
  openchat.hidden = true;
  const back = makeDiaryElement("a", "btn btn-sub", "一覧へ戻る");
  back.href = listPage;
  actions.appendChild(openchat);
  actions.appendChild(back);
  box.appendChild(actions);
  wrap.appendChild(box);
  return wrap;
}

/**
 * 日記1件を、決まった並びで表示し、タブの題名を「Day N 見出し｜経営会議の日記」にする。
 * @param {HTMLElement} area 表示する場所
 * @param {object} entry 検査を通った日記1件
 * @param {{ faceFile: string, listPage: string }} paths 場所の設定
 * @returns {void}
 * @example showDiaryEntry(area, entry, paths)
 */
function showDiaryEntry(area, entry, paths) {
  area.textContent = "";
  area.appendChild(createEntryHead(entry, paths));
  const body = makeDiaryElement("div", "d-body", "");
  body.appendChild(createAgendaSection(entry.agenda));
  body.appendChild(createLinesSection(entry.lines, paths.faceFile));
  body.appendChild(createDecisionsSection(entry.decisions));
  const lessons = createDiarySection("04", "今日の失敗・学び");
  lessons.appendChild(createTextList("d-lessons", entry.lessons));
  body.appendChild(lessons);
  area.appendChild(body);
  area.appendChild(createExitBox(paths.listPage));
  document.title = "Day " + getDayNumber(entry.date) + " " + entry.title + DIARY_TITLE_SUFFIX;
}

/**
 * 日付が正しくない・一覧にない・読み込めない・形が正しくないときの表示（真っ白にせず、一覧へ案内する）。
 * @param {HTMLElement} area 表示する場所
 * @param {{ listPage: string }} paths 場所の設定
 * @returns {void}
 * @example showDiaryNotFound(area, { listPage: "./" })
 */
function showDiaryNotFound(area, paths) {
  area.textContent = "";
  const panel = makeDiaryElement("section", "panel tone-gray d-notfound", "");
  const body = makeDiaryElement("div", "panel-body", "");
  body.appendChild(makeDiaryElement("p", "eyebrow", "DIARY"));
  const heading = makeDiaryElement("h1", "panel-title", "");
  heading.appendChild(makeDiaryElement("span", "", "この日の日記は"));
  heading.appendChild(makeDiaryElement("span", "", "見つかりませんでした"));
  body.appendChild(heading);
  body.appendChild(makeDiaryElement("p", "panel-desc", "日付が変わったか、まだ公開されていない日記かもしれません。"));
  const actions = makeDiaryElement("div", "actions", "");
  const link = makeDiaryElement("a", "btn btn-main", "日記の一覧へ");
  link.href = paths.listPage;
  actions.appendChild(link);
  panel.appendChild(body);
  panel.appendChild(actions);
  area.appendChild(panel);
  document.title = "見つかりませんでした" + DIARY_TITLE_SUFFIX;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  // 〔v3〕部品は、新しい形の表示（diary_story_view.js）でも同じものを使う
  module.exports = {
    showDiaryEntry, showDiaryNotFound, DIARY_OPENCHAT_BUTTON_ID, DIARY_TITLE_SUFFIX,
    createEntryHead, createDiarySection, createTextList, createLinesSection, createExitBox
  };
}
