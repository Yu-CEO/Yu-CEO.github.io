/*
 * diary_latest_panel.js：入口ページの「最新の日記」パネルと、ヒーローの主役ボタン「今日の会議を読む」を出す
 * 最新1件の入口画像・N日目・日付・見出し・今日の学び（ある日だけ）・抜粋・登場した話者の小さな顔と、「読む」の行き先を入れる。
 * 最新の前の3件は小さなカード（diary_recent_view.js）で下に並べる。
 * 日記が1件もない・読み込めない（ファイルを直接開いたときなど）・形が正しくないときは、パネルと主役ボタンを隠したままにし、
 * 「無料ツールを見る」の大きなボタンをそのまま主役にする（index.html で最初からそうしてある）。
 * 主な関数：showLatestDiary（読み込みから表示までの流れ）、fillLatestCard（カードの中身を入れる）、getHeroMainLabel（主役ボタンの文字）
 * 使うもの：diary_load.js・diary_day.js・diary_parts.js・diary_hero_view.js・diary_markup.js・diary_recent_view.js。main.js から使われる。tests/diary_views.test.js・tests/diary_recent.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.loadDiaryIndex = require("./diary_load.js").loadDiaryIndex;
  globalThis.loadCheckedEntry = require("./diary_load.js").loadCheckedEntry;
  globalThis.formatDayLong = require("./diary_day.js").formatDayLong;
  globalThis.stripMarkup = require("./diary_markup.js").stripMarkup;
  globalThis.showRecentDiaries = require("./diary_recent_view.js").showRecentDiaries;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryMetaRow = require("./diary_parts.js").createDiaryMetaRow;
  globalThis.createFacesRow = require("./diary_parts.js").createFacesRow;
  globalThis.createDiaryHero = require("./diary_hero_view.js").createDiaryHero;
}

// index.html に書いた部品の id
const LATEST_DIARY_IDS = {
  panel: "diary-latest",
  card: "diary-latest-card",
  readButton: "diary-latest-read",
  heroMain: "hero-main",
  toolsBig: "hero-tools",
  toolsPill: "hero-tools-pill"
};
// 主役ボタンの文字。最新の日記が今日の日付なら前者、昨日以前なら後者（古い日記を「今日」と言わないため）
const HERO_MAIN_LABEL_TODAY = "今日の会議を読む";
const HERO_MAIN_LABEL_LATEST = "最新の会議を読む";
// 最新の前の日記を、小さなカードで何件出すか（最新と同じ日記を2回出さないため、最新は含めない）
const RECENT_DIARY_COUNT = 3;
// 今日の学びがある日のカードに付ける印（抜粋を2行に減らす。css/diary_recent.css）
const CARD_HAS_TAKEAWAY_CLASS = "has-take";

/**
 * 主役ボタンの文字を決める（画面に触れない）。
 * @param {string} latestDate 最新の日記の日付
 * @param {string} today 端末の今日の日付（"YYYY-MM-DD"）
 * @returns {string} 最新が今日なら「今日の会議を読む」、そうでなければ「最新の会議を読む」
 * @example getHeroMainLabel("2026-11-21", "2026-11-21") // "今日の会議を読む"
 */
function getHeroMainLabel(latestDate, today) {
  if (latestDate === today) {
    return HERO_MAIN_LABEL_TODAY;
  }
  return HERO_MAIN_LABEL_LATEST;
}

/**
 * 「今日の学び」の小さな枠を作る。
 * @param {string} takeaway 今日の学び（太字・ハイライトの記号つきの文字）
 * @returns {HTMLElement} 枠の要素
 * @example createTakeaway("先に答えを置く。")
 */
function createTakeaway(takeaway) {
  const box = makeDiaryElement("div", "take-mini", "");
  box.appendChild(makeDiaryElement("small", "", "今日の学び"));
  box.appendChild(makeDiaryElement("p", "", stripMarkup(takeaway)));
  return box;
}

/**
 * 最新の日記のカードの中身（入口画像・N日目・日付・見出し・今日の学び・抜粋・小さな顔）を入れる。
 * @param {HTMLElement} card カードの要素
 * @param {object} entry 検査を通った日記1件
 * @param {string} faceFile speakers.svg の場所
 * @param {string} heroFolder diary/heroes/ の場所（hero のない日は使わない）
 * @returns {void}
 * @example fillLatestCard(card, entry, "assets/speakers.svg", "diary/heroes/")
 */
function fillLatestCard(card, entry, faceFile, heroFolder) {
  card.textContent = "";
  card.className = "diary-card";
  // 入口画像はカードの一番上。hero のない日は何も足さない
  const heroImage = createDiaryHero(entry, heroFolder, "latest");
  if (heroImage !== null) {
    card.appendChild(heroImage);
  }
  card.appendChild(createDiaryMetaRow(entry.date));
  card.appendChild(makeDiaryElement("h3", "", entry.title));
  // 今日の学びは書いてある日だけ出す（無い日は枠ごと出さない）
  if (typeof entry.takeaway === "string" && entry.takeaway !== "") {
    card.className += " " + CARD_HAS_TAKEAWAY_CLASS;
    card.appendChild(createTakeaway(entry.takeaway));
  }
  card.appendChild(makeDiaryElement("p", "d-summary", entry.summary));
  card.appendChild(createFacesRow(entry, faceFile));
}

/**
 * 部品を id で集める。1つでも無ければ null（id の書き間違いに気づけるよう、コンソールに日本語で出す）。
 * @returns {Object<string,HTMLElement>|null} 部品の表
 */
function findLatestParts() {
  const parts = {};
  let missing = false;
  Object.keys(LATEST_DIARY_IDS).forEach(function (key) {
    parts[key] = document.getElementById(LATEST_DIARY_IDS[key]);
    if (parts[key] === null) {
      missing = true;
    }
  });
  if (missing) {
    console.warn("「最新の日記」の部品が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return null;
  }
  return parts;
}

/**
 * 最新の日記をパネルに出し、ヒーローの主役ボタンを「今日の会議を読む」にする（「無料ツールを見る」は小さな丸ボタンへ）。
 * @param {object} entry 検査を通った日記1件
 * @param {object[]} recentEntries 最新の前の日記（検査を通った分だけ。0件でもよい）
 * @param {{ faceFile: string, entryPage: string, heroFolder: string, today: string }} paths 場所の設定と今日の日付
 * @returns {boolean} 表示できたら true（index.html に部品がないときは false）
 * @example revealLatestDiary(entry, [], paths)
 */
function revealLatestDiary(entry, recentEntries, paths) {
  const parts = findLatestParts();
  if (parts === null) {
    return false;
  }
  fillLatestCard(parts.card, entry, paths.faceFile, paths.heroFolder);
  // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
  const entryHref = paths.entryPage + "?date=" + entry.date;
  parts.readButton.href = entryHref;
  parts.readButton.setAttribute("aria-label", "読む：" + formatDayLong(entry.date) + " " + entry.title);
  showRecentDiaries(recentEntries, paths);
  const label = getHeroMainLabel(entry.date, paths.today);
  parts.heroMain.textContent = label;
  parts.heroMain.href = entryHref;
  parts.heroMain.setAttribute("aria-label", label + "：" + formatDayLong(entry.date) + " " + entry.title);
  parts.heroMain.hidden = false;
  parts.toolsBig.hidden = true;
  parts.toolsPill.hidden = false;
  parts.panel.hidden = false;
  return true;
}

/**
 * 最新の前の日記（RECENT_DIARY_COUNT 件まで）を読み込む。読めない・形が正しくない日は、その日だけ飛ばす。
 * @param {string} folder diary/entries/ の場所
 * @param {string[]} dates 公開する日付の一覧（新しい順）
 * @returns {Promise<object[]>} 検査を通った日記（新しい順）
 */
function loadRecentEntries(folder, dates) {
  const recentDates = dates.slice(1, 1 + RECENT_DIARY_COUNT);
  return Promise.all(recentDates.map(function (date) {
    return loadCheckedEntry(folder, date, dates);
  })).then(function (entries) {
    return entries.filter(function (entry) {
      return entry !== null;
    });
  });
}

/**
 * 最新の日記を読み込んで、パネルとボタンを出す。出せないときは隠したまま（index.html で最初から隠してある）。
 * 最新の1件が正しくないときは、古い日記で代わりにせず、パネルごと隠す（最新でない日記を「最新」と見せないため）。
 * @param {string} folder diary/entries/ の場所
 * @param {{ faceFile: string, entryPage: string, heroFolder: string, today: string }} paths 場所の設定と今日の日付
 * @returns {Promise<boolean>} 出せたら true
 * @example showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html", heroFolder: "diary/heroes/", today: "2026-11-21" })
 */
function showLatestDiary(folder, paths) {
  let knownDates = [];
  return loadDiaryIndex(folder)
    .then(function (dates) {
      if (dates === null || dates.length === 0) {
        return null;
      }
      knownDates = dates;
      return loadCheckedEntry(folder, dates[0], dates);
    })
    .then(function (entry) {
      if (entry === null) {
        return false;
      }
      return loadRecentEntries(folder, knownDates).then(function (recentEntries) {
        return revealLatestDiary(entry, recentEntries, paths);
      });
    });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showLatestDiary, fillLatestCard, getHeroMainLabel, RECENT_DIARY_COUNT };
}
