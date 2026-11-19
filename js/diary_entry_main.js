/*
 * diary_entry_main.js：日記1件のページ（diary/entry.html?date=YYYY-MM-DD）の入口。ページを開いたときの流れだけを書く
 * 1. 固定バーの「TikTokを見る」を、設定ファイルのURLが正しいときだけ出す（link_button.js）
 * 2. URLの ?date= の日記を読み込み、表示する。見つからないときは「見つかりませんでした」を出す（diary_load.js・diary_entry_view.js）
 *    〔v3〕形を見て、旧形式は diary_entry_view.js、新しい形（format 2）は diary_story_view.js で表示する
 * 3. 本文の最後の「オープンチャットで続きを話そう」と、Zenn の説明・リンクを、正しいURLがあるときだけ出す（link_button.js）
 * 4. 検索用の説明文をその日の抜粋にする。見つからないときは検索に載せない印を付ける（diary_page_meta.js）
 * diary/entry.html の最後に読み込まれる。
 */

// このページ（diary/ の中）から見た、ほかのファイルの場所
const DIARY_ENTRY_PATHS = {
  folder: "entries/",
  faceFile: "../assets/speakers.svg",
  listPage: "./",
  // 〔v3〕図（SVG）のフォルダ。図の場所は、検査を通った日付からだけ組み立てる（diary_figure_view.js）
  figureFolder: "figures/"
};
// URLの ?date= の値。そのまま読み込みの場所には使わず、diary_load.js が一覧と照らしてから使う
const requestedDiaryDate = new URLSearchParams(location.search).get("date");

applyLinkButton("bar-tiktok", SITE_CONFIG.TIKTOK_URL);

// 検索用の情報を直すときに使う、<head> の部品
const diaryPageMeta = {
  description: document.querySelector('meta[name="description"]'),
  head: document.head,
  documentObject: document
};

loadEntryByDate(DIARY_ENTRY_PATHS.folder, requestedDiaryDate).then(function (entry) {
  const area = document.getElementById("diary-entry");
  if (entry === null) {
    showDiaryNotFound(area, DIARY_ENTRY_PATHS);
    updateEntryPageMeta(null, diaryPageMeta);
    return;
  }
  showEntryByFormat(area, entry, DIARY_ENTRY_PATHS);
  updateEntryPageMeta(entry, diaryPageMeta);
  applyLinkButton(DIARY_OPENCHAT_BUTTON_ID, SITE_CONFIG.LINE_OPENCHAT_URL);
  // Zenn は説明の1行とリンクを一緒に出す・隠す（URLが使えないときに説明だけ残さないため）
  applyLinkButton(DIARY_ZENN_LINK_ID, SITE_CONFIG.ZENN_URL);
  setPanelVisible(DIARY_ZENN_BOX_ID, shouldShowLinkButton(SITE_CONFIG.ZENN_URL));
});
