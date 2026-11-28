/*
 * tools_view.js：検査を通ったツールから、「会議から生まれた道具」の一覧（1ツール＝1行）を作って並べる
 * 主な関数：showToolList（検査→問題の報告→表示までの流れ）、createToolRow（1行を作る）、createEmptyRow（0件のとき）
 * 「公開中」は行全体が新しいタブで開くリンク、「準備中」はリンクなし。画像がある項目は画面写真も出す。説明は省略しない。
 * 1行目は色の枠で目立たせる（データの先頭はぬりえシアター）。
 * main.js から使われる。データは tools_data.js、検査は tools_validate.js、読めない画像を隠すのは hero_image.js。tests/tools_view.test.js でテストする。
 */

// 表示できるツールが1件もないときの文
const EMPTY_TOOLS_TEXT = "ただいま準備中です。ツールができたら、ここに並びます。";
// 開けるようにする状態の値（tools_validate.js で認めている値の1つ）
const STATUS_PUBLISHED = "公開中";
// 行全体を押したときの読み上げ名のつけ足し
const TOOL_ROW_LABEL_SUFFIX = "を開く（新しいタブ）";
// 行の右の矢印（飾り）
const TOOL_ARROW = "›";
// imageAlt がないときに、ツール名のあとにつける言葉（例：「おかね収支シミュレーターの画面」）
const IMAGE_ALT_SUFFIX = "の画面";

/**
 * 決まったタグ・クラス・文字で、画面の部品（要素）を1つ作る。
 * 文字は textContent（文字としてそのまま入れる書き方）で入れる。HTMLとして読まれないので、データに記号が入っても安全。
 * @param {string} tagName タグの名前（"div" など）
 * @param {string} className つけるクラス名（見た目の指定に使う名前）
 * @param {string} text 中に入れる文字
 * @returns {HTMLElement} 作った要素
 * @example createElementWithText("p", "panel-desc", "説明文")
 */
function createElementWithText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * スクリーンショットの alt（画像が見えない人や読み上げのための説明）を決める。
 * imageAlt が空・ないときは「（ツール名）の画面」で代用する（決定済みのルール）。
 * @param {{ name: string, imageAlt?: string }} tool ツール1件
 * @returns {string} alt に入れる文
 * @example getImageAlt({ name: "A", imageAlt: "Aの計算例" }) // "Aの計算例"
 * @example getImageAlt({ name: "A" })                        // "Aの画面"
 */
function getImageAlt(tool) {
  if (typeof tool.imageAlt === "string" && tool.imageAlt.trim() !== "") {
    return tool.imageAlt;
  }
  return tool.name + IMAGE_ALT_SUFFIX;
}

/**
 * スクリーンショットの画像を1つ作る。読み込めないときは画像だけを隠す（hero_image.js の hideWhenBroken を使う）。
 * @param {{ name: string, image: string, imageAlt?: string }} tool 画像のあるツール1件
 * @returns {HTMLImageElement} 画像の要素
 * @example createToolImage({ name: "A", image: "assets/a.jpg" })
 */
function createToolImage(tool) {
  const image = document.createElement("img");
  image.className = "tl-shot";
  // 最初の画面（ヒーロー）の下にある画像なので、見える場所に近づいてから読み込む（最初の表示を軽くするため）
  image.loading = "lazy";
  image.decoding = "async";
  image.src = tool.image;
  image.alt = getImageAlt(tool);
  hideWhenBroken(image);
  return image;
}

/**
 * 行の文字の部分（名前・説明。「準備中」なら状態も）を作る。
 * @param {{ name: string, description: string, status: string }} tool ツール1件
 * @returns {HTMLElement} 文字の部分の要素
 */
function createToolRowText(tool) {
  const text = createElementWithText("span", "tl-text", "");
  text.appendChild(createElementWithText("span", "tl-name", tool.name));
  text.appendChild(createElementWithText("span", "tl-desc", tool.description));
  if (tool.status !== STATUS_PUBLISHED) {
    text.appendChild(createElementWithText("span", "tl-status", tool.status));
  }
  return text;
}

/**
 * ツール1件ぶんの1行を作る。「公開中」なら行全体が新しいタブで開くリンク、「準備中」ならリンクなし（まだ開けないページへ移動させないため）。
 * @param {{ name: string, description: string, url: string, status: string, image?: string, imageAlt?: string }} tool 検査を通ったツール1件
 * @returns {HTMLElement} li 要素
 * @example createToolRow({ name: "A", description: "B", url: "https://x", status: "公開中" })
 */
function createToolRow(tool) {
  const item = document.createElement("li");
  const published = tool.status === STATUS_PUBLISHED;
  let row;
  if (published) {
    row = createElementWithText("a", "tl-row", "");
    row.href = tool.url;
    // 外部のページは新しいタブで開く。noopener は、開いた先のページからこのページを操作されないようにする指定
    row.target = "_blank";
    row.rel = "noopener";
    row.setAttribute("aria-label", tool.name + TOOL_ROW_LABEL_SUFFIX);
  } else {
    row = createElementWithText("div", "tl-row tl-preparing", "");
  }
  // 画像がないツールは、画像の場所を空けずに表示する
  if (typeof tool.image === "string" && tool.image !== "") {
    row.appendChild(createToolImage(tool));
  }
  row.appendChild(createToolRowText(tool));
  if (published) {
    const arrow = createElementWithText("b", "tl-arrow", TOOL_ARROW);
    arrow.setAttribute("aria-hidden", "true");
    row.appendChild(arrow);
  }
  item.appendChild(row);
  return item;
}

/**
 * 表示できるツールが0件のときの1行を作る。
 * @returns {HTMLElement} li 要素
 */
function createEmptyRow() {
  return createElementWithText("li", "tl-empty", EMPTY_TOOLS_TEXT);
}

/**
 * 正しくない項目を、ブラウザの開発者用の画面（コンソール）に日本語で出す。データを直す人のための表示。
 * @param {{ problemReports: object[], imageProblemReports: object[] }} result validateTools が返した結果
 * @returns {void}
 * @example reportToolProblems({ problemReports: [{ position: 2, problems: ["「name」がないか、空です"] }], imageProblemReports: [] })
 */
function reportToolProblems(result) {
  result.problemReports.forEach(function (report) {
    let where = report.position + "件目";
    if (report.position === 0) {
      where = "データ全体";
    }
    console.warn(
      "ツール一覧のデータ（js/tools_data.js）の" + where + "が正しくないため、表示しませんでした：" +
      report.problems.join("／") + "。js/tools_data.js を直してください。"
    );
  });
  result.imageProblemReports.forEach(function (report) {
    console.warn(
      "ツール一覧のデータ（js/tools_data.js）の" + report.position + "件目の、画像の項目が正しくないため、画像なしで表示しました：" +
      report.problem + "。画像は assets/ フォルダに置き、\"assets/ファイル名\" と書いてください。"
    );
  });
}

/**
 * ツール一覧のデータを検査し、問題を報告してから、正しい項目だけを一覧に並べる。
 * @param {string} listId 一覧（ul）の id（index.html に書いたもの）
 * @param {*} tools ツール一覧のデータ（tools_data.js の TOOLS_DATA）
 * @returns {number} 表示したツールの数（場所が見つからないときは 0）
 * @example showToolList("tool-list", TOOLS_DATA) // 4
 */
function showToolList(listId, tools) {
  const list = document.getElementById(listId);
  if (list === null) {
    console.warn("id「" + listId + "」のツールの場所が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return 0;
  }

  const result = validateTools(tools);
  reportToolProblems(result);

  list.textContent = "";
  result.validTools.forEach(function (tool, position) {
    const item = createToolRow(tool);
    if (position === 0) {
      item.className = "first";
    }
    list.appendChild(item);
  });
  if (result.validTools.length === 0) {
    list.appendChild(createEmptyRow());
  }
  return result.validTools.length;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getImageAlt, createToolRow, createEmptyRow, reportToolProblems, showToolList };
}
