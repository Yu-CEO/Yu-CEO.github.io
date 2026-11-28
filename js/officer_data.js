/*
 * officer_data.js：入口の「AI役員」の区画に出す、会議の日記に載った発言の一覧（データだけ）
 * 言葉は公開済みの日記（diary/entries/）の文のまま。「…」は後ろを省いた印。言い換えない・足さない。
 * 1件の形：face＝顔の絵（assets/faces/ の名前）、name＝名前、label＝顔の下の短い名前、role＝役の説明、text＝発言、date＝出典の日記の日付。
 * officer_view.js・main.js から使われる。tests/officer.test.js が、日記の発言と一致するかを確かめる。
 */

const OFFICER_QUOTES = [
  { face: "aoi", name: "アオイ", label: "アオイ", role: "リスナー代表", date: "2026-11-28",
    text: "13枚ずっと『私の動画が伸びない』話で、私に関係ある話が出てこない。" },
  { face: "secretary", name: "秘書", label: "秘書", role: "進行・記録", date: "2026-11-26",
    text: "二者択一にしなくてもよさそうです。…" },
  { face: "cmo", name: "CMO", label: "CMO", role: "発信の作戦", date: "2026-11-26",
    text: "お客さんが買うのは、仕組みではありません。「面倒な作業が1つ消える」ことです。…" },
  { face: "producer", name: "プロデューサー", label: "プロデューサー", role: "動画の構成", date: "2026-11-27",
    text: "漫画なら、役員どうしの対立も描けます。" },
  { face: "brand", name: "ブランドディレクター", label: "ブランド", role: "見た目・世界観", date: "2026-11-16",
    text: "右上のDay表示は、実録である証拠です。…" },
  { face: "cfo", name: "CFO", label: "CFO", role: "お金の管理", date: "2026-11-20",
    text: "届かない動画を速く作っても、意味がありません。" },
  { face: "cto", name: "CTO", label: "CTO", role: "開発", date: "2026-11-18",
    text: "調整を6通り試しても、ほぼ変わりません。原因はデータです。…" },
  { face: "ciso", name: "CISO", label: "CISO", role: "守り・リスク", date: "2026-11-19",
    text: "注意書きは消しません。置き場所を変えます。" }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OFFICER_QUOTES };
}
