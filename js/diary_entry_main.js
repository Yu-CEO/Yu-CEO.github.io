/*
 * diary_entry_main.js：日記1件のページ（diary/entry.html?date=YYYY-MM-DD）の入口。ページを開いたときの流れだけを書く
 * 1. 固定バーの「TikTokを見る」を、設定ファイルのURLが正しいときだけ出す（link_button.js）
 * 2. URLの ?date= の日記を読み込み、表示する。見つからないときは「見つかりませんでした」を出す（diary_load.js・diary_entry_view.js）
 * 3. 本文の最後の「オープンチャットで続きを話そう」を、正しいURLがあるときだけ出す（link_button.js）
 * diary/entry.html の最後に読み込まれる。
 */

// このページ（diary/ の中）から見た、ほかのファイルの場所
const DIARY_ENTRY_PATHS = {
  folder: "entries/",
  faceFile: "../assets/speakers.svg",
  listPage: "./"
};
// URLの ?date= の値。そのまま読み込みの場所には使わず、diary_load.js が一覧と照らしてから使う
const requestedDiaryDate = new URLSearchParams(location.search).get("date");

applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);

loadEntryByDate(DIARY_ENTRY_PATHS.folder, requestedDiaryDate).then(function (entry) {
  const area = document.getElementById("diary-entry");
  if (entry === null) {
    showDiaryNotFound(area, DIARY_ENTRY_PATHS);
    return;
  }
  showDiaryEntry(area, entry, DIARY_ENTRY_PATHS);
  applyLinkButton(DIARY_OPENCHAT_BUTTON_ID, SITE_CONFIG.LINE_OPENCHAT_URL);
});
