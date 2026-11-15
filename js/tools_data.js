/*
 * tools_data.js：ツール一覧のデータ
 * ツールを増やすときは、このファイルの配列（[ ] の中）に1件足すだけでよい。ほかのファイルは触らない。
 * 1件ごとに name（名前）・description（一言説明）・url（https:// で始まる）・status（"公開中" か "準備中"）を書く。
 * 書いた順番で画面に並ぶ。形が正しくない項目は表示されない（tools_validate.js が検査する）。
 * tools_view.js から使われる。tests/tools_data.test.js で全項目が検査を通るかを確かめる。
 */

const TOOLS_DATA = [
  {
    name: "おかね収支シミュレーター",
    description: "NISAの積立とマンションの毎月の収支を、数字を入れるだけで計算できます",
    url: "https://yu-ceo.github.io/okane-simulator/",
    status: "公開中"
  }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLS_DATA };
}
