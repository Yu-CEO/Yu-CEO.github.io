/*
 * toolbox_data.js：「Yuの道具箱」に並べる道具のデータ
 * 道具を増やす・リンクを差し替えるときは、このファイルの配列（[ ] の中）だけを書き換える。ほかのファイルは触らない。
 * 1件ごとに書く項目：
 *   genre（ジャンル："money"＝お金・NISA／"ai"＝AI・開発の道具／"life"＝ふだん使い）、name（名前・40文字以内）、
 *   note（Yuの一言・80文字以内。「使っています」など体験の言葉で書く）、
 *   linkType（"affiliate"＝紹介リンク（PR）／"official"＝公式リンク／"none"＝リンクなし）、
 *   url（affiliate・official のときだけ。https:// で始まる）、asp（affiliate のときだけ。site_config.js の ASP_LIST の id）、
 *   beaconUrl（affiliate のときだけ・任意。ASPのタグに入っている1×1の計測用画像のURL）、label（任意。ボタンの文言・20文字以内）
 * 提携が承認されたら：ASPの管理画面のタグ（HTML）はそのまま貼らず、「リンクのURL」と「計測用画像のURL」の2つだけを写して
 *   linkType を "affiliate"、asp・url・beaconUrl を書き換える（<script> は使わない）。
 * 形が正しくない項目は表示されない（toolbox_validate.js が検査する）。tests/toolbox_data.test.js で全項目が検査を通るかを確かめる。
 * toolbox_view.js から使われる。
 */

const TOOLBOX_DATA = [
  // お金・NISA（証券会社は紹介リンクの提携がないため、公式リンク）
  {
    genre: "money",
    name: "SBI証券",
    note: "NISAの積立のベースにしている口座です",
    linkType: "official",
    url: "https://www.sbisec.co.jp/"
  },
  {
    genre: "money",
    name: "楽天証券",
    note: "楽天のお買い物マラソンでたまったポイントの運用に使っています",
    linkType: "official",
    url: "https://www.rakuten-sec.co.jp/"
  },
  // AI・開発の道具
  {
    genre: "ai",
    name: "Gemini",
    note: "調べものや文章の下書きの相談相手として使っています",
    linkType: "official",
    url: "https://gemini.google.com/"
  },
  {
    genre: "ai",
    name: "Microsoft Copilot",
    note: "パソコンでのちょっとした調べものに使っています",
    linkType: "official",
    url: "https://copilot.microsoft.com/"
  },
  {
    genre: "ai",
    name: "VS Code",
    note: "このサイトは、AIと一緒にVS Codeで作っています",
    linkType: "official",
    url: "https://code.visualstudio.com/"
  },
  {
    genre: "ai",
    name: "ココナラ",
    note: "サイトや発信で使うイラストを発注するときに使っています",
    // A8.net の紹介リンク。タグの中のリンク先と計測用画像だけを写したもの
    linkType: "affiliate",
    asp: "a8",
    url: "https://px.a8.net/svt/ejp?a8mat=4BGLS7+2VLG1E+2PEO+1HN5LU",
    beaconUrl: "https://www18.a8.net/0.gif?a8mat=4BGLS7+2VLG1E+2PEO+1HN5LU"
  },
  // ふだん使い
  {
    genre: "life",
    name: "楽天市場",
    note: "楽天のお買い物マラソンでポイントをためています",
    // A8.net の紹介リンク（楽天市場用）。A8 のSNS用リンクのため計測用画像はない
    linkType: "affiliate",
    asp: "a8",
    url: "https://rpx.a8.net/svt/ejp?a8mat=4BGLS7+DOZOY+2HOM+6GRMR&rakuten=y&a8ejpredirect=http%3A%2F%2Fhb.afl.rakuten.co.jp%2Fhgc%2F0ea62065.34400275.0ea62066.204f04c0%2Fa26111582720_4BGLS7_DOZOY_2HOM_6GRMR%3Fpc%3Dhttp%253A%252F%252Fwww.rakuten.co.jp%252F%26m%3Dhttp%253A%252F%252Fm.rakuten.co.jp%252F"
  },
  {
    genre: "life",
    name: "田中渓『億までの人 億からの人』",
    note: "愛読書です。お金との向き合い方に迷ったときに読み返しています",
    // もしもアフィリエイト（楽天ブックス）の紹介リンク。タグの中のリンク先と計測用画像だけを写したもの（表紙の画像は使わない）
    linkType: "affiliate",
    asp: "moshimo",
    url: "https://af.moshimo.com/af/c/click?a_id=5903105&p_id=54&pc_id=54&pl_id=616&url=https%3A%2F%2Fitem.rakuten.co.jp%2Fbook%2F18013288%2F&m=http%3A%2F%2Fm.rakuten.co.jp%2Fbook%2Fi%2F21397275%2F",
    beaconUrl: "https://i.moshimo.com/af/i/impression?a_id=5903105&p_id=54&pc_id=54&pl_id=616"
  },
  {
    genre: "life",
    name: "FIT-EASYの酸素ルーム",
    note: "ジムに行く日に使っていて、気に入っています",
    linkType: "official",
    url: "https://fit-easy.jp/"
  }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLBOX_DATA };
}
