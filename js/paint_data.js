/*
 * paint_data.js：最初の画面の「指で塗れる絵」のデータ（今日の色5組と、絵3種）。絵はこのサイトのオリジナル
 * 色の名前はぬりえシアターにそろえた。並び順は css/home_base.css の theme-0〜4 と同じ。
 * 絵の1か所＝[形（SVGの path の d）, 色番号]。色番号 -1 は空の色。後ろに書いたものが手前に重なる。
 * paint_view.js・main.js から使われる。tests/paint.test.js でテストする。
 */

const PAINT_PALETTES = [
  { name: "いちごソーダ", sky: "#ffe1ec", fills: ["#ff4f8b", "#ffc233", "#2bb7c9", "#8bd450", "#a77bf3"] },
  { name: "ラムネ", sky: "#d6f4ff", fills: ["#12b5a0", "#ffd23f", "#3a8dff", "#a5e65a", "#ff7a8a"] },
  { name: "夕やけ", sky: "#ffe0c2", fills: ["#ff6b35", "#ffc43d", "#d94f9a", "#7a5cc7", "#2fa39a"] },
  { name: "ゆめ空", sky: "#e4e0ff", fills: ["#7c5cff", "#ffcf5c", "#ff7ab6", "#4cc9f0", "#72d6a0"] },
  { name: "若葉", sky: "#e8f8d8", fills: ["#4caf3d", "#ffca28", "#ff7f50", "#26a8c9", "#b38cff"] }
];

// 丸の形（中心 x・y、半径 r）
function circlePath(x, y, r) {
  return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}
// 雲の形（左下の点 x・y）
function cloudPath(x, y) {
  return `M${x} ${y}a16 16 0 0 1 6-30a22 22 0 0 1 40-4a18 18 0 0 1 14 34Z`;
}
// 星の形。外側の角と内側の角（外側の46%の位置）を交互に10点つなぐ
function starPath(x, y, r) {
  const points = [];
  for (let index = 0; index < 10; index++) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    let distance = r;
    if (index % 2 === 1) {
      distance = r * 0.46;
    }
    points.push((x + Math.cos(angle) * distance).toFixed(1) + " " + (y + Math.sin(angle) * distance).toFixed(1));
  }
  return "M" + points.join("L") + "Z";
}
// 絵の一番後ろの空（viewBox と同じ大きさ）
const PAINT_SKY = "M0 0H360V260H0Z";

const PAINT_SCENES = [
  { name: "朝の島", parts: [
    [PAINT_SKY, -1], [circlePath(180, 112, 52), 1], [cloudPath(26, 78), 4], [cloudPath(268, 62), 4],
    ["M52 190Q110 108 168 142Q232 96 310 190Z", 3],
    ["M0 186Q45 174 90 186T180 186T270 186T360 186V260H0Z", 2],
    ["M142 124Q180 134 218 124L215 140Q180 148 145 140Z", 0],
    ["M154 142H168L170 198H152Z", 0], ["M192 142H206L208 198H190Z", 0],
    ["M150 156H210V167H150Z", 0],
    ["M40 224H112L98 244H54Z", 0], ["M76 220V170L112 220Z", 1],
    ["M262 228q22-22 46 0q-24 22-46 0l-16 12v-24Z", 4]
  ], deco: ["M236 100q8-8 16 0q8-8 16 0"] },
  { name: "机から打ち上げ", parts: [
    [PAINT_SKY, -1], [circlePath(62, 56, 28), 1], [starPath(300, 44, 22), 1], [starPath(256, 114, 14), 0],
    [circlePath(310, 168, 24), 4],
    ["M155 128L124 170L155 164Z", 0], ["M205 128L236 170L205 164Z", 0],
    ["M180 16Q214 48 205 164H155Q146 48 180 16Z", 4],
    [circlePath(180, 80, 17), 2],
    ["M160 164H200Q204 190 180 214Q156 190 160 164Z", 1],
    ["M96 190H142Q152 216 180 216Q208 216 218 190H264V232H96Z", 2],
    ["M72 232H288L304 250H56Z", 3],
    ["M28 208H66L62 250H32Z", 0], ["M47 208Q20 190 30 166Q50 176 47 208Q46 180 68 170Q76 196 47 208Z", 3]
  ], deco: ["M130 90v26", "M232 66v20"] },
  { name: "気球の旅", parts: [
    [PAINT_SKY, -1], [circlePath(304, 50, 27), 1], [cloudPath(18, 66), 4],
    ["M180 16C112 16 100 92 156 150H166C130 90 140 30 180 16Z", 0],
    ["M180 16C140 30 130 90 166 150H194C230 90 220 30 180 16Z", 1],
    ["M180 16C220 30 230 90 194 150H204C260 92 248 16 180 16Z", 0],
    ["M164 164H196L192 190H168Z", 3],
    [circlePath(284, 122, 22), 4], ["M277 152H291V163H277Z", 3],
    ["M0 200Q90 150 190 206Q270 168 360 190V260H0Z", 2],
    ["M0 232Q80 196 170 232T360 224V260H0Z", 3],
    ["M52 206H92V234H52Z", 4], ["M46 207L72 182L98 207Z", 0],
    [starPath(300, 236, 15), 1]
  ], deco: ["M166 150L170 164", "M194 150L190 164", "M284 144v8"] }
];

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PAINT_PALETTES, PAINT_SCENES };
}
