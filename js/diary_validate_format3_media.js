/*
 * diary_validate_format3_media.js：3版目の日記の図の説明（figure・figure2）と入口画像の説明（hero）の検査。画面には触れない
 * 主な関数：checkFigureDescription（{ alt, caption } の形か）、checkHeroDescription（{ alt } の形か）。どちらも書かなくてよいが、書くなら強調の記号は不可。
 * 使うもの：diary_validate_format3.js の checkPlainText と diary_validate.js の checkUnknownFields（ブラウザでは同じ名前が共有される。
 *   読み込み順は本体より前でよい：関数は呼ばれるときに探す）。diary_validate_format3.js から使われる。tests/diary_validate_format3.test.js・tests/diary_hero.test.js でテストする。
 */

// 図の説明・入口画像に書いてよい項目の名前
const FORMAT3_FIGURE_FIELDS = ["alt", "caption"];
const FORMAT3_HERO_FIELDS = ["alt"];
// 文字の長さの上限。入口画像の alt は図の alt と同じ
const FORMAT3_MAX_FIGURE_ALT = 200;
const FORMAT3_MAX_FIGURE_CAPTION = 60;

/**
 * 図の説明（figure・figure2）を調べる。書かなくてよいが、書くなら { alt, caption } の形。強調の記号は書けない。
 * @param {*} figure 調べる値
 * @param {string} fieldName 項目の名前（"figure" か "figure2"）
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFigureDescription({ alt: "説明", caption: "下の説明" }, "figure", problems)
 */
function checkFigureDescription(figure, fieldName, problems) {
  if (figure === undefined) {
    return;
  }
  if (figure === null || typeof figure !== "object" || Array.isArray(figure)) {
    problems.push("「" + fieldName + "」が { } の形になっていません");
    return;
  }
  checkUnknownFields(figure, FORMAT3_FIGURE_FIELDS, "「" + fieldName + "」に、", problems);
  checkPlainText(figure.alt, "「" + fieldName + "」の「alt」", FORMAT3_MAX_FIGURE_ALT, problems);
  checkPlainText(figure.caption, "「" + fieldName + "」の「caption」", FORMAT3_MAX_FIGURE_CAPTION, problems);
}

/**
 * 入口画像の説明（hero）を調べる。書かなくてよいが、書くなら { alt } だけの形。強調の記号は書けない。
 * @param {*} hero 調べる値
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkHeroDescription({ alt: "説明" }, problems)
 */
function checkHeroDescription(hero, problems) {
  if (hero === undefined) {
    return;
  }
  if (hero === null || typeof hero !== "object" || Array.isArray(hero)) {
    problems.push("「hero」が { } の形になっていません");
    return;
  }
  checkUnknownFields(hero, FORMAT3_HERO_FIELDS, "「hero」に、", problems);
  checkPlainText(hero.alt, "「hero」の「alt」", FORMAT3_MAX_FIGURE_ALT, problems);
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkFigureDescription, checkHeroDescription };
}
