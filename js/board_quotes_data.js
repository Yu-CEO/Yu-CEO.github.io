/*
 * board_quotes_data.js：ヒーローの吹き出しに出す「AI役員の名言」の一覧（データだけ。計算・表示はしない）
 * 中身は、確定した「役員の名言の一覧」（13件）をそのまま写したもの。言葉を直さない。
 * 1件の形：speaker＝話した役員の名前、text＝吹き出しに出す文、date＝出典の日記の日付（YYYY-MM-DD）、
 * kind＝Yu への「提案」か「指摘」か（"teian"＝提案・7件／"shiteki"＝指摘・6件。ラベル「→ Yu へ提案／指摘」に使う。2026-11-21 決定）。
 * 秘書・アオイ・Yu の名言は載せない。足すときは「表を作る → 確認 → ここに1行足す」。
 * board_quote_pick.js（検査と選ぶ処理）と hero_advice.js（表示）から使われる。tests/board_quotes_data.test.js でテストする。
 */
const BOARD_QUOTES = [
  { speaker: "CMO", text: "金額を出さないなら、看板は「お金の額」ではなく「AI役員会議で人生の戦略を決める会社員」です。", date: "2026-11-14", kind: "teian" },
  { speaker: "CMO", text: "TikTokは、最後まで見られるか・繰り返し見られるかが効きます。…", date: "2026-11-16", kind: "teian" },
  { speaker: "CMO", text: "答えを先に出して、最後に次の行動を置きましょう。3つ同じ順にそろえます。", date: "2026-11-19", kind: "teian" },
  { speaker: "CFO", text: "効いたかどうかは数字で確かめます。…", date: "2026-11-16", kind: "teian" },
  { speaker: "CFO", text: "届かない動画を速く作っても、意味がありません。", date: "2026-11-20", kind: "shiteki" },
  { speaker: "CTO", text: "調整を6通り試しても、ほぼ変わりません。原因はデータです。…", date: "2026-11-18", kind: "shiteki" },
  { speaker: "CTO", text: "作る量に対して、見る人がほぼ0です。", date: "2026-11-20", kind: "shiteki" },
  { speaker: "CISO", text: "LINEボタンの白い文字は、背景の緑に対して読みづらい。ここは直すべきです。", date: "2026-11-15", kind: "shiteki" },
  { speaker: "CISO", text: "注意書きは消しません。置き場所を変えます。", date: "2026-11-19", kind: "teian" },
  { speaker: "ブランドディレクター", text: "海外の調査では、AIが作るコンテンツへの好感度は下がっているそうです。…", date: "2026-11-14", kind: "shiteki" },
  { speaker: "ブランドディレクター", text: "右上のDay表示は、実録である証拠です。…", date: "2026-11-16", kind: "teian" },
  { speaker: "プロデューサー", text: "AI役員会議は、毎回の動画の枠組み（相談→答え）として使いましょう。", date: "2026-11-14", kind: "teian" },
  { speaker: "プロデューサー", text: "Episode 01は言い換えで盛ってしまいました。…", date: "2026-11-16", kind: "shiteki" }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOARD_QUOTES };
}
