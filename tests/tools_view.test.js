/*
 * tools_view.test.js：js/tools_view.js（カードを作って並べる処理）の自動テスト
 * Node.js にはブラウザの画面（document）がないので、テストに必要な分だけをまねた「にせの画面」を作って確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");

// ブラウザでは tools_validate.js が先に読み込まれていて validateTools がそのまま使える。
// テストでも同じ状態にするため、global（どのファイルからも見える置き場所）に入れておく
global.validateTools = require("../js/tools_validate.js").validateTools;
const { showToolList } = require("../js/tools_view.js");

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
    }
  };
}

/**
 * id が "tool-list" の場所だけを持つ、にせの画面を用意し、一覧の場所を返す。
 * @returns {object} 一覧の場所（にせの要素）
 */
function setUpFakeDocument() {
  const listArea = createFakeElement("div");
  global.document = {
    createElement: createFakeElement,
    getElementById: function (id) {
      if (id === "tool-list") {
        return listArea;
      }
      return null;
    }
  };
  return listArea;
}

/**
 * カードの中から、決まったクラス名の部品を探す（見出しの中も探す）。
 * @param {object} element 探す場所
 * @param {string} className 探すクラス名の一部
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

const PUBLISHED_TOOL = {
  name: "おかね収支シミュレーター",
  description: "テスト用の説明です",
  url: "https://yu-ceo.github.io/okane-simulator/",
  status: "公開中"
};

test("AC-3：「公開中」のカードには、名前・説明・状態・新しいタブで開くボタンが出る", function () {
  const listArea = setUpFakeDocument();
  showToolList("tool-list", [PUBLISHED_TOOL]);
  assert.strictEqual(listArea.children.length, 1);
  const card = listArea.children[0];
  assert.strictEqual(findByClass(card, "tool-name").textContent, "おかね収支シミュレーター");
  assert.strictEqual(findByClass(card, "tool-desc").textContent, "テスト用の説明です");
  assert.strictEqual(findByClass(card, "status").textContent, "公開中");
  const openButton = findByClass(card, "button-tool");
  assert.strictEqual(openButton.textContent, "開く");
  assert.strictEqual(openButton.href, "https://yu-ceo.github.io/okane-simulator/");
  assert.strictEqual(openButton.target, "_blank");
  assert.strictEqual(openButton.rel, "noopener");
});

test("AC-5：「準備中」のカードには「準備中」と出て、開くボタンは出ない", function () {
  const listArea = setUpFakeDocument();
  const preparing = Object.assign({}, PUBLISHED_TOOL, { status: "準備中" });
  showToolList("tool-list", [preparing]);
  const card = listArea.children[0];
  assert.strictEqual(findByClass(card, "status").textContent, "準備中");
  assert.strictEqual(findByClass(card, "button-tool"), undefined);
});

test("AC-6：正しくない項目は表示せず、何件目のどの項目かをコンソールに日本語で出す", function () {
  const listArea = setUpFakeDocument();
  const noName = Object.assign({}, PUBLISHED_TOOL);
  delete noName.name;
  const warnings = captureWarnings(function () {
    showToolList("tool-list", [PUBLISHED_TOOL, noName]);
  });
  assert.strictEqual(listArea.children.length, 1);
  assert.strictEqual(warnings.length, 1);
  assert.match(warnings[0], /2件目/);
  assert.match(warnings[0], /「name」/);
});

test("AC-7：表示できるツールが0件なら「ただいま準備中です」と出る", function () {
  const listArea = setUpFakeDocument();
  showToolList("tool-list", []);
  assert.strictEqual(listArea.children.length, 1);
  assert.strictEqual(listArea.children[0].textContent, "ただいま準備中です");
});
