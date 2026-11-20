/*
 * scene_quote.js：ヒーローの場面に、名言の吹き出し・「Day N の会議から」・出典リンクを出す
 * 主な関数：formatQuoteText（記号を外し80字で省く）、buildQuoteTexts（出す文字をまとめる・画面に触れない）、showSceneQuote（入口に出す）
 * 前提：diary_day.js・diary_markup.js・diary_speakers.js・scene_layout.js・meeting_scene.js・board_quote_pick.js が先に読み込まれている。
 * 名言が選べない（0件）ときは吹き出しの入れ物を隠したまま（空の吹き出しを残さない）。見た目は css/meeting_scene.css。main.js から呼ばれる。
 * 吹き出しに出すのは一覧に書いた文字だけ（その場で文を作らない）。tests/scene_quote.test.js でテストする。
 */

// 吹き出しに出す文字数の上限（これを超えたら末尾を「…」で省く）。board_quote_pick.js と同じ値
const QUOTE_SHOW_MAX_LENGTH = 80;
// 出典の日記のページ（入口からの場所）
const QUOTE_ENTRY_PAGE = "diary/entry.html";

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
 * @param {{speaker:string,text:string,date:string}} quote 選んだ名言
 * @returns {{speaker:string, role:string, text:string, dayLabel:string, href:string}} 出す文字とリンク先
 * @example buildQuoteTexts({ speaker: "CFO", text: "数字で確かめます。", date: "2026-11-16" }).dayLabel // "Day 3 の会議から"
 */
function buildQuoteTexts(quote) {
  return {
    speaker: quote.speaker,
    role: getSpeakerInfo(quote.speaker).role,
    text: formatQuoteText(quote.text),
    dayLabel: "Day " + getDayNumber(quote.date) + " の会議から",
    href: QUOTE_ENTRY_PAGE + "?date=" + quote.date
  };
}

/**
 * 吹き出しの三角の位置（吹き出しの幅に対する %）。話した役員の席の真上に合わせる。
 * @param {string} speaker 役員の名前
 * @returns {number|null} 0〜100 の数。席が見つからなければ null
 */
function computeTailPercent(speaker) {
  const layout = computeSceneLayout(HERO_SCENE_SEATS);
  const seat = layout.seats.find(function (candidate) {
    return candidate.name === speaker;
  });
  if (seat === undefined) {
    return null;
  }
  return seat.x / layout.width * 100;
}

/**
 * 吹き出しの要素（名前・文）を作る。文字は textContent で入れる（HTML として解釈させない）。
 * @param {ReturnType<typeof buildQuoteTexts>} texts 出す文字
 * @returns {HTMLElement} 吹き出し
 */
function createQuoteBubble(texts) {
  const info = getSpeakerInfo(texts.speaker);
  const bubble = document.createElement("div");
  bubble.className = "quote";
  const tailPercent = computeTailPercent(texts.speaker);
  if (tailPercent !== null) {
    // 位置は style 属性ではなく JS（CSSOM）で入れる（CSP で style 属性は止められるため）
    bubble.style.setProperty("--tail-x", tailPercent + "%");
  }
  const who = document.createElement("p");
  who.className = "quote-who " + info.className;
  who.textContent = texts.speaker;
  const role = document.createElement("span");
  role.className = "role";
  role.textContent = texts.role;
  who.appendChild(role);
  const body = document.createElement("p");
  body.className = "quote-text";
  body.textContent = texts.text;
  bubble.appendChild(who);
  bubble.appendChild(body);
  return bubble;
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
 * 入口の場面に名言を1つ出す。入れ物（#hero-quote-wrap）がない・名言が選べないときは何も出さない。
 * 話した役員の顔に輪（.speaking）を付ける。
 * @param {{wrapId:string, stageId:string, quotes:*, rand:function(): number}} options wrapId＝吹き出しの入れ物の id、stageId＝場面の id、quotes＝名言の一覧、rand＝乱数
 * @returns {boolean} 出せたら true
 * @example showSceneQuote({ wrapId: "hero-quote-wrap", stageId: "hero-stage", quotes: BOARD_QUOTES, rand: Math.random })
 */
function showSceneQuote(options) {
  const wrap = document.getElementById(options.wrapId);
  const stage = document.getElementById(options.stageId);
  if (wrap === null || stage === null) {
    return false;
  }
  const quote = pickBoardQuote(options.quotes, options.rand);
  if (quote === null) {
    return false;
  }
  const texts = buildQuoteTexts(quote);
  wrap.querySelector(".quote-holder").appendChild(createQuoteBubble(texts));
  wrap.querySelector(".quote-day").textContent = texts.dayLabel;
  wrap.querySelector(".quote-link").setAttribute("href", texts.href);
  const seatPart = stage.querySelector('[data-seat="' + texts.speaker + '"]');
  if (seatPart !== null) {
    seatPart.classList.add("speaking");
  }
  wrap.hidden = false;
  return true;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatQuoteText, buildQuoteTexts, computeTailPercent, readBoardQuotes, QUOTE_SHOW_MAX_LENGTH };
}
