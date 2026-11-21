/*
 * tools_view.js：検査を通ったツールから、「無料ツール」の1枚のパネル（1ツール＝1行）を作って画面に並べる（第3回で1枚にまとめた）
 * 主な関数：showToolPanels（検査→問題の報告→パネルの表示までの流れ）、createToolListPanel（パネル1枚を作る）、createToolRow（1行を作る）、
 *           createEmptyPanel（0件のときの「ただいま準備中です」）、getToolsJumpTarget（「無料ツールを見る」の行き先）
 * 「公開中」は行全体が新しいタブで開くリンク（「開く ›」つき）、「準備中」はリンクなし。画像がある項目は画面写真も出す。説明は省略しない。
 * main.js から使われる。データは tools_data.js、検査は tools_validate.js、読めない画像を隠すのは hero_image.js。tests/tools_view.test.js でテストする。
 */

// 表示できるツールが1件もないときの見出しと説明（文言は確定済み。変えるときはここを直す）
const EMPTY_TOOLS_TITLE = "ただいま準備中です";
const EMPTY_TOOLS_DESCRIPTION = "ツールができたら、ここに並びます。";
// 開くボタンを出す状態の値（tools_validate.js で認めている値の1つ）
const STATUS_PUBLISHED = "公開中";
// パネルの id。ヒーローの「無料ツールを見る」の行き先にも使う
const TOOL_LIST_PANEL_ID = "tool-list";
const EMPTY_PANEL_ID = "tools-empty";
// パネル上部の英字の小見出し（飾り）と見出し
const TOOL_EYEBROW = "FREE TOOLS";
const TOOL_LIST_TITLE = "無料ツール";
// パネルの説明文（仮の文言。CEOが変えたいときはここだけ直す）
const TOOL_LIST_DESCRIPTION = "会議で決めて作った道具です。登録なしで使えます。";
// 1行の右下の「開く」の文字
const TOOL_OPEN_LABEL = "開く ›";
// 行全体を押したときの読み上げ名のつけ足し
const TOOL_ROW_LABEL_SUFFIX = "を開く（新しいタブ）";
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
 * 行の文字の部分（名前・説明・状態・「開く ›」）を作る。
 * @param {{ name: string, description: string, status: string }} tool ツール1件
 * @returns {HTMLElement} 文字の部分の要素
 */
function createToolRowText(tool) {
  const text = document.createElement("span");
  text.appendChild(createElementWithText("p", "tl-name", tool.name));
  text.appendChild(createElementWithText("p", "tl-desc", tool.description));
  let statusClass = "status status-preparing";
  if (tool.status === STATUS_PUBLISHED) {
    statusClass = "status status-published";
  }
  const foot = document.createElement("span");
  foot.className = "tl-foot";
  foot.appendChild(createElementWithText("span", statusClass, tool.status));
  // 「準備中」は開けないので「開く ›」を出さない
  if (tool.status === STATUS_PUBLISHED) {
    foot.appendChild(createElementWithText("b", "", TOOL_OPEN_LABEL));
  }
  text.appendChild(foot);
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
  let row = document.createElement("div");
  if (tool.status === STATUS_PUBLISHED) {
    row = document.createElement("a");
    row.href = tool.url;
    // 外部のページは新しいタブで開く。noopener は、開いた先のページからこのページを操作されないようにする指定
    row.target = "_blank";
    row.rel = "noopener";
    row.setAttribute("aria-label", tool.name + TOOL_ROW_LABEL_SUFFIX);
  }
  row.className = "tl-row";
  // 画像がないツールは、画像の場所を空けずに表示する
  if (typeof tool.image === "string" && tool.image !== "") {
    row.appendChild(createToolImage(tool));
  }
  row.appendChild(createToolRowText(tool));
  item.appendChild(row);
  return item;
}

/**
 * 「無料ツール」の1枚のパネル（小見出し・見出し・説明・ツールの行のリスト）を作る。
 * @param {object[]} tools 検査を通ったツール（1件以上）
 * @returns {HTMLElement} パネルの要素
 * @example createToolListPanel([{ name: "A", description: "B", url: "https://x", status: "公開中" }])
 */
function createToolListPanel(tools) {
  const panel = document.createElement("section");
  panel.className = "panel tool-panel";
  panel.id = TOOL_LIST_PANEL_ID;
  // reveal は、スクロールで少し浮かび上がる動きの対象につける印（reveal_motion.js）
  const body = document.createElement("div");
  body.className = "panel-body reveal";
  body.appendChild(createElementWithText("p", "eyebrow", TOOL_EYEBROW));
  body.appendChild(createElementWithText("h2", "panel-title", TOOL_LIST_TITLE));
  body.appendChild(createElementWithText("p", "panel-desc", TOOL_LIST_DESCRIPTION));
  const list = document.createElement("ul");
  list.className = "tl-list";
  tools.forEach(function (tool) {
    list.appendChild(createToolRow(tool));
  });
  body.appendChild(list);
  panel.appendChild(body);
  return panel;
}

/**
 * 表示できるツールが0件のときのパネル（「ただいま準備中です」と説明）を作る。
 * @returns {HTMLElement} パネルの要素
 * @example createEmptyPanel()
 */
function createEmptyPanel() {
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = EMPTY_PANEL_ID;
  const body = document.createElement("div");
  body.className = "panel-body reveal";
  body.appendChild(createElementWithText("p", "eyebrow", TOOL_EYEBROW));
  body.appendChild(createElementWithText("h2", "panel-title", EMPTY_TOOLS_TITLE));
  body.appendChild(createElementWithText("p", "panel-desc", EMPTY_TOOLS_DESCRIPTION));
  panel.appendChild(body);
  return panel;
}

/**
 * ヒーローの「無料ツールを見る」の行き先（ページ内の場所）を決める。画面には触れない。
 * @param {number} shownCount 表示したツールの数
 * @returns {string} 行き先（"#tool-list" か、0件なら "#tools-empty"）
 * @example getToolsJumpTarget(1) // "#tool-list"
 * @example getToolsJumpTarget(0) // "#tools-empty"
 */
function getToolsJumpTarget(shownCount) {
  if (shownCount > 0) {
    return "#" + TOOL_LIST_PANEL_ID;
  }
  return "#" + EMPTY_PANEL_ID;
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
 * ツール一覧のデータを検査し、問題を報告してから、正しい項目だけを1枚のパネル（1ツール＝1行）にして並べる。
 * 1件も表示できないときは「ただいま準備中です」のパネルを出す。
 * @param {string} areaId パネルを入れる場所の id（index.html に書いたもの）
 * @param {*} tools ツール一覧のデータ（tools_data.js の TOOLS_DATA）
 * @returns {number} 表示したツールの数（場所が見つからないときは 0）
 * @example showToolPanels("tool-area", TOOLS_DATA) // 1
 */
function showToolPanels(areaId, tools) {
  const area = document.getElementById(areaId);
  if (area === null) {
    console.warn("id「" + areaId + "」のツールの場所が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return 0;
  }

  const result = validateTools(tools);
  reportToolProblems(result);

  area.textContent = "";
  if (result.validTools.length === 0) {
    area.appendChild(createEmptyPanel());
    return 0;
  }
  area.appendChild(createToolListPanel(result.validTools));
  return result.validTools.length;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getImageAlt, createToolListPanel, createToolRow, createEmptyPanel, getToolsJumpTarget,
    reportToolProblems, showToolPanels
  };
}
