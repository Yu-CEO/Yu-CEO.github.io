/*
 * diary_publish.js：日記の公開前チェック（--check）と自動公開（--push）の流れ（requirements_diary.md 機能5・2-5・2-5-1）
 * 使い方：portal フォルダで `node tools/diary_publish.js --check`（手元のチェック）／`node tools/diary_publish.js --push`（公開）
 * --check：一覧ファイルの場所 → 変更がその日の日記だけか → 日付 → index.json → 日記と図の検査 → 機密の言葉の照合。PASS なら指紋を出す
 * --push ：--check と同じことをもう一度（commit の直前の照合）→ push の前の確かめ → 確認担当の PASS の記録 → commit
 *          → 照合をもう一度（push の直前）→ push。どれか1つでも FAIL なら commit・push しない
 * 部品：tools/diary_words_file.js・diary_changes.js・diary_contents.js（日記・図の中身の検査）・diary_audit.js・diary_git.js。
 * Node.js 標準の機能だけで書く。テスト（tests/diary_publish.test.js）では git と Python を差し替えて、本物の push はしない。
 */
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");
const { checkWordsFileLocation } = require("./diary_words_file.js");
const changesRule = require("./diary_changes.js");
const audit = require("./diary_audit.js");
const git = require("./diary_git.js");
const { readRepoFile, checkDiaryContents } = require("./diary_contents.js");

const REPO_DIR = path.join(__dirname, "..");
const CONFIDENTIAL_CHECK = path.join("ci", "confidential_check.py");
// Python のコマンドの名前の候補。パソコンによってどちらの名前で入っているかが違うので、順に試して先に動いたほうを使う
const PYTHON_CANDIDATES = ["python3", "python"];

/**
 * 機密の言葉の照合（ci/confidential_check.py --words-file）を動かす。結果にはファイル名と行番号だけが出る。
 * @param {object} context 動かす場所・環境変数・run・log
 * @returns {string[]} 問題点（なければ空）
 * @example runConfidentialCheck(context)
 */
function runConfidentialCheck(context) {
  const python = findPython(context);
  if (python === "") {
    return ["Python が見つからないため、機密の言葉の照合ができません"];
  }
  const result = context.run(python, [CONFIDENTIAL_CHECK, "--words-file", context.env.DIARY_CONFIDENTIAL_WORDS_FILE]);
  context.log(result.stdout.trim());
  if (result.status !== 0) {
    return ["機密の言葉の照合で止まりました（上の場所を直してください。言葉そのものは表示しません）"];
  }
  return [];
}

/**
 * 動く Python のコマンドの名前を探す（--version が成功したもの）。見つからなければ ""。
 * @param {object} context run を持つもの
 * @returns {string} コマンドの名前
 * @example findPython(context) // "python"
 */
function findPython(context) {
  for (const python of PYTHON_CANDIDATES) {
    if (context.run(python, ["--version"]).status === 0) {
      return python;
    }
  }
  return "";
}

/**
 * 公開前チェック（--check の中身）。--push でも commit の直前に必ずもう一度行う。
 * @param {object} context 動かす場所・環境変数・run・today・log
 * @returns {{ ok: boolean, problems: string[], plan: object|null, fingerprint: string }} 結果
 * @example runChecks(createContext(process.env))
 */
function runChecks(context) {
  const fail = function (problems, plan) {
    return { ok: false, problems: problems, plan: plan || null, fingerprint: "" };
  };
  const location = checkWordsFileLocation(context.env.DIARY_CONFIDENTIAL_WORDS_FILE, context.env.HQ_DIR, context.repoDir);
  if (!location.ok) {
    return fail([location.message]);
  }
  const plan = changesRule.judgeDiaryChanges(changesRule.parseGitStatus(git.readChanges(context.run)));
  if (!plan.ok) {
    return fail(plan.problems);
  }
  const contentProblems = checkDiaryContents(context, plan);
  if (contentProblems.length > 0) {
    return fail(contentProblems, plan);
  }
  const confidentialProblems = runConfidentialCheck(context);
  if (confidentialProblems.length > 0) {
    return fail(confidentialProblems, plan);
  }
  const files = plan.files.map(function (filePath) {
    return { path: filePath, content: readRepoFile(context, filePath) };
  });
  return { ok: true, problems: [], plan: plan, fingerprint: audit.computeFingerprint(files) };
}

/**
 * 確認担当の確認の記録を読み、PASS で指紋が合うかを確かめる。
 * @param {object} context 環境変数（HQ_DIR）
 * @param {string} date 日記の日付
 * @param {string} fingerprint 今の中身の指紋
 * @returns {string[]} 問題点（なければ空）
 * @example checkAudit(context, "2026-11-16", "0123456789abcdef")
 */
function checkAudit(context, date, fingerprint) {
  const recordPath = audit.auditRecordLocation(context.env.HQ_DIR, date);
  const recordText = fs.existsSync(recordPath) ? fs.readFileSync(recordPath, "utf8") : null;
  return audit.checkAuditRecord(recordText, fingerprint);
}

/**
 * 自動公開（--push の中身）。チェック → push の前の確かめ → 確認の記録 → commit → 照合 → push。
 * @param {object} context 動かす場所・環境変数・run・today・log
 * @returns {{ ok: boolean, problems: string[] }} 結果
 * @example publishDiary(createContext(process.env))
 */
function publishDiary(context) {
  const checks = runChecks(context);
  if (!checks.ok) {
    return { ok: false, problems: checks.problems };
  }
  const pushConditions = git.checkPushConditions(context.run);
  const auditProblems = checkAudit(context, checks.plan.date, checks.fingerprint);
  const before = pushConditions.concat(auditProblems);
  if (before.length > 0) {
    return { ok: false, problems: before };
  }
  const commitProblems = git.commitDiary(context.run, checks.plan.files, checks.plan.date);
  if (commitProblems.length > 0) {
    return { ok: false, problems: commitProblems };
  }
  // push の直前にもう一度照合する（commit のあとに一覧や中身が変わっても見逃さないため。2-5-1）
  const lastCheck = runConfidentialCheck(context);
  if (lastCheck.length > 0) {
    git.undoLastCommit(context.run);
    return { ok: false, problems: lastCheck.concat(["commit を取り消しました（変更は手元に残っています）"]) };
  }
  git.pushToMain(context.run);
  return { ok: true, problems: [] };
}

/**
 * 手元の時計で今日の日付（YYYY-MM-DD）を作る。
 * @param {Date} now 今の時刻
 * @returns {string} 今日の日付
 * @example formatLocalDate(new Date(2026, 10, 16)) // "2026-11-16"
 */
function formatLocalDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

/**
 * 本物の git・Python を動かす context を作る。
 * @param {object} env 環境変数
 * @returns {object} context
 * @example createContext(process.env)
 */
function createContext(env) {
  const commandEnv = Object.assign({}, env, { PYTHONIOENCODING: "utf-8" });
  // 作成者を git config と違う名前にしてしまう環境変数は渡さない（commit のあとでも作成者を確かめる）
  git.GIT_IDENTITY_ENV_NAMES.forEach(function (name) {
    delete commandEnv[name];
  });
  return {
    repoDir: REPO_DIR,
    env: env,
    today: formatLocalDate(new Date()),
    log: function (text) { console.log(text); },
    run: function (command, args) {
      const result = childProcess.spawnSync(command, args, { cwd: REPO_DIR, encoding: "utf8", env: commandEnv });
      return {
        status: result.status,
        stdout: result.stdout || "",
        stderr: result.stderr || ""
      };
    }
  };
}

/**
 * コマンドの入口。--check か --push を受け取り、結果を日本語で出して、終了コード（0＝PASS／1＝止めた）を返す。
 * @param {string[]} args コマンドの引数
 * @param {object} context 動かす場所など
 * @returns {number} 終了コード
 * @example main(["--check"], createContext(process.env))
 */
function main(args, context) {
  const mode = args[0];
  if (mode !== "--check" && mode !== "--push") {
    context.log("使い方：node tools/diary_publish.js --check ／ node tools/diary_publish.js --push");
    return 1;
  }
  let result;
  try {
    result = mode === "--check" ? runChecks(context) : publishDiary(context);
  } catch (error) {
    result = { ok: false, problems: [error.message] };
  }
  if (!result.ok) {
    context.log("FAIL（公開しません）");
    result.problems.forEach(function (problem) { context.log("- " + problem); });
    return 1;
  }
  if (mode === "--check") {
    context.log("PASS");
    context.log("指紋：" + result.fingerprint + "（確認担当に日記と一緒に渡す）");
  } else {
    context.log("PASS：push しました。GitHub の Actions で ✅ を確かめてください");
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2), createContext(process.env));
}

module.exports = { main, runChecks, publishDiary, formatLocalDate, createContext };
