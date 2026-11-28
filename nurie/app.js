// 写真 → 線画 → 一区画ずつ色が入る動画。すべて端末の中で処理し、通信はしない
const WIDTH = 720;      // 動画の横幅
const SECONDS = 12;     // 動画の長さ（アオイの声が長いときは伸ばす）
const COLOR_END = 7;    // この秒までに塗り終わる
const AOI_AT = 8.2;     // この秒からアオイの一言

const view = document.getElementById("view");
const screen2d = view.getContext("2d");
const statusText = document.getElementById("status");
const saveLink = document.getElementById("save");
const buttons = ["again", "other"].map((id) => document.getElementById(id));

let work = null;     // 作った線画・色・塗る順番
let playing = false;
let audio = null;

/* ---------- 画像の下ごしらえ ---------- */

// 写真を横720pxにそろえる（縦長すぎる・横長すぎる写真は中央を切り出す）
function fitImage(image) {
  const ratio = Math.min(16 / 9, Math.max(9 / 16, image.height / image.width));
  const w = WIDTH;
  const h = Math.round(WIDTH * ratio / 2) * 2;
  const canvas = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const scale = Math.max(w / image.width, h / image.height);
  const pen = canvas.getContext("2d", { willReadFrequently: true });
  pen.fillStyle = "#fff";
  pen.fillRect(0, 0, w, h);
  pen.drawImage(image, (w - image.width * scale) / 2, (h - image.height * scale) / 2, image.width * scale, image.height * scale);
  return pen.getImageData(0, 0, w, h);
}

// まわりの平均をとってぼかす（横→縦）
function blur(values, w, h, radius) {
  const pass = (src, length, lines, step, lineStep) => {
    const out = new Float32Array(src.length);
    for (let l = 0; l < lines; l++) {
      const start = l * lineStep;
      const at = (i) => src[start + Math.min(length - 1, Math.max(0, i)) * step];
      let sum = 0;
      for (let i = -radius; i <= radius; i++) sum += at(i);
      for (let i = 0; i < length; i++) {
        out[start + i * step] = sum / (radius * 2 + 1);
        sum += at(i + radius + 1) - at(i - radius);
      }
    }
    return out;
  };
  return pass(pass(values, w, h, 1, w), h, w, w, 1);
}

// 色の変わり目を線にする（白い紙に黒い線）
function lineArt(pixels, w, h) {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = pixels[i * 4] * .3 + pixels[i * 4 + 1] * .59 + pixels[i * 4 + 2] * .11;
  const fine = blur(gray, w, h, 1);
  const wide = blur(gray, w, h, 4);
  const paper = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const dark = wide[i] - fine[i]; // 周りより暗い所ほど大きい
    paper[i] = 255 - Math.max(0, dark - 2.5) * 38;
  }
  return paper;
}

// 色を明るく、あざやかにする
function brighten(pixels) {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < out.length; i += 4) {
    const mean = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    for (let c = 0; c < 3; c++) out[i + c] = (mean + (pixels[i + c] - mean) * 1.35) * 1.04 + 8;
  }
  return out;
}

/* ---------- 区画と塗る順番 ---------- */

// 近くて色が似ている点を同じ区画にまとめる
function regions(pixels, w, h, size = 36) {
  const cols = Math.ceil(w / size);
  const rows = Math.ceil(h / size);
  let seeds = [];
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const x = Math.min(w - 1, Math.floor((gx + Math.random()) * size));
      const y = Math.min(h - 1, Math.floor((gy + Math.random()) * size));
      const i = (y * w + x) * 4;
      seeds.push({ x, y, r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
    }
  }
  const label = new Int32Array(w * h);
  for (let round = 0; round < 3; round++) {
    const sums = seeds.map(() => ({ x: 0, y: 0, r: 0, g: 0, b: 0, n: 0 }));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const gx = Math.floor(x / size);
        const gy = Math.floor(y / size);
        let best = Infinity;
        for (let ny = Math.max(0, gy - 1); ny <= Math.min(rows - 1, gy + 1); ny++) {
          for (let nx = Math.max(0, gx - 1); nx <= Math.min(cols - 1, gx + 1); nx++) {
            const k = ny * cols + nx;
            const s = seeds[k];
            const far = (x - s.x) ** 2 + (y - s.y) ** 2
              + ((pixels[p * 4] - s.r) ** 2 + (pixels[p * 4 + 1] - s.g) ** 2 + (pixels[p * 4 + 2] - s.b) ** 2) * .6;
            if (far < best) { best = far; label[p] = k; }
          }
        }
        const t = sums[label[p]];
        t.x += x; t.y += y; t.r += pixels[p * 4]; t.g += pixels[p * 4 + 1]; t.b += pixels[p * 4 + 2]; t.n++;
      }
    }
    seeds = seeds.map((s, k) => {
      const t = sums[k];
      return t.n ? { x: t.x / t.n, y: t.y / t.n, r: t.r / t.n, g: t.g / t.n, b: t.b / t.n } : s;
    });
  }
  return { label, seeds };
}

// 各区画の「色が入る秒」：はじめは8つを1つずつ → 一気に広がる → 一番あざやかな所が最後
function schedule(seeds, w, h) {
  const vivid = (s) => Math.max(s.r, s.g, s.b) - Math.min(s.r, s.g, s.b);
  const order = seeds.map((_, k) => k).sort(() => Math.random() - .5);
  const stars = [...order].sort((a, b) => vivid(seeds[b]) - vivid(seeds[a]))
    .slice(0, Math.round(seeds.length * .08))
    .filter((k) => vivid(seeds[k]) > 60);
  const rest = order.filter((k) => !stars.includes(k));
  const first = rest.splice(0, 8);
  const from = { x: Math.random() * w, y: Math.random() * h };
  const distance = (k) => Math.hypot(seeds[k].x - from.x, seeds[k].y - from.y) + Math.random() * 160;
  const far = new Map(rest.map((k) => [k, distance(k)]));
  rest.sort((a, b) => far.get(a) - far.get(b));

  const time = new Float32Array(seeds.length);
  const pops = first.map((_, i) => .8 + i * .22);
  first.forEach((k, i) => { time[k] = pops[i]; });
  rest.forEach((k, i) => { time[k] = 2.7 + 3 * (i / rest.length) ** .6; });
  stars.sort((a, b) => seeds[b].y - seeds[a].y).forEach((k, i) => { time[k] = 5.9 + (COLOR_END - 6) * (i / stars.length); });
  return { time, pops };
}

function prepare(image) {
  const source = fitImage(image);
  const { width: w, height: h, data } = source;
  const line = lineArt(data, w, h);
  const color = brighten(data);
  const { label, seeds } = regions(data, w, h);
  const { time, pops } = schedule(seeds, w, h);
  const when = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) when[i] = time[label[i]];
  view.width = w;
  view.height = h;
  const words = aoiWords(); // 作った時間に合わせた一言
  return { w, h, line, color, when, pops, words, frame: screen2d.createImageData(w, h) };
}

/* ---------- 描画・音・録画 ---------- */

function drawFrame(sec) {
  const { w, h, line, color, when, words, frame } = work;
  const out = frame.data;
  const finish = Math.min(1, Math.max(0, (sec - COLOR_END - .2) / .8)); // 最後は線を消して仕上がりの絵に
  for (let i = 0; i < w * h; i++) {
    const age = sec - when[i];
    const alpha = age <= 0 ? 0 : Math.min(1, age / .2);
    const flash = age > 0 && age < .35 ? (1 - age / .35) * 90 : 0; // 塗った瞬間に光る
    const shade = (line[i] / 255) * (1 - finish) + finish;
    for (let c = 0; c < 3; c++) {
      const painted = color[i * 4 + c] * (.25 + .75 * shade) + flash;
      out[i * 4 + c] = line[i] * (1 - alpha) + painted * alpha;
    }
    out[i * 4 + 3] = 255;
  }
  screen2d.putImageData(frame, 0, 0);
  drawSparkles(sec - COLOR_END);
  drawAoi(screen2d, w, h, words, sec - AOI_AT);
}

// 塗り終わった瞬間のキラキラ
function drawSparkles(age) {
  if (age < 0 || age > 2) return;
  screen2d.fillStyle = "#fff";
  for (let n = 0; n < 40; n++) {
    const x = (n * 197.3) % work.w;
    const y = (n * 431.7) % work.h;
    const size = Math.max(0, Math.sin((age * 1.6 - (n % 10) * .12) * Math.PI)) * (8 + (n % 5) * 4);
    screen2d.beginPath();
    for (let i = 0; i < 8; i++) {
      const d = i % 2 ? size * .25 : size;
      screen2d.lineTo(x + Math.cos(i * Math.PI / 4) * d, y + Math.sin(i * Math.PI / 4) * d);
    }
    screen2d.fill();
  }
}

// 色が入るたびに音階が上がるオルゴール風の合成音
function playSound(outputs) {
  const start = audio.currentTime;
  const scale = [261.6, 293.7, 329.6, 392.0, 440.0];
  const pitch = (n) => scale[n % 5] * 2 ** Math.floor(n / 5);
  const note = (at, freq, length, volume) => {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = freq;
    gain.gain.setValueAtTime(0, start + at);
    gain.gain.linearRampToValueAtTime(volume, start + at + .01);
    gain.gain.exponentialRampToValueAtTime(.001, start + at + length);
    tone.connect(gain);
    outputs.forEach((o) => gain.connect(o));
    tone.start(start + at);
    tone.stop(start + at + length);
  };
  work.pops.forEach((at, n) => note(at, pitch(n), .9, .22));
  for (let n = 0; n < 22; n++) note(2.7 + n * .14, pitch(5 + n % 10), .4, .1);
  note(AOI_AT, 880, .5, .16); // 吹き出しが出る「ぽん」
  [523.3, 659.3, 784.0, 1046.5].forEach((f, k) => note(COLOR_END + .1 * k, f, 2.4, .15));
}

// アオイの声（埋め込んだ文字データ）を、鳴らせる形にする
async function aoiVoice(words) {
  const data = AOI_VOICES[words.join("")];
  if (!data) return null;
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  return audio.decodeAudioData(bytes.buffer).catch(() => null);
}

// 吹き出しが出た少し後に読み上げる
function speak(voice, outputs) {
  if (!voice) return;
  const source = audio.createBufferSource();
  source.buffer = voice;
  outputs.forEach((o) => source.connect(o));
  source.start(audio.currentTime + AOI_AT + .3);
}

// 画面と音をまとめて録画する。対応していない端末では null
function startRecorder(sound) {
  if (!window.MediaRecorder || !view.captureStream) return null;
  const type = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm"].find((t) => MediaRecorder.isTypeSupported(t));
  if (!type) return null;
  const stream = new MediaStream([...view.captureStream(30).getTracks(), ...sound.stream.getTracks()]);
  const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => offerDownload(new Blob(chunks, { type }));
  recorder.start();
  return recorder;
}

function offerDownload(blob) {
  if (saveLink.href) URL.revokeObjectURL(saveLink.href);
  saveLink.href = URL.createObjectURL(blob);
  saveLink.download = `nurie.${blob.type.includes("mp4") ? "mp4" : "webm"}`;
  saveLink.hidden = false;
}

async function play() {
  if (playing) return;
  playing = true;
  saveLink.hidden = true;
  buttons.forEach((b) => { b.hidden = true; });
  statusText.textContent = "🎨 色が戻っています…（画面はこのまま）";
  const voice = await aoiVoice(work.words);
  const length = Math.max(SECONDS, AOI_AT + .3 + (voice?.duration ?? 0) + 1);

  const sound = audio.createMediaStreamDestination();
  drawFrame(0);
  const recorder = startRecorder(sound);
  playSound([audio.destination, sound]);
  speak(voice, [audio.destination, sound]);
  const begin = performance.now();

  const step = (now) => {
    const sec = (now - begin) / 1000;
    drawFrame(Math.min(sec, length));
    if (sec < length) return requestAnimationFrame(step);
    playing = false;
    recorder?.stop();
    buttons.forEach((b) => { b.hidden = false; });
    statusText.textContent = recorder ? "✨ できました！" : "✨ できました！（この端末は動画の保存に未対応です）";
    burst("confetti");
  };
  requestAnimationFrame(step);
}

/* ---------- 操作 ---------- */

function showStage() {
  document.getElementById("start").hidden = true;
  document.getElementById("stage").hidden = false;
  saveLink.hidden = true;
  buttons.forEach((b) => { b.hidden = true; });
  statusText.textContent = "✏️ 線画を描いています…";
}

function begin(image) {
  showStage();
  // 画面の表示を先に更新してから、重い計算をする
  setTimeout(() => {
    try {
      work = prepare(image);
      play();
    } catch {
      statusText.textContent = "うまく作れませんでした。別の写真でためしてください。";
      document.getElementById("other").hidden = false;
    }
  }, 60);
}

// 音はボタンを押した直後に用意しないと鳴らない
function readyAudio() {
  audio ??= new AudioContext();
  audio.resume();
}

// 写真がなくても試せる見本の絵
function sampleImage() {
  const canvas = Object.assign(document.createElement("canvas"), { width: 720, height: 960 });
  const pen = canvas.getContext("2d");
  const circle = (x, y, r, color) => { pen.fillStyle = color; pen.beginPath(); pen.arc(x, y, r, 0, Math.PI * 2); pen.fill(); };
  const sea = pen.createLinearGradient(0, 0, 0, 960);
  sea.addColorStop(0, "#5ec8f2"); sea.addColorStop(.55, "#ffe3a3"); sea.addColorStop(.56, "#2f9fc4"); sea.addColorStop(1, "#176b99");
  pen.fillStyle = sea;
  pen.fillRect(0, 0, 720, 960);
  circle(540, 200, 90, "#ffcf33");
  [[120, 180], [170, 160], [220, 185], [330, 330], [375, 315]].forEach(([x, y]) => circle(x, y, 45, "#ffffff"));
  pen.fillStyle = "#4c9a4a";
  pen.beginPath(); pen.moveTo(0, 540); pen.quadraticCurveTo(200, 300, 430, 540); pen.fill();
  pen.fillStyle = "#e8452c";
  [[360, 560, 40, 280], [560, 560, 40, 280], [290, 560, 380, 42], [330, 640, 300, 30]].forEach((r) => pen.fillRect(...r));
  for (let n = 0; n < 14; n++) circle(40 + (n * 211) % 660, 860 + (n * 37) % 80, 24, n % 2 ? "#ff8fb8" : "#ffd5e5");
  return canvas;
}

document.getElementById("file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  readyAudio();
  try {
    begin(await createImageBitmap(file));
  } catch {
    alert("この写真は読み込めませんでした。JPEG か PNG の写真でためしてください。");
  }
});
document.getElementById("sample").addEventListener("click", () => { readyAudio(); begin(sampleImage()); });
document.getElementById("again").addEventListener("click", () => { readyAudio(); play(); });
document.getElementById("other").addEventListener("click", () => {
  document.getElementById("stage").hidden = true;
  document.getElementById("start").hidden = false;
  burst();
});
