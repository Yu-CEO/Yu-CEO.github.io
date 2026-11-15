/*
 * diary_list_main.js：日記の一覧ページ（diary/index.html）の入口。ページを開いたときの流れだけを書く
 * 1. 固定バーの「TikTokを見る」を、設定ファイルのURLが正しいときだけ出す（link_button.js）
 * 2. 日記を全部読み込み、検査を通ったものを新しい順に表示する（diary_load.js・diary_list_view.js）
 * diary/index.html の最後に読み込まれる。
 */

// このページ（diary/ の中）から見た、ほかのファイルの場所
const DIARY_LIST_PATHS = {
  folder: "entries/",
  faceFile: "../assets/speakers.svg",
  entryPage: "entry.html",
  homePage: "../"
};

applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);

loadAllCheckedEntries(DIARY_LIST_PATHS.folder).then(function (entries) {
  showDiaryList(
    document.getElementById("diary-list"),
    document.getElementById("diary-count"),
    entries,
    DIARY_LIST_PATHS
  );
});
