/*
 * diary_speakers.js：日記の話者の決まった表（名前 → 顔の絵・色・役の説明）と、顔のアイコンを作る処理
 * 主な関数：isKnownSpeaker（決まった名前か）、getSpeakerInfo（表を引く）、createSpeakerFace（顔のアイコンを作る）
 * 秘書と役員7人の顔は assets/faces/<key>.webp（立体の絵・192角）、Yu だけは assets/speakers.svg の線画（#yu）を使う。
 * どちらも表の key（例 "aoi"）で決める。表にない名前のときは絵を出さない。
 * 日記のデータの文字を、そのまま絵の名前やファイルの場所に使わないため、必ずこの表を通す。
 * diary_validate.js（使える名前の確認）と日記の表示のファイルから使われる。tests/diary_speakers.test.js でテストする。
 */

// 話者の決まった表。key＝絵の名前（faces/ のファイル名・speakers.svg の中の名前）、solid＝立体の絵（webp）があるか、className＝色を決めるクラス（css/diary.css）、role＝名前の横の小さな説明
const DIARY_SPEAKERS = {
  "秘書": { key: "secretary", solid: true, className: "sp-secretary", role: "進行・記録" },
  "アオイ": { key: "aoi", solid: true, className: "sp-aoi", role: "リスナー代表" },
  "CMO": { key: "cmo", solid: true, className: "sp-cmo", role: "発信の作戦" },
  "プロデューサー": { key: "producer", solid: true, className: "sp-producer", role: "動画の構成" },
  "ブランドディレクター": { key: "brand", solid: true, className: "sp-brand", role: "見た目・世界観" },
  "CFO": { key: "cfo", solid: true, className: "sp-cfo", role: "お金の管理" },
  "CTO": { key: "cto", solid: true, className: "sp-cto", role: "開発" },
  "CISO": { key: "ciso", solid: true, className: "sp-ciso", role: "守り・リスク" },
  "Yu": { key: "yu", solid: false, className: "sp-yu", role: "社長・人間" }
};
// 人間（Yu）の名前。吹き出しを右寄せの紺にする・「今日の一言」の自動の選び方で使う
const HUMAN_SPEAKER = "Yu";
// 語り手（秘書）の名前。「今日の一言」の自動の選び方で使う
const NARRATOR_SPEAKER = "秘書";
// 立体の絵のフォルダ名。顔の絵の場所（faceFile）と同じ assets/ の中の faces/ を見る（日記ページからは ../assets/faces/）
// フォルダ名を site_config.js に置かないのは、日記のページ（diary/）が site_config.js を読み込まないため（faceFile から導く）
const SPEAKER_FACE_FOLDER_NAME = "faces/";
// 立体の絵の拡張子
const SPEAKER_FACE_EXTENSION = ".webp";
// 絵の元の大きさ（px）。表示のずれを出さないため幅と高さを指定する（絵は 192 角）
const SPEAKER_FACE_PIXELS = 192;
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
 * 顔の絵の場所（speakers.svg）から、立体の絵のファイルの場所を作る。名前は表の key だけを使う。
 * @param {string} faceFile speakers.svg の場所
 * @param {string} key 表の key
 * @returns {string} webp の場所
 * @example getSolidFacePath("../assets/speakers.svg", "aoi") // "../assets/faces/aoi.webp"
 */
function getSolidFacePath(faceFile, key) {
  // 正規表現（文字のパターン）で末尾のファイル名を消し、フォルダ部分（例 ../assets/）だけ残す
  const assetsFolder = faceFile.replace(/[^/]*$/, "");
  return assetsFolder + SPEAKER_FACE_FOLDER_NAME + key + SPEAKER_FACE_EXTENSION;
}

/**
 * 立体の絵（img）を作る。読み込めなかったときは絵だけ隠し、丸（話者の色）だけ見せる。
 * @param {string} path webp の場所
 * @returns {HTMLElement} img 要素
 */
function createSolidFaceImage(path) {
  const image = document.createElement("img");
  image.setAttribute("src", path);
  image.setAttribute("alt", "");
  image.setAttribute("width", String(SPEAKER_FACE_PIXELS));
  image.setAttribute("height", String(SPEAKER_FACE_PIXELS));
  image.setAttribute("loading", "lazy");
  image.setAttribute("decoding", "async");
  // 壊れた画像のマークを出さないため、失敗したら隠す
  image.addEventListener("error", function () {
    image.style.display = "none";
  });
  return image;
}

/**
 * 線画（speakers.svg の #key）の絵を作る。Yu に使う。
 * @param {string} faceFile speakers.svg の場所
 * @param {string} key 表の key
 * @returns {Element} svg 要素
 */
function createLineDrawingFace(faceFile, key) {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 40 40");
  const use = document.createElementNS(SVG_NAMESPACE, "use");
  // 絵の名前は表の key だけを使う（データの文字は使わない）
  use.setAttribute("href", faceFile + "#" + key);
  svg.appendChild(use);
  return svg;
}

/**
 * 話者の顔のアイコン（丸の中に絵）を1つ作る。表にない名前なら null を返し、絵は出さない。
 * 顔は飾りなので、読み上げでは読まない（名前は別に文字で出す）。
 * @param {string} name 話者の名前
 * @param {string} sizeClass 大きさのクラス（"" ＝40px、"avatar-large"＝48px、"avatar-small"＝26px）
 * @param {string} faceFile speakers.svg の場所（"assets/speakers.svg" か "../assets/speakers.svg"）。立体の絵はその隣の faces/ から読む
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
  if (info.solid) {
    face.appendChild(createSolidFaceImage(getSolidFacePath(faceFile, info.key)));
  } else {
    face.appendChild(createLineDrawingFace(faceFile, info.key));
  }
  return face;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DIARY_SPEAKERS, HUMAN_SPEAKER, NARRATOR_SPEAKER, isKnownSpeaker, getSpeakerInfo, createSpeakerFace, getSolidFacePath, SPEAKER_FACE_PIXELS };
}
