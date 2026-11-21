/*
 * main.js：入口。ページを開いたときの流れだけを書く
 * 1. ツールのパネルを1件1枚で並べ、ヒーローの「無料ツールを見る」の行き先を決める（tools_view.js）
 * 2. 設定ファイルのURLをもとに、TikTok・LINEのボタンとLINEパネル、「最新の日記」パネルの Zenn の文字リンクを出すか隠すかを切り替える（link_button.js）
 * 3. 道具箱のカードを並べ、PR表示と注意書きを出し分ける。0件ならパネルごと隠す（toolbox_view.js）
 * 4. ヒーローに「今日の会議」の場面（机・顔・Day N・Yu の席の写真）を出す（meeting_scene.js）
 * 4b. 名言を1つランダムに選び、吹き出しで出す（scene_quote.js）
 * 5. Yu の写真が読めないときの対応・背景の交互の色・スクロールの動きをつける（hero_image.js・panel_tone.js・reveal_motion.js）
 * 6. URLの #tool-1 などの場所へ移動し直す（hash_jump.js）
 * 7. 最新の日記を読み込み、出せたら「最新の日記」パネルとヒーローの「会議の日記」ボタンを出す（diary_latest_panel.js）
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
applyLinkButton("diary-zenn", SITE_CONFIG.ZENN_URL);
applyLinkButton("line-official", SITE_CONFIG.LINE_OFFICIAL_URL);
const lineDecision = decideLineButtons(SITE_CONFIG.LINE_OPENCHAT_URL, SITE_CONFIG.LINE_OFFICIAL_URL);
setPanelVisible("line-panel", lineDecision.showPanel);
// 道具箱を出すか決めたあとで交互の色をつけるため、paintPanelTones より前に呼ぶ
showToolbox(TOOLBOX_DATA, ASP_LIST);

// 場面は日記を読めなくても出す（机・顔・Day N は日記のデータに頼らない）
showMeetingScene({ stageId: "hero-stage", faceFile: "assets/speakers.svg", now: new Date() });
// 名言の吹き出し：場面ができたあとで、一覧からランダムに1つ出す（選べなければ何も出さない）
showSceneQuote({ wrapId: "hero-quote-wrap", stageId: "hero-stage", quotes: readBoardQuotes(), rand: Math.random });
hideImageIfBroken("hero-image");
// LINEパネルを出すか決めたあとに呼ぶ（隠れたパネルを飛ばして、交互の色をつけるため）
paintPanelTones(TONED_PANELS);
startRevealMotion();
// パネルを作り終えたあとで、URLの #tool-1 などの場所へ移動し直す
jumpToHashTarget();

// 最新の日記は読み込みに少し時間がかかるので、出せたあとで背景の色をつけ直し、#diary-latest への移動もやり直す
showLatestDiary("diary/entries/", { faceFile: "assets/speakers.svg", entryPage: "diary/entry.html", heroFolder: "diary/heroes/" }).then(function (shown) {
  if (shown) {
    paintPanelTones(TONED_PANELS);
    jumpToHashTarget();
  }
});
