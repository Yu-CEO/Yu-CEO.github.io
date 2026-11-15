/*
 * main.js：入口。ページを開いたときの流れだけを書く
 * 1. ツールのパネルを1件1枚で並べ、ヒーローの「無料ツールを見る」の行き先を決める（tools_view.js）
 * 2. 設定ファイルのURLをもとに、TikTok・LINEのボタンとLINEパネルを出すか隠すかを切り替える（link_button.js）
 * 3. 道具箱のカードを並べ、PR表示と注意書きを出し分ける。0件ならパネルごと隠す（toolbox_view.js）
 * 4. 肖像の画像が読めないときの対応・背景の交互の色・スクロールの動きをつける（hero_image.js・panel_tone.js・reveal_motion.js）
 * 5. URLの #tool-1 などの場所へ移動し直す（hash_jump.js）
 * 6. 最新の日記を読み込み、出せたら「最新の日記」パネルとヒーローの「会議の日記」ボタンを出す（diary_latest_panel.js）
 * index.html の最後に読み込まれる。
 */

// 交互の背景の色をつけるパネル（ツール・最新の日記・LINE・道具箱・注意書き）
const TONED_PANELS = "#tool-area .panel, #diary-latest, #line-panel, #toolbox, #note";

const shownToolCount = showToolPanels("tool-area", TOOLS_DATA);
document.getElementById("hero-tools").href = getToolsJumpTarget(shownToolCount);

applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("hero-tiktok", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("hero-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("line-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("line-official", SITE_CONFIG.LINE_OFFICIAL_URL);
const lineDecision = decideLineButtons(SITE_CONFIG.LINE_OPENCHAT_URL, SITE_CONFIG.LINE_OFFICIAL_URL);
setPanelVisible("line-panel", lineDecision.showPanel);
// 道具箱を出すか決めたあとで交互の色をつけるため、paintPanelTones より前に呼ぶ
showToolbox(TOOLBOX_DATA, ASP_LIST);

hideImageIfBroken("hero-image");
// LINEパネルを出すか決めたあとに呼ぶ（隠れたパネルを飛ばして、交互の色をつけるため）
paintPanelTones(TONED_PANELS);
startRevealMotion();
// パネルを作り終えたあとで、URLの #tool-1 などの場所へ移動し直す
jumpToHashTarget();

// 最新の日記は読み込みに少し時間がかかるので、出せたあとで背景の色をつけ直し、#diary-latest への移動もやり直す
showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html" }).then(function (shown) {
  if (shown) {
    paintPanelTones(TONED_PANELS);
    jumpToHashTarget();
  }
});
