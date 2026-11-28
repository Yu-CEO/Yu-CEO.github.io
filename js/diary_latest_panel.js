/*
 * diary_latest_panel.js：入口の日記の区画（最新1件の札・本数・読み込み中／失敗／0件の表示）
 * 最新1件の入口画像（ない日は「N日目」の面）・日付・見出し・抜粋と、その日のページへのリンクを入れる。前の3件は diary_recent_view.js。
 * 最新の1件が読めないときは、古い日記を「最新」と見せないで、失敗の表示と「もう一度読み込む」を出す。
 * 主な関数：showLatestDiary（読み込みから表示までの流れ）、fillLatestCard（札の中身を入れる）、showDiaryState（状態の切り替え）
 * 使うもの：diary_load.js・diary_day.js・diary_parts.js・diary_hero_view.js・diary_recent_view.js。main.js から使われる。
 * tests/diary_views.test.js・tests/diary_recent.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.loadDiaryIndex = require("./diary_load.js").loadDiaryIndex;
  globalThis.loadCheckedEntry = require("./diary_load.js").loadCheckedEntry;
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.formatDateDot = require("./diary_day.js").formatDateDot;
  globalThis.showRecentDiaries = require("./diary_recent_view.js").showRecentDiaries;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryHero = require("./diary_hero_view.js").createDiaryHero;
}

// index.html に書いた部品の id（状態ごとの箱と、札・本数）
const LATEST_DIARY_IDS = {
  ok: "diary-ok",
  loading: "diary-loading",
  failed: "diary-failed",
  empty: "diary-empty",
  card: "diary-latest-card",
  countArea: "diary-count-area",
  count: "diary-count"
};
// 状態の名前（箱の id の表のキーと同じ）
const DIARY_STATES = ["ok", "loading", "failed", "empty"];
// 前の日記を何件出すか（最新は含めない）
const RECENT_DIARY_COUNT = 3;

/**
 * 日記の区画の状態を切り替える（選んだ箱だけ見せる）。
 * @param {string} state "ok"・"loading"・"failed"・"empty" のどれか
 * @returns {void}
 * @example showDiaryState("loading")
 */
function showDiaryState(state) {
  DIARY_STATES.forEach(function (name) {
    const box = document.getElementById(LATEST_DIARY_IDS[name]);
    if (box !== null) {
      box.hidden = name !== state;
    }
  });
}

// 「日記N本。」を出す。本数が分からないとき（読み込めないとき）は null を渡して隠す
function showDiaryCount(count) {
  const area = document.getElementById(LATEST_DIARY_IDS.countArea);
  const number = document.getElementById(LATEST_DIARY_IDS.count);
  if (area === null || number === null) {
    return;
  }
  area.hidden = count === null;
  if (count !== null) {
    number.textContent = String(count);
  }
}

// 札の一番上：入口画像。ない日・読めないときは「N日目」の面を出す
function appendLatestPicture(card, entry, heroFolder) {
  const fallback = makeDiaryElement("span", "noimg", formatDayShort(entry.date));
  const image = createDiaryHero(entry, heroFolder, "latest");
  if (image !== null) {
    card.appendChild(image);
    fallback.hidden = true;
    // 画像そのものは diary_hero_view.js が隠すので、ここでは代わりの面を出すだけ
    image.addEventListener("error", function () {
      fallback.hidden = false;
    });
  }
  card.appendChild(fallback);
}

/**
 * 最新の日記の札の中身（入口画像・日付・見出し・抜粋・「読む」の見た目）を入れる。
 * @param {HTMLElement} card 札の要素（全体が1つのリンク）
 * @param {object} entry 検査を通った日記1件
 * @param {string} heroFolder diary/heroes/ の場所
 * @param {string} entryHref その日のページの場所
 * @returns {void}
 * @example fillLatestCard(card, entry, "diary/heroes/", "diary/entry.html?date=2026-11-21")
 */
function fillLatestCard(card, entry, heroFolder, entryHref) {
  card.textContent = "";
  card.setAttribute("href", entryHref);
  appendLatestPicture(card, entry, heroFolder);
  const body = makeDiaryElement("span", "body", "");
  body.appendChild(makeDiaryElement("span", "meta", "最新｜" + formatDateDot(entry.date)));
  body.appendChild(makeDiaryElement("h3", "", entry.title));
  body.appendChild(makeDiaryElement("p", "d-summary", entry.summary));
  body.appendChild(makeDiaryElement("span", "read", "読む ›"));
  card.appendChild(body);
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

// 最新の1件を読んで札と前の3件を出す。読めなければ失敗の表示にする
function showEntries(folder, paths, dates) {
  return loadCheckedEntry(folder, dates[0], dates).then(function (entry) {
    const card = document.getElementById(LATEST_DIARY_IDS.card);
    if (entry === null || card === null) {
      showDiaryState("failed");
      return false;
    }
    return loadRecentEntries(folder, dates).then(function (recentEntries) {
      // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
      fillLatestCard(card, entry, paths.heroFolder, paths.entryPage + "?date=" + entry.date);
      showRecentDiaries(recentEntries, paths);
      showDiaryCount(dates.length);
      showDiaryState("ok");
      return true;
    });
  });
}

/**
 * 日記を読み込んで区画に出す。0件なら「最初の日記は…」、読み込めなければ失敗の表示。
 * @param {string} folder diary/entries/ の場所
 * @param {{ entryPage: string, heroFolder: string }} paths 場所の設定
 * @returns {Promise<boolean>} 最新の日記を出せたら true
 * @example showLatestDiary("diary/entries/", { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" })
 */
function showLatestDiary(folder, paths) {
  showDiaryState("loading");
  showDiaryCount(null);
  return loadDiaryIndex(folder).then(function (dates) {
    if (dates === null) {
      showDiaryState("failed");
      return false;
    }
    if (dates.length === 0) {
      showDiaryCount(0);
      showDiaryState("empty");
      return false;
    }
    return showEntries(folder, paths, dates);
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showLatestDiary, fillLatestCard, showDiaryState, RECENT_DIARY_COUNT };
}
