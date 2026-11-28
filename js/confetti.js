/*
 * confetti.js：紙ふぶきを降らせる。落ち終わった紙は消す
 * 主な関数：dropConfetti。動きは element.animate（JSから直接動かす仕組み）を使い、HTMLの style 属性は使わない。
 * 動きを減らす設定の人と、この仕組みがない古いブラウザには出さない。main.js・paint_view.js から使われる。
 */

const CONFETTI_MIN_MS = 1600;   // 落ちきるまでの最短の時間
const CONFETTI_RANGE_MS = 1800; // 紙ごとにばらつかせる幅

/**
 * 画面の上から紙ふぶきを降らせる。
 * @param {number} count 紙の枚数
 * @param {string[]} colors 紙の色（順に使う）
 * @returns {void}
 * @example dropConfetti(24, ["#ff4f8b", "#ffc233"])
 */
function dropConfetti(count, colors) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !document.body.animate) {
    return;
  }
  for (let index = 0; index < count; index++) {
    const paper = document.createElement("i");
    paper.className = "confetti";
    paper.setAttribute("aria-hidden", "true");
    document.body.appendChild(paper);
    const left = Math.random() * 100 + "vw";
    const color = colors[index % colors.length];
    const animation = paper.animate([
      { left: left, background: color, transform: "translateY(0) rotate(0deg)" },
      { left: left, background: color, transform: "translateY(105vh) rotate(720deg)" }
    ], { duration: CONFETTI_MIN_MS + Math.random() * CONFETTI_RANGE_MS, fill: "forwards" });
    animation.onfinish = function () {
      paper.remove();
    };
  }
}
