/*
 * tools_view.js：検査を通ったツールからカードを作り、画面の一覧の場所に並べる
 * 主な関数：showToolList（検査→問題の報告→カードの表示までの流れ）、createToolCard（カード1枚を作る）
 * 「公開中」は開くボタンつき、「準備中」はボタンなしのカードにする。
 * main.js から使われる。データは tools_data.js、検査は tools_validate.js。
 */

// 表示できるツールが1件もないときに、一覧の場所に出す文
const EMPTY_TOOL_LIST_MESSAGE = "ただいま準備中です";
// 開くボタンを出す状態の値（tools_validate.js で認めている値の1つ）
const STATUS_PUBLISHED = "公開中";

/**
 * 決まったタグ・クラス・文字で、画面の部品（要素）を1つ作る。
 * 文字は textContent（文字としてそのまま入れる書き方）で入れる。HTMLとして読まれないので、データに記号が入っても安全。
 * @param {string} tagName タグの名前（"div" など）
 * @param {string} className つけるクラス名（見た目の指定に使う名前）
 * @param {string} text 中に入れる文字
 * @returns {HTMLElement} 作った要素
 * @example createElementWithText("p", "tool-desc", "説明文")
 */
function createElementWithText(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * ツール1件ぶんのカードを作る。「公開中」なら開くボタン、「準備中」ならボタンなしにする。
 * @param {{ name: string, description: string, url: string, status: string }} tool 検査を通ったツール1件
 * @returns {HTMLElement} カードの要素
 * @example createToolCard({ name: "A", description: "B", url: "https://x", status: "公開中" })
 */
function createToolCard(tool) {
  const card = document.createElement("article");
  card.className = "card tool-card";

  const isPublished = tool.status === STATUS_PUBLISHED;
  let statusClass = "status status-preparing";
  if (isPublished) {
    statusClass = "status status-published";
  }

  const heading = document.createElement("div");
  heading.className = "tool-head";
  heading.appendChild(createElementWithText("h3", "tool-name", tool.name));
  heading.appendChild(createElementWithText("span", statusClass, tool.status));
  card.appendChild(heading);
  card.appendChild(createElementWithText("p", "tool-desc", tool.description));

  // 「準備中」はリンクを出さない（まだ開けないページへ移動させないため）
  if (isPublished) {
    const openButton = createElementWithText("a", "button button-tool", "開く");
    openButton.href = tool.url;
    // 外部のページは新しいタブで開く。noopener は、開いた先のページからこのページを操作されないようにする指定
    openButton.target = "_blank";
    openButton.rel = "noopener";
    card.appendChild(openButton);
  }
  return card;
}

/**
 * 問題のある項目を、ブラウザの開発者用の画面（コンソール）に日本語で出す。データを直す人のための表示。
 * @param {{ position: number, problems: string[] }[]} problemReports validateTools が返した問題の一覧
 * @returns {void}
 * @example reportToolProblems([{ position: 2, problems: ["「name」がないか、空です"] }])
 */
function reportToolProblems(problemReports) {
  problemReports.forEach(function (report) {
    let where = report.position + "件目";
    if (report.position === 0) {
      where = "データ全体";
    }
    console.warn(
      "ツール一覧のデータ（js/tools_data.js）の" + where + "が正しくないため、表示しませんでした：" +
      report.problems.join("／") + "。js/tools_data.js を直してください。"
    );
  });
}

/**
 * ツール一覧のデータを検査し、問題を報告してから、正しい項目だけをカードにして並べる。
 * 1件も表示できないときは「ただいま準備中です」と表示する。
 * @param {string} listId 一覧を入れる場所の id（index.html に書いたもの）
 * @param {*} tools ツール一覧のデータ（tools_data.js の TOOLS_DATA）
 * @returns {void}
 * @example showToolList("tool-list", TOOLS_DATA)
 */
function showToolList(listId, tools) {
  const listArea = document.getElementById(listId);
  if (listArea === null) {
    console.warn("id「" + listId + "」の一覧の場所が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return;
  }

  const result = validateTools(tools);
  reportToolProblems(result.problemReports);

  listArea.textContent = "";
  if (result.validTools.length === 0) {
    listArea.appendChild(createElementWithText("p", "card empty-message", EMPTY_TOOL_LIST_MESSAGE));
    return;
  }
  result.validTools.forEach(function (tool) {
    listArea.appendChild(createToolCard(tool));
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createToolCard, reportToolProblems, showToolList };
}
