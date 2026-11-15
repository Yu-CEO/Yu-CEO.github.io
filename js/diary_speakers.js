/*
 * diary_speakers.js：日記の話者の決まった表（名前 → 顔の絵・色・役の説明）と、顔のアイコンを作る処理
 * 主な関数：isKnownSpeaker（決まった名前か）、getSpeakerInfo（表を引く）、createSpeakerFace（顔のアイコンを作る）
 * 顔の絵は assets/speakers.svg の中にあり、表の key（例 "aoi"）で呼び出す。表にない名前のときは絵を出さない。
 * 日記のデータの文字を、そのまま絵の名前やファイルの場所に使わないため、必ずこの表を通す。
 * diary_validate.js（使える名前の確認）と日記の表示のファイルから使われる。tests/diary_speakers.test.js でテストする。
 */

// 話者の決まった表。key＝speakers.svg の中の絵の名前、className＝色を決めるクラス（css/diary.css）、role＝名前の横の小さな説明
const DIARY_SPEAKERS = {
  "秘書": { key: "secretary", className: "sp-secretary", role: "進行・記録" },
  "アオイ": { key: "aoi", className: "sp-aoi", role: "リスナー代表" },
  "CMO": { key: "cmo", className: "sp-cmo", role: "発信の作戦" },
  "プロデューサー": { key: "producer", className: "sp-producer", role: "動画の構成" },
  "ブランドディレクター": { key: "brand", className: "sp-brand", role: "見た目・世界観" },
  "CFO": { key: "cfo", className: "sp-cfo", role: "お金の管理" },
  "CTO": { key: "cto", className: "sp-cto", role: "開発" },
  "CISO": { key: "ciso", className: "sp-ciso", role: "守り・リスク" },
  "Yu": { key: "yu", className: "sp-yu", role: "社長・人間" }
};
// 人間（Yu）の名前。吹き出しを右寄せの紺にする・「今日の一言」の自動の選び方で使う
const HUMAN_SPEAKER = "Yu";
// 語り手（秘書）の名前。「今日の一言」の自動の選び方で使う
const NARRATOR_SPEAKER = "秘書";
// SVG（線や図形で描く画像の形式）の要素を作るときに必要な、決まった名前空間の文字（通信はしない）
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * 決まった表にある話者の名前かを調べる。
 * @param {*} name 話者の名前
 * @returns {boolean} 表にあれば true
 * @example isKnownSpeaker("アオイ") // true
 * @example isKnownSpeaker("部長")   // false
 */
function isKnownSpeaker(name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(DIARY_SPEAKERS, name);
}

/**
 * 話者の名前から、表の中身（絵の名前・色のクラス・役の説明）を返す。表にない名前なら null。
 * @param {*} name 話者の名前
 * @returns {{ key: string, className: string, role: string } | null} 表の中身
 * @example getSpeakerInfo("CFO").role // "お金の管理"
 * @example getSpeakerInfo("部長")     // null
 */
function getSpeakerInfo(name) {
  if (!isKnownSpeaker(name)) {
    return null;
  }
  return DIARY_SPEAKERS[name];
}

/**
 * 話者の顔のアイコン（丸の中に絵）を1つ作る。表にない名前なら null を返し、絵は出さない。
 * 顔は飾りなので、読み上げでは読まない（名前は別に文字で出す）。
 * @param {string} name 話者の名前
 * @param {string} sizeClass 大きさのクラス（"" ＝40px、"avatar-large"＝48px、"avatar-small"＝26px）
 * @param {string} faceFile speakers.svg の場所（ページの場所によって "assets/speakers.svg" か "../assets/speakers.svg"）
 * @returns {HTMLElement|null} アイコンの要素
 * @example createSpeakerFace("アオイ", "avatar-small", "assets/speakers.svg")
 */
function createSpeakerFace(name, sizeClass, faceFile) {
  const info = getSpeakerInfo(name);
  if (info === null) {
    return null;
  }
  const face = document.createElement("span");
  face.className = "avatar " + info.className;
  if (sizeClass !== "") {
    face.className += " " + sizeClass;
  }
  face.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 40 40");
  const use = document.createElementNS(SVG_NAMESPACE, "use");
  // 絵の名前は表の key だけを使う（データの文字は使わない）
  use.setAttribute("href", faceFile + "#" + info.key);
  svg.appendChild(use);
  face.appendChild(svg);
  return face;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DIARY_SPEAKERS, HUMAN_SPEAKER, NARRATOR_SPEAKER, isKnownSpeaker, getSpeakerInfo, createSpeakerFace };
}
