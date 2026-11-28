/*
 * paint_view.js：指で塗れる絵（線画を作る・触った所に色を入れる・「おまかせで塗る」・案内の文）
 * 主な関数：startPaintCanvas（流れ）、drawPaintScene（線画を作る）、paintRegion（1か所塗る）、buildPaintHint（案内の文。画面に触れない）
 * 色は SVG の fill 属性で入れる（HTMLの style 属性は使わない）。塗った結果は保存しない。
 * データは paint_data.js、紙ふぶきは confetti.js。main.js から使われる。tests/paint.test.js でテストする。
 */

const PAINT_SVG_NS = "http://www.w3.org/2000/svg";
const PAINT_BLANK_COLOR = "#ffffff";
const PAINT_FIRST_DROP_MS = 1200; // 線が描き終わったころ（1.1秒）に、1か所だけ色を落とす
const PAINT_AUTO_STEP_MS = 110;   // 「おまかせ」で次の1か所を塗るまでの間
const PAINT_DONE_CONFETTI = 50;   // 全部塗ったときの紙ふぶきの枚数

/**
 * 絵の下の案内の文を作る（画面に触れない）。
 * @param {number} left まだ塗っていない数
 * @param {number} total 全部の数
 * @param {boolean} touched 利用者が塗ったことがあるか
 * @param {string} paletteName 今日の色の名前
 * @returns {string} 案内の文
 * @example buildPaintHint(0, 12, true, "ラムネ") // "12か所ぜんぶ塗れました"
 */
function buildPaintHint(left, total, touched, paletteName) {
  if (left === 0) {
    return total + "か所ぜんぶ塗れました";
  }
  if (!touched) {
    return "指でさわると色がつく（今日は" + paletteName + "）";
  }
  return "いいね。あと" + left + "か所";
}

// SVG の線（path）を1本作る。pathLength="1" は、線が描かれていく動きの長さをそろえるため
function createPaintPath(className, shape) {
  const path = document.createElementNS(PAINT_SVG_NS, "path");
  path.setAttribute("class", className);
  path.setAttribute("pathLength", "1");
  path.setAttribute("d", shape);
  return path;
}

/**
 * 絵を白い線画として作り直す。
 * @param {object} state 絵の状態（svg・scene・regions・touched）
 * @returns {void}
 */
function drawPaintScene(state) {
  state.svg.textContent = "";
  state.regions = state.scene.parts.map(function (part) {
    const region = createPaintPath("region", part[0]);
    region.setAttribute("data-color", String(part[1]));
    region.setAttribute("fill", PAINT_BLANK_COLOR);
    state.svg.appendChild(region);
    return region;
  });
  state.scene.deco.forEach(function (shape) {
    state.svg.appendChild(createPaintPath("deco", shape));
  });
  state.svg.setAttribute("aria-label", "塗り絵の絵「" + state.scene.name + "」");
  state.touched = false;
}

// まだ塗っていない所の一覧
function unpaintedRegions(state) {
  return state.regions.filter(function (region) {
    return region.getAttribute("data-on") !== "1";
  });
}

// 案内の文・ボタンの文字・「ほら、意外とやれた。」の出し入れ
function updatePaintHint(state) {
  const left = unpaintedRegions(state).length;
  state.hint.textContent = buildPaintHint(left, state.regions.length, state.touched, state.palette.name);
  state.autoButton.textContent = "おまかせで塗る";
  if (left === 0) {
    state.autoButton.textContent = "もう一度";
  }
  state.done.hidden = left !== 0;
}

/**
 * 1か所を塗る。絵の部分でないもの・塗り済みの所は何もしない。
 * @param {object} state 絵の状態
 * @param {Element|null} region 触った要素
 * @param {boolean} byUser 利用者の操作（おまかせを含む）なら true。最初の1滴は false
 * @returns {void}
 */
function paintRegion(state, region, byUser) {
  if (!state.regions.includes(region) || region.getAttribute("data-on") === "1") {
    return;
  }
  const colorIndex = Number(region.getAttribute("data-color"));
  let color = state.palette.sky;
  if (colorIndex >= 0) {
    color = state.palette.fills[colorIndex];
  }
  region.setAttribute("fill", color);
  region.setAttribute("data-on", "1");
  if (byUser) {
    state.touched = true;
  }
  updatePaintHint(state);
  if (byUser && unpaintedRegions(state).length === 0) {
    dropConfetti(PAINT_DONE_CONFETTI, state.palette.fills);
  }
}

// 予約した「あとで塗る」をすべて取り消す
function stopPaintTimers(state) {
  state.timers.forEach(clearTimeout);
  state.timers = [];
}

// 線画を作り、動いてよい端末では線が描かれる動きと、最初の1滴（塗れると気づくため）をつける
function restartPaintScene(state) {
  stopPaintTimers(state);
  drawPaintScene(state);
  state.box.classList.remove("draw");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    void state.box.offsetWidth; // 一度画面の大きさを読むと、同じ動きをもう一度始められる
    state.box.classList.add("draw");
    state.timers.push(setTimeout(function () {
      paintRegion(state, state.regions[1], false);
    }, PAINT_FIRST_DROP_MS));
  }
  updatePaintHint(state);
}

// 「おまかせで塗る」。全部塗れたあとは「もう一度」になり、線画に戻す
function paintRest(state) {
  const rest = unpaintedRegions(state);
  if (rest.length === 0) {
    restartPaintScene(state);
    return;
  }
  stopPaintTimers(state);
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    rest.forEach(function (region) {
      paintRegion(state, region, true);
    });
    return;
  }
  rest.forEach(function (region, order) {
    state.timers.push(setTimeout(function () {
      paintRegion(state, region, true);
    }, order * PAINT_AUTO_STEP_MS));
  });
}

// タップ＝1か所、指やマウスを押したままなぞる＝通った所を塗る
function bindPaintPointer(state) {
  let pressing = false;
  state.svg.addEventListener("click", function (event) {
    paintRegion(state, event.target, true);
  });
  state.svg.addEventListener("pointerdown", function () {
    pressing = true;
  });
  ["pointerup", "pointercancel"].forEach(function (type) {
    window.addEventListener(type, function () {
      pressing = false;
    });
  });
  state.svg.addEventListener("pointermove", function (event) {
    if (pressing) {
      paintRegion(state, document.elementFromPoint(event.clientX, event.clientY), true);
    }
  });
}

/**
 * 塗れる絵を始める。部品が index.html にないときは何もしない。
 * @param {{ parts: Array[], deco: string[], name: string }} scene 今日の絵
 * @param {{ name: string, sky: string, fills: string[] }} palette 今日の色
 * @returns {object|null} 絵の状態
 * @example startPaintCanvas(PAINT_SCENES[0], PAINT_PALETTES[0])
 */
function startPaintCanvas(scene, palette) {
  const state = {
    box: document.getElementById("canvas"),
    svg: document.getElementById("art"),
    hint: document.getElementById("paint-hint"),
    autoButton: document.getElementById("paint-auto"),
    done: document.getElementById("paint-done"),
    scene: scene,
    palette: palette,
    regions: [],
    touched: false,
    timers: []
  };
  if (!state.box || !state.svg || !state.hint || !state.autoButton || !state.done) {
    console.warn("塗れる絵の部品が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return null;
  }
  bindPaintPointer(state);
  state.autoButton.addEventListener("click", function () {
    paintRest(state);
  });
  restartPaintScene(state);
  return state;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { buildPaintHint, drawPaintScene, paintRegion };
}
