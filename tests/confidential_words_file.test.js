/*
 * confidential_words_file.test.js：ci/confidential_check.py の --words-file（日記の自動公開で使う、リポジトリの外の一覧）の自動テスト
 * 一時フォルダでテスト用の言葉を照合する（実際の機密の言葉・一覧は使わない）。Python が無いときは飛ばす（CI では動く）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");

const CONFIDENTIAL_CHECK = path.join(__dirname, "..", "ci", "confidential_check.py");
// テスト用の言葉（実際の機密の言葉ではない）
const TEST_WORD = "テスト用ひみつ語";
const OTHER_WORD = "べつのテスト語";
const PYTHON = ["python3", "python"].find(function (command) {
  return childProcess.spawnSync(command, ["--version"]).status === 0;
});
const SKIP_REASON = PYTHON ? false : "Python が見つからないため飛ばします（CI では動きます）";

/**
 * 一時フォルダ（調べる側）と一覧ファイルを作り、照合を動かす。
 * @param {string} fileText 調べるファイルの中身
 * @param {string|null} wordsText 一覧の中身（null なら一覧を作らない）
 * @param {string} envWords 環境変数 CONFIDENTIAL_WORDS の値（--words-file のときは使われないはず）
 * @param {string} [fileName] 調べるファイルの名前（既定は figure.svg）
 * @returns {{ status: number, output: string, wordsFile: string }} 終了コード・表示・一覧の場所
 */
function runCheck(fileText, wordsText, envWords, fileName) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "words-file-"));
  const folder = path.join(base, "repo");
  fs.mkdirSync(folder);
  const wordsFile = path.join(base, "words.txt");
  if (wordsText !== null) {
    fs.writeFileSync(wordsFile, wordsText, "utf8");
  }
  fs.writeFileSync(path.join(folder, fileName || "figure.svg"), fileText, "utf8");
  try {
    const result = childProcess.spawnSync(PYTHON, [CONFIDENTIAL_CHECK, "--words-file", wordsFile], {
      cwd: folder,
      encoding: "utf8",
      env: Object.assign({}, process.env, { CONFIDENTIAL_WORDS: envWords, PYTHONIOENCODING: "utf-8", GIT_CEILING_DIRECTORIES: base })
    });
    return { status: result.status, output: result.stdout + result.stderr, wordsFile: wordsFile };
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

test("AC-15・AC-50：一覧の言葉を含む図は止まり、表示はファイル名と行番号だけ（言葉・一覧の場所は出ない）", { skip: SKIP_REASON }, function () {
  const result = runCheck("<text>" + TEST_WORD + "</text>\n", TEST_WORD + "\n", "");
  assert.strictEqual(result.status, 1);
  assert.match(result.output, /figure\.svg:1/);
  assert.ok(!result.output.includes(TEST_WORD));
  assert.ok(!result.output.includes(result.wordsFile));
});

test("--words-file のときは、その一覧だけを使う（環境変数の言葉は使わない）", { skip: SKIP_REASON }, function () {
  const result = runCheck("<text>" + OTHER_WORD + "</text>\n", TEST_WORD + "\n", OTHER_WORD);
  assert.strictEqual(result.status, 0, result.output);
});

test("AC-15・AC-52：一覧が空・説明の行だけ・無いときは止まり、場所は表示されない", { skip: SKIP_REASON }, function () {
  [["", "空"], ["# 説明だけ\n\n", "説明だけ"], [null, "無い"]].forEach(function (oneCase) {
    const result = runCheck("<text>ふつうの文</text>\n", oneCase[0], "");
    assert.strictEqual(result.status, 1, oneCase[1]);
    assert.match(result.output, /一覧が読めないか、空です/);
    assert.ok(!result.output.includes(result.wordsFile));
  });
});

test("M1：JSON の \\uXXXX の書き方で書いた言葉も、読み込んだあとの文字で見つかる（言葉・場所は表示しない）", { skip: SKIP_REASON }, function () {
  const escaped = TEST_WORD.split("").map(function (char) {
    return "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
  }).join("");
  const result = runCheck("{\"title\": \"" + escaped + "\"}\n", TEST_WORD + "\n", "", "entry.json");
  assert.strictEqual(result.status, 1, result.output);
  assert.match(result.output, /entry\.json:全体/);
  assert.ok(!result.output.includes(TEST_WORD));
});

test("L13：図の <text> 2行に分けた言葉・空白入り・全角半角の違いも見つかる", { skip: SKIP_REASON }, function () {
  const half = TEST_WORD.length / 2;
  const split = "<svg>\n<text>" + TEST_WORD.slice(0, half) + "</text>\n<text>" + TEST_WORD.slice(half) + "</text>\n</svg>\n";
  const splitResult = runCheck(split, TEST_WORD + "\n", "");
  assert.strictEqual(splitResult.status, 1, splitResult.output);
  assert.match(splitResult.output, /figure\.svg:全体/);
  const spaced = runCheck("<text>" + TEST_WORD.slice(0, half) + " " + TEST_WORD.slice(half) + "</text>\n", TEST_WORD + "\n", "");
  assert.strictEqual(spaced.status, 1, spaced.output);
  // 全角の英字（ＡＢＣ）で書いても、半角の言葉（abc）で見つかる
  const wide = runCheck("<text>テストＡＢＣ</text>\n", "テストabc\n", "");
  assert.strictEqual(wide.status, 1, wide.output);
});

test("L13：言葉を含まない図・JSON は、そろえて照合しても止まらない（過剰な検知をしない）", { skip: SKIP_REASON }, function () {
  const result = runCheck("<svg>\n<text>テスト用</text>\n<text>ふつうの文</text>\n</svg>\n", TEST_WORD + "\n", "");
  assert.strictEqual(result.status, 0, result.output);
});

test("N1：言葉の途中に目に見えない書式の文字を挟んでも見つかる", { skip: SKIP_REASON }, function () {
  [0x200b, 0x2060, 0x00ad].forEach(function (codePoint) {
    const hidden = TEST_WORD.slice(0, 3) + String.fromCharCode(codePoint) + TEST_WORD.slice(3);
    const result = runCheck("<text>" + hidden + "</text>\n", TEST_WORD + "\n", "");
    assert.strictEqual(result.status, 1, codePoint.toString(16) + " " + result.output);
  });
});

test("N3：先頭に BOM がある JSON でも、読み込んだあとの文字で照合する（一覧に BOM があっても読める）", { skip: SKIP_REASON }, function () {
  const bom = String.fromCharCode(0xfeff);
  const backslash = String.fromCharCode(92);
  const escaped = TEST_WORD.split("").map(function (char) {
    return backslash + "u" + char.charCodeAt(0).toString(16).padStart(4, "0");
  }).join("");
  const result = runCheck(bom + "{\"title\": \"" + escaped + "\"}\n", bom + TEST_WORD + "\n", "", "entry.json");
  assert.strictEqual(result.status, 1, result.output);
  assert.match(result.output, /entry\.json:全体/);
});
