/*
 * bright_open.js：開くたびに、背景の色を前回と違うものにして、紙ふぶきを降らせる（見た目は css/bright.css）
 */
const BRIGHT_THEME_COUNT = 4;
const BRIGHT_CONFETTI_COLORS = ["#ff4f8b", "#ffb020", "#2bb7c9", "#7bd34f", "#9b5de5"];

// 前回の番号と違う番号を選ぶ。保存できない端末では、毎回自由に選ぶ
function pickBrightTheme() {
  let last = -1;
  try { last = Number(localStorage.getItem("portal-theme") ?? -1); } catch { last = -1; }
  let next = Math.floor(Math.random() * BRIGHT_THEME_COUNT);
  if (next === last) next = (next + 1) % BRIGHT_THEME_COUNT;
  try { localStorage.setItem("portal-theme", String(next)); } catch { return next; }
  return next;
}

// 紙ふぶき。落ち終わった紙は消す
function dropConfetti(count) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) {
    const paper = document.createElement("i");
    paper.className = "confetti";
    paper.setAttribute("aria-hidden", "true");
    paper.style.left = `${Math.random() * 100}%`;
    paper.style.background = BRIGHT_CONFETTI_COLORS[i % BRIGHT_CONFETTI_COLORS.length];
    paper.style.animationDuration = `${1.6 + Math.random() * 2}s`;
    paper.addEventListener("animationend", () => paper.remove());
    document.body.appendChild(paper);
  }
}

document.body.classList.add(`theme-${pickBrightTheme()}`);
dropConfetti(36);
