/*
 * hero_image.js：画像が読み込めなかったときに、その画像だけを隠す
 * ヒーローの肖像（assets/yu.jpg）では、隠すと枠の中が代わりの色（夜の紺）になり、文字やボタンはそのまま使える。
 * ツールのスクリーンショットでも同じ関数を使う（tools_view.js）。
 * 主な関数：hideWhenBroken（画像の要素を受け取る）、hideImageIfBroken（id で画像を探して hideWhenBroken を呼ぶ）
 * main.js・tools_view.js から使われる。
 */

/**
 * 画像が読み込めない（ファイルがない・壊れている）ときに、その画像を隠す。
 * 壊れた画像の印や alt の文字が見えてしまわないようにするため。
 * この関数を呼ぶ前に読み込みが失敗している場合もあるので、「もう失敗しているか」も確かめる。
 * @param {HTMLImageElement} image 画像の要素
 * @returns {void}
 * @example hideWhenBroken(document.getElementById("hero-image"))
 */
function hideWhenBroken(image) {
  // complete（読み込みが終わった）なのに幅が0なら、読み込みに失敗している
  if (image.complete === true && image.naturalWidth === 0) {
    image.hidden = true;
    return;
  }
  image.addEventListener("error", function () {
    image.hidden = true;
  });
}

/**
 * id で画像を探し、読み込めないときに隠す。
 * @param {string} imageId 画像の id（index.html に書いたもの）
 * @returns {void}
 * @example hideImageIfBroken("hero-image")
 */
function hideImageIfBroken(imageId) {
  const image = document.getElementById(imageId);
  if (image === null) {
    return;
  }
  hideWhenBroken(image);
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { hideWhenBroken, hideImageIfBroken };
}
