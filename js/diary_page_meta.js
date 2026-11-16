/*
 * diary_page_meta.js：日記1件のページの、検索用の情報（<head> の meta）を表示に合わせて直す（requirements_seo.md 2-4）
 * 主な関数：chooseEntryDescription（説明文に使う文字を決める。画面に触れない）、
 *   updateEntryPageMeta（日記を表示できたら説明文をその日の抜粋に、見つからないときは検索に載せない印を付ける）
 * 共有カード（og:*）は書きかえない（LINE・X などは JS を動かさずに読むので、変えても効果がないため）。
 * diary_entry_main.js から、表示のあとに呼ばれる。tests/seo_meta.test.js でテストする。
 */

// 検索に載せない印（中身のない「見つかりませんでした」のページが検索結果に出ないようにする）
const DIARY_NOINDEX_CONTENT = "noindex";

/**
 * 説明文（<meta name="description">）に入れる文字を決める。検査を通った日記の summary（抜粋）を使う。
 * @param {object|null} entry 検査を通った日記1件（見つからないときは null）
 * @returns {string} 入れる文字。使えないときは ""（書きかえない）
 * @example chooseEntryDescription({ summary: "今日の話題のまとめ" }) // "今日の話題のまとめ"
 */
function chooseEntryDescription(entry) {
  if (!entry || typeof entry.summary !== "string") {
    return "";
  }
  return entry.summary;
}

/**
 * 日記1件のページの meta を、表示の結果に合わせて直す。
 * 日記があれば説明文の content をその日の抜粋にする（属性に文字として入れるだけで、HTMLとしては扱わない）。
 * 日記が無ければ <meta name="robots" content="noindex"> を <head> に足す。
 * @param {object|null} entry 表示した日記（見つからないときは null）
 * @param {{ description: (HTMLMetaElement|null), head: HTMLElement, documentObject: Document }} page 説明文の meta・<head>・document
 * @returns {void}
 * @example updateEntryPageMeta(entry, { description: document.querySelector('meta[name="description"]'), head: document.head, documentObject: document })
 */
function updateEntryPageMeta(entry, page) {
  if (entry === null) {
    const robots = page.documentObject.createElement("meta");
    robots.setAttribute("name", "robots");
    robots.setAttribute("content", DIARY_NOINDEX_CONTENT);
    page.head.appendChild(robots);
    return;
  }
  const description = chooseEntryDescription(entry);
  if (description !== "" && page.description) {
    page.description.setAttribute("content", description);
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { chooseEntryDescription, updateEntryPageMeta };
}
