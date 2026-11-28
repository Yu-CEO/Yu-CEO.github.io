/*
 * officer_view.js：AI役員の顔を並べ、押すと会議の日記に載った発言と、その日の日記へのリンクを出す
 * 主な関数：buildOfficerTexts（出す文字をまとめる。画面に触れない）、showOfficers（顔を並べて最初の1人を出す）
 * 部品は createElement で組み立て、文字は textContent で入れる。
 * 使うもの：diary_day.js。データは officer_data.js。main.js から使われる。tests/officer.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.formatDateDot = require("./diary_day.js").formatDateDot;
}

const OFFICER_ENTRY_PAGE = "diary/entry.html";
const OFFICER_FACE_FOLDER = "assets/faces/";
const OFFICER_FACE_SIZE_PX = 192; // 顔の絵の元の大きさ（読み込み前に場所を取るため）

/**
 * 発言1件から、画面に出す文字をまとめる。
 * @param {{ name: string, role: string, text: string, date: string }} quote 発言
 * @returns {{ who: string, text: string, linkText: string, href: string }} 出す文字とリンク先
 * @example buildOfficerTexts({ name: "CFO", role: "お金の管理", text: "あ", date: "2026-11-20" }).linkText
 *          // "7日目（2026.11.20）の会議を読む ›"
 */
function buildOfficerTexts(quote) {
  return {
    who: quote.name + "｜" + quote.role,
    text: "「" + quote.text + "」",
    linkText: formatDayShort(quote.date) + "（" + formatDateDot(quote.date) + "）の会議を読む ›",
    href: OFFICER_ENTRY_PAGE + "?date=" + quote.date
  };
}

// 選んだ役員の発言を出し、その顔のボタンだけ「押されている」にする
function showOfficerQuote(parts, quotes, index) {
  const texts = buildOfficerTexts(quotes[index]);
  parts.who.textContent = texts.who;
  parts.text.textContent = texts.text;
  parts.link.textContent = texts.linkText;
  parts.link.setAttribute("href", texts.href);
  parts.buttons.forEach(function (button, position) {
    button.setAttribute("aria-pressed", String(position === index));
  });
}

// 顔のボタン1つ（顔の絵と短い名前）を作る
function createOfficerButton(quote) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", quote.name + "（AI）の発言を読む");
  const face = document.createElement("img");
  face.src = OFFICER_FACE_FOLDER + quote.face + ".webp";
  face.alt = "";
  face.width = OFFICER_FACE_SIZE_PX;
  face.height = OFFICER_FACE_SIZE_PX;
  face.loading = "lazy";
  const label = document.createElement("span");
  label.textContent = quote.label;
  button.appendChild(face);
  button.appendChild(label);
  return button;
}

/**
 * 顔を並べ、最初の1人の発言を出す。部品が index.html にないときは何もしない。
 * @param {object[]} quotes 発言の一覧（OFFICER_QUOTES）
 * @param {number} firstIndex 最初に出す番号
 * @returns {boolean} 出せたら true
 * @example showOfficers(OFFICER_QUOTES, 0)
 */
function showOfficers(quotes, firstIndex) {
  const faces = document.getElementById("officer-faces");
  const parts = {
    who: document.getElementById("officer-name"),
    text: document.getElementById("officer-line"),
    link: document.getElementById("officer-link")
  };
  if (!faces || !parts.who || !parts.text || !parts.link) {
    console.warn("AI役員の部品が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return false;
  }
  parts.buttons = quotes.map(createOfficerButton);
  parts.buttons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      showOfficerQuote(parts, quotes, index);
    });
    faces.appendChild(button);
  });
  showOfficerQuote(parts, quotes, firstIndex);
  return true;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildOfficerTexts, showOfficers };
}
