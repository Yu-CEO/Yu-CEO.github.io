/*
 * site_config.js：設定値（LINE・TikTok・Zenn のURL・アクセス解析の設定と、道具箱で使うアフィリエイトサービスの一覧 ASP_LIST）をまとめたファイル
 * URLを変えるときは、このファイルの該当する1行だけを書き換える。
 * 空（""）にしたり、https:// で始まらない文字にしたりすると、そのボタンは表示されない（link_button.js が判定する）。
 * main.js から使われる（ASP_LIST は toolbox_view.js・toolbox_validate.js、ANALYTICS_* は analytics_main.js も使う）。
 */

const SITE_CONFIG = {
  // LINEオープンチャットのURL。ボタン「オープンチャットに参加」（メイン・上）に使う
  LINE_OPENCHAT_URL: "https://line.me/ti/g2/AqeWZKfg1cgkoQAFTDayDzp1tNAcG6-nuNjrlg",
  // LINE公式アカウントの友だち追加URL。ボタン「LINEで友だち追加」（サブ・下）に使う
  LINE_OFFICIAL_URL: "https://lin.ee/8W9x0HEb",
  // TikTokのアカウントのURL。ボタン「TikTokを見る」に使う
  TIKTOK_URL: "https://www.tiktok.com/@yu_from_l2w",
  // Zenn（エンジニア向けの記事サイト）の記事一覧のURL。文字のリンク「作り方の記事を読む（Zenn）」に使う
  ZENN_URL: "https://zenn.dev/yuceo",

  // ここから アクセス解析（GoatCounter）の設定。analytics_path.js・analytics_beacon.js が使う。止め方・始め方は README の「アクセス解析」
  // 計測のスイッチ。false にすると、どのページでも計測サービスと通信しない（JSを消さずに止められる）
  ANALYTICS_ENABLED: true,
  // 送り先のホスト名（「サイトコード.goatcounter.com」の形だけ。https:// は書かない）。
  // サイトコードは公開の値になるので、本名・会社名・仕事に関する言葉を入れない。
  // 空や形の違う値のときは送らない。ここを変えたら、3ページの CSP（img-src）も同じホスト名に直す（テストが確かめる）
  ANALYTICS_HOST: "yuceo.goatcounter.com",
  // 計測してよいページのホスト名（公開サイト）。手元のサーバーや file:// で開いたときは送らない
  ANALYTICS_PUBLIC_HOST: "yu-ceo.github.io",
  // Google タグマネージャーのコンテナID（GTM-で始まる。公開の値）。空にすると GTM は読み込まない（gtm_loader.js）。
  // 読み込む条件は GoatCounter と同じ（ANALYTICS_ENABLED・公開サイト・トラッキングしない）
  GTM_ID: "GTM-PH2VNGMC"
};

// 道具箱で使うアフィリエイトサービス（ASP：紹介リンクを発行する会社）の一覧。toolbox_validate.js・toolbox_view.js が使う。
// 1件ごとに id（toolbox_data.js の asp に書く名前）・name（注意書きに出す名前）・
// linkHosts（紹介リンクとして認めるホスト名）・beaconHosts（計測用画像として認めるホスト名）を書く。
// ここにないホストの紹介リンク・計測用画像は表示しない（知らない外部のサイトと通信しないため）。
// 「*.a8.net」のような広い書き方はせず、ホスト名を1つずつ書く。ASPを増やすときは1件足すだけでよい。
const ASP_LIST = [
  {
    id: "a8",
    name: "A8.net",
    // px.a8.net：ふつうの紹介リンク／rpx.a8.net：楽天市場用の紹介リンク
    linkHosts: ["px.a8.net", "rpx.a8.net"],
    // 計測用画像のホストは広告ごとに番号が違う。新しいタグの番号が違うときは、ここに1つ足す
    beaconHosts: ["www18.a8.net"]
  },
  {
    id: "moshimo",
    name: "もしもアフィリエイト",
    linkHosts: ["af.moshimo.com"],
    beaconHosts: ["i.moshimo.com"]
  }
];

// Node.js（ブラウザの外でJavaScriptを動かす仕組み。テストに使う）から require（別のファイルを読み込む命令）で
// 使えるようにする。module（Node.jsでファイルの外に渡すものを入れる箱）はブラウザにはないので、ブラウザでは何もしない
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SITE_CONFIG, ASP_LIST };
}
