/*
 * diary_markup_view.js：3版目の文の「太字・ハイライト」を、画面の部品（strong・mark）にして入れる
 * 日記の文字は必ず「文字」として入れる（createTextNode と textContent）。日記の文字を HTML として読ませる書き方は使わない。
 * 作る要素は strong と mark の2つだけ。属性・class はデータから決めない。
 * 主な関数：appendMarkedText（要素の中に、強調つきの文を入れる）、writePlainText（強調を読まずに、そのまま文字として入れる。2版目・旧形式用）
 * 使うもの：diary_markup.js（強調の読み取り）。diary_story3_view.js・diary_hook_view.js・diary_entry_view.js・diary_takeaway_view.js から使われる。
 * tests/diary_markup_view.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.parseMarkup = require("./diary_markup.js").parseMarkup;
}

// 強調の種類と、作る要素の名前の対応（この2つ以外の要素は作らない）
const MARKUP_VIEW_TAGS = { strong: "strong", mark: "mark" };

/**
 * 要素の中に、文字をそのまま（記号も強調として読まずに）入れる。2版目・旧形式の文はこちらで入れる。
 * @param {HTMLElement} element 入れ先の要素
 * @param {string} text 文
 * @returns {void}
 * @example writePlainText(span, "**大事**") // 画面にも ** がそのまま出る
 */
function writePlainText(element, text) {
  element.textContent = text;
}

/**
 * 要素の中に、強調つきの文を入れる。** の間は strong、== の間は mark の要素にして、中の文字は textContent で入れる。
 * 形の誤りがある文は強調として読まず、そのまま文字として入れる（検査を通ったデータでは起きない。念のための安全側の動き）。
 * @param {HTMLElement} element 入れ先の要素
 * @param {string} text 文（** と == が書ける）
 * @returns {void}
 * @example appendMarkedText(p, "これは**大事**です") // 「これは」「大事（strong）」「です」の3つが入る
 */
function appendMarkedText(element, text) {
  const parsed = parseMarkup(text);
  if (parsed.problems.length > 0) {
    writePlainText(element, text);
    return;
  }
  element.textContent = "";
  parsed.segments.forEach(function (segment) {
    if (segment.type === "plain") {
      element.appendChild(document.createTextNode(segment.text));
      return;
    }
    const marked = document.createElement(MARKUP_VIEW_TAGS[segment.type]);
    marked.textContent = segment.text;
    element.appendChild(marked);
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { appendMarkedText, writePlainText };
}
