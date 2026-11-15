/*
 * hash_jump.js：URLの「#」のあとに書かれた場所（例：#tool-1）へ移動し直す
 * ツールのパネルはページを開いたあとにJSで作るので、ブラウザが最初に移動しようとした時点ではまだない。
 * そのため、パネルを作り終えたあとで移動し直す。
 * 主な関数：jumpToHashTarget
 * main.js の最後で使われる。
 */

/**
 * URLの「#」のあとに書かれた id の場所へ移動する。# がない・その場所がないときは何もしない。
 * @returns {void}
 * @example jumpToHashTarget() // URLが …/#tool-1 なら、1件目のツールのパネルへ移動する
 */
function jumpToHashTarget() {
  if (location.hash === "") {
    return;
  }
  const target = document.getElementById(location.hash.slice(1));
  if (target !== null) {
    target.scrollIntoView();
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { jumpToHashTarget };
}
