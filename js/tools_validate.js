/*
 * tools_validate.js：ツール一覧のデータが決まった形かを検査する（画面には触れない）
 * 主な関数：findToolProblems（1件の問題点を返す）、validateTools（正しい項目と問題点の一覧に分ける）
 * tools_view.js から使われる。tests/tools_validate.test.js・tests/tools_data.test.js でテストする。
 */

// 1件ごとに必ず必要な項目の名前
const REQUIRED_TOOL_FIELDS = ["name", "description", "url", "status"];
// status に使ってよい値。これ以外は書き間違いとして扱う
const ALLOWED_TOOL_STATUSES = ["公開中", "準備中"];
// URL の先頭として認める文字。javascript: など、押すとプログラムが動く危ないリンクを防ぐため https:// だけにする
// ルールを変えるときは、link_button.js の SAFE_BUTTON_URL_PREFIX も同じように変える
const SAFE_TOOL_URL_PREFIX = "https://";

/**
 * 値が「空でない文字」かどうかを調べる。空白だけの文字も空として扱う（画面に何も出ないため）。
 * @param {*} value 調べる値
 * @returns {boolean} 空でない文字なら true
 * @example isNonEmptyText("abc") // true
 * @example isNonEmptyText("  ")  // false
 * @example isNonEmptyText(123)   // false
 */
function isNonEmptyText(value) {
  if (typeof value !== "string") {
    return false;
  }
  return value.trim() !== "";
}

/**
 * ツール1件の問題点を調べて、日本語の説明の一覧を返す。問題がなければ空の配列を返す。
 * @param {*} tool ツール1件のデータ（{ name, description, url, status } の形のはず）
 * @returns {string[]} 問題点の説明の一覧
 * @example findToolProblems({ name: "A", description: "B", url: "https://x", status: "公開中" }) // []
 * @example findToolProblems({ description: "B", url: "https://x", status: "公開中" })
 *          // ["「name」がないか、空です"]
 */
function findToolProblems(tool) {
  // データが { } の形でない（文字や null など）ときは、項目を1つずつ調べられないので、ここで終える
  if (tool === null || typeof tool !== "object") {
    return ["{ } の形になっていません"];
  }

  const problems = [];
  REQUIRED_TOOL_FIELDS.forEach(function (fieldName) {
    if (!isNonEmptyText(tool[fieldName])) {
      problems.push("「" + fieldName + "」がないか、空です");
    }
  });

  // 空のときは上で報告済みなので、中身があるときだけ値を確かめる（同じ項目を二重に報告しないため）
  if (isNonEmptyText(tool.status) && !ALLOWED_TOOL_STATUSES.includes(tool.status)) {
    problems.push("「status」が「" + tool.status + "」になっています（「" + ALLOWED_TOOL_STATUSES.join("」か「") + "」にしてください）");
  }
  if (isNonEmptyText(tool.url) && !tool.url.startsWith(SAFE_TOOL_URL_PREFIX)) {
    problems.push("「url」が https:// で始まっていません");
  }
  return problems;
}

/**
 * ツール一覧のデータを、表示してよい項目と、問題のある項目の報告に分ける。
 * 問題のある項目があっても、ほかの正しい項目はそのまま返す（画面全体を止めないため）。
 * @param {*} tools ツール一覧のデータ（配列のはず）
 * @returns {{ validTools: object[], problemReports: { position: number, problems: string[] }[] }}
 *          validTools：表示してよい項目（データに書いた順）
 *          problemReports：問題のある項目。position は「何件目か」（1から数える）
 * @example validateTools([{ name: "A", description: "B", url: "https://x", status: "公開中" }])
 *          // { validTools: [そのままの1件], problemReports: [] }
 */
function validateTools(tools) {
  const result = { validTools: [], problemReports: [] };
  // 配列でないときは1件も表示できない。position 0 は「データ全体」の問題を表す
  if (!Array.isArray(tools)) {
    result.problemReports.push({ position: 0, problems: ["一覧のデータが [ ] の形（配列）になっていません"] });
    return result;
  }

  tools.forEach(function (tool, index) {
    const problems = findToolProblems(tool);
    if (problems.length === 0) {
      result.validTools.push(tool);
    } else {
      // index は0から数えるので、人が読む「何件目」に合わせて1を足す
      result.problemReports.push({ position: index + 1, problems: problems });
    }
  });
  return result;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { isNonEmptyText, findToolProblems, validateTools };
}
