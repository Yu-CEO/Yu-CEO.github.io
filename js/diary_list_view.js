/*
 * diary_list_view.js：日記の一覧ページ（/diary/）の表示
 * 主な関数：showDiaryList（一覧・0件・読み込み失敗のどれかを表示する）、createDiaryListItem（カード1枚を作る）
 * カード1枚は Day N・日付・見出し・抜粋（2行まで）・登場した話者の小さな顔・「読む」で、カード全体が1つのリンク。
 * 使うもの：diary_parts.js・diary_hero_view.js（カード一番上の入口画像）。diary_list_main.js から使われる。tests/diary_views.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.createDiaryMetaRow = require("./diary_parts.js").createDiaryMetaRow;
  globalThis.createFacesRow = require("./diary_parts.js").createFacesRow;
  globalThis.createDiaryNotice = require("./diary_parts.js").createDiaryNotice;
  globalThis.createDiaryHero = require("./diary_hero_view.js").createDiaryHero;
}

// 件数がこれを超えたら、月の区切りを出す（見た目だけ。絞り込みはしない）
const DIARY_MONTH_DIVIDER_FROM = 10;
// 日記が1件もないとき・読み込めないときの案内の文
const DIARY_LIST_EMPTY = {
  title: "まだ日記はありません",
  text: "会議のあった日に、ここに日記が増えていきます。"
};
const DIARY_LIST_FAILED = {
  title: "日記を読み込めませんでした",
  text: "通信の状態を確かめて、少し時間をおいてから、もう一度開いてください。"
};

/**
 * 日記1件ぶんのカード（全体が1つのリンク）を作る。
 * @param {object} entry 検査を通った日記1件
 * @param {{ faceFile: string, entryPage: string, heroFolder: string }} paths 顔の絵の場所と、1件のページの場所と、入口画像の場所
 * @returns {HTMLElement} カードの要素（li）
 * @example createDiaryListItem(entry, { faceFile: "../assets/speakers.svg", entryPage: "entry.html", heroFolder: "heroes/" })
 */
function createDiaryListItem(entry, paths) {
  const item = makeDiaryElement("li", "d-item", "");
  const link = makeDiaryElement("a", "", "");
  // 日付は検査で YYYY-MM-DD の形と確かめ済みなので、そのまま場所に使ってよい
  link.href = paths.entryPage + "?date=" + entry.date;
  // 入口画像はカードの一番上。hero のない日は何も足さない
  const heroImage = createDiaryHero(entry, paths.heroFolder, "list");
  if (heroImage !== null) {
    link.appendChild(heroImage);
  }
  link.appendChild(createDiaryMetaRow(entry.date));
  link.appendChild(makeDiaryElement("h2", "", entry.title));
  link.appendChild(makeDiaryElement("p", "d-summary", entry.summary));
  const bottomRow = makeDiaryElement("div", "d-read", "");
  bottomRow.appendChild(createFacesRow(entry, paths.faceFile));
  bottomRow.appendChild(makeDiaryElement("span", "read-label", "読む"));
  link.appendChild(bottomRow);
  item.appendChild(link);
  return item;
}

/**
 * 月の区切りの行を作る（例「2026年11月」）。見た目だけなので、読み上げでは読まない。
 * @param {string} date 日記の日付（"YYYY-MM-DD"）
 * @returns {HTMLElement} 区切りの要素（li）
 * @example createMonthDivider("2026-11-16")
 */
function createMonthDivider(date) {
  const label = Number(date.slice(0, 4)) + "年" + Number(date.slice(5, 7)) + "月";
  const divider = makeDiaryElement("li", "d-month", label);
  divider.setAttribute("aria-hidden", "true");
  return divider;
}

/**
 * 日記のカードを新しい順に並べたリストを作る。件数が多いときは月の区切りを入れる。
 * @param {object[]} entries 検査を通った日記（新しい順）
 * @param {{ faceFile: string, entryPage: string }} paths 場所の設定
 * @returns {HTMLElement} リストの要素（ul）
 * @example createDiaryCardList(entries, paths)
 */
function createDiaryCardList(entries, paths) {
  const list = makeDiaryElement("ul", "d-list", "");
  const showMonths = entries.length > DIARY_MONTH_DIVIDER_FROM;
  let currentMonth = "";
  entries.forEach(function (entry) {
    const month = entry.date.slice(0, 7);
    if (showMonths && month !== currentMonth) {
      currentMonth = month;
      list.appendChild(createMonthDivider(entry.date));
    }
    list.appendChild(createDiaryListItem(entry, paths));
  });
  return list;
}

/**
 * 一覧ページの中身を表示する。entries が null なら「読み込めませんでした」、空なら「まだ日記はありません」。
 * @param {HTMLElement} listArea 一覧を入れる場所
 * @param {HTMLElement} countLine 「全N件・新しい順」を出す行
 * @param {object[]|null} entries 検査を通った日記（新しい順）。読み込めなかったときは null
 * @param {{ faceFile: string, entryPage: string, homePage: string }} paths 場所の設定
 * @returns {void}
 * @example showDiaryList(listArea, countLine, entries, paths)
 */
function showDiaryList(listArea, countLine, entries, paths) {
  listArea.textContent = "";
  if (entries === null || entries.length === 0) {
    let message = DIARY_LIST_EMPTY;
    if (entries === null) {
      message = DIARY_LIST_FAILED;
    }
    countLine.hidden = true;
    listArea.appendChild(createDiaryNotice({
      title: message.title,
      text: message.text,
      linkText: "入口ページへ戻る",
      linkHref: paths.homePage
    }));
    return;
  }
  countLine.textContent = "全" + entries.length + "件・新しい順";
  countLine.hidden = false;
  listArea.appendChild(createDiaryCardList(entries, paths));
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showDiaryList, createDiaryListItem };
}
