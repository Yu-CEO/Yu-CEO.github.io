/*
 * fake_dom.js：テスト用の「にせの画面」（ブラウザの document と要素のまね）
 * Node.js にはブラウザの画面がないので、日記の表示のテストに必要な機能だけをまねる。
 * 主な関数：installFakeDocument（にせの document を用意する）、findAllByClass・findByClass（クラス名で部品を探す）
 * tests/diary_*.test.js から使われる（このファイル自体はテストではない）。
 */

/**
 * にせの要素を1つ作る。
 * @param {string} tagName タグの名前
 * @returns {object} にせの要素
 */
function createFakeElement(tagName) {
  return {
    tagName: tagName,
    className: "",
    id: "",
    hidden: false,
    children: [],
    attributes: {},
    text: "",
    // 文字は、自分の文字か、中の部品の文字をつなげたもの（ブラウザの textContent と同じ考え方）
    get textContent() {
      if (this.children.length === 0) {
        return this.text;
      }
      return this.children.map(function (child) {
        return child.textContent;
      }).join("");
    },
    set textContent(value) {
      this.text = value;
      this.children = [];
    },
    appendChild: function (child) {
      this.children.push(child);
    },
    setAttribute: function (name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute: function (name) {
      return this.attributes[name];
    },
    addEventListener: function () {}
  };
}

/**
 * 部品の中から、決まったクラス名の部品をすべて探す（中の部品も探す）。
 * @param {object} element 探す場所
 * @param {string} className 探すクラス名
 * @returns {object[]} 見つかった部品
 */
function findAllByClass(element, className) {
  let found = [];
  element.children.forEach(function (child) {
    if (child.className.split(" ").includes(className)) {
      found.push(child);
    }
    found = found.concat(findAllByClass(child, className));
  });
  return found;
}

/**
 * 部品の中から、決まったクラス名の最初の部品を探す。
 * @param {object} element 探す場所
 * @param {string} className 探すクラス名
 * @returns {object|undefined} 見つかった部品
 */
function findByClass(element, className) {
  return findAllByClass(element, className)[0];
}

/**
 * にせの document を用意する。ids に渡した要素は getElementById で見つかる。
 * @param {object} ids id と要素の組（例 { "diary-latest": panel }）
 * @returns {object} にせの document
 */
function installFakeDocument(ids) {
  global.document = {
    title: "",
    createElement: createFakeElement,
    // 文字だけの部品（ブラウザの createTextNode のまね）。文字は text に持つ
    createTextNode: function (text) {
      const node = createFakeElement("#text");
      node.text = text;
      return node;
    },
    createElementNS: function (namespace, tagName) {
      return createFakeElement(tagName);
    },
    getElementById: function (id) {
      if (Object.prototype.hasOwnProperty.call(ids, id)) {
        return ids[id];
      }
      return null;
    }
  };
  return global.document;
}

module.exports = { createFakeElement, findAllByClass, findByClass, installFakeDocument };
