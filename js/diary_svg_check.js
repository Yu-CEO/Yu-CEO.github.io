/*
 * diary_svg_check.js：日記の図（diary/figures/YYYY-MM-DD.svg）が決まりどおりかを調べ、図の中の文字を取り出す。画面には触れない
 * 調べるもの：使ってよい要素・属性だけか（許可リスト）／禁止の書き方（<!DOCTYPE・コメント・& など）／大きさ（30KB）／
 *            viewBox があるか／<text> は1行・30文字以内か／図の中の文字に公開してはいけない書き方がないか（diary_safety.js と同じ検査）
 * 主な関数：findSvgProblems（図の問題点を「何行目の何が理由か」の日本語の一覧で返す。空なら正しい）、extractSvgTexts（図の中の文字を取り出す）
 * 使うもの：diary_svg_tokens.js・diary_svg_attributes.js（属性の決まり）・diary_safety.js。tests/diary_data.test.js（CI）と tests/diary_svg_check.test.js から使われる。
 * 画面では使わない（図は <img> で表示し、ブラウザが図の中のプログラムを動かさないため。この検査と二重の守り）。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.tokenizeSvg = require("./diary_svg_tokens.js").tokenizeSvg;
  globalThis.findUnsafeWritings = require("./diary_safety.js").findUnsafeWritings;
  globalThis.findSvgAttributeProblem = require("./diary_svg_attributes.js").findSvgAttributeProblem;
  globalThis.SVG_CHECK_NAMESPACE = require("./diary_svg_attributes.js").SVG_CHECK_NAMESPACE;
}

// 使ってよい要素（これ以外の script・foreignObject・image・use・a・style・animate・tspan などは止める）
const SVG_ALLOWED_ELEMENTS = [
  "svg", "g", "title", "desc", "defs", "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text",
  "linearGradient", "radialGradient", "stop", "marker"
];
// 文字を書いてよい要素（文字はこの中だけ。照合しやすいよう、どれも1行で書く）
const SVG_TEXT_ELEMENTS = ["text", "title", "desc"];
// 大きさの上限：30KB（重いページにしないため・中身を人の目で確かめられる量にするため）
const SVG_MAX_BYTES = 30 * 1024;
// <text> 1つの文字数の上限と、図の中の文字の合計の上限（文字数）
const SVG_MAX_TEXT_LENGTH = 30;
const SVG_MAX_TOTAL_TEXT = 200;
// 行ごとに探す、禁止の書き方。文字を隠して照合（機密の言葉・diary_safety.js）をすり抜けるのを防ぐ
const SVG_FORBIDDEN_WRITINGS = [
  { name: "<!DOCTYPE", pattern: /<!DOCTYPE/i },
  { name: "<!ENTITY", pattern: /<!ENTITY/i },
  { name: "<?xml-stylesheet", pattern: /<\?xml-stylesheet/i },
  { name: "<![CDATA[", pattern: /<!\[CDATA\[/i },
  { name: "コメント（<!-- -->）", pattern: /<!--/ },
  { name: "& で始まる文字参照（& を使いたいときは全角の「＆」）", pattern: /&/ }
];

/**
 * 行ごとに禁止の書き方を探し、問題を problems に足す。
 * @param {string} svgText SVGファイルの中身
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgForbiddenWritings("<!-- メモ -->", problems) // 「1行目：コメント…」が足される
 */
function checkSvgForbiddenWritings(svgText, problems) {
  svgText.split("\n").forEach(function (lineText, index) {
    SVG_FORBIDDEN_WRITINGS.forEach(function (rule) {
      if (rule.pattern.test(lineText)) {
        problems.push((index + 1) + "行目：" + rule.name + " は使えません");
      }
    });
  });
}

/**
 * 開くタグ1つ（要素の種類・属性・置き場所）を調べ、問題を problems に足す。
 * @param {object} token 開くタグのかけら
 * @param {string[]} openNames いま開いている要素の名前（外側から順）
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgOpenTag({ name: "script", attributes: [], line: 3 }, ["svg"], problems) // 「3行目：使えない要素 <script>」
 */
function checkSvgOpenTag(token, openNames, problems) {
  const where = token.line + "行目：";
  if (!SVG_ALLOWED_ELEMENTS.includes(token.name)) {
    problems.push(where + "使えない要素 <" + token.name + "> があります");
  }
  if (SVG_TEXT_ELEMENTS.includes(openNames[openNames.length - 1])) {
    problems.push(where + "<text>・<title>・<desc> の中に、要素 <" + token.name + "> は入れられません");
  }
  token.attributes.forEach(function (attribute) {
    const reason = findSvgAttributeProblem(attribute);
    if (reason !== "") {
      problems.push(where + "<" + token.name + "> の" + reason);
    }
  });
}

/**
 * いちばん外側の要素が <svg> で、xmlns（SVGの決まった名前）と viewBox があるかを調べ、問題を problems に足す。
 * xmlns がないと、ブラウザが <img> で図を表示できないため必須にする。
 * @param {object} token いちばん外側の開くタグのかけら
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgRoot({ name: "svg", attributes: [], line: 2 }, problems) // xmlns・viewBox がない理由が足される
 */
function checkSvgRoot(token, problems) {
  const names = token.attributes.map(function (attribute) {
    return attribute.name;
  });
  if (token.name !== "svg") {
    problems.push(token.line + "行目：いちばん外側は <svg> にしてください");
    return;
  }
  if (!names.includes("xmlns")) {
    problems.push(token.line + "行目：<svg> に xmlns=\"" + SVG_CHECK_NAMESPACE + "\" がありません");
  }
  if (!names.includes("viewBox")) {
    problems.push(token.line + "行目：<svg> に viewBox がありません");
  }
}

/**
 * 文字のかけら1つを調べる。文字は <text>・<title>・<desc> の中だけ・途中で改行しない・<text> は30文字以内。
 * 決まりどおりの文字は texts に足す（あとで書き方の検査と合計の文字数に使う）。
 * @param {object} token 文字のかけら
 * @param {string} parentName すぐ外側の要素の名前（なければ ""）
 * @param {object[]} texts 図の中の文字を足していく一覧（{ line, element, text }）
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgText({ text: "見出し", line: 5, hasNewline: false }, "text", texts, problems)
 */
function checkSvgText(token, parentName, texts, problems) {
  const text = token.text.trim();
  if (text === "") {
    return;
  }
  const where = token.line + "行目：";
  if (!SVG_TEXT_ELEMENTS.includes(parentName)) {
    problems.push(where + "文字は <text>・<title>・<desc> の中だけに書いてください");
    return;
  }
  if (token.hasNewline) {
    problems.push(where + "<" + parentName + "> の文字は途中で改行せず、1行で書いてください（機密の言葉の照合が1行ずつのため）");
  }
  if (parentName === "text" && Array.from(text).length > SVG_MAX_TEXT_LENGTH) {
    problems.push(where + "<text> 1つの文字が " + SVG_MAX_TEXT_LENGTH + " 文字を超えています");
  }
  texts.push({ line: token.line, element: parentName, text: text });
}

/**
 * かけらを上から順にたどり、要素の入れ子・属性・文字の置き場所を調べる。図の中の文字も集める。
 * @param {object[]} tokens tokenizeSvg が返したかけらの一覧
 * @returns {{ problems: string[], texts: object[] }} 問題の一覧と、図の中の文字の一覧
 * @example walkSvgTokens(tokenizeSvg(svgText).tokens)
 */
function walkSvgTokens(tokens) {
  const problems = [];
  const texts = [];
  const openNames = [];
  let rootCount = 0;
  tokens.forEach(function (token) {
    const parentName = openNames[openNames.length - 1] || "";
    if (token.type === "text") {
      checkSvgText(token, parentName, texts, problems);
    } else if (token.type === "open") {
      if (openNames.length === 0) {
        rootCount += 1;
        checkSvgRoot(token, problems);
      }
      checkSvgOpenTag(token, openNames, problems);
      if (!token.selfClosing) {
        openNames.push(token.name);
      }
    } else if (token.name !== parentName) {
      problems.push(token.line + "行目：閉じるタグ </" + token.name + "> が、開いたタグと合っていません");
    } else {
      openNames.pop();
    }
  });
  if (rootCount !== 1 || openNames.length > 0) {
    problems.push("いちばん外側の <svg> が1つだけで、すべてのタグが閉じられている形にしてください");
  }
  return { problems: problems, texts: texts };
}

/**
 * 図の中の文字（<text>・<title>・<desc> の中身）を取り出す。形が崩れた部分は取り出さない。
 * @param {string} svgText SVGファイルの中身
 * @returns {{ line: number, element: string, text: string }[]} 図の中の文字の一覧
 * @example extractSvgTexts('<svg …><text x="1">見出し</text></svg>') // [{ line: 1, element: "text", text: "見出し" }]
 */
function extractSvgTexts(svgText) {
  return walkSvgTokens(tokenizeSvg(svgText).tokens).texts;
}

/**
 * 図の中の文字を全部つなげた文でも検査する（1つの言葉を2つの <text> に分けて、照合をすり抜けるのを防ぐ）。
 * 1つずつの検査ですでに見つかった決まりは、2回は出さない。
 * @param {object[]} texts 図の中の文字の一覧
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgJoinedText([{ text: "3" }, { text: "万" }], problems) // つなげると金額の書き方になる理由が足される
 */
function checkSvgJoinedText(texts, problems) {
  const foundEach = [];
  texts.forEach(function (item) {
    findUnsafeWritings(item.text).forEach(function (ruleName) {
      foundEach.push(ruleName);
    });
  });
  const joined = texts.map(function (item) {
    return item.text;
  }).join("");
  findUnsafeWritings(joined).forEach(function (ruleName) {
    if (!foundEach.includes(ruleName)) {
      problems.push("図の中の文字を全部つなげると、公開してはいけない書き方（" + ruleName + "）になります。言葉を分けて書かないでください");
    }
  });
}

/**
 * 図の中の文字を、日記の文字と同じ「公開してはいけない書き方」の検査にかけ、合計の文字数も調べる。
 * @param {object[]} texts 図の中の文字の一覧
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkSvgTextSafety([{ line: 5, element: "text", text: "3万" }], problems) // 金額の書き方の理由が足される
 */
function checkSvgTextSafety(texts, problems) {
  let total = 0;
  texts.forEach(function (item) {
    total += Array.from(item.text).length;
    findUnsafeWritings(item.text).forEach(function (ruleName) {
      problems.push(item.line + "行目：<" + item.element + "> の文字に、公開してはいけない書き方（" + ruleName + "）があります");
    });
  });
  if (total > SVG_MAX_TOTAL_TEXT) {
    problems.push("図の中の文字の合計が " + SVG_MAX_TOTAL_TEXT + " 文字を超えています（今は " + total + " 文字）");
  }
}

/**
 * 図（SVGファイルの中身）の問題点を、「何行目の何が理由か」の日本語の一覧で返す。空の配列なら、正しい。
 * @param {*} svgText SVGファイルの中身（文字）
 * @returns {string[]} 問題点の説明の一覧
 * @example findSvgProblems('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>') // []
 */
function findSvgProblems(svgText) {
  if (typeof svgText !== "string" || svgText.trim() === "") {
    return ["図のファイルが空か、文字として読めません"];
  }
  const problems = [];
  const size = new TextEncoder().encode(svgText).length;
  if (size > SVG_MAX_BYTES) {
    problems.push("図のファイルが 30KB を超えています（今は約 " + Math.ceil(size / 1024) + "KB）");
  }
  checkSvgForbiddenWritings(svgText, problems);
  const tokenized = tokenizeSvg(svgText);
  const walked = walkSvgTokens(tokenized.tokens);
  checkSvgTextSafety(walked.texts, problems);
  checkSvgJoinedText(walked.texts, problems);
  return problems.concat(tokenized.problems, walked.problems);
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findSvgProblems, extractSvgTexts };
}
