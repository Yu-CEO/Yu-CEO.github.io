/*
 * reveal_motion.js：下へ進むと、まだ画面の外にある区画が下から出てくる
 * 最初から見えている区画には何もしない（中身が見えないままになるのを防ぐため）。
 * 動きを減らす設定の人や、古いブラウザでは何もしない。主な関数：startRevealMotion
 * main.js から使われる。動きそのものは css/home_motion.css の .reveal・.off。
 */

/**
 * class="reveal" の部品のうち、画面より下にあるものに off の印をつけ、画面に入ったら外す。
 * IntersectionObserver（部品が画面に入ったかを見張るブラウザの機能）を使う。
 * @returns {void}
 * @example startRevealMotion()
 */
function startRevealMotion() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove("off");
        // 1回出たら見張りをやめる（上に戻ったときに何度も動かさないため）
        observer.unobserve(entry.target);
      }
    });
  });
  document.querySelectorAll(".reveal").forEach(function (element) {
    if (element.getBoundingClientRect().top > window.innerHeight) {
      element.classList.add("off");
      observer.observe(element);
    }
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { startRevealMotion };
}
