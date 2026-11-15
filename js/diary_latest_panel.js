/*
 * diary_latest_panel.js：入口ページの「最新の日記」パネルと、ヒーローの丸い「会議の日記」ボタンを出す
 * 最新1件の Day N・日付・見出し・抜粋（3行まで）・登場した話者の小さな顔と、「読む」の行き先を入れる。
 * 日記が1件もない・読み込めない（ファイルを直接開いたときなど）・形が正しくないときは、パネルとボタンを両方隠したままにする。
 * 主な関数：showLatestDiary（読み込みから表示までの流れ）、fillLatestCard（カードの中身を入れる）
 * 使うもの：diary_load.js・diary_day.js・diary_parts.js。main.js から使われる。tests/diary_views.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.loadDiaryIndex = require("./diary_load.js").loadDiaryIndex;
  globalThis.loadCheckedEntry = require("./diary_load.js").loadCheckedEntry;
  globalThis.getDayNumber = require("./diary_day.js").getDayNumber;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryMetaRow = require("./diary_parts.js").createDiaryMetaRow;
  globalThis.createFacesRow = require("./diary_parts.js").createFacesRow;
}

// index.html に書いた部品の id
const LATEST_DIARY_IDS = {
  panel: "diary-latest",
  card: "diary-latest-card",
  readButton: "diary-latest-read",
  heroButton: "hero-diary"
};

/**
 * 最新の日記のカードの中身（Day N・日付・見出し・抜粋・小さな顔）を入れる。
 * @param {HTMLElement} card カードの要素
 * @param {object} entry 検査を通った日記1件
 * @param {string} faceFile speakers.svg の場所
 * @returns {void}
 * @example fillLatestCard(card, entry, "assets/speakers.svg")
 */
function fillLatestCard(card, entry, faceFile) {
  card.textContent = "";
  card.appendChild(createDiaryMetaRow(entry.date));
  card.appendChild(makeDiaryElement("h3", "", entry.title));
  card.appendChild(makeDiaryElement("p", "d-summary", entry.summary));
  card.appendChild(createFacesRow(entry, faceFile));
}

/**
 * 最新の日記をパネルに出し、パネルとヒーローの「会議の日記」ボタンを表示する。
 * @param {object} entry 検査を通った日記1件
 * @param {{ faceFile: string, entryPage: string }} paths 場所の設定
 * @returns {boolean} 表示できたら true（index.html に部品がないときは false）
 * @example revealLatestDiary(entry, paths)
 */
function revealLatestDiary(entry, paths) {
  const panel = document.getElementById(LATEST_DIARY_IDS.panel);
  const card = document.getElementById(LATEST_DIARY_IDS.card);
  const readButton = document.getElementById(LATEST_DIARY_IDS.readButton);
  const heroButton = document.getElementById(LATEST_DIARY_IDS.heroButton);
  if (panel === null || card === null || readButton === null || heroButton === null) {
    console.warn("「最新の日記」の部品が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return false;
  }
  fillLatestCard(card, entry, paths.faceFile);
  // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
  readButton.href = paths.entryPage + "?date=" + entry.date;
  readButton.setAttribute("aria-label", "読む：Day " + getDayNumber(entry.date) + " " + entry.title);
  panel.hidden = false;
  heroButton.hidden = false;
  return true;
}

/**
 * 最新の日記を読み込んで、パネルとボタンを出す。出せないときは隠したまま（index.html で最初から隠してある）。
 * 最新の1件が正しくないときは、古い日記で代わりにせず、パネルごと隠す（最新でない日記を「最新」と見せないため）。
 * @param {string} folder diary/entries/ の場所
 * @param {{ faceFile: string, entryPage: string }} paths 場所の設定
 * @returns {Promise<boolean>} 出せたら true
 * @example showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html" })
 */
function showLatestDiary(folder, paths) {
  return loadDiaryIndex(folder)
    .then(function (dates) {
      if (dates === null || dates.length === 0) {
        return null;
      }
      return loadCheckedEntry(folder, dates[0], dates);
    })
    .then(function (entry) {
      if (entry === null) {
        return false;
      }
      return revealLatestDiary(entry, paths);
    });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showLatestDiary, fillLatestCard };
}
