/*
 * meeting_scene.js：ヒーローに「今日の会議」の場面（机を囲む AI 役員の顔・Day N・Yu の写真の席）を出す
 * 主な関数：buildSceneSvg（座席の配置 → SVG の要素）、showMeetingScene（入口に場面を入れる）
 * 配置の計算は scene_layout.js、顔の表は diary_speakers.js、見た目と動きは css/meeting_scene.css。
 * main.js から呼ばれる。吹き出し（名言）は別の機能なので、ここでは扱わない。
 * 事実のきまり：今この瞬間を表す言葉（生放送中・会議の最中を示す言葉）は出さない（毎日の会議の記録を表す場面のため）。
 */

// 場面に座る9人（左から Yu → 上の列 → 下の列の順。名前は diary_speakers.js の表と同じ）
const HERO_SCENE_SEATS = ["Yu", "秘書", "CMO", "プロデューサー", "ブランドディレクター", "アオイ", "CFO", "CTO", "CISO"];
// 机の上の小さな文字（毎日の会議の記録であることを伝える。今この瞬間を表す言葉は使わない）
const SCENE_SUB_TEXT = "AI役員会議・毎日開催";
// 机の上の文字の位置（机の上端からの距離）。Day N は大きく、下に小さな文字
const SCENE_DAY_BASELINE = 35;
const SCENE_SUB_BASELINE = 52;
// 顔の輪（話している人の印）の、顔の外へのはみ出し。名言の吹き出しを出す機能が使う
const SCENE_RING_GAP = 3.5;

/**
 * SVG の要素を1つ作り、属性を付ける。
 * @param {string} tagName 要素の名前（"circle" など）
 * @param {Object<string,string|number>} attributes 付ける属性
 * @returns {Element} 作った要素
 * @example createSvgPart("circle", { r: 17 })
 */
function createSvgPart(tagName, attributes) {
  const part = document.createElementNS(SVG_NAMESPACE, tagName);
  Object.keys(attributes).forEach(function (name) {
    part.setAttribute(name, String(attributes[name]));
  });
  return part;
}

/**
 * 席1つ分（輪・顔の背景・顔の絵）を作る。Yu の席は写真を HTML で重ねるので、背景と名前だけ。
 * 外側の g が位置、内側の g（class="seat"）が動き（顔が順に浮かぶ）を担当する。
 * @param {{name:string,x:number,y:number,radius:number,isYu:boolean,order:number}} seat 席
 * @param {string} faceFile speakers.svg の場所
 * @returns {Element|null} 席の要素。名前が表にないときは null（絵を出さない）
 */
function createSeatPart(seat, faceFile) {
  const info = getSpeakerInfo(seat.name);
  if (info === null) {
    return null;
  }
  const place = createSvgPart("g", { transform: "translate(" + seat.x + " " + seat.y + ")" });
  const body = createSvgPart("g", { "class": "seat " + info.className, "data-seat": seat.name });
  // 浮かぶ順番は style 属性ではなく JS で入れる（CSP で style 属性は止められるため）
  body.style.setProperty("--i", String(seat.order));
  const title = createSvgPart("title", {});
  title.textContent = seat.name + "（" + info.role + "）";
  body.appendChild(title);
  body.appendChild(createSvgPart("circle", { "class": "ring", r: seat.radius + SCENE_RING_GAP }));
  body.appendChild(createSvgPart("circle", { "class": seat.isYu ? "yu-bg" : "face-bg", r: seat.radius }));
  if (seat.isYu) {
    const label = createSvgPart("text", { "class": "yu-name", y: seat.radius + 14, "text-anchor": "middle" });
    label.textContent = SCENE_YU_NAME;
    body.appendChild(label);
  } else {
    // 顔の絵は表の key だけで呼ぶ（日記のデータの文字は使わない）
    const face = createSvgPart("use", { x: -seat.radius, y: -seat.radius, width: seat.radius * 2, height: seat.radius * 2 });
    face.setAttribute("href", faceFile + "#" + info.key);
    body.appendChild(face);
  }
  place.appendChild(body);
  return place;
}

/**
 * 机・「Day N」・席を並べた SVG を作る。
 * @param {ReturnType<typeof computeSceneLayout>} layout 配置
 * @param {number} dayNumber 机の上に出す Day の番号
 * @param {string} faceFile speakers.svg の場所
 * @returns {Element} svg 要素
 * @example buildSceneSvg(computeSceneLayout(HERO_SCENE_SEATS), 7, "assets/speakers.svg")
 */
function buildSceneSvg(layout, dayNumber, faceFile) {
  const svg = createSvgPart("svg", {
    "class": "scene", viewBox: "0 0 " + layout.width + " " + layout.height, role: "img",
    "aria-label": "AI役員が会議の机を囲む絵。Day " + dayNumber + "。" + SCENE_SUB_TEXT
  });
  const table = layout.table;
  svg.appendChild(createSvgPart("rect", { "class": "table", x: table.x, y: table.y, width: table.width, height: table.height, rx: table.height / 2 }));
  const centerX = table.x + table.width / 2;
  const day = createSvgPart("text", { "class": "day", x: centerX, y: table.y + SCENE_DAY_BASELINE, "text-anchor": "middle" });
  day.appendChild(document.createTextNode("Day "));
  const dayNumberPart = createSvgPart("tspan", { "font-weight": "600" });
  dayNumberPart.textContent = String(dayNumber);
  day.appendChild(dayNumberPart);
  svg.appendChild(day);
  const sub = createSvgPart("text", { "class": "sub", x: centerX, y: table.y + SCENE_SUB_BASELINE, "text-anchor": "middle" });
  sub.textContent = SCENE_SUB_TEXT;
  svg.appendChild(sub);
  layout.seats.forEach(function (seat) {
    const part = createSeatPart(seat, faceFile);
    if (part !== null) {
      svg.appendChild(part);
    }
  });
  return svg;
}

/**
 * 入口のヒーローに場面を入れる。場所（#hero-scene）と Yu の写真（.scene-yu）は index.html に書いてある。
 * 場所がなければ何もしない。Yu の写真は、絵の中の Yu の席の上に、割合（%）で位置を合わせて重ねる。
 * @param {{stageId:string, faceFile:string, now:Date}} options stageId＝場面の入れ物の id、faceFile＝speakers.svg の場所、now＝今の時刻
 * @returns {boolean} 場面を出せたら true
 * @example showMeetingScene({ stageId: "hero-stage", faceFile: "assets/speakers.svg", now: new Date() })
 */
function showMeetingScene(options) {
  const stage = document.getElementById(options.stageId);
  if (stage === null) {
    return false;
  }
  const holder = stage.querySelector(".scene-holder");
  if (holder === null) {
    return false;
  }
  const layout = computeSceneLayout(HERO_SCENE_SEATS);
  holder.appendChild(buildSceneSvg(layout, getTodayDayNumber(options.now), options.faceFile));
  const yuSeat = layout.seats.find(function (seat) {
    return seat.isYu;
  });
  const photo = stage.querySelector(".scene-yu");
  if (yuSeat !== undefined && photo !== null) {
    const box = toPercentBox(yuSeat, layout);
    photo.style.left = box.left + "%";
    photo.style.top = box.top + "%";
    photo.style.width = box.width + "%";
    photo.style.height = box.height + "%";
    photo.style.setProperty("--i", String(yuSeat.order));
  }
  // 場面ができたあとで印を付ける（CSS はこの印があるときだけ写真と動きを出す）
  stage.classList.add("has-scene", "play");
  return true;
}
