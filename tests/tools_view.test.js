/*
 * tools_view.test.js：js/tools_view.js（「会議から生まれた道具」の一覧を作る処理）の自動テスト（1ツール1行）
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
const { showToolList, getImageAlt } = require("../js/tools_view.js");

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
    attributes: {},
    setAttribute: function (name, value) {
      this.attributes[name] = String(value);
    },
    // 画像の読み込み失敗を見張る登録。にせの画面では読み込みが起きないので、何もしない
    addEventListener: function () {}
  };
}

/**
 * id が "tool-list" の場所だけを持つ、にせの画面を用意し、その場所を返す。
 * @returns {object} ツールの場所（にせの要素）
 */
function setUpFakeDocument() {
  const area = createFakeElement("ul");
  global.document = {
    createElement: createFakeElement,
    getElementById: function (id) {
      if (id === "tool-list") {
        return area;
      }
      return null;
    }
  };
  return area;
}

/**
 * 一覧の中から、決まったクラス名の部品を探す（中の部品も探す）。
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

/**
 * 一覧の中の、ツールの行（li）を取り出す。
 * @param {object} area 一覧
 * @returns {object[]} 行の一覧
 */
function getRows(area) {
  return area.children;
}

test("AC-3：「公開中」のツールは名前・説明が出て、行全体が新しいタブで開くリンクになる。1行目は目立たせる印がつく", function () {
  const area = setUpFakeDocument();
  assert.strictEqual(showToolList("tool-list", [makePublishedTool()]), 1);
  assert.strictEqual(getRows(area)[0].className, "first");
  const row = getRows(area)[0].children[0];
  assert.strictEqual(row.tagName, "a");
  assert.strictEqual(findByClass(row, "tl-name").textContent, "おかね収支シミュレーター");
  assert.strictEqual(findByClass(row, "tl-desc").textContent, "テスト用の説明です");
  assert.strictEqual(row.href, "https://yu-ceo.github.io/okane-simulator/");
  assert.strictEqual(row.target, "_blank");
  assert.strictEqual(row.rel, "noopener");
  assert.match(row.attributes["aria-label"], /おかね収支シミュレーターを開く/);
  assert.strictEqual(findByClass(row, "tl-arrow").textContent, "›");
});

test("AC-4：ツールを2件にすると2行になり、足した順に並ぶ", function () {
  const area = setUpFakeDocument();
  const second = Object.assign(makePublishedTool(), { name: "2つ目のツール" });
  showToolList("tool-list", [makePublishedTool(), second]);
  const rows = getRows(area);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(findByClass(rows[1], "tl-name").textContent, "2つ目のツール");
});

test("AC-5：「準備中」の行には「準備中」と出て、リンクも矢印も出ない", function () {
  const area = setUpFakeDocument();
  showToolList("tool-list", [Object.assign(makePublishedTool(), { status: "準備中" })]);
  const row = getRows(area)[0].children[0];
  assert.strictEqual(row.tagName, "div");
  assert.strictEqual(row.href, undefined);
  assert.strictEqual(findByClass(row, "tl-status").textContent, "準備中");
  assert.strictEqual(findByClass(row, "tl-arrow"), undefined);
});

test("AC-6：正しくない項目は表示せず、何件目のどの項目かをコンソールに日本語で出す", function () {
  const area = setUpFakeDocument();
  const noName = makePublishedTool();
  delete noName.name;
  const warnings = captureWarnings(function () {
    showToolList("tool-list", [makePublishedTool(), noName]);
  });
  assert.strictEqual(getRows(area).length, 1);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /2件目/);
  assert.match(warnings[0], /「name」/);
});

test("AC-7：表示できるツールが0件なら「ただいま準備中です」の1行が出る", function () {
  const area = setUpFakeDocument();
  assert.strictEqual(showToolList("tool-list", []), 0);
  assert.strictEqual(area.children.length, 1);
  assert.match(area.children[0].textContent, /^ただいま準備中です/);
});

test("AC-31・AC-32：画像があるツールの行には、名前の左に画面写真が出て、alt は imageAlt の文", function () {
  const area = setUpFakeDocument();
  showToolList("tool-list", [makePublishedTool()]);
  const row = getRows(area)[0].children[0];
  const image = findByClass(row, "tl-shot");
  assert.ok(image, "スクリーンショットがありません");
  assert.strictEqual(image.src, "assets/tool_simulator.jpg");
  assert.strictEqual(image.alt, "おかね収支シミュレーターの画面（NISA積立の計算例）");
  // 並び：画像（左）→ 文字の部分
  assert.strictEqual(row.children[0].className, "tl-shot");
});

test("AC-32：imageAlt が空・ないときは「（ツール名）の画面」を alt に入れ、画像は表示する", function () {
  assert.strictEqual(getImageAlt({ name: "おかね収支シミュレーター", imageAlt: "" }), "おかね収支シミュレーターの画面");
  assert.strictEqual(getImageAlt({ name: "おかね収支シミュレーター" }), "おかね収支シミュレーターの画面");
  const area = setUpFakeDocument();
  const noAlt = makePublishedTool();
  delete noAlt.imageAlt;
  showToolList("tool-list", [noAlt]);
  assert.strictEqual(findByClass(area, "tl-shot").alt, "おかね収支シミュレーターの画面");
});

test("AC-33：image がない・空のツールは、画像なしの行になり、ほかは今までどおり", function () {
  const area = setUpFakeDocument();
  const noImage = makePublishedTool();
  delete noImage.image;
  const emptyImage = Object.assign(makePublishedTool(), { image: "" });
  showToolList("tool-list", [noImage, emptyImage]);
  const rows = getRows(area);
  assert.strictEqual(rows.length, 2);
  rows.forEach(function (row) {
    assert.strictEqual(findByClass(row, "tl-shot"), undefined);
    assert.ok(findByClass(row, "tl-name"));
  });
});

test("AC-34：image が外部URLのツールは、画像なしで表示され、何件目の画像かがコンソールに日本語で出る", function () {
  const area = setUpFakeDocument();
  const external = Object.assign(makePublishedTool(), { image: "https://example.com/a.jpg" });
  const warnings = captureWarnings(function () {
    showToolList("tool-list", [makePublishedTool(), external]);
  });
  const rows = getRows(area);
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(findByClass(rows[1], "tl-shot"), undefined);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /2件目の、画像の項目/);
});

test("第3回：説明文は省略せず全文を出す（為替の注意の文を隠さないため）", function () {
  const area = setUpFakeDocument();
  const longText = "あ".repeat(120);
  showToolList("tool-list", [Object.assign(makePublishedTool(), { description: longText })]);
  assert.strictEqual(findByClass(area, "tl-desc").textContent, longText);
});
