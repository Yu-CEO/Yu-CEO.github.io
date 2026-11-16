/*
 * diary_git.js：日記の自動公開で使う git の操作（状態を見る・push の前の確かめ・commit・push・取り消し）
 * 主な関数：readChanges（変更の一覧）、readCommittedFile（前の commit の中身）、checkPushConditions（ブランチ・GitHub とのずれ・作成者・push 先）、
 *   commitDiary（決まったファイルだけを決まったメッセージで commit し、中身と作成者を確かめる）、undoLastCommit、pushToMain
 * git は「run(コマンド, 引数の一覧)」の形の関数を通して動かす。テストではこの関数を差し替え、本物の git・push を動かさない。
 * tools/diary_publish.js から使われる。tests/diary_publish.test.js で、差し替えた run を使って確かめる。
 */

// コミットの作成者（個人のアカウントとつなげないための決まった名前とアドレス。requirements_diary.md 2-5）
const DIARY_AUTHOR_NAME = "Yu-CEO";
const DIARY_AUTHOR_EMAIL = "356794411+Yu-CEO@users.noreply.github.com";
const MAIN_BRANCH = "main";
const REMOTE_NAME = "origin";
// push してよい先（公開サイトのリポジトリ。末尾の .git はあってもなくてもよい）
const PUBLIC_REPOSITORY_URLS = [
  "https://github.com/Yu-CEO/Yu-CEO.github.io.git",
  "https://github.com/Yu-CEO/Yu-CEO.github.io"
];
// commit のときに git config より優先されてしまう環境変数（取り除いてから git を動かす）
const GIT_IDENTITY_ENV_NAMES = ["GIT_AUTHOR_NAME", "GIT_AUTHOR_EMAIL", "GIT_COMMITTER_NAME", "GIT_COMMITTER_EMAIL"];

/**
 * git を動かし、失敗したら日本語の理由つきで例外にする。
 * @param {function(string, string[]): {status: number, stdout: string, stderr: string}} run コマンドを動かす関数
 * @param {string[]} args git に渡す引数
 * @param {string} failMessage 失敗したときの説明
 * @returns {string} 出力
 * @example runGit(run, ["rev-parse", "HEAD"], "今の commit を読めませんでした")
 */
function runGit(run, args, failMessage) {
  const result = run("git", args);
  if (result.status !== 0) {
    throw new Error(failMessage);
  }
  return result.stdout;
}

/**
 * 変更の一覧（git status の出力）を読む。新しいファイルはフォルダの中まで1つずつ出す。
 * @param {function} run コマンドを動かす関数
 * @returns {string} `git status --porcelain=v1 -z --untracked-files=all` の出力
 * @example readChanges(run)
 */
function readChanges(run) {
  return runGit(run, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], "git status を読めませんでした");
}

/**
 * 今の commit（HEAD）の、あるファイルの中身を読む。
 * @param {function} run コマンドを動かす関数
 * @param {string} filePath ファイルの場所（リポジトリの中）
 * @returns {string} 中身
 * @example readCommittedFile(run, "diary/entries/index.json")
 */
function readCommittedFile(run, filePath) {
  return runGit(run, ["show", "HEAD:" + filePath], filePath + " の前の版を読めませんでした");
}

/**
 * push してよい状態かを確かめる：ブランチが main／手元の main が GitHub の main と同じ／作成者の設定が決まったもの。
 * @param {function} run コマンドを動かす関数
 * @returns {string[]} 問題点（なければ空）
 * @example checkPushConditions(run) // []
 */
function checkPushConditions(run) {
  const problems = [];
  const branch = runGit(run, ["rev-parse", "--abbrev-ref", "HEAD"], "今のブランチを読めませんでした").trim();
  if (branch !== MAIN_BRANCH) {
    problems.push("ブランチが main ではありません（今は " + branch + "）");
  }
  // GitHub の最新を取り寄せてから比べる（ほかの変更を一緒に押し出さないため）
  runGit(run, ["fetch", REMOTE_NAME, MAIN_BRANCH], "GitHub から最新の main を取り寄せられませんでした（インターネット接続を確認してください）");
  const local = runGit(run, ["rev-parse", "HEAD"], "手元の commit を読めませんでした").trim();
  const remote = runGit(run, ["rev-parse", REMOTE_NAME + "/" + MAIN_BRANCH], "GitHub の main を読めませんでした").trim();
  if (local !== remote) {
    problems.push("手元の main が GitHub の main とずれています（先に通常の手順でそろえてください）");
  }
  return problems.concat(checkAuthorConfig(run), checkPushUrl(run));
}

/**
 * git config の作成者（user.name・user.email）が決まったものかを確かめる。
 * @param {function} run コマンドを動かす関数
 * @returns {string[]} 問題点（なければ空）
 * @example checkAuthorConfig(run) // []
 */
function checkAuthorConfig(run) {
  const name = run("git", ["config", "user.name"]).stdout.trim();
  const email = run("git", ["config", "user.email"]).stdout.trim();
  if (name !== DIARY_AUTHOR_NAME || email !== DIARY_AUTHOR_EMAIL) {
    return ["作成者の設定が違います（このリポジトリの git config の user.name・user.email を決まったものにしてください。README 参照）"];
  }
  return [];
}

/**
 * push 先（origin の push 用の URL）がちょうど1つで、公開サイトのリポジトリかを確かめる（別のリポジトリへ押し出さないため）。
 * @param {function} run コマンドを動かす関数
 * @returns {string[]} 問題点（なければ空）
 * @example checkPushUrl(run) // []
 */
function checkPushUrl(run) {
  // --all：push 先が2つ以上登録されていると git push は全部へ送るので、全部を出させて「ちょうど1つ」かも確かめる
  const pushUrls = run("git", ["remote", "get-url", "--push", "--all", REMOTE_NAME]).stdout
    .split("\n").map(function (line) { return line.trim(); }).filter(Boolean);
  if (pushUrls.length !== 1 || !PUBLIC_REPOSITORY_URLS.includes(pushUrls[0])) {
    return ["push 先が公開サイトのリポジトリではありません（git remote の origin を確かめてください）"];
  }
  return [];
}

/**
 * 直前の commit の作成者（author）と記録者（committer）が、決まった名前とアドレスかを確かめる。
 * 環境変数（GIT_AUTHOR_NAME など）で git config と違う名前になっていないかを、できあがった commit で確かめるため。
 * @param {function} run コマンドを動かす関数
 * @returns {boolean} 決まったものなら true
 * @example isCommitAuthorCorrect(run) // true
 */
function isCommitAuthorCorrect(run) {
  const expected = DIARY_AUTHOR_NAME + " <" + DIARY_AUTHOR_EMAIL + ">";
  const actual = runGit(run, ["log", "-1", "--format=%an <%ae>|%cn <%ce>"], "commit の作成者を読めませんでした").trim();
  return actual === expected + "|" + expected;
}

/**
 * 決まったファイルだけを足して、「日記を追加：YYYY-MM-DD」で commit する。commit の中身がそのファイルだけかも確かめる。
 * @param {function} run コマンドを動かす関数
 * @param {string[]} files 上げるファイル
 * @param {string} date 日記の日付
 * @returns {string[]} 問題点（なければ空。中身が違えば commit を取り消してから返す）
 * @example commitDiary(run, ["diary/entries/2026-11-16.json", "diary/entries/index.json"], "2026-11-16")
 */
function commitDiary(run, files, date) {
  runGit(run, ["add", "--"].concat(files), "ファイルを commit の準備に入れられませんでした");
  runGit(run, ["commit", "-m", "日記を追加：" + date], "commit できませんでした");
  const committed = runGit(run, ["show", "--name-only", "--format=", "HEAD"], "commit の中身を読めませんでした")
    .split("\n").map(function (line) { return line.trim(); }).filter(Boolean).sort();
  if (JSON.stringify(committed) !== JSON.stringify(files.slice().sort())) {
    undoLastCommit(run);
    return ["commit に決まったファイル以外が入りました。commit を取り消しました"];
  }
  if (!isCommitAuthorCorrect(run)) {
    undoLastCommit(run);
    return ["commit の作成者が決まったものではありません（環境変数 GIT_AUTHOR_* などを確かめてください）。commit を取り消しました"];
  }
  return [];
}

/**
 * 直前の commit を取り消す（変更そのものは手元に残す）。push の直前の照合で止めたときなどに使う。
 * @param {function} run コマンドを動かす関数
 * @returns {void}
 * @example undoLastCommit(run)
 */
function undoLastCommit(run) {
  runGit(run, ["reset", "--soft", "HEAD~1"], "commit を取り消せませんでした。git log で確かめ、CTOに伝えてください");
}

/**
 * GitHub の main へ push する。
 * @param {function} run コマンドを動かす関数
 * @returns {void}
 * @example pushToMain(run)
 */
function pushToMain(run) {
  runGit(run, ["push", REMOTE_NAME, MAIN_BRANCH], "push できませんでした（commit は手元に残っています。CTOに伝えてください）");
}

module.exports = {
  readChanges, readCommittedFile, checkPushConditions, commitDiary, undoLastCommit, pushToMain,
  DIARY_AUTHOR_NAME, DIARY_AUTHOR_EMAIL, PUBLIC_REPOSITORY_URLS, GIT_IDENTITY_ENV_NAMES
};
