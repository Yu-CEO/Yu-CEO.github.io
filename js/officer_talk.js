/*
 * officer_talk.js：「この会社の進め方」の役員の顔を並べ、押すとひとこと話す。
 * ここの言葉はページ用のあいさつで、会議の発言の記録ではない。
 */
const OFFICER_GREETINGS = [
  ["aoi", "アオイ", "来てくれた！まずは写真1枚、ぬってみて。"],
  ["secretary", "秘書", "会議の話は、日記にまとめています。"],
  ["cmo", "CMO", "最初の1秒で止まりました？　正直に教えてください。"],
  ["producer", "プロデューサー", "失敗した日ほど、いい話になるんです！"],
  ["brand", "ブランドディレクター", "今日の色、気に入りました？　開くたび変わります。"],
  ["cfo", "CFO", "ぬりえは無料です。数字の話は、私が地道にやります。"],
  ["cto", "CTO", "まず小さく作って試す。それがうちのやり方です。"],
  ["ciso", "CISO", "ぬりえの写真は、端末の外に出ません。"],
];

function showOfficerGreeting(officer) {
  document.getElementById("officer-name").textContent = `${officer[1]}（AI）`;
  document.getElementById("officer-line").textContent = officer[2];
}

function buildOfficerFaces(list) {
  OFFICER_GREETINGS.forEach((officer) => {
    const button = document.createElement("button");
    button.type = "button";
    const face = document.createElement("img");
    face.src = `assets/faces/${officer[0]}.webp`;
    face.alt = "";
    face.loading = "lazy";
    button.append(face, officer[1]);
    button.addEventListener("click", () => { showOfficerGreeting(officer); dropConfetti(24); });
    list.appendChild(button);
  });
}

buildOfficerFaces(document.getElementById("officer-faces"));
showOfficerGreeting(OFFICER_GREETINGS[Math.floor(Math.random() * OFFICER_GREETINGS.length)]);
