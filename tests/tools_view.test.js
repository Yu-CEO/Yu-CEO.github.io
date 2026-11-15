/*
 * tools_view.test.js：js/tools_view.js（ツールのパネルを作って並べる処理）の自動テスト
 * Node.js にはブラウザの画面（document）がないので、テストに必要な分だけをまねた「にせの画面」を作って確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");

// ブラウザでは tools_validate.js が先に読み込まれていて validateTools がそのまま使える。
// テストでも同じ状態にするため、global（どのファイルからも見える置き場所）に入れておく
global.validateTools = require("../js/tools_validate.js").validateTools;
// 同じく、読めない画像を隠す関数（hero_image.js）も先に用意しておく
global.hideWhenBroken = require("../js/hero_image.js").hideWhenBroken;
const { showToolPanels, getToolsJumpTarget, getImageAlt } = require("../js/tools_view.js");

/**
 * テスト用の、にせの画面部品を作る（tools_view.js が使う機能だけを持つ）。
 * @param {string} tagName タグの名前
 * @returns {object} にせの要素
 */
function createFakeElement(tagName) {
  return {
    tagName: tagName,
    className: "",
    children: [],
    text: "",
    get textContent() {
      return this.text;
    },
    // textContent に文字を入れると、中身がその文字だけになる（ブラウザと同じ動き）
    set textContent(value) {
      this.text = value;
      this.children = [];
    },
    appendChild: function (child) {
      this.children.push(child);
    },
    // 画像の読み込み失敗を見張る登録。にせの画面では読み込みが起きないので、何もしない
    addEventListener: function () {}
  };
}

/**
 * id が "tool-area" の場所だけを持つ、にせの画面を用意し、その場所を返す。
 * @returns {object} ツールの場所（にせの要素）
 */
function setUpFakeDocument() {
  const area = createFakeElement("div");
  global.document = {
    createElement: createFakeElement,
    getElementById: function (id) {
      if (id === "tool-area") {
        return area;
      }
      return null;
    }
  };
  return area;
}

/**
 * パネルの中から、決まったクラス名の部品を探す（中の部品も探す）。
 * @param {object} element 探す場所
 * @param {string} className 探すクラス名
 * @returns {object|undefined} 見つかった部品
 */
function findByClass(element, className) {
  for (const child of element.children) {
    if (child.className.split(" ").includes(className)) {
      return child;
    }
    const found = findByClass(child, className);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * 警告がテストの結果表示にまざらないよう、テスト中だけ console.warn（コンソールに警告を出す命令）の中身を集める。
 * @param {function} action 警告を集めている間に実行する処理
 * @returns {string[]} 集めた警告の文の一覧
 */
function captureWarnings(action) {
  const messages = [];
  const originalWarn = console.warn;
  console.warn = function (message) {
    messages.push(message);
  };
  try {
    action();
  } finally {
    console.warn = originalWarn;
  }
  return messages;
}

/**
 * テスト用の「公開中」のツール1件を作る。毎回新しく作るのは、テスト同士で中身を書き換え合わないようにするため。
 * @returns {object} ツール1件（画像あり）
 */
function makePublishedTool() {
  return {
    name: "おかね収支シミュレーター",
    description: "テスト用の説明です",
    url: "https://yu-ceo.github.io/okane-simulator/",
    status: "公開中",
    image: "assets/tool_simulator.jpg",
    imageAlt: "おかね収支シミュレーターの画面（NISA積立の計算例）"
  };
}

test("AC-3：「公開中」のパネルには、名前・説明・状態・新しいタブで開く「開く」ボタンが出る", function () {
  const area = setUpFakeDocument();
  const count = showToolPanels("tool-area", [makePublishedTool()]);
  assert.strictEqual(count, 1);
  assert.strictEqual(area.children.length, 1);
  const panel = area.children[0];
  assert.strictEqual(panel.id, "tool-1");
  assert.match(panel.className, /panel/);
  assert.strictEqual(findByClass(panel, "panel-title").textContent, "おかね収支シミュレーター");
  assert.strictEqual(findByClass(panel, "panel-desc").textContent, "テスト用の説明です");
  assert.strictEqual(findByClass(panel, "status").textContent, "公開中");
  const openButton = findByClass(panel, "btn-main");
  assert.strictEqual(openButton.textContent, "開く");
  assert.strictEqual(openButton.href, "https://yu-ceo.github.io/okane-simulator/");
  assert.strictEqual(openButton.target, "_blank");
  assert.strictEqual(openButton.rel, "noopener");
});

test("AC-4：ツールを2件にすると、パネルが2枚になり、足した順に並ぶ", function () {
  const area = setUpFakeDocument();
  const second = Object.assign(makePublishedTool(), { name: "2つ目のツール" });
  showToolPanels("tool-area", [makePublishedTool(), second]);
  assert.strictEqual(area.children.length, 2);
  assert.strictEqual(area.children[1].id, "tool-2");
  assert.strictEqual(findByClass(area.children[1], "panel-title").textContent, "2つ目のツール");
  assert.strictEqual(findByClass(area.children[1], "eyebrow").textContent, "FREE TOOL 02");
});

test("AC-5：「準備中」のパネルには「準備中」と出て、開くボタンは出ない", function () {
  const area = setUpFakeDocument();
  const preparing = Object.assign(makePublishedTool(), { status: "準備中" });
  showToolPanels("tool-area", [preparing]);
  const panel = area.children[0];
  assert.strictEqual(findByClass(panel, "status").textContent, "準備中");
  assert.strictEqual(findByClass(panel, "btn-main"), undefined);
});

test("AC-6：正しくない項目は表示せず、何件目のどの項目かをコンソールに日本語で出す", function () {
  const area = setUpFakeDocument();
  const noName = makePublishedTool();
  delete noName.name;
  const warnings = captureWarnings(function () {
    showToolPanels("tool-area", [makePublishedTool(), noName]);
  });
  assert.strictEqual(area.children.length, 1);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /2件目/);
  assert.match(warnings[0], /「name」/);
});

test("AC-7：表示できるツールが0件なら「ただいま準備中です」と説明のパネルが出る", function () {
  const area = setUpFakeDocument();
  const count = showToolPanels("tool-area", []);
  assert.strictEqual(count, 0);
  assert.strictEqual(area.children.length, 1);
  const panel = area.children[0];
  assert.strictEqual(panel.id, "tools-empty");
  assert.strictEqual(findByClass(panel, "panel-title").textContent, "ただいま準備中です");
  assert.strictEqual(findByClass(panel, "panel-desc").textContent, "ツールができたら、ここに並びます。");
});

test("AC-28：「無料ツールを見る」の行き先は、最初のツールのパネル（0件なら準備中の場所）", function () {
  assert.strictEqual(getToolsJumpTarget(1), "#tool-1");
  assert.strictEqual(getToolsJumpTarget(3), "#tool-1");
  assert.strictEqual(getToolsJumpTarget(0), "#tools-empty");
});

test("AC-31・AC-32：画像があるパネルには、説明の下・ボタンの上にスクリーンショットが出て、alt は imageAlt の文", function () {
  const area = setUpFakeDocument();
  showToolPanels("tool-area", [makePublishedTool()]);
  const panel = area.children[0];
  const image = findByClass(panel, "tool-shot");
  assert.ok(image, "スクリーンショットがありません");
  assert.strictEqual(image.src, "assets/tool_simulator.jpg");
  assert.strictEqual(image.alt, "おかね収支シミュレーターの画面（NISA積立の計算例）");
  // 並び：本文の場所（説明 → 状態 → 画像）のあとに、ボタンの場所
  const body = panel.children[0];
  const classNames = body.children.map(function (child) {
    return child.className;
  });
  assert.ok(classNames.indexOf("panel-desc") < classNames.indexOf("tool-shot"));
  assert.match(panel.children[1].className, /actions/);
});

test("AC-32：imageAlt が空・ないときは「（ツール名）の画面」を alt に入れ、画像は表示する", function () {
  assert.strictEqual(getImageAlt({ name: "おかね収支シミュレーター", imageAlt: "" }), "おかね収支シミュレーターの画面");
  assert.strictEqual(getImageAlt({ name: "おかね収支シミュレーター" }), "おかね収支シミュレーターの画面");
  const area = setUpFakeDocument();
  const noAlt = makePublishedTool();
  delete noAlt.imageAlt;
  showToolPanels("tool-area", [noAlt]);
  assert.strictEqual(findByClass(area.children[0], "tool-shot").alt, "おかね収支シミュレーターの画面");
});

test("AC-33：image がない・空のツールは、画像なしのパネルになり、ほかは今までどおり", function () {
  const area = setUpFakeDocument();
  const noImage = makePublishedTool();
  delete noImage.image;
  const emptyImage = Object.assign(makePublishedTool(), { image: "" });
  showToolPanels("tool-area", [noImage, emptyImage]);
  assert.strictEqual(area.children.length, 2);
  area.children.forEach(function (panel) {
    assert.strictEqual(findByClass(panel, "tool-shot"), undefined);
    assert.ok(findByClass(panel, "panel-title"));
    assert.ok(findByClass(panel, "btn-main"));
  });
});

test("AC-34：image が外部URLのツールは、画像なしで表示され、何件目の画像かがコンソールに日本語で出る", function () {
  const area = setUpFakeDocument();
  const external = Object.assign(makePublishedTool(), { image: "https://example.com/a.jpg" });
  const warnings = captureWarnings(function () {
    showToolPanels("tool-area", [makePublishedTool(), external]);
  });
  assert.strictEqual(area.children.length, 2);
  assert.strictEqual(findByClass(area.children[1], "tool-shot"), undefined);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /2件目の、画像の項目/);
});
