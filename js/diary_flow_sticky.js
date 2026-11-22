/*
 * diary_flow_sticky.js：3版目の1件のページで、画面の上に付いてくる道しるべ（問題›意見›決定›結果›学び）の「今読んでいる節」と「読んだ量の線」を更新する
 * 主な関数：findCurrentStepIndex（今読んでいる節の番号を出す・計算だけ）、calcReadRatio（読んだ量の割合を出す・計算だけ）、
 *   startFlowSticky（スクロールに合わせて道しるべを更新する。画面を触るのはこの関数だけ）
 * 道しるべは押せない飾り（リンク・ボタン・目次にしない）。読み上げでは道しるべ全体の説明（aria-label）を1回だけ読み、
 * 節が変わるたびの読み上げは増やさない（aria-live を使わない）。外部ライブラリなし・動きのアニメーションなし。
 * diary_story3_view.js から使われる。tests/diary_v5.test.js で計算の部分をテストする。
 */

// 今読んでいる節の札につける印（css/diary_format3.css で青くする）
const FLOW_NOW_CLASS = "is-now";
// 読んだ量の線の長さを渡すCSS変数の名前（css/diary_format3.css の ::after の幅）
const FLOW_READ_VARIABLE = "--read";
// 道しるべの下に空けておく余白（px）。節の見出しが道しるべの真下に来たときに「その節を読んでいる」と見なすため
const FLOW_LINE_MARGIN = 24;
// 本文の先頭がこの距離（px）まで近づいたら「読み始めた」と見なす
const FLOW_START_MARGIN = 40;
// 道しるべが付くまでの固定バーの高さの初期値（px。バーが見つからないときだけ使う）
const FLOW_DEFAULT_BAR_HEIGHT = 52;

/**
 * 今読んでいる節の番号を出す。画面の「基準の線」より上に出ている節のうち、いちばん後ろのもの。
 * @param {number[]} targetTops 各節の上端の画面上の位置（道しるべの順）
 * @param {number} line 基準の線の位置
 * @returns {number} 節の番号（0から）。どの節も線より下なら 0
 * @example findCurrentStepIndex([-300, 20, 500], 100) // 1
 */
function findCurrentStepIndex(targetTops, line) {
  let current = 0;
  targetTops.forEach(function (top, index) {
    if (top <= line) {
      current = index;
    }
  });
  return current;
}

/**
 * 読んだ量の割合（0〜1）を出す。基準の線が本文の先頭から終わり（画面の下端が本文の終わりに着くところ）までのどこにあるか。
 * @param {number} bodyTop 本文の上端の画面上の位置
 * @param {number} bodyHeight 本文の高さ
 * @param {number} line 基準の線の位置
 * @param {number} viewportHeight 画面の高さ
 * @returns {number} 割合（0〜1）
 * @example calcReadRatio(0, 2000, 100, 800) // 100 / 1300
 */
function calcReadRatio(bodyTop, bodyHeight, line, viewportHeight) {
  const scrollable = Math.max(1, bodyHeight - viewportHeight + line);
  const ratio = (line - bodyTop) / scrollable;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * 道しるべの札と本文の節を結び、スクロールのたびに「今の節の札」と「読んだ量の線」を更新する。
 * @param {HTMLElement} flow 道しるべ（ol）
 * @param {HTMLElement[]} targets 札ごとの節の要素（道しるべの札と同じ順・同じ数）
 * @param {HTMLElement} body 本文全体の要素（読んだ量を測る）
 * @returns {void}
 * @example startFlowSticky(flow, [problemSection, linesSection, decisionSection, resultSection], body)
 */
function startFlowSticky(flow, targets, body) {
  const steps = Array.from(flow.querySelectorAll(".flow-step"));
  const bar = document.querySelector(".bar");
  function update() {
    let barHeight = FLOW_DEFAULT_BAR_HEIGHT;
    if (bar !== null) {
      barHeight = bar.offsetHeight;
    }
    const line = barHeight + flow.offsetHeight + FLOW_LINE_MARGIN;
    const tops = targets.map(function (target) {
      return target.getBoundingClientRect().top;
    });
    const bodyBox = body.getBoundingClientRect();
    const hasStarted = bodyBox.top < line + FLOW_START_MARGIN;
    const currentIndex = findCurrentStepIndex(tops, line);
    steps.forEach(function (step, index) {
      step.classList.toggle(FLOW_NOW_CLASS, hasStarted && index === currentIndex);
    });
    const ratio = calcReadRatio(bodyBox.top, bodyBox.height, line, window.innerHeight);
    flow.style.setProperty(FLOW_READ_VARIABLE, Math.round(ratio * 100) + "%");
  }
  // passive＝スクロールを止めないと約束する書き方（スクロールが重くならない）
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findCurrentStepIndex, calcReadRatio, startFlowSticky };
}
