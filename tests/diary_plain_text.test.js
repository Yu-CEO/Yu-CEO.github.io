/*
 * diary_plain_text.test.js：tools/diary_plain_text.js（3版目の記号を外した文字を、照合用に一時フォルダへ書き出す）の自動テスト
 * 2版目・旧形式は書き出さないこと、書き出し先がリポジトリの中なら止まること、書き出した文字に記号がないことを確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writePlainTexts, removePlainTexts, isOutsideRepository } = require("../tools/diary_plain_text.js");

const FIXTURE_FOLDER = path.join(__dirname, "fixtures", "diary_entries");

/**
 * 一時フォルダに、練習用のリポジトリ（diary/entries/ に日記を入れたもの）を作る。
 * @param {string[]} dates 入れる日記の日付（テスト用の仮の日記）
 * @returns {{ base: string, repo: string, out: string }} 場所
 */
function makeRepo(dates) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "diary-plain-test-"));
  const repo = path.join(base, "repo");
  fs.mkdirSync(path.join(repo, "diary", "entries"), { recursive: true });
  dates.forEach(function (date) {
    fs.copyFileSync(path.join(FIXTURE_FOLDER, date + ".json"), path.join(repo, "diary", "entries", date + ".json"));
  });
  fs.writeFileSync(path.join(repo, "diary", "entries", "index.json"), JSON.stringify(dates));
  return { base: base, repo: repo, out: path.join(base, "plain") };
}

test("AC-77：3版目の強調を書ける項目だけが、記号を外した文字で、1項目1ファイルに書き出される", function () {
  const world = makeRepo(["2026-11-15", "2026-11-17", "2026-11-20"]);
  try {
    const result = writePlainTexts(world.repo, world.out);
    assert.strictEqual(result.ok, true);
    const names = fs.readdirSync(world.out).sort();
    // problem 3・lines 4・decision 1・result 2・takeaway 1 ＝ 11 ファイル。日付は 3版目の 2026-11-20 だけ
    assert.strictEqual(names.length, 11);
    assert.strictEqual(result.count, 11);
    names.forEach(function (name) {
      assert.ok(name.startsWith("2026-11-20__"), name);
    });
    assert.ok(names.includes("2026-11-20__decision-1.txt"));
    const decision = fs.readFileSync(path.join(world.out, "2026-11-20__decision-1.txt"), "utf8");
    assert.strictEqual(decision.trim(), "（テスト用）長い説明は図にして、文章は短くする");
    names.forEach(function (name) {
      const text = fs.readFileSync(path.join(world.out, name), "utf8");
      assert.ok(!text.includes("**") && !text.includes("=="), name);
    });
  } finally {
    fs.rmSync(world.base, { recursive: true, force: true });
  }
});

test("AC-77：2版目・旧形式の日記だけなら何も書き出さない（もとの文字のまま照合されるため）", function () {
  const world = makeRepo(["2026-11-15", "2026-11-17"]);
  try {
    const result = writePlainTexts(world.repo, world.out);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.count, 0);
    assert.deepStrictEqual(fs.readdirSync(world.out), []);
  } finally {
    fs.rmSync(world.base, { recursive: true, force: true });
  }
});

test("AC-77：書き出し先がリポジトリの中なら、書かずに止まる", function () {
  const world = makeRepo(["2026-11-20"]);
  try {
    const inside = path.join(world.repo, "plain");
    const result = writePlainTexts(world.repo, inside);
    assert.strictEqual(result.ok, false);
    assert.match(result.problems[0], /リポジトリの中/);
    assert.strictEqual(fs.existsSync(inside), false);
    assert.strictEqual(isOutsideRepository(world.repo, world.repo), false);
    assert.strictEqual(isOutsideRepository(world.repo, world.out), true);
  } finally {
    fs.rmSync(world.base, { recursive: true, force: true });
  }
});

test("AC-77：removePlainTexts で書き出したフォルダが消える", function () {
  const world = makeRepo(["2026-11-20"]);
  try {
    writePlainTexts(world.repo, world.out);
    assert.ok(fs.existsSync(world.out));
    removePlainTexts(world.out);
    assert.strictEqual(fs.existsSync(world.out), false);
  } finally {
    fs.rmSync(world.base, { recursive: true, force: true });
  }
});

test("AC-77：CI（ci.yml）に、記号を外した文字を作業用の一時フォルダ（_site の外）に書き出して Secrets で照合する手順がある", function () {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "ci.yml"), "utf8");
  assert.ok(workflow.includes("node tools/diary_plain_text.js \"$RUNNER_TEMP/diary_plain\""));
  assert.ok(workflow.includes("confidential_check.py\" --require-words"));
  // 書き出し先は公開するファイルの置き場（_site）の外
  assert.ok(!workflow.includes("_site/diary_plain"));
  // 照合は公開（deploy）の前の check ジョブの中にある
  assert.ok(workflow.indexOf("記号を外した文字") < workflow.indexOf("deploy:\n"));
});
