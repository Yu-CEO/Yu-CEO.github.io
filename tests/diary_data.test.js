/*
 * diary_data.test.js：実際の日記のデータ（diary/entries/）が全部検査を通るか、一覧のファイルと過不足がないかのテスト
 * 形の正しくない日記を入れた変更は、ここで CI が失敗し、公開されない。
 * テスト用の仮の日記（tests/fixtures/diary_entries/）も、同じ検査を通ることを確かめる。
 * 〔v3〕図（SVG）も、「figure がある日だけ図のファイルがある」ことと、図の検査を通ることを確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { findEntryProblems } = require("../js/diary_format.js");
const { findSvgProblems } = require("../js/diary_svg_check.js");

// 調べるフォルダ（名前は結果の表示に使う）
// figureFolder：その日記の図（SVG）のフォルダ。図が1つもないうちは、フォルダがなくてもよい
const ENTRY_FOLDERS = [
  {
    label: "公開する日記",
    folder: path.join(__dirname, "..", "diary", "entries"),
    figureFolder: path.join(__dirname, "..", "diary", "figures")
  },
  {
    label: "テスト用の日記",
    folder: path.join(__dirname, "fixtures", "diary_entries"),
    figureFolder: path.join(__dirname, "fixtures", "diary_figures")
  }
];

/**
 * フォルダの中の index.json と、日付の名前のJSONファイルの一覧を読む。
 * @param {string} folder フォルダの場所
 * @returns {{ index: *, files: string[] }} 一覧の中身と、ファイル名から取った日付の一覧
 */
function readEntryFolder(folder) {
  const index = JSON.parse(fs.readFileSync(path.join(folder, "index.json"), "utf8"));
  const files = fs.readdirSync(folder)
    .filter(function (fileName) {
      return fileName.endsWith(".json") && fileName !== "index.json";
    })
    .map(function (fileName) {
      return fileName.replace(/\.json$/, "");
    });
  return { index: index, files: files };
}

// 図のファイル名の決まり：1枚目は <日付>.svg、2枚目（3版目）は <日付>-2.svg。これ以外の名前（-1・-3・-02 など）は失敗にする
const FIRST_FIGURE_PATTERN = /^(\d{4}-\d{2}-\d{2})\.svg$/;
const SECOND_FIGURE_PATTERN = /^(\d{4}-\d{2}-\d{2})-2\.svg$/;

/**
 * 図のフォルダの中のファイル名の一覧を返す。フォルダがなければ空。
 * @param {string} figureFolder 図のフォルダの場所
 * @returns {string[]} ファイル名の一覧
 */
function listFigureFiles(figureFolder) {
  if (!fs.existsSync(figureFolder)) {
    return [];
  }
  return fs.readdirSync(figureFolder);
}

/**
 * 図のファイル名のうち、決まった形（pattern）のものから日付を取り出す。
 * @param {string[]} fileNames ファイル名の一覧
 * @param {RegExp} pattern 1枚目か2枚目の形
 * @returns {string[]} 日付の一覧
 */
function pickFigureDates(fileNames, pattern) {
  return fileNames.filter(function (fileName) {
    return pattern.test(fileName);
  }).map(function (fileName) {
    return fileName.match(pattern)[1];
  });
}

/**
 * 日記の中で、決まった項目（figure か figure2）がある日の一覧を返す。
 * @param {string} folder 日記のフォルダの場所
 * @param {string} fieldName "figure" か "figure2"
 * @returns {string[]} 日付の一覧
 */
function listDatesWithField(folder, fieldName) {
  return readEntryFolder(folder).files.filter(function (date) {
    const entry = JSON.parse(fs.readFileSync(path.join(folder, date + ".json"), "utf8"));
    return entry[fieldName] !== undefined;
  });
}

ENTRY_FOLDERS.forEach(function (target) {
  test("AC-18：" + target.label + "の index.json は日付の配列で、重複がなく、ファイルと過不足なく一致する", function () {
    const data = readEntryFolder(target.folder);
    assert.ok(Array.isArray(data.index), "index.json が配列になっていません");
    assert.strictEqual(new Set(data.index).size, data.index.length, "index.json に同じ日付が2回あります");
    assert.deepStrictEqual(data.index.slice().sort(), data.files.slice().sort());
  });

  test("AC-18：" + target.label + "の全ファイルが検査を通る", function () {
    readEntryFolder(target.folder).files.forEach(function (date) {
      const entry = JSON.parse(fs.readFileSync(path.join(target.folder, date + ".json"), "utf8"));
      assert.deepStrictEqual(findEntryProblems(entry, date), [], date + ".json が正しくありません");
    });
  });

  test("AC-46：" + target.label + "で、figure がある日にだけ図のファイル（日付.svg）があり、過不足がない", function () {
    const figureDates = pickFigureDates(listFigureFiles(target.figureFolder), FIRST_FIGURE_PATTERN);
    assert.deepStrictEqual(figureDates.slice().sort(), listDatesWithField(target.folder, "figure").sort());
  });

  test("AC-74：" + target.label + "で、figure2 がある日にだけ2枚目の図（日付-2.svg）があり、過不足がない（figure なしの figure2 だけの日も可）", function () {
    const figureDates = pickFigureDates(listFigureFiles(target.figureFolder), SECOND_FIGURE_PATTERN);
    assert.deepStrictEqual(figureDates.slice().sort(), listDatesWithField(target.folder, "figure2").sort());
  });

  test("AC-74：" + target.label + "の図のフォルダには、決まった名前（日付.svg・日付-2.svg）のファイルだけがある", function () {
    listFigureFiles(target.figureFolder).forEach(function (fileName) {
      const isKnownName = FIRST_FIGURE_PATTERN.test(fileName) || SECOND_FIGURE_PATTERN.test(fileName);
      assert.ok(isKnownName, "決まっていない名前の図のファイルがあります：" + fileName);
    });
  });

  test("AC-48・AC-49・AC-75：" + target.label + "の図（2枚目も）が、すべて図の検査を通る", function () {
    listFigureFiles(target.figureFolder).forEach(function (fileName) {
      const svgText = fs.readFileSync(path.join(target.figureFolder, fileName), "utf8");
      assert.deepStrictEqual(findSvgProblems(svgText), [], fileName + " が正しくありません");
    });
  });
});
