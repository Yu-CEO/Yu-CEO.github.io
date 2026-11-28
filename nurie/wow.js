// 開くたびの「wow」：色の組み合わせ・あいさつ・登場の演出を、前回と違うものにする
const THEMES = [
  ["#fff3b0", "#ffc2d9", "#ff4f8b", "#2bb7c9"], // いちごソーダ
  ["#c9f7ff", "#d9ffd0", "#0b8f7a", "#ffb020"], // ラムネ
  ["#ffe0c2", "#ffd1f0", "#e8590c", "#9b5de5"], // 夕やけ
  ["#e4dbff", "#c4ecff", "#6a4cff", "#ff7ab6"], // ゆめ空
  ["#fffbd1", "#bff5c9", "#d6336c", "#37b24d"], // 春の野原
];
const GREETINGS = ["今日の色は、どれかな？", "ようこそ。色の時間です。", "いい写真、ありますか？", "ちょっと、ひと休みしよう。", "きょうも会えたね。"];
const SHOWS = ["splash", "confetti", "balloons", "bubbles", "stars"];
const COLORS = ["#ff4f8b", "#ffb020", "#2bb7c9", "#7bd34f", "#9b5de5", "#ff6b4a"];

const sky = document.getElementById("sky");
const pen = sky.getContext("2d");
let pieces = [];
let running = false;

const random = (a, b) => a + Math.random() * (b - a);
const choose = (list) => list[Math.floor(Math.random() * list.length)];

// 前回と同じ番号にならないように選ぶ
function pickNew(name, length) {
  let last = -1;
  try { last = Number(localStorage.getItem(name) ?? -1); } catch { /* 保存できない環境では毎回自由に選ぶ */ }
  let next = Math.floor(Math.random() * length);
  if (next === last) next = (next + 1) % length;
  try { localStorage.setItem(name, next); } catch { /* 同上 */ }
  return next;
}

// 演出の部品を1つ作る
function piece(kind, x, y) {
  const p = { kind, x, y, vx: 0, vy: 0, g: 0, r: random(6, 16), color: choose(COLORS), age: 0, life: random(1.8, 3.2), spin: random(0, 6) };
  const angle = random(0, Math.PI * 2);
  const speed = random(80, 520);
  if (kind === "splash") Object.assign(p, { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, g: 260 });
  if (kind === "confetti") Object.assign(p, { y: random(-innerHeight * .6, 0), vx: random(-40, 40), vy: random(180, 380), life: 4 });
  if (kind === "balloons") Object.assign(p, { x: random(0, innerWidth), y: innerHeight + random(30, 300), vy: random(-340, -200), r: random(18, 34), life: 5 });
  if (kind === "bubbles") Object.assign(p, { x: random(0, innerWidth), y: innerHeight + random(0, 200), vy: random(-300, -120), r: random(8, 38), life: 5 });
  if (kind === "stars") Object.assign(p, { x: random(0, innerWidth), y: random(0, innerHeight), r: random(8, 24), age: -random(0, 1.5), life: 1.4 });
  return p;
}

function drawPiece(p) {
  const fade = Math.max(0, Math.min(1, (p.life - p.age) / .6));
  pen.globalAlpha = fade;
  pen.fillStyle = pen.strokeStyle = p.color;
  pen.save();
  pen.translate(p.x, p.y);
  pen.beginPath();
  if (p.kind === "confetti") {
    pen.rotate(p.spin + p.age * 5);
    pen.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
  } else if (p.kind === "stars") {
    const size = p.r * Math.sin(Math.PI * Math.min(1, p.age / p.life));
    for (let i = 0; i < 8; i++) {
      const d = i % 2 ? size * .35 : size * 1.4;
      pen.lineTo(Math.cos(i * Math.PI / 4) * d, Math.sin(i * Math.PI / 4) * d);
    }
    pen.fill();
  } else if (p.kind === "bubbles") {
    pen.lineWidth = 3;
    pen.arc(0, 0, p.r, 0, Math.PI * 2);
    pen.stroke();
  } else {
    pen.ellipse(0, 0, p.r, p.kind === "balloons" ? p.r * 1.25 : p.r, 0, 0, Math.PI * 2);
    pen.fill();
    if (p.kind === "balloons") { pen.moveTo(0, p.r * 1.25); pen.quadraticCurveTo(8, p.r * 2, 0, p.r * 2.8); pen.stroke(); }
  }
  pen.restore();
}

let before = 0;
function tick(now) {
  const dt = Math.min((now - before) / 1000, .05);
  before = now;
  pen.clearRect(0, 0, innerWidth, innerHeight);
  pieces = pieces.filter((p) => p.age < p.life);
  for (const p of pieces) {
    p.age += dt;
    if (p.age < 0) continue;
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    drawPiece(p);
  }
  running = pieces.length > 0;
  if (running) requestAnimationFrame(tick);
}

// 演出を出す（app.js からも呼ぶ）
function burst(kind = choose(SHOWS), x = innerWidth / 2, y = innerHeight * .28, count = 70) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < count; i++) pieces.push(piece(kind, x, y));
  if (!running) { running = true; before = performance.now(); requestAnimationFrame(tick); }
}

function resizeSky() {
  const ratio = devicePixelRatio || 1;
  sky.width = innerWidth * ratio;
  sky.height = innerHeight * ratio;
  pen.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function welcome() {
  resizeSky();
  const theme = THEMES[pickNew("nurie-theme", THEMES.length)];
  ["--bg1", "--bg2", "--main", "--sub"].forEach((name, i) => document.documentElement.style.setProperty(name, theme[i]));
  document.getElementById("greet").textContent = GREETINGS[pickNew("nurie-greet", GREETINGS.length)];

  // 題名を1文字ずつ落とす
  const title = document.getElementById("title");
  const letters = [...title.textContent];
  title.textContent = "";
  letters.forEach((letter, i) => {
    const span = document.createElement("span");
    span.textContent = letter;
    span.style.animationDelay = `${i * .07}s`;
    span.style.color = COLORS[i % COLORS.length];
    title.appendChild(span);
  });

  burst(SHOWS[pickNew("nurie-show", SHOWS.length)], innerWidth / 2, innerHeight * .28, 90);
}

addEventListener("resize", resizeSky);
// 画面のどこを触っても、絵の具が飛ぶ
addEventListener("pointerdown", (e) => burst("splash", e.clientX, e.clientY, 14));
welcome();
