/*
 * diary_parts.js：日記の画面で何度も使う小さな部品を作る（入口のパネル・一覧・1件のページで共通）
 * 主な関数：makeDiaryElement（文字入りの要素）、createDiaryMetaRow（「N日目」と日付の行）、createDayBand（1件のページの帯の「AI会社を始めて N 日目」）、
 *           createFacesRow（登場した話者の小さな顔の列）、createDiaryNotice（見つからない・0件などの案内）
 * 日記の文字はすべて textContent（文字としてそのまま入れる書き方）で入れる。HTMLとしては読ませない。
 * 使うもの：diary_day.js・diary_pick.js・diary_speakers.js。tests/diary_views.test.js で（ほかの表示のテストを通して）確かめる。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.getDayNumber = require("./diary_day.js").getDayNumber;
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.formatDateJa = require("./diary_day.js").formatDateJa;
  globalThis.listSpeakers = require("./diary_pick.js").listSpeakers;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
}

// 小さな顔を並べる最大の人数。これより多い分は「+N」と出す（カードの幅に収めるため）
const DIARY_MAX_FACES = 5;

/**
 * 決まったタグ・クラス・文字で、画面の部品（要素）を1つ作る。
 * @param {string} tagName タグの名前（"p" など）
 * @param {string} className つけるクラス名（なければ ""）
 * @param {string} text 中に入れる文字（なければ ""）
 * @returns {HTMLElement} 作った要素
 * @example makeDiaryElement("p", "d-lead", "まとめの文")
 */
function makeDiaryElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className !== "") {
    element.className = className;
  }
  if (text !== "") {
    element.textContent = text;
  }
  return element;
}

/**
 * 「3日目　2026年11月16日（月）」の小さな行を作る。
 * @param {string} date 日記の日付（"YYYY-MM-DD"）
 * @returns {HTMLElement} 行の要素
 * @example createDiaryMetaRow("2026-11-16")
 */
function createDiaryMetaRow(date) {
  const row = makeDiaryElement("p", "d-meta", "");
  row.appendChild(makeDiaryElement("span", "d-day", formatDayShort(date)));
  row.appendChild(makeDiaryElement("span", "", formatDateJa(date)));
  return row;
}

/**
 * 1件のページの紺の帯の「AI会社を始めて 3 日目」を作る。数字だけ大きく見せる（文字は「AI会社を始めて3日目」と読み上げる）。
 * @param {string} date 日記の日付（"YYYY-MM-DD"）
 * @returns {HTMLElement} 帯の日数の要素（class="d-day-big"）
 * @example createDayBand("2026-11-16").textContent // "AI会社を始めて3日目"
 */
function createDayBand(date) {
  const band = makeDiaryElement("p", "d-day-big", "");
  band.appendChild(makeDiaryElement("span", "d-day-pre", "AI会社を始めて"));
  band.appendChild(makeDiaryElement("b", "d-day-num", String(getDayNumber(date))));
  band.appendChild(makeDiaryElement("span", "d-day-post", "日目"));
  return band;
}

/**
 * その日に話した話者の小さな顔を、登場順に少し重ねて並べる（5人まで。それ以上は「+N」）。
 * 読み上げでは「登場：秘書・アオイ…」と名前を読む（顔の絵は読まない）。
 * @param {object} entry 日記1件
 * @param {string} faceFile speakers.svg の場所
 * @returns {HTMLElement} 顔の列の要素
 * @example createFacesRow(entry, "assets/speakers.svg")
 */
function createFacesRow(entry, faceFile) {
  const names = listSpeakers(entry);
  const row = makeDiaryElement("span", "faces", "");
  row.setAttribute("role", "img");
  row.setAttribute("aria-label", "登場：" + names.join("・"));
  names.slice(0, DIARY_MAX_FACES).forEach(function (name) {
    const face = createSpeakerFace(name, "avatar-small", faceFile);
    if (face !== null) {
      row.appendChild(face);
    }
  });
  if (names.length > DIARY_MAX_FACES) {
    row.appendChild(makeDiaryElement("span", "faces-more", "+" + (names.length - DIARY_MAX_FACES)));
  }
  return row;
}

/**
 * 「見つかりませんでした」「まだ日記はありません」などの案内（見出し・説明・ボタン1つ）を作る。
 * @param {{ title: string, text: string, linkText: string, linkHref: string }} notice 案内の中身
 * @returns {HTMLElement} 案内の要素
 * @example createDiaryNotice({ title: "まだ日記はありません", text: "…", linkText: "入口ページへ戻る", linkHref: "../" })
 */
function createDiaryNotice(notice) {
  const box = makeDiaryElement("div", "d-empty", "");
  box.appendChild(makeDiaryElement("h2", "", notice.title));
  box.appendChild(makeDiaryElement("p", "", notice.text));
  const actions = makeDiaryElement("div", "actions", "");
  const link = makeDiaryElement("a", "btn btn-main", notice.linkText);
  link.href = notice.linkHref;
  actions.appendChild(link);
  box.appendChild(actions);
  return box;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { makeDiaryElement, createDiaryMetaRow, createDayBand, createFacesRow, createDiaryNotice };
}
