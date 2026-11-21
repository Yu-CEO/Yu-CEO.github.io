/*
 * main.js：入口。ページを開いたときの流れだけを書く
 * 1. 「無料ツール」の1枚のパネル（1ツール＝1行）を作り、「無料ツールを見る」（大・丸ボタンの両方）の行き先を決める（tools_view.js）
 * 2. 設定ファイルのURLをもとに、TikTok・LINEのボタンとLINEパネル、「最新の日記」パネルの Zenn の文字リンクを出すか隠すかを切り替える（link_button.js）
 * 3. 道具箱のカードを並べ、PR表示と注意書きを出し分ける。0件ならパネルごと隠す（toolbox_view.js）
 * 4. ヒーローに「今日で、AI会社を始めて N 日目」と、ランダムに選んだ役員が Yu に提案・指摘する場面を出す（hero_advice.js）
 * 5. Yu の写真が読めないときの対応・背景の交互の色・スクロールの動きをつける（hero_image.js・panel_tone.js・reveal_motion.js）
 * 6. URLの #tool-list などの場所へ移動し直す（hash_jump.js）
 * 7. 最新の日記と「これまでの会議」を読み込み、出せたら日記パネルを出し、ヒーローの主役ボタンを「今日の会議を読む」にする（diary_latest_panel.js）
 * index.html の最後に読み込まれる。
 */

// 交互の背景の色をつけるパネル（最新の日記・無料ツール・LINE・道具箱・注意書き）
const TONED_PANELS = "#tool-area .panel, #diary-latest, #line-panel, #toolbox, #note";

const shownToolCount = showToolPanels("tool-area", TOOLS_DATA);
const toolsTarget = getToolsJumpTarget(shownToolCount);
document.getElementById("hero-tools").href = toolsTarget;
document.getElementById("hero-tools-pill").href = toolsTarget;

applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("hero-tiktok", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("hero-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("hero-zenn", SITE_CONFIG.ZENN_URL);
applyLinkButton("hero-line", SITE_CONFIG.LINE_OFFICIAL_URL);
applyLinkButton("line-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("diary-zenn", SITE_CONFIG.ZENN_URL);
applyLinkButton("line-official", SITE_CONFIG.LINE_OFFICIAL_URL);
const lineDecision = decideLineButtons(SITE_CONFIG.LINE_OPENCHAT_URL, SITE_CONFIG.LINE_OFFICIAL_URL);
setPanelVisible("line-panel", lineDecision.showPanel);
// 道具箱を出すか決めたあとで交互の色をつけるため、paintPanelTones より前に呼ぶ
showToolbox(TOOLBOX_DATA, ASP_LIST);

// 場面と日数は日記を読めなくても出す（名言の一覧は日記と別に持っているため）。今日の日付は端末のもの
const openedAt = new Date();
showHeroDays({ paragraphId: "hero-days", numberId: "hero-days-number", now: openedAt });
showHeroAdvice({ quotes: readBoardQuotes(), rand: Math.random, faceFile: SITE_CONFIG.SPEAKER_FACE_FILE });
hideImageIfBroken("hero-image");
// LINEパネルを出すか決めたあとに呼ぶ（隠れたパネルを飛ばして、交互の色をつけるため）
paintPanelTones(TONED_PANELS);
startRevealMotion();
// パネルを作り終えたあとで、URLの #tool-list などの場所へ移動し直す
jumpToHashTarget();

// 最新の日記は読み込みに少し時間がかかるので、出せたあとで背景の色をつけ直し、#diary-latest への移動もやり直す
showLatestDiary("diary/entries/", {
  faceFile: SITE_CONFIG.SPEAKER_FACE_FILE,
  entryPage: "diary/entry.html",
  heroFolder: "diary/heroes/",
  today: formatLocalDate(openedAt)
}).then(function (shown) {
  if (shown) {
    paintPanelTones(TONED_PANELS);
    jumpToHashTarget();
  }
});
