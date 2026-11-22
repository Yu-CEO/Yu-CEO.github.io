/*
 * diary_exit_view.js：日記1件のページの本文の最後の「出口」（オープンチャットのボタン・一覧へ戻る・Zenn の説明と文字リンク）を作る
 * 主な関数：createExitBox（出口全体）、createZennNote（Zenn の説明とリンク）
 * 使うもの：diary_parts.js の makeDiaryElement。diary_entry_view.js・diary_story_view.js・diary_story3_view.js（出口として）と
 * diary_entry_main.js（ボタンの id でURLを入れる）から使われる。tests/diary_views.test.js で確かめる。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
}

// オープンチャットのボタンの id。URLは diary_entry_main.js が link_button.js で入れる（正しいURLのときだけ出す）
const DIARY_OPENCHAT_BUTTON_ID = "diary-openchat";
// Zenn の説明＋文字リンクのまとまりの id と、リンクの id。URLは diary_entry_main.js が入れる（正しいURLのときだけまとまりごと出す）
const DIARY_ZENN_BOX_ID = "diary-zenn-box";
const DIARY_ZENN_LINK_ID = "diary-zenn";
/**
 * 出口の枠の中に置く、Zenn の説明の1行と文字のリンクを作る。ボタンではなく文字のリンク（ボタンは2つまでの決まりのため）。
 * 正しいURLがあるときだけ diary_entry_main.js が出すので、最初はまとまりごと隠しておく。
 * @returns {HTMLElement} 説明とリンクを入れたまとまり
 * @example createZennNote()
 */
function createZennNote() {
  const note = makeDiaryElement("div", "d-zenn", "");
  note.id = DIARY_ZENN_BOX_ID;
  note.hidden = true;
  note.appendChild(makeDiaryElement("p", "", "会議で決めたことの作り方は、記事にまとめています。"));
  const link = makeDiaryElement("a", "text-link", "作り方の記事を読む（Zenn）");
  link.id = DIARY_ZENN_LINK_ID;
  link.target = "_blank";
  link.rel = "noopener";
  note.appendChild(link);
  return note;
}

/**
 * 本文の最後の出口（「見るだけの参加もOK。」・緑のボタン・一覧へ戻る・その下に Zenn の説明と文字リンク）を作る。
 * Zenn の説明とリンクも最初は隠しておき、正しいURLがあるときだけ diary_entry_main.js が一緒に出す。
 * 緑のボタンは最初は隠しておき、正しいURLがあるときだけ diary_entry_main.js が出す。
 * @param {string} listPage 一覧ページの場所
 * @returns {HTMLElement} 出口の要素
 * @example createExitBox("./")
 */
function createExitBox(listPage) {
  const wrap = makeDiaryElement("div", "d-cta", "");
  const box = makeDiaryElement("div", "d-cta-box", "");
  box.appendChild(makeDiaryElement("p", "", "見るだけの参加もOK。"));
  const actions = makeDiaryElement("div", "actions", "");
  const openchat = makeDiaryElement("a", "btn btn-line", "オープンチャットで続きを話そう");
  openchat.id = DIARY_OPENCHAT_BUTTON_ID;
  openchat.target = "_blank";
  openchat.rel = "noopener";
  openchat.hidden = true;
  const back = makeDiaryElement("a", "btn btn-sub", "一覧へ戻る");
  back.href = listPage;
  actions.appendChild(openchat);
  actions.appendChild(back);
  box.appendChild(actions);
  box.appendChild(createZennNote());
  wrap.appendChild(box);
  return wrap;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createExitBox, createZennNote, DIARY_OPENCHAT_BUTTON_ID, DIARY_ZENN_BOX_ID, DIARY_ZENN_LINK_ID };
}
