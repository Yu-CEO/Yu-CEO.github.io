/*
 * diary_svg_attributes.js：日記の図（SVG）の「属性」が決まりどおりかを調べる。画面には触れない
 * 調べるもの：使ってよい属性だけか（許可リスト）／on…・href・style がないか／値の中身（xmlns・url(…)・色・transform・font-family・id）
 * 色を指定する属性（fill・stroke など）は、色の値の許可リスト（#色・決まった色名・url(#名前)）だけを認める。
 * 主な関数：findSvgAttributeProblem（属性1つの問題の理由を返す。問題がなければ ""）
 * diary_svg_check.js（図の検査）から使われる。tests/diary_svg_check.test.js でテストする。
 */

// 使ってよい属性（これ以外の on…・href・xlink:href・style などは止める）
const SVG_ALLOWED_ATTRIBUTES = [
  "xmlns", "viewBox", "width", "height", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "d", "points",
  "transform", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity",
  "fill-opacity", "stroke-opacity", "font-size", "font-weight", "font-family", "text-anchor", "dominant-baseline", "id",
  "offset", "stop-color", "stop-opacity", "gradientUnits", "markerWidth", "markerHeight", "refX", "refY", "orient",
  "marker-start", "marker-end", "role", "aria-labelledby"
];
// xmlns に書いてよい値（SVGの決まった名前。外部の読み込みではない）
const SVG_CHECK_NAMESPACE = "http://www.w3.org/2000/svg";
// font-family に書いてよい値（外部フォントを使わないため、端末にある3種類だけ）
const SVG_FONT_FAMILIES = ["sans-serif", "serif", "monospace"];
// id に書いてよい形（英字で始まる英数字・_・-）。url(#名前) で指せる名前と同じ形
const SVG_ID_PATTERN = /^[A-Za-z_][\w-]*$/;
// 同じファイルの中を指す url(#名前) の形。これ以外の url(…)（外部の場所など）は止める
const SVG_LOCAL_URL = /url\(#[A-Za-z_][\w-]*\)/g;
// 値1つがまるごと url(#名前) かを見る形（色の値の許可リストで使う）
const SVG_LOCAL_URL_ONLY = /^url\(#[A-Za-z_][\w-]*\)$/;
// url(#名前) を取り除いたあとに残っていたら止める書き方。大文字小文字（URL(）と、\ を混ぜた書き方（u\rl(）も止める
const SVG_HIDDEN_URL = /url|\\/i;
// 色を指定する属性。値は下の「色の値」だけを認める（javascript: や外部の場所などを書けないように）
const SVG_COLOR_ATTRIBUTES = ["fill", "stroke", "stop-color", "marker-start", "marker-end"];
// 色の値として認める書き方：#から始まる色（#fff・#ffffff）／決まった色名／url(#名前)（marker-* は url(#名前) か none だけ）
const SVG_HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const SVG_COLOR_NAMES = ["none", "currentColor", "transparent", "white", "black"];
// transform に書いてよい形（決まった変形の名前と数字だけ）。( を使う属性はこれだけ
const SVG_TRANSFORM = /^\s*((translate|scale|rotate|matrix|skewX|skewY)\(\s*[-+\d.eE,\s]*\)\s*)+$/;

/**
 * 属性の値の中身（xmlns・url(…)・font-family・id）の決まりを調べ、理由を返す。問題がなければ ""。
 * @param {string} name 属性の名前
 * @param {string} value 属性の値
 * @returns {string} 理由（問題がなければ ""）
 * @example findSvgValueProblem("fill", "url(https://example.com/a)") // "url(…) は同じファイルの中（url(#名前)）だけ…"
 */
function findSvgValueProblem(name, value) {
  if (name === "xmlns" && value !== SVG_CHECK_NAMESPACE) {
    return "xmlns は " + SVG_CHECK_NAMESPACE + " だけが使えます";
  }
  if (SVG_HIDDEN_URL.test(value.replace(SVG_LOCAL_URL, ""))) {
    return "url(…) は同じファイルの中（url(#名前)）だけが使えます（大文字や \\ を混ぜた書き方も不可）";
  }
  if (SVG_COLOR_ATTRIBUTES.includes(name) && !isAllowedSvgColor(name, value)) {
    return "色の値は #から始まる色（#fff・#ffffff）・" + SVG_COLOR_NAMES.join("・") + "・url(#名前) だけが使えます";
  }
  if (name === "transform" && !SVG_TRANSFORM.test(value)) {
    return "transform は translate(…)・scale(…)・rotate(…) などの決まった形と数字だけが使えます";
  }
  if (name !== "transform" && value.replace(SVG_LOCAL_URL, "").includes("(")) {
    return "( は url(#名前) と transform の中だけで使えます";
  }
  if (name === "font-family" && !SVG_FONT_FAMILIES.includes(value)) {
    return "font-family は " + SVG_FONT_FAMILIES.join("・") + " だけが使えます（外部フォントは使いません）";
  }
  if (name === "id" && !SVG_ID_PATTERN.test(value)) {
    return "id は英字で始まる英数字（_ と - も可）だけが使えます";
  }
  return "";
}

/**
 * 色を指定する属性の値が、色の値の許可リストに入っているかを調べる。marker-* は url(#名前) か none だけ。
 * @param {string} name 属性の名前（"fill" など）
 * @param {string} value 属性の値
 * @returns {boolean} 使ってよければ true
 * @example isAllowedSvgColor("fill", "#2563a8") // true
 * @example isAllowedSvgColor("fill", "javascript:alert(1)") // false
 */
function isAllowedSvgColor(name, value) {
  if (SVG_LOCAL_URL_ONLY.test(value) || value === "none") {
    return true;
  }
  if (name.startsWith("marker-")) {
    return false;
  }
  return SVG_HEX_COLOR.test(value) || SVG_COLOR_NAMES.includes(value);
}

/**
 * 属性1つが使ってよいものかを調べ、理由を返す。問題がなければ ""。
 * @param {{ name: string, value: string }} attribute 属性
 * @returns {string} 理由（問題がなければ ""）
 * @example findSvgAttributeProblem({ name: "onload", value: "x()" }) // "on で始まる属性（onload）は使えません"
 */
function findSvgAttributeProblem(attribute) {
  const name = attribute.name;
  if (name.toLowerCase().startsWith("on")) {
    return "on で始まる属性（" + name + "）は使えません";
  }
  if (name === "href" || name.endsWith(":href")) {
    return "リンクの属性（" + name + "）は使えません";
  }
  if (name === "style") {
    return "style 属性は使えません";
  }
  if (!SVG_ALLOWED_ATTRIBUTES.includes(name)) {
    return "使えない属性「" + name + "」があります";
  }
  return findSvgValueProblem(name, attribute.value);
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findSvgAttributeProblem, SVG_CHECK_NAMESPACE };
}
