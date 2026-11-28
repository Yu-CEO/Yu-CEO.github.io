// アオイ（AI）の一言。開いた時間に合わせて声をかける。すべてオリジナル。1つは2行まで・1行16字まで
// 言葉を変えたら make_aoi_voice.py で声を作り直す
const AOI_WORDS = {
  morning: [ // 5〜11時
    ["おはよう！", "今日もいっしょにがんばろう。"],
    ["朝からえらいね！", "いい一日にしようね。"],
    ["あせらなくていいよ。", "今日もがんばろうね。"],
  ],
  noon: [ // 11〜17時
    ["おつかれさま！", "午後もがんばろう。"],
    ["ここまでいい感じ！", "あと少し、いけるよ。"],
    ["ちょっとひと息。", "それからまたがんばろ。"],
  ],
  evening: [ // 17〜22時
    ["今日もおつかれさま。", "よくがんばったね。"],
    ["ここまでよく来たね。", "今日の自分をほめよう。"],
    ["がんばったの、", "ちゃんと分かってるよ。"],
  ],
  night: [ // 22〜5時
    ["遅くまでおつかれさま。", "本当にがんばったね。"],
    ["今日はもう十分だよ。", "ゆっくり休んでね。"],
    ["まだ起きてたの？", "がんばりすぎないでね。"],
  ],
};

// 端末の時刻から、前回と違う一言をえらぶ
function aoiWords(hour = new Date().getHours()) {
  const slot = hour < 5 || hour >= 22 ? "night" : hour < 11 ? "morning" : hour < 17 ? "noon" : "evening";
  return AOI_WORDS[slot][pickNew(`nurie-words-${slot}`, AOI_WORDS[slot].length)];
}

// 動画の一番下に、アオイの顔と吹き出しを描く。age は出てからの秒数
function drawAoi(pen, w, h, lines, age) {
  if (age <= 0) return;
  const t = Math.min(1, age / .45);
  const pop = 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // 少し行き過ぎて戻る「ぽん」という動き
  const areaW = w - 40;
  const areaH = 190;
  const bubbleX = 206;
  const bubbleW = areaW - bubbleX;
  const font = (size) => `bold ${size}px "Yu Gothic UI", "Hiragino Maru Gothic ProN", sans-serif`;
  pen.save();
  pen.translate(w / 2, h - 28 - areaH / 2);
  pen.scale(pop, pop);
  pen.translate(-areaW / 2, -areaH / 2);
  pen.textAlign = "center";
  pen.textBaseline = "middle";

  // 吹き出し（左のしっぽがアオイを指す）
  pen.shadowColor = "rgba(40, 20, 60, .3)";
  pen.shadowBlur = 18;
  pen.fillStyle = "#fff";
  pen.beginPath();
  pen.roundRect(bubbleX, 20, bubbleW, 150, 40);
  pen.moveTo(bubbleX + 4, 72);
  pen.lineTo(bubbleX - 28, 95);
  pen.lineTo(bubbleX + 4, 118);
  pen.fill();

  // 顔（丸く切り抜く）
  pen.beginPath();
  pen.arc(85, 88, 85, 0, Math.PI * 2);
  pen.fill();
  pen.shadowColor = "transparent";
  pen.save();
  pen.clip();
  pen.drawImage(AOI_FACE, 0, 3, 170, 170);
  pen.restore();
  pen.strokeStyle = "#ff4f8b";
  pen.lineWidth = 6;
  pen.stroke();

  // 名札（AIであることを必ず書く）
  pen.fillStyle = "#ff4f8b";
  pen.beginPath();
  pen.roundRect(5, 150, 160, 40, 20);
  pen.fill();
  pen.fillStyle = "#fff";
  pen.font = font(23);
  pen.fillText("アオイ（AI）", 85, 171);

  pen.fillStyle = "#33253d";
  pen.font = font(34);
  lines.forEach((line, i) => pen.fillText(line, bubbleX + bubbleW / 2, 70 + i * 52, bubbleW - 32));
  pen.restore();
}

document.getElementById("face").src = AOI_FACE.src; // ページのあいさつにも顔を出す
