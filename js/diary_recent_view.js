/*
 * diary_recent_view.js：入口の最新の日記の下に、前の3件（N日目と見出しだけの行）を並べる
 * 1行全体が日記1件へのリンク。0件のときは欄を空にする。
 * 主な関数：createRecentCard（1行を作る）、showRecentDiaries（欄に並べて出す）
 * 使うもの：diary_day.js・diary_parts.js。diary_latest_panel.js から呼ばれる。tests/diary_recent.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
}

// index.html に書いた、行を入れるリストの id
const RECENT_DIARY_LIST_ID = "diary-recent-list";

/**
 * 前の日記の1行（リストの1項目）を作る。
 * @param {object} entry 検査を通った日記1件
 * @param {{ entryPage: string }} paths 場所の設定
 * @returns {HTMLElement} li 要素
 * @example createRecentCard(entry, { entryPage: "diary/entry.html" })
 */
function createRecentCard(entry, paths) {
  const item = makeDiaryElement("li", "", "");
  const link = makeDiaryElement("a", "", "");
  // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
  link.href = paths.entryPage + "?date=" + entry.date;
  link.appendChild(makeDiaryElement("small", "", formatDayShort(entry.date)));
  link.appendChild(makeDiaryElement("span", "", entry.title));
  item.appendChild(link);
  return item;
}

/**
 * 前の日記を並べる。読み直したときに二重にならないよう、先に空にする。
 * @param {object[]} entries 検査を通った日記（新しい順。最新の日記は含めない）
 * @param {{ entryPage: string }} paths 場所の設定
 * @returns {boolean} 1件以上出せたら true
 * @example showRecentDiaries(entries, paths)
 */
function showRecentDiaries(entries, paths) {
  const list = document.getElementById(RECENT_DIARY_LIST_ID);
  if (list === null) {
    return false;
  }
  list.textContent = "";
  entries.forEach(function (entry) {
    list.appendChild(createRecentCard(entry, paths));
  });
  return entries.length > 0;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createRecentCard, showRecentDiaries };
}
