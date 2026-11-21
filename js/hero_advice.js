/*
 * hero_advice.js：ヒーローの「AI役員が Yu に提案・指摘する場面」と「AI会社を始めて N 日目」を出す（第3回）
 * 場面の中身：ランダムに選んだ役員の大きな顔・名札・名言の吹き出し・「→ Yu へ提案／指摘」のラベル・出典リンク・AI役員8人の小さな顔の列。
 * 主な関数：formatQuoteText（記号を外し80字で省く）、buildQuoteTexts（出す文字をまとめる・画面に触れない）、
 *           showHeroAdvice（場面に出す）、showHeroDays（「今日で、AI会社を始めて N 日目」を出す）、readBoardQuotes（名言の一覧を安全に取り出す）
 * 前提：diary_day.js・diary_markup.js・diary_speakers.js・diary_parts.js・board_quote_pick.js が先に読み込まれている。
 * 名言が選べない（0件）ときは、顔の列と説明だけ出す（空の吹き出しを残さない）。見た目は css/hero_advice.css。main.js から呼ばれる。
 * 役員の顔の絵の場所は呼ぶ側（main.js）が渡す。あとで立体の絵に差し替えるときは site_config.js の SPEAKER_FACE_FILE の1か所を直す。
 * 吹き出しに出すのは一覧に書いた文字だけ（その場で文を作らない）。tests/hero_advice.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.formatDayShort = require("./diary_day.js").formatDayShort;
  globalThis.formatDateDot = require("./diary_day.js").formatDateDot;
  globalThis.getTodayDayNumber = require("./diary_day.js").getTodayDayNumber;
  globalThis.getSpeakerInfo = require("./diary_speakers.js").getSpeakerInfo;
  globalThis.createSpeakerFace = require("./diary_speakers.js").createSpeakerFace;
  globalThis.stripMarkup = require("./diary_markup.js").stripMarkup;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
  globalThis.pickBoardQuote = require("./board_quote_pick.js").pickBoardQuote;
}

// 吹き出しに出す文字数の上限（これを超えたら末尾を「…」で省く）。board_quote_pick.js と同じ値
const QUOTE_SHOW_MAX_LENGTH = 80;
// 出典の日記のページ（入口からの場所）
const QUOTE_ENTRY_PAGE = "diary/entry.html";
// 「提案」「指摘」のラベルと、見た目の印（クラス名）。種類は board_quote_pick.js の BOARD_QUOTE_KINDS と同じ
const QUOTE_KIND_LABELS = { teian: "→ Yu へ提案", shiteki: "→ Yu へ指摘" };
const QUOTE_KIND_CLASSES = { teian: "k-teian", shiteki: "k-shiteki" };
// 名札に出す短い名前（長い名前が名札からはみ出さないため）。ここにない役員はそのままの名前
const SPEAKER_SHORT_NAMES = { "ブランドディレクター": "ブランド" };
// 場面の下に並べる AI 役員8人（人間の Yu は並べない）。左から順に並ぶ
const HERO_BOARD_SPEAKERS = ["秘書", "CMO", "プロデューサー", "ブランドディレクター", "アオイ", "CFO", "CTO", "CISO"];
// 列の左の小さな見出し
const HERO_BOARD_LABEL = "AI役員";
// 話した役員の小さな顔に付ける印（クラス名。黄色い輪になる）
const HERO_BOARD_ON_CLASS = "on";
// 名言が選べないときに、場面の入れ物に付けておく印（CSS が名言の部分を隠す）
const NO_QUOTE_CLASS = "no-quote";
// index.html に書いた部品の id
const HERO_ADVICE_IDS = {
  advice: "hero-advice",
  eyebrow: "adv-eyebrow",
  face: "adv-face-holder",
  name: "adv-name",
  text: "adv-text",
  tag: "adv-tag",
  board: "adv-board",
  link: "hero-quote-link"
};

/**
 * 吹き出しに出す文字にする。太字・ハイライトの記号を外し、上限を超えたら末尾を「…」で省く。
 * @param {string} text 一覧の文
 * @returns {string} 出す文字
 * @example formatQuoteText("**大事**です") // "大事です"
 */
function formatQuoteText(text) {
  const characters = Array.from(stripMarkup(text));
  if (characters.length <= QUOTE_SHOW_MAX_LENGTH) {
    return characters.join("");
  }
  return characters.slice(0, QUOTE_SHOW_MAX_LENGTH - 1).join("") + "…";
}

/**
 * 選んだ名言から、画面に出す文字をまとめる（画面に触れない）。
 * @param {{speaker:string,text:string,date:string,kind:string}} quote 選んだ名言
 * @returns {{speaker:string, shortName:string, role:string, text:string, eyebrow:string, kindLabel:string, kindClass:string, href:string}} 出す文字とリンク先
 * @example buildQuoteTexts({ speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16", kind: "teian" }).eyebrow // "3日目の会議で（2026.11.16）"
 */
function buildQuoteTexts(quote) {
  let shortName = quote.speaker;
  if (Object.prototype.hasOwnProperty.call(SPEAKER_SHORT_NAMES, quote.speaker)) {
    shortName = SPEAKER_SHORT_NAMES[quote.speaker];
  }
  return {
    speaker: quote.speaker,
    shortName: shortName,
    role: getSpeakerInfo(quote.speaker).role,
    text: formatQuoteText(quote.text),
    eyebrow: formatDayShort(quote.date) + "の会議で（" + formatDateDot(quote.date) + "）",
    kindLabel: QUOTE_KIND_LABELS[quote.kind],
    kindClass: QUOTE_KIND_CLASSES[quote.kind],
    href: QUOTE_ENTRY_PAGE + "?date=" + quote.date
  };
}

/**
 * 名言の一覧を取り出す。board_quotes_data.js が読めていないときは null を返す（main.js を止めないため）。
 * @returns {Array|null} 一覧。読めていなければ null
 * @example readBoardQuotes() // 一覧が読めていれば BOARD_QUOTES
 */
function readBoardQuotes() {
  if (typeof BOARD_QUOTES === "undefined") {
    return null;
  }
  return BOARD_QUOTES;
}

/**
 * 場面に必要な部品を id で集める。1つでも無ければ null（名前の書き間違いに気づけるよう、コンソールに日本語で出す）。
 * @returns {Object<string,HTMLElement>|null} 部品の表。足りなければ null
 */
function findAdviceParts() {
  const parts = {};
  const missing = [];
  Object.keys(HERO_ADVICE_IDS).forEach(function (key) {
    parts[key] = document.getElementById(HERO_ADVICE_IDS[key]);
    if (parts[key] === null) {
      missing.push(HERO_ADVICE_IDS[key]);
    }
  });
  if (missing.length > 0) {
    console.warn("ヒーローの場面の部品が index.html に見つかりません（" + missing.join("・") + "）。id の書き間違いがないか確かめてください。");
    return null;
  }
  return parts;
}

/**
 * 場面の下の、AI役員8人の小さな顔の列を作る（話した役員の顔だけ黄色い輪＝"on"）。
 * @param {HTMLElement} board 列の入れ物
 * @param {string} faceFile 顔の絵（speakers.svg）の場所
 * @param {string|null} activeSpeaker 話した役員の名前（いなければ null）
 * @returns {void}
 * @example fillBoardFaces(board, "assets/speakers.svg", "CFO")
 */
function fillBoardFaces(board, faceFile, activeSpeaker) {
  board.textContent = "";
  board.appendChild(makeDiaryElement("span", "lbl", HERO_BOARD_LABEL));
  HERO_BOARD_SPEAKERS.forEach(function (name) {
    let sizeClass = "avatar-small";
    if (name === activeSpeaker) {
      sizeClass += " " + HERO_BOARD_ON_CLASS;
    }
    const face = createSpeakerFace(name, sizeClass, faceFile);
    if (face !== null) {
      face.setAttribute("title", name + "（" + getSpeakerInfo(name).role + "）");
      board.appendChild(face);
    }
  });
}

/**
 * 選んだ名言を、大きな顔・名札・吹き出し・ラベル・出典リンクに入れる。文字は textContent で入れる（HTML として解釈させない）。
 * @param {Object<string,HTMLElement>} parts 場面の部品
 * @param {ReturnType<typeof buildQuoteTexts>} texts 出す文字
 * @param {string} faceFile 顔の絵の場所
 * @returns {void}
 */
function fillAdviceQuote(parts, texts, faceFile) {
  parts.eyebrow.textContent = texts.eyebrow;
  parts.face.textContent = "";
  parts.face.appendChild(createSpeakerFace(texts.speaker, "adv-face", faceFile));
  parts.name.textContent = texts.shortName;
  parts.name.appendChild(makeDiaryElement("small", "", texts.role));
  parts.text.textContent = texts.text;
  parts.tag.className = "adv-tag " + texts.kindClass;
  parts.tag.textContent = texts.kindLabel;
  parts.link.setAttribute("href", texts.href);
}

/**
 * 入口の場面に、役員を1人（名言ごとランダム）大きく出す。名言が選べないときは、顔の列と説明だけを残す。
 * @param {{quotes:*, rand:function(): number, faceFile:string}} options quotes＝名言の一覧、rand＝乱数、faceFile＝顔の絵の場所
 * @returns {boolean} 名言を出せたら true（部品がない・名言が選べないときは false）
 * @example showHeroAdvice({ quotes: BOARD_QUOTES, rand: Math.random, faceFile: "assets/speakers.svg" })
 */
function showHeroAdvice(options) {
  const parts = findAdviceParts();
  if (parts === null) {
    return false;
  }
  const quote = pickBoardQuote(options.quotes, options.rand);
  if (quote === null) {
    // 名言が選べない日も顔の列は出す。名言の部分は「no-quote」の印のまま隠れている
    fillBoardFaces(parts.board, options.faceFile, null);
    return false;
  }
  fillAdviceQuote(parts, buildQuoteTexts(quote), options.faceFile);
  fillBoardFaces(parts.board, options.faceFile, quote.speaker);
  // 印を外すと、CSS が名言の部分（顔・吹き出し・ラベル・リンク）を出す
  parts.advice.className = parts.advice.className.replace(NO_QUOTE_CLASS, "").trim();
  return true;
}

/**
 * 名前の下の「今日で、AI会社を始めて N 日目」を出す。部品がなければ何もしない。
 * @param {{paragraphId:string, numberId:string, now:Date}} options 段落の id・数字の部分の id・今の時刻
 * @returns {boolean} 出せたら true
 * @example showHeroDays({ paragraphId: "hero-days", numberId: "hero-days-number", now: new Date() })
 */
function showHeroDays(options) {
  const paragraph = document.getElementById(options.paragraphId);
  const number = document.getElementById(options.numberId);
  if (paragraph === null || number === null) {
    return false;
  }
  number.textContent = String(getTodayDayNumber(options.now));
  paragraph.hidden = false;
  return true;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    formatQuoteText, buildQuoteTexts, readBoardQuotes, showHeroAdvice, showHeroDays, fillBoardFaces,
    QUOTE_SHOW_MAX_LENGTH, QUOTE_KIND_LABELS, HERO_BOARD_SPEAKERS
  };
}
