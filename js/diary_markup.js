/*
 * diary_markup.js：3版目（"format": 3）の日記の文に書ける「太字・ハイライト」の読み取り。画面には触れない
 * 書けるのは2種類だけ：**文字**（太字）と ==文字==（ハイライト）。HTMLは書けない。Markdown 全体には対応しない。
 * 主な関数：parseMarkup（文を「普通／太字／ハイライト」の区切りの並びに分け、形の誤りを返す）、
 *   stripMarkup（記号を外した文字）、countVisibleCharacters（記号を除いた文字数）、countMarkupUses（太字・ハイライトの数）、hasMarkupSymbols
 * 検査（diary_validate_format3.js）・画面（diary_markup_view.js）・照合用の書き出し（tools/diary_plain_text.js）が、
 * 同じこの関数を使う（検査では通るのに画面では違う形に見える、を防ぐため）。
 * tests/diary_markup.test.js でテストする。
 */

// 強調の記号。この2つ以外は強調として読まない
const MARKUP_BOLD_SYMBOL = "**";
const MARKUP_MARK_SYMBOL = "==";
// 区切りの種類の名前
const MARKUP_PLAIN = "plain";
const MARKUP_STRONG = "strong";
const MARKUP_MARK = "mark";
// 同じ記号が3つ以上続く書き方（***・===）。どこまでが記号か分からなくなるので誤りにする
const MARKUP_RUN_PATTERN = /\*{3,}|={3,}/;

/**
 * 記号 ** か == が1つでも入っているかを調べる。
 * @param {string} text 調べる文
 * @returns {boolean} 入っていれば true
 * @example hasMarkupSymbols("**大事**") // true
 * @example hasMarkupSymbols("A=B") // false
 */
function hasMarkupSymbols(text) {
  return text.includes(MARKUP_BOLD_SYMBOL) || text.includes(MARKUP_MARK_SYMBOL);
}

/**
 * 今いる位置に ** か == があれば、その記号を返す。なければ ""。
 * @param {string} text 文
 * @param {number} position 調べる位置
 * @returns {string} 記号
 * @example symbolAt("a**b", 1) // "**"
 */
function symbolAt(text, position) {
  if (text.startsWith(MARKUP_BOLD_SYMBOL, position)) {
    return MARKUP_BOLD_SYMBOL;
  }
  if (text.startsWith(MARKUP_MARK_SYMBOL, position)) {
    return MARKUP_MARK_SYMBOL;
  }
  return "";
}

/**
 * 記号の名前（画面に出す説明用）。
 * @param {string} symbol ** か ==
 * @returns {string} 「太字（**）」などの名前
 * @example describeSymbol("==") // "ハイライト（==）"
 */
function describeSymbol(symbol) {
  if (symbol === MARKUP_BOLD_SYMBOL) {
    return "太字（**）";
  }
  return "ハイライト（==）";
}

/**
 * 文を「普通／太字／ハイライト」の区切りの並びに分ける。形の誤りがあれば、理由（日本語）も返す。
 * 形の誤り：閉じていない・入れ子や重なり・空の強調・記号が3つ以上続く。1つだけの * や = は普通の文字。
 * 誤りがあるときの segments は使わず、呼ぶ側は problems を先に見ること。
 * @param {string} text 文
 * @returns {{ segments: { type: string, text: string }[], problems: string[] }} 区切りの並びと、形の誤りの理由
 * @example parseMarkup("a**b**c") // segments は [普通 "a"・太字 "b"・普通 "c"]
 */
function parseMarkup(text) {
  const problems = [];
  const segments = [];
  if (MARKUP_RUN_PATTERN.test(text)) {
    problems.push("強調の記号（** や ==）が3つ以上続いています");
    return { segments: [], problems: problems };
  }
  let openSymbol = "";
  let buffer = "";
  let position = 0;
  while (position < text.length) {
    const symbol = symbolAt(text, position);
    if (symbol === "") {
      buffer += text[position];
      position += 1;
      continue;
    }
    position += symbol.length;
    if (openSymbol === "") {
      pushSegment(segments, MARKUP_PLAIN, buffer);
      openSymbol = symbol;
      buffer = "";
    } else if (openSymbol === symbol) {
      if (buffer.trim() === "") {
        problems.push("中身が空の強調（" + describeSymbol(symbol) + "）があります");
      }
      pushSegment(segments, symbolToType(symbol), buffer);
      openSymbol = "";
      buffer = "";
    } else {
      problems.push("強調の入れ子か重なり（" + describeSymbol(openSymbol) + "の中に" + describeSymbol(symbol) + "）があります");
      return { segments: [], problems: problems };
    }
  }
  if (openSymbol !== "") {
    problems.push("閉じていない強調（" + describeSymbol(openSymbol) + "）があります");
    return { segments: [], problems: problems };
  }
  pushSegment(segments, MARKUP_PLAIN, buffer);
  return { segments: segments, problems: problems };
}

/**
 * 記号から区切りの種類を決める。
 * @param {string} symbol ** か ==
 * @returns {string} "strong" か "mark"
 * @example symbolToType("**") // "strong"
 */
function symbolToType(symbol) {
  if (symbol === MARKUP_BOLD_SYMBOL) {
    return MARKUP_STRONG;
  }
  return MARKUP_MARK;
}

/**
 * 区切りを並びに足す（空の文字は足さない）。
 * @param {object[]} segments 並び
 * @param {string} type 種類
 * @param {string} text 文字
 * @returns {void}
 * @example pushSegment(segments, "plain", "a")
 */
function pushSegment(segments, type, text) {
  if (text !== "") {
    segments.push({ type: type, text: text });
  }
}

/**
 * 記号を外した、読者に見える文字を返す。形の誤りがある文は、記号をすべて取り除いた文字を返す（照合用の安全側の動き）。
 * @param {string} text 文
 * @returns {string} 記号を外した文字
 * @example stripMarkup("**大事**な==所==") // "大事な所"
 */
function stripMarkup(text) {
  const parsed = parseMarkup(text);
  if (parsed.problems.length > 0) {
    return text.split(MARKUP_BOLD_SYMBOL).join("").split(MARKUP_MARK_SYMBOL).join("");
  }
  return parsed.segments.map(function (segment) {
    return segment.text;
  }).join("");
}

/**
 * 記号を除いた文字数を数える（絵文字など2つ分の文字でできた字も1文字）。
 * @param {string} text 文
 * @returns {number} 文字数
 * @example countVisibleCharacters("**大事**な所") // 4
 */
function countVisibleCharacters(text) {
  return Array.from(stripMarkup(text)).length;
}

/**
 * 太字とハイライトが何か所あるかを数える。形の誤りがある文は 0 か所として数える。
 * @param {string} text 文
 * @returns {{ strong: number, mark: number }} 数
 * @example countMarkupUses("**a**と==b==と**c**") // { strong: 2, mark: 1 }
 */
function countMarkupUses(text) {
  const counts = { strong: 0, mark: 0 };
  const parsed = parseMarkup(text);
  if (parsed.problems.length > 0) {
    return counts;
  }
  parsed.segments.forEach(function (segment) {
    if (segment.type === MARKUP_STRONG) {
      counts.strong += 1;
    } else if (segment.type === MARKUP_MARK) {
      counts.mark += 1;
    }
  });
  return counts;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseMarkup, stripMarkup, countVisibleCharacters, countMarkupUses, hasMarkupSymbols,
    MARKUP_PLAIN, MARKUP_STRONG, MARKUP_MARK
  };
}
