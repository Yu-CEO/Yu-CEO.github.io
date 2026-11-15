/*
 * reveal_motion.js：パネルの中身が、スクロールで画面に入ったときに少し浮かび上がる動きをつける
 * 動きを減らす設定（prefers-reduced-motion: reduce）の人や、古いブラウザでは何もしない（中身は最初から見えたまま）。
 * 主な関数：startRevealMotion
 * main.js から使われる。動きそのものは css/style.css の「⑨ 動き」に書いている。
 */

// 画面に何割入ったら動かすか。0.2＝2割見えたら（早すぎず、遅すぎない目安）
const REVEAL_VISIBLE_RATIO = 0.2;
// 動きをつけてよいときに html につける印（css/style.css の .anim）
const REVEAL_ENABLED_CLASS = "anim";
// 動きの対象につける印と、画面に入ったあとにつける印（css/style.css の .reveal・.is-in）
const REVEAL_TARGET_SELECTOR = ".reveal";
const REVEAL_SHOWN_CLASS = "is-in";

/**
 * class="reveal" の部品が画面に入ったら、is-in の印をつけて浮かび上がらせる。
 * IntersectionObserver（部品が画面に入ったかを見張るブラウザの機能）を使う。
 * html に anim の印をつけるのは使えるとわかったあとだけにする（中身が透明のまま見えなくなるのを防ぐため）。
 * @returns {void}
 * @example startRevealMotion()
 */
function startRevealMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    return;
  }
  document.documentElement.classList.add(REVEAL_ENABLED_CLASS);
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add(REVEAL_SHOWN_CLASS);
        // 1回浮かび上がったら見張りをやめる（上に戻ったときに何度も動かさないため）
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: REVEAL_VISIBLE_RATIO });
  document.querySelectorAll(REVEAL_TARGET_SELECTOR).forEach(function (element) {
    observer.observe(element);
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { startRevealMotion };
}
