/*
 * diary_words_file.test.js：tools/diary_words_file.js（機密の言葉の一覧ファイルの場所の確認）の自動テスト
 * 一時フォルダに「運用用のフォルダ」「その中のリポジトリ」「運用用のフォルダの外」を作って確かめる（実際の一覧・場所は使わない）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { checkWordsFileLocation, isInsideFolder, WORDS_FILE_PROBLEM } = require("../tools/diary_words_file.js");

// テスト用の言葉（実際の機密の言葉ではない）
const TEST_WORD = "テスト用ひみつ語";

/**
 * 一時フォルダに、運用用のフォルダ・リポジトリ・その外の場所を作る。
 * @returns {{ base: string, hq: string, repo: string, outside: string }} それぞれの場所
 */
function makeFolders() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "diary-words-"));
  const hq = path.join(base, "hq");
  const repo = path.join(hq, "products", "portal");
  const outside = path.join(base, "outside");
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(outside);
  return { base: base, hq: hq, repo: repo, outside: outside };
}

/**
 * ファイルを書いて、その場所を返す。
 * @param {string} folder フォルダ
 * @param {string} text 中身
 * @returns {string} ファイルの場所
 */
function writeWords(folder, text) {
  const file = path.join(folder, "words.txt");
  fs.writeFileSync(file, text, "utf8");
  return file;
}

test("AC-52：運用用のフォルダの外・リポジトリの外にあり、言葉が入っていれば進む", function () {
  const folders = makeFolders();
  try {
    const file = writeWords(folders.outside, "# 説明の行\n" + TEST_WORD + "\n");
    assert.deepStrictEqual(checkWordsFileLocation(file, folders.hq, folders.repo), { ok: true, message: "" });
  } finally {
    fs.rmSync(folders.base, { recursive: true, force: true });
  }
});

test("AC-52：未指定・ない・空・リポジトリの中・運用用のフォルダの中・運用用のフォルダが無い、のどれでも決まった文で止める", function () {
  const folders = makeFolders();
  try {
    const good = writeWords(folders.outside, TEST_WORD + "\n");
    const cases = [
      [undefined, folders.hq],
      ["", folders.hq],
      [good, undefined],
      [path.join(folders.outside, "none.txt"), folders.hq],
      [writeWords(fs.mkdtempSync(path.join(folders.base, "empty-")), "# 説明だけ\n\n"), folders.hq],
      [writeWords(folders.repo, TEST_WORD), folders.hq],
      [writeWords(path.join(folders.hq, "products"), TEST_WORD), folders.hq],
      [good, path.join(folders.base, "no-such-hq")]
    ];
    cases.forEach(function (oneCase, index) {
      const result = checkWordsFileLocation(oneCase[0], oneCase[1], folders.repo);
      assert.strictEqual(result.ok, false, "場合 " + index);
      assert.strictEqual(result.message, WORDS_FILE_PROBLEM);
    });
  } finally {
    fs.rmSync(folders.base, { recursive: true, force: true });
  }
});

test("AC-52：止めるときの文に、一覧の場所も中身も出ない", function () {
  assert.ok(WORDS_FILE_PROBLEM.startsWith("機密の言葉の一覧が正しい場所にありません"));
  assert.ok(!WORDS_FILE_PROBLEM.includes(os.tmpdir()));
  assert.ok(!WORDS_FILE_PROBLEM.includes(TEST_WORD));
});

test("フォルダの中かどうかの判定（同じ名前で始まる別のフォルダは中ではない）", function () {
  const base = path.join(os.tmpdir(), "inside-check");
  assert.strictEqual(isInsideFolder(path.join(base, "hq", "a.txt"), path.join(base, "hq")), true);
  assert.strictEqual(isInsideFolder(path.join(base, "hq2", "a.txt"), path.join(base, "hq")), false);
  assert.strictEqual(isInsideFolder(path.join(base, "a.txt"), path.join(base, "hq")), false);
});
