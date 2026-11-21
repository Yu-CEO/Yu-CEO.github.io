/*
 * diary_recent_view.js：入口の「最新の日記」パネルの下に、「これまでの会議」（最新の前の3件）を小さなカードで並べる（第3回）
 * 1枚のカード：入口画像（16:9・ある日だけ）か紺の札「7日目」・N日目・日付（2026.11.19）・見出し（2行まで）。カード全体が日記1件へのリンク。
 * 画像が読み込めないときは画像だけ消え、札の「N日目」と文字は残る。0件のときは欄ごと隠したままにする。
 * 主な関数：createRecentCard（カード1枚を作る）、showRecentDiaries（欄に並べて出す）
 * 使うもの：diary_day.js・diary_parts.js・diary_hero_view.js。diary_latest_panel.js から呼ばれる。tests/diary_recent.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.formatDateDot = require("./diary_day.js").formatDateDot;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryHero = require("./diary_hero_view.js").createDiaryHero;
}

// index.html に書いた部品の id（欄ごと・カードを入れるリスト）
const RECENT_DIARY_IDS = { section: "diary-recent", list: "diary-recent-list" };

/**
 * 小カードの左の画像の場所（入口画像。hero のない日は紺の札だけ）を作る。
 * 札の文字は画像の下に置き、画像が消えたときに見えるようにする。読み上げでは読まない（カード全体の名前で読むため）。
 * @param {object} entry 検査を通った日記1件
 * @param {string} heroFolder diary/heroes/ の場所
 * @returns {HTMLElement} 札の要素
 */
function createRecentThumb(entry, heroFolder) {
  const thumb = makeDiaryElement("span", "rc-thumb", formatDayShort(entry.date));
  thumb.setAttribute("aria-hidden", "true");
  const image = createDiaryHero(entry, heroFolder, "list");
  if (image !== null) {
    thumb.appendChild(image);
  }
  return thumb;
}

/**
 * 小カード1枚（リストの1項目）を作る。
 * @param {object} entry 検査を通った日記1件
 * @param {{ entryPage: string, heroFolder: string }} paths 場所の設定
 * @returns {HTMLElement} li 要素
 * @example createRecentCard(entry, { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" })
 */
function createRecentCard(entry, paths) {
  const item = makeDiaryElement("li", "", "");
  const link = makeDiaryElement("a", "", "");
  // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
  link.href = paths.entryPage + "?date=" + entry.date;
  link.setAttribute("aria-label", formatDayShort(entry.date) + " " + entry.title + " を読む");
  link.appendChild(createRecentThumb(entry, paths.heroFolder));
  const text = makeDiaryElement("span", "", "");
  const meta = makeDiaryElement("span", "d-meta", "");
  meta.appendChild(makeDiaryElement("span", "d-day", formatDayShort(entry.date)));
  meta.appendChild(makeDiaryElement("span", "", formatDateDot(entry.date)));
  text.appendChild(meta);
  text.appendChild(makeDiaryElement("span", "rc-title", entry.title));
  link.appendChild(text);
  item.appendChild(link);
  return item;
}

/**
 * 「これまでの会議」の欄に小カードを並べて出す。0件のときは欄を隠したままにする（日記が1件だけの日など）。
 * @param {object[]} entries 検査を通った日記（新しい順。最新の日記は含めない）
 * @param {{ entryPage: string, heroFolder: string }} paths 場所の設定
 * @returns {boolean} 出せたら true（0件・部品がないときは false）
 * @example showRecentDiaries(entries, paths)
 */
function showRecentDiaries(entries, paths) {
  const section = document.getElementById(RECENT_DIARY_IDS.section);
  const list = document.getElementById(RECENT_DIARY_IDS.list);
  if (section === null || list === null || entries.length === 0) {
    return false;
  }
  list.textContent = "";
  entries.forEach(function (entry) {
    list.appendChild(createRecentCard(entry, paths));
  });
  section.hidden = false;
  return true;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createRecentCard, showRecentDiaries };
}
