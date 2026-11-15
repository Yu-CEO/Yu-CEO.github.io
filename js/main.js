/*
 * main.js：入口。ページを開いたときの流れだけを書く
 * 1. ツール一覧のカードを並べる（tools_view.js）
 * 2. 設定ファイルのURLをもとに、TikTok・LINEのボタンを出すか隠すかを切り替える（link_button.js）
 * index.html の最後に読み込まれる。
 */

showToolList("tool-list", TOOLS_DATA);

applyLinkButton("tiktok-button", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("line-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("line-official", SITE_CONFIG.LINE_OFFICIAL_URL);
// 上の3行でボタンの表示・非表示が決まった後に呼ぶ（表示されているボタンの数を数えて、場所ごと隠すかを決めるため）
hideAreaIfNoButton("line-area");
