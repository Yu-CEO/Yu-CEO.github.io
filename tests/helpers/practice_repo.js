/*
 * practice_repo.js：テスト用の道具。日記の自動公開（tools/diary_publish.js）を確かめるための練習用リポジトリと、差し替えた run を作る
 * 一時フォルダに「運用用のフォルダ」とその中の練習用リポジトリ、外の一覧ファイルを作り、手元の git だけで動かす。
 * GitHub との通信（fetch・push 先の URL）と push は差し替え、本物の push はしない（push された回数と、そのときの commit の中身を記録する）。
 * tests/diary_publish.test.js から使われる（このファイル自体はテストではない）。
 */
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const { main } = require("../../tools/diary_publish.js");
const { DIARY_AUTHOR_NAME, DIARY_AUTHOR_EMAIL, PUBLIC_REPOSITORY_URLS } = require("../../tools/diary_git.js");

const PORTAL = path.join(__dirname, "..", "..");
const FIXTURES = path.join(__dirname, "..", "fixtures");
const TODAY = "2026-11-16";
// テスト用の言葉（実際の機密の言葉ではない）
const TEST_WORD = "テスト用ひみつ語";
const HAS_PYTHON = ["python3", "python"].some(function (command) {
  return childProcess.spawnSync(command, ["--version"]).status === 0;
});
const SKIP_REASON = HAS_PYTHON ? false : "Python が見つからないため飛ばします（CI では動きます）";

/**
 * 練習用のリポジトリで git を動かす（テストの準備用）。
 * @param {string} repo リポジトリの場所
 * @param {string[]} args 引数
 * @returns {string} 出力
 */
function gitIn(repo, args) {
  const result = childProcess.spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  assert.strictEqual(result.status, 0, "準備の git が失敗：" + args.join(" ") + " " + result.stderr);
  return result.stdout;
}

/**
 * ファイルを書く（フォルダが無ければ作る）。
 * @param {string} repo リポジトリの場所
 * @param {string} filePath リポジトリの中の場所
 * @param {string} text 中身
 */
function writeFile(repo, filePath, text) {
  fs.mkdirSync(path.dirname(path.join(repo, filePath)), { recursive: true });
  fs.writeFileSync(path.join(repo, filePath), text, "utf8");
}

/**
 * 運用用のフォルダ・その中の練習用リポジトリ（前の日の日記まで commit 済み）・運用用のフォルダの外の一覧ファイルを作る。
 * @returns {{ base: string, hq: string, repo: string, wordsFile: string }} 場所
 */
function makeWorld() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "diary-publish-"));
  const hq = path.join(base, "hq");
  const repo = path.join(hq, "products", "portal");
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(path.join(base, "outside"));
  const wordsFile = path.join(base, "outside", "words.txt");
  fs.writeFileSync(wordsFile, TEST_WORD + "\n", "utf8");
  gitIn(repo, ["init", "-q", "-b", "main"]);
  gitIn(repo, ["config", "user.name", DIARY_AUTHOR_NAME]);
  gitIn(repo, ["config", "user.email", DIARY_AUTHOR_EMAIL]);
  gitIn(repo, ["config", "commit.gpgsign", "false"]);
  gitIn(repo, ["config", "core.autocrlf", "false"]);
  writeFile(repo, "ci/confidential_check.py", fs.readFileSync(path.join(PORTAL, "ci", "confidential_check.py"), "utf8"));
  writeFile(repo, "diary/entries/2026-11-15.json", fs.readFileSync(path.join(FIXTURES, "diary_entries", "2026-11-15.json"), "utf8"));
  writeFile(repo, "diary/entries/index.json", "[\"2026-11-15\"]\n");
  writeFile(repo, "js/main.js", "// 練習用\n");
  writeFile(repo, ".github/workflows/ci.yml", "name: CI\n");
  gitIn(repo, ["add", "-A"]);
  gitIn(repo, ["commit", "-q", "-m", "はじめ"]);
  return { base: base, hq: hq, repo: repo, wordsFile: wordsFile };
}

/**
 * その日の日記（テスト用の仮の日記）と index.json の1行追加を置く。
 * @param {string} repo リポジトリの場所
 * @param {function(string): string} [edit] 日記の文字を書き換える関数
 */
function addTodayEntry(repo, edit) {
  let text = fs.readFileSync(path.join(FIXTURES, "diary_entries", TODAY + ".json"), "utf8");
  if (edit) {
    text = edit(text);
  }
  writeFile(repo, "diary/entries/" + TODAY + ".json", text);
  writeFile(repo, "diary/entries/index.json", "[\"2026-11-15\", \"" + TODAY + "\"]\n");
}

/**
 * テスト用の context を作る。fetch・GitHub の main・push を差し替え、ほかは本物のコマンドを練習用リポジトリで動かす。
 * @param {object} world makeWorld の結果
 * @param {object} [options] remoteHead（GitHub の main として返す値）・pushUrl（origin の push 先として返す値）・
 *   failSecondCheck（2回目の照合を失敗にする）・env（context の環境変数の上書き）・commandEnv（コマンドに渡す環境変数の追加）
 * @returns {object} context と記録（logs・pushes・checks）
 */
function makeContext(world, options) {
  const settings = options || {};
  const record = { logs: [], pushes: [], checks: 0 };
  const context = {
    repoDir: world.repo,
    today: TODAY,
    env: Object.assign({ DIARY_CONFIDENTIAL_WORDS_FILE: world.wordsFile, HQ_DIR: world.hq }, settings.env),
    log: function (text) { record.logs.push(text); },
    run: function (command, args, options) {
      if (command === "git" && args[0] === "fetch") {
        return { status: 0, stdout: "", stderr: "" };
      }
      if (command === "git" && args[0] === "rev-parse" && args[1] === "origin/main") {
        return { status: 0, stdout: settings.remoteHead || gitIn(world.repo, ["rev-parse", "HEAD"]), stderr: "" };
      }
      if (command === "git" && args[0] === "remote") {
        return { status: 0, stdout: (settings.pushUrl || PUBLIC_REPOSITORY_URLS[0]) + "\n", stderr: "" };
      }
      if (command === "git" && args[0] === "push") {
        record.pushes.push(gitIn(world.repo, ["show", "--name-only", "--format=%an <%ae>%n%s", "HEAD"]));
        return { status: 0, stdout: "", stderr: "" };
      }
      if (args[0] && args[0].includes("confidential_check.py")) {
        record.checks += 1;
        if (settings.failSecondCheck && record.checks === 2) {
          return { status: 1, stdout: "見つかりました：（テスト）", stderr: "" };
        }
      }
      const result = childProcess.spawnSync(command, args, {
        cwd: (options && options.cwd) || world.repo, encoding: "utf8", env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }, settings.commandEnv)
      });
      return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
    }
  };
  return { context: context, record: record };
}

/**
 * 確認担当の記録を、運用用のフォルダに書く（判定の行を足したいときは extraLines）。
 * @param {object} world makeWorld の結果
 * @param {string} fingerprint 指紋
 * @param {string} [verdict] 判定（既定は PASS）
 * @param {string} [extraLines] 最後に書き足す行
 */
function writeAuditRecord(world, fingerprint, verdict, extraLines) {
  const folder = path.join(world.hq, "security", "diary_audit");
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, TODAY + ".md"), "判定：" + (verdict || "PASS") + "\n指紋：" + fingerprint + "\n" + (extraLines || ""), "utf8");
}

/**
 * --check を動かして指紋を取り出す。
 * @param {object} world makeWorld の結果
 * @returns {string} 指紋
 */
function checkAndGetFingerprint(world) {
  const run = makeContext(world);
  assert.strictEqual(main(["--check"], run.context), 0, run.record.logs.join("\n"));
  return run.record.logs.join("\n").match(/指紋：([0-9a-f]{16})/)[1];
}

/**
 * 一時フォルダを片付けながらテストを動かす。
 * @param {function(object): void} body テストの中身
 */
function withWorld(body) {
  const world = makeWorld();
  try {
    body(world);
  } finally {
    fs.rmSync(world.base, { recursive: true, force: true });
  }
}

/**
 * 止まって、push されず、commit も増えていないことを確かめる。
 * @param {object} world makeWorld の結果
 * @param {object} run makeContext の結果
 * @param {number} exitCode main の終了コード
 * @param {RegExp} reason 表示に含まれるべき理由
 */
function assertStoppedWithoutPush(world, run, exitCode, reason) {
  assert.strictEqual(exitCode, 1);
  assert.strictEqual(run.record.pushes.length, 0);
  assert.strictEqual(gitIn(world.repo, ["rev-list", "--count", "HEAD"]).trim(), "1");
  assert.match(run.record.logs.join("\n"), reason);
}

module.exports = {
  TODAY, TEST_WORD, FIXTURES, SKIP_REASON, gitIn, writeFile, makeWorld, addTodayEntry, makeContext,
  writeAuditRecord, checkAndGetFingerprint, withWorld, assertStoppedWithoutPush
};
