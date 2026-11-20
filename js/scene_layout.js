/*
 * scene_layout.js：ヒーローの「今日の会議」場面の座席の配置と Day N を決める。画面には触れない（計算だけ）
 * 主な関数：computeSceneLayout（席の名前の並び → 机・席の位置と大きさ）、toPercentBox（席の丸を、絵に重ねる写真の位置に直す）、getTodayDayNumber（今日が Day いくつか）
 * meeting_scene.js が呼び、絵（SVG）を作る。tests/scene_layout.test.js でテストする。
 * 座標は SVG の viewBox（絵の中だけの座標。画面のピクセルではなく、絵を拡大縮小しても比率が変わらない）で表す。
 */

// 席の名前（diary_speakers.js の話者の表と同じ名前）。Yu は左の端の席、ほかは上と下に半分ずつ座る
const SCENE_YU_NAME = "Yu";
// 席と席のあいだ（横）。顔の直径34 + すき間24
const SCENE_SEAT_GAP = 58;
// ふつうの席の顔の半径
const SCENE_FACE_RADIUS = 17;
// Yu の席の顔の半径（写真が入るので少し大きく）
const SCENE_YU_RADIUS = 24;
// Yu の席が占める横幅（左の端。机の左に置く）
const SCENE_YU_AREA_WIDTH = 60;
// Yu の顔の中心の x（左の端から。顔の半径24 + 余白8）
const SCENE_YU_X = 32;
// 机の上端の位置と高さ。上の列の顔が机にかぶさる分の余白を、上に取る
const SCENE_TABLE_TOP = 46;
const SCENE_TABLE_HEIGHT = 64;
// 机の左右の余白と、机の最小の幅
const SCENE_TABLE_MARGIN = 8;
const SCENE_TABLE_MIN_WIDTH = 150;
// 絵全体の高さ（上の列の顔 + 机 + 下の列の顔 + Yu の名前の分）
const SCENE_HEIGHT = 152;
// 顔の中心が机のふちから離れる距離（上下とも）
const SCENE_ROW_OFFSET = 18;
// 1日の長さを日付に直すときの桁（"YYYY-MM-DD" の月・日を 2 けたにそろえる）
const SCENE_DATE_DIGITS = 2;

/**
 * 1列に並ぶ席の中心の x 座標を、机の中で均等に割り付ける。
 * @param {number} count その列の人数
 * @param {number} tableX 机の左端の x
 * @param {number} tableWidth 机の幅
 * @returns {number[]} 左から順の中心 x
 * @example computeRowXs(2, 0, 200) // [71, 129]
 */
function computeRowXs(count, tableX, tableWidth) {
  const offset = (tableWidth - count * SCENE_SEAT_GAP) / 2;
  const xs = [];
  for (let index = 0; index < count; index++) {
    xs.push(tableX + offset + SCENE_SEAT_GAP * (index + 0.5));
  }
  return xs;
}

/**
 * 席の名前の並びから、机と席の位置を決める。Yu がいれば左の端の席にする。
 * ほかの人は並び順のまま、上の列（多いほう）→下の列に分ける（上が先に埋まるので、9人なら上4・下4）。
 * @param {string[]} names 席に座る人の名前（Yu を含んでよい）
 * @returns {{width:number,height:number,table:{x:number,y:number,width:number,height:number},
 *            seats:{name:string,x:number,y:number,radius:number,isYu:boolean,order:number}[]}}
 * @example computeSceneLayout(["Yu","秘書","CMO"]).seats.length // 3
 */
function computeSceneLayout(names) {
  const hasYu = names.includes(SCENE_YU_NAME);
  const others = names.filter(function (name) {
    return name !== SCENE_YU_NAME;
  });
  const topCount = Math.ceil(others.length / 2);
  const topNames = others.slice(0, topCount);
  const bottomNames = others.slice(topCount);
  const columns = Math.max(topNames.length, bottomNames.length, 1);
  const yuAreaWidth = hasYu ? SCENE_YU_AREA_WIDTH : 0;
  const table = {
    x: yuAreaWidth + SCENE_TABLE_MARGIN,
    y: SCENE_TABLE_TOP,
    width: Math.max(columns * SCENE_SEAT_GAP + 2 * SCENE_TABLE_MARGIN, SCENE_TABLE_MIN_WIDTH),
    height: SCENE_TABLE_HEIGHT
  };
  const seats = [];
  let order = 0; // 顔が浮かぶ順番（Yu → 上の列 → 下の列）
  if (hasYu) {
    seats.push({
      name: SCENE_YU_NAME, x: SCENE_YU_X,
      y: table.y + table.height / 2, radius: SCENE_YU_RADIUS, isYu: true, order: order++
    });
  }
  const topXs = computeRowXs(topNames.length, table.x, table.width);
  const bottomXs = computeRowXs(bottomNames.length, table.x, table.width);
  topNames.forEach(function (name, index) {
    seats.push({ name: name, x: topXs[index], y: table.y - SCENE_ROW_OFFSET, radius: SCENE_FACE_RADIUS, isYu: false, order: order++ });
  });
  bottomNames.forEach(function (name, index) {
    seats.push({ name: name, x: bottomXs[index], y: table.y + table.height + SCENE_ROW_OFFSET, radius: SCENE_FACE_RADIUS, isYu: false, order: order++ });
  });
  return {
    width: table.x + table.width + SCENE_TABLE_MARGIN,
    height: SCENE_HEIGHT,
    table: table,
    seats: seats
  };
}

/**
 * 席の丸（中心と半径）を、絵全体に対する割合（%）の四角に直す。Yu の写真（HTML の画像）を絵の上に重ねる位置に使う。
 * 絵（SVG）は画面の幅に合わせて拡大縮小するので、ピクセルではなく割合で表すと、どの幅でも席と重なる。
 * @param {{x:number,y:number,radius:number}} seat 席
 * @param {{width:number,height:number}} layout computeSceneLayout の結果
 * @returns {{left:number,top:number,width:number,height:number}} すべて % の数
 * @example toPercentBox({x:50,y:50,radius:10}, {width:100,height:100}) // {left:40,top:40,width:20,height:20}
 */
function toPercentBox(seat, layout) {
  return {
    left: (seat.x - seat.radius) / layout.width * 100,
    top: (seat.y - seat.radius) / layout.height * 100,
    width: seat.radius * 2 / layout.width * 100,
    height: seat.radius * 2 / layout.height * 100
  };
}

/**
 * 端末の「今日」が Day いくつかを返す（Day 1 ＝ 2026-11-14。日記と同じ数え方）。
 * 端末の時刻のずれで日付が変わるのを避けるため、端末の現地の年月日をそのまま使う。
 * 前提：diary_day.js の getDayNumber が先に読み込まれている。
 * @param {Date} now 今の時刻
 * @returns {number} Day の番号
 * @example getTodayDayNumber(new Date(2026, 10, 20)) // 7
 */
function getTodayDayNumber(now) {
  const month = String(now.getMonth() + 1).padStart(SCENE_DATE_DIGITS, "0");
  const day = String(now.getDate()).padStart(SCENE_DATE_DIGITS, "0");
  return getDayNumber(now.getFullYear() + "-" + month + "-" + day);
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeSceneLayout, getTodayDayNumber, computeRowXs, toPercentBox };
}
