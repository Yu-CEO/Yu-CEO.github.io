/*
 * site_config.js：設定値（LINE・TikTok のURL）をまとめたファイル
 * URLを変えるときは、このファイルの該当する1行だけを書き換える。
 * 空（""）にしたり、https:// で始まらない文字にしたりすると、そのボタンは表示されない（link_button.js が判定する）。
 * main.js から使われる。
 */

const SITE_CONFIG = {
  // LINEオープンチャットのURL。ボタン「オープンチャットに参加」（メイン・上）に使う
  LINE_OPENCHAT_URL: "https://line.me/ti/g2/AqeWZKfg1cgkoQAFTDayDzp1tNAcG6-nuNjrlg",
  // LINE公式アカウントの友だち追加URL。ボタン「LINEで友だち追加」（サブ・下）に使う
  LINE_OFFICIAL_URL: "https://lin.ee/8W9x0HEb",
  // TikTokのアカウントのURL。ボタン「TikTokを見る」に使う
  TIKTOK_URL: "https://www.tiktok.com/@yu_from_l2w"
};

// Node.js（ブラウザの外でJavaScriptを動かす仕組み。テストに使う）から require（別のファイルを読み込む命令）で
// 使えるようにする。module（Node.jsでファイルの外に渡すものを入れる箱）はブラウザにはないので、ブラウザでは何もしない
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SITE_CONFIG };
}
