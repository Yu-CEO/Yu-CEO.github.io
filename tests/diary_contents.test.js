/*
 * diary_contents.test.js：tools/diary_contents.js（自動公開の前の、日記・図の中身の確かめ）のうち、ファイルが無いときの扱いと \uXXXX の書き方の自動テスト
 * 流れ全体（練習用リポジトリ）は tests/diary_publish.test.js で確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readRepoText, checkDiaryContents, hasUnicodeEscape } = require("../tools/diary_contents.js");

test("readRepoText：ファイルが無いときは、中身の代わりに「〜がありません」を返す", function () {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "diary-contents-"));
  try {
    fs.writeFileSync(path.join(folder, "a.json"), "[]", "utf8");
    assert.deepStrictEqual(readRepoText({ repoDir: folder }, "a.json"), { text: "[]", problems: [] });
    assert.deepStrictEqual(readRepoText({ repoDir: folder }, "none.json"), { text: "", problems: ["none.json がありません"] });
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("checkDiaryContents：日記・index.json・図のファイルが無いときは、それぞれ「ありません」で止まる", function () {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "diary-contents-"));
  try {
    const context = { repoDir: folder, today: "2026-11-16", run: function () { return { status: 0, stdout: "[]", stderr: "" }; } };
    const problems = checkDiaryContents(context, { date: "2026-11-16", hasFigure: true });
    assert.ok(problems.includes("diary/entries/index.json がありません"), problems.join("／"));
    assert.ok(problems.includes("diary/entries/2026-11-16.json がありません"));
    assert.ok(problems.includes("diary/figures/2026-11-16.svg がありません"));
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("M1：\\uXXXX の書き方を見分ける。公開する日記・テスト用の日記には1つも無い（CI でも確かめる）", function () {
  assert.strictEqual(hasUnicodeEscape("{\"title\": \"\\u3042\"}"), true);
  assert.strictEqual(hasUnicodeEscape("{\"title\": \"あ\"}"), false);
  const folders = [path.join(__dirname, "..", "diary", "entries"), path.join(__dirname, "fixtures", "diary_entries")];
  folders.forEach(function (folder) {
    fs.readdirSync(folder).filter(function (name) { return name.endsWith(".json"); }).forEach(function (name) {
      assert.strictEqual(hasUnicodeEscape(fs.readFileSync(path.join(folder, name), "utf8")), false, name + " に \\uXXXX の書き方があります");
    });
  });
});
