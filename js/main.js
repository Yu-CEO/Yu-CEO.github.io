/*
 * main.js：入口。ページを開いたときの流れだけを書く
 * 1. 今日の色と絵を選び（daily_pick.js）、塗れる絵を始める（paint_view.js）。会社づくりの日数を出す（company_days.js）
 * 2. AI役員の顔と発言を出す（officer_view.js）
 * 3. 無料の道具の一覧（tools_view.js）、設定のURLで TikTok・Zenn・LINE の出し分け（link_button.js）、道具箱（toolbox_view.js）
 * 4. 紙ふぶき・下から出る動き（confetti.js・reveal_motion.js）、URLの # の場所への移動（hash_jump.js）
 * 5. 最新の日記と前の3件を読み込む（diary_latest_panel.js）。失敗したら「もう一度読み込む」でやり直せる
 * index.html の最後に読み込まれる。
 */

const OPENING_CONFETTI = 24; // 開いたときの紙ふぶきの枚数

// 前回と違う番号を選んで返す（保存場所は端末の中だけ）
function pickForThisVisit(key, count) {
  return pickNewIndex(key, count, Math.random, function () {
    return window.localStorage;
  });
}

// 日記の区画を読み込む（読み直しにも使う）
function loadHomeDiary() {
  showLatestDiary("diary/entries/", { entryPage: "diary/entry.html", heroFolder: "diary/heroes/" }).then(function (shown) {
    // 日記が出ると下の区画の位置がずれるので、URLの # の場所へ移動し直す
    if (shown) {
      jumpToHashTarget();
    }
  });
}

const themeIndex = pickForThisVisit("home-theme", PAINT_PALETTES.length);
document.body.classList.add("theme-" + themeIndex);
startPaintCanvas(PAINT_SCENES[pickForThisVisit("home-scene", PAINT_SCENES.length)], PAINT_PALETTES[themeIndex]);
showCompanyDays(new Date());
showOfficers(OFFICER_QUOTES, pickForThisVisit("home-officer", OFFICER_QUOTES.length));

showToolList("tool-list", TOOLS_DATA);
applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);
applyLinkButton("diary-zenn", SITE_CONFIG.ZENN_URL);
applyLinkButton("line-openchat", SITE_CONFIG.LINE_OPENCHAT_URL);
applyLinkButton("line-official", SITE_CONFIG.LINE_OFFICIAL_URL);
setPanelVisible("line-panel", decideLineButtons(SITE_CONFIG.LINE_OPENCHAT_URL, SITE_CONFIG.LINE_OFFICIAL_URL).showPanel);
showToolbox(TOOLBOX_DATA, ASP_LIST);

dropConfetti(OPENING_CONFETTI, PAINT_PALETTES[themeIndex].fills);
startRevealMotion();
jumpToHashTarget();
document.getElementById("diary-retry").addEventListener("click", loadHomeDiary);
loadHomeDiary();
