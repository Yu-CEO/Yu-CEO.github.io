/*
 * tools_view.js：検査を通ったツールから、1件1枚の全画面パネルを作って画面に並べる
 * 主な関数：showToolPanels（検査→問題の報告→パネルの表示までの流れ）、createToolPanel（パネル1枚を作る）、
 *           createEmptyPanel（0件のときの「ただいま準備中です」）、getToolsJumpTarget（「無料ツールを見る」の行き先）
 * 「公開中」は「開く」ボタンつき、「準備中」はボタンなし。画像がある項目はスクリーンショットも出す。
 * main.js から使われる。データは tools_data.js、検査は tools_validate.js、読めない画像を隠すのは hero_image.js。tests/tools_view.test.js でテストする。
 */

// 表示できるツールが1件もないときの見出しと説明（文言は確定済み。変えるときはここを直す）
const EMPTY_TOOLS_TITLE = "ただいま準備中です";
const EMPTY_TOOLS_DESCRIPTION = "ツールができたら、ここに並びます。";
// 開くボタンを出す状態の値（tools_validate.js で認めている値の1つ）
const STATUS_PUBLISHED = "公開中";
// パネルの id のつけ方。1件目は "tool-1"。ヒーローの「無料ツールを見る」の行き先にも使う
const TOOL_PANEL_ID_PREFIX = "tool-";
const EMPTY_PANEL_ID = "tools-empty";
// パネル上部の英字の小見出し（飾り）。番号はデータの順から自動でつける
const TOOL_EYEBROW_PREFIX = "FREE TOOL ";
const EMPTY_EYEBROW = "FREE TOOLS";
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
 * 番号を2けたの文字にする（小見出し「FREE TOOL 01」用）。
 * @param {number} number 1から数えた番号
 * @returns {string} 2けたの文字
 * @example toTwoDigits(1)  // "01"
 * @example toTwoDigits(12) // "12"
 */
function toTwoDigits(number) {
  return String(number).padStart(2, "0");
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
  image.className = "tool-shot";
  image.src = tool.image;
  image.alt = getImageAlt(tool);
  hideWhenBroken(image);
  return image;
}

/**
 * 「開く」ボタンを入れた、パネル下部のボタンの場所を作る。
 * @param {string} url ツールのURL（検査で https:// で始まることを確かめ済み）
 * @returns {HTMLElement} ボタンの場所
 * @example createOpenButtonArea("https://example.com/")
 */
function createOpenButtonArea(url) {
  const actions = document.createElement("div");
  actions.className = "actions";
  const openButton = createElementWithText("a", "btn btn-main", "開く");
  openButton.href = url;
  // 外部のページは新しいタブで開く。noopener は、開いた先のページからこのページを操作されないようにする指定
  openButton.target = "_blank";
  openButton.rel = "noopener";
  actions.appendChild(openButton);
  return actions;
}

/**
 * ツール1件ぶんの全画面パネルを作る。「公開中」なら「開く」ボタン、「準備中」ならボタンなしにする。
 * @param {{ name: string, description: string, url: string, status: string, image?: string, imageAlt?: string }} tool 検査を通ったツール1件
 * @param {number} position 何件目か（1から数える）。id と小見出しの番号に使う
 * @returns {HTMLElement} パネルの要素
 * @example createToolPanel({ name: "A", description: "B", url: "https://x", status: "公開中" }, 1)
 */
function createToolPanel(tool, position) {
  const panel = document.createElement("section");
  panel.className = "panel tool-panel";
  panel.id = TOOL_PANEL_ID_PREFIX + position;

  const isPublished = tool.status === STATUS_PUBLISHED;
  let statusClass = "status status-preparing";
  if (isPublished) {
    statusClass = "status status-published";
  }

  // reveal は、スクロールで少し浮かび上がる動きの対象につける印（reveal_motion.js）
  const body = document.createElement("div");
  body.className = "panel-body reveal";
  body.appendChild(createElementWithText("p", "eyebrow", TOOL_EYEBROW_PREFIX + toTwoDigits(position)));
  body.appendChild(createElementWithText("h2", "panel-title", tool.name));
  body.appendChild(createElementWithText("p", "panel-desc", tool.description));
  body.appendChild(createElementWithText("p", statusClass, tool.status));
  // 画像がないツールは、画像の場所を空けずに表示する
  if (typeof tool.image === "string" && tool.image !== "") {
    body.appendChild(createToolImage(tool));
  }
  panel.appendChild(body);

  // 「準備中」はリンクを出さない（まだ開けないページへ移動させないため）
  if (isPublished) {
    panel.appendChild(createOpenButtonArea(tool.url));
  }
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
  body.appendChild(createElementWithText("p", "eyebrow", EMPTY_EYEBROW));
  body.appendChild(createElementWithText("h2", "panel-title", EMPTY_TOOLS_TITLE));
  body.appendChild(createElementWithText("p", "panel-desc", EMPTY_TOOLS_DESCRIPTION));
  panel.appendChild(body);
  return panel;
}

/**
 * ヒーローの「無料ツールを見る」の行き先（ページ内の場所）を決める。画面には触れない。
 * @param {number} shownCount 表示したツールの数
 * @returns {string} 行き先（"#tool-1" か、0件なら "#tools-empty"）
 * @example getToolsJumpTarget(1) // "#tool-1"
 * @example getToolsJumpTarget(0) // "#tools-empty"
 */
function getToolsJumpTarget(shownCount) {
  if (shownCount > 0) {
    return "#" + TOOL_PANEL_ID_PREFIX + "1";
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
 * ツール一覧のデータを検査し、問題を報告してから、正しい項目だけを1件1枚のパネルにして並べる。
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
  result.validTools.forEach(function (tool, index) {
    area.appendChild(createToolPanel(tool, index + 1));
  });
  return result.validTools.length;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    getImageAlt, createToolPanel, createEmptyPanel, getToolsJumpTarget,
    reportToolProblems, showToolPanels, toTwoDigits
  };
}
