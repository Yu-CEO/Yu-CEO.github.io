/*
 * diary_svg_tokens.js：図（SVGファイル）の中身を、タグと文字の「かけら」（トークン）に分ける。外部ライブラリは使わない
 * 例：<text x="1">見出し</text> → 「開くタグ text（属性 x）」「文字 見出し」「閉じるタグ text」の3つ
 * 主な関数：tokenizeSvg（SVGの文字をかけらの一覧にする。読み取れない書き方は日本語の理由で返す）
 * diary_svg_check.js（図の検査）から使われる。画面では使わない（図は <img> で表示するため）。
 * 決まった書き方（名前="値"）以外は読み取らずに「正しくない」とする。あいまいに読んで通すより、止めるほうが安全なため。
 */

// 先頭にだけ書いてよい宣言（<?xml version="1.0" encoding="UTF-8"?>）
const SVG_XML_DECLARATION = /^<\?xml\s+version="1\.0"(\s+encoding="UTF-8")?\s*\?>/;
// 閉じるタグの形（例 </text>）
const SVG_CLOSE_TAG = /^<\/([A-Za-z][\w:.-]*)\s*>$/;
// 開くタグの形（例 <rect x="1" y="2"/>）。属性は 名前="値" か 名前='値' だけ
const SVG_OPEN_TAG = /^<([A-Za-z][\w:.-]*)((?:\s+[^\s=\/>"']+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>$/;
// 属性を1つずつ取り出す形
const SVG_ATTRIBUTE = /([^\s=\/>"']+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/**
 * 文字の位置が、何行目にあたるかを数える（理由の表示に使う）。
 * @param {string} svgText SVGの文字全体
 * @param {number} index 位置（0から数える）
 * @returns {number} 行番号（1から数える）
 * @example lineNumberAt("a\nb", 2) // 2
 */
function lineNumberAt(svgText, index) {
  return svgText.slice(0, index).split("\n").length;
}

/**
 * タグの終わり（>）の位置を探す。"…" や '…' の中の > は数えない。
 * @param {string} svgText SVGの文字全体
 * @param {number} tagStart タグの始まり（<）の位置
 * @returns {number} > の位置。見つからなければ -1
 * @example findTagEnd('<a b=">">', 0) // 8
 */
function findTagEnd(svgText, tagStart) {
  let quote = "";
  for (let index = tagStart + 1; index < svgText.length; index++) {
    const character = svgText[index];
    if (quote !== "") {
      if (character === quote) {
        quote = "";
      }
    } else if (character === "\"" || character === "'") {
      quote = character;
    } else if (character === ">") {
      return index;
    }
  }
  return -1;
}

/**
 * 開くタグの属性の部分を、{ name, value } の一覧にする。
 * @param {string} attributeText 属性の部分の文字（例 ' x="1" y="2"'）
 * @returns {{ name: string, value: string }[]} 属性の一覧
 * @example parseSvgAttributes(' x="1"') // [{ name: "x", value: "1" }]
 */
function parseSvgAttributes(attributeText) {
  const attributes = [];
  let match = SVG_ATTRIBUTE.exec(attributeText);
  while (match !== null) {
    let value = match[2];
    if (value === undefined) {
      value = match[3];
    }
    attributes.push({ name: match[1], value: value });
    match = SVG_ATTRIBUTE.exec(attributeText);
  }
  SVG_ATTRIBUTE.lastIndex = 0;
  return attributes;
}

/**
 * タグ1つ（< から > まで）を読み取り、かけらにする。読み取れない・使えない書き方なら理由を返す。
 * @param {string} tagText タグの文字（例 '<rect x="1"/>'）
 * @param {number} line 何行目か
 * @returns {{ token?: object, problem?: string }} かけら、または理由
 * @example parseSvgTag('<rect x="1"/>', 3) // { token: { type: "open", name: "rect", ... } }
 */
function parseSvgTag(tagText, line) {
  if (tagText.startsWith("<!") || tagText.startsWith("<?")) {
    return { problem: line + "行目：<! や <? で始まる書き方は使えません（先頭の <?xml version=\"1.0\" encoding=\"UTF-8\"?> だけは使えます）" };
  }
  const close = tagText.match(SVG_CLOSE_TAG);
  if (close !== null) {
    return { token: { type: "close", name: close[1], line: line } };
  }
  const open = tagText.match(SVG_OPEN_TAG);
  if (open === null) {
    return { problem: line + "行目：タグの書き方が読み取れません（属性は 名前=\"値\" の形で書きます）" };
  }
  return {
    token: { type: "open", name: open[1], attributes: parseSvgAttributes(open[2]), selfClosing: open[3] === "/", line: line }
  };
}

/**
 * SVGの文字を、タグと文字のかけらの一覧にする。
 * @param {string} svgText SVGファイルの中身
 * @returns {{ tokens: object[], problems: string[] }} かけらの一覧（type は "open"・"close"・"text"）と、読み取れなかった理由
 * @example tokenizeSvg('<svg viewBox="0 0 1 1"></svg>').tokens.length // 2
 */
function tokenizeSvg(svgText) {
  const tokens = [];
  const problems = [];
  let position = 0;
  const declaration = svgText.match(SVG_XML_DECLARATION);
  if (declaration !== null) {
    position = declaration[0].length;
  }
  while (position < svgText.length) {
    let tagStart = svgText.indexOf("<", position);
    if (tagStart === -1) {
      tagStart = svgText.length;
    }
    if (tagStart > position) {
      const text = svgText.slice(position, tagStart);
      tokens.push({ type: "text", text: text, line: lineNumberAt(svgText, position), hasNewline: text.includes("\n") });
    }
    if (tagStart === svgText.length) {
      break;
    }
    const tagEnd = findTagEnd(svgText, tagStart);
    if (tagEnd === -1) {
      problems.push(lineNumberAt(svgText, tagStart) + "行目：タグが > で閉じられていません");
      break;
    }
    const parsed = parseSvgTag(svgText.slice(tagStart, tagEnd + 1), lineNumberAt(svgText, tagStart));
    if (parsed.problem !== undefined) {
      problems.push(parsed.problem);
    } else {
      tokens.push(parsed.token);
    }
    position = tagEnd + 1;
  }
  return { tokens: tokens, problems: problems };
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { tokenizeSvg };
}
