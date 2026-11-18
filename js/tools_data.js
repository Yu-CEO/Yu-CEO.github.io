/*
 * tools_data.js：ツール一覧のデータ
 * ツールを増やすときは、このファイルの配列（[ ] の中）に1件足すだけでよい。ほかのファイルは触らない。
 * 1件ごとに name（名前）・description（一言説明）・url（https:// で始まる）・status（"公開中" か "準備中"）を書く。
 * 画像を載せるときだけ、image（assets/ の中の画像ファイル。例 "assets/tool_a.jpg"）と imageAlt（画像の短い説明）も書く。
 * 画像の説明がないときは「（ツール名）の画面」が代わりに使われる。画像がないツールは、この2つを書かない。
 * 書いた順番で画面に並ぶ。形が正しくない項目は表示されない（tools_validate.js が検査する）。
 * tools_view.js から使われる。tests/tools_data.test.js で全項目が検査を通るかを確かめる。
 */

const TOOLS_DATA = [
  {
    name: "おかね収支シミュレーター",
    description: "NISAの積立とマンションの毎月の収支を、数字を入れるだけで計算できます",
    url: "https://yu-ceo.github.io/okane-simulator/",
    status: "公開中",
    image: "assets/tool_simulator.jpg",
    imageAlt: "おかね収支シミュレーターの画面（NISA積立の計算例）"
  },
  {
    name: "ショート動画のかんたん診断",
    description: "縦のショート動画を選ぶだけで、冒頭3秒や無音など6つの項目を、伸びる動画の目安と比べます（動画は端末の外へ送りません）",
    url: "https://yu-ceo.github.io/video-check/",
    status: "公開中",
    image: "assets/tool_video_check.jpg",
    imageAlt: "ショート動画のかんたん診断の最初の画面"
  },
  {
    name: "為替の動く幅（学習用）",
    description: "米ドル／円が過去にどれくらいの幅で動いたかを見て学べます。売買のタイミングや方向を示すものではありません",
    url: "https://yu-ceo.github.io/fx-simulator/",
    status: "公開中",
    image: "assets/tool_fx_simulator.jpg",
    imageAlt: "為替の動く幅（学習用）の最初の画面"
  }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLS_DATA };
}
