/*
 * diary_words_file.js：機密の言葉の一覧ファイルが「正しい場所」にあるかを確かめる（requirements_diary.md 2-5-1）
 * 主な関数：checkWordsFileLocation（指定あり・ある・空でない・リポジトリの外・運用用のフォルダの外 のすべてを満たすか）、isInsideFolder
 * 一覧の場所は環境変数 DIARY_CONFIDENTIAL_WORDS_FILE、運用用のフォルダの場所は環境変数 HQ_DIR で受け取る（場所はコードに書かない）。
 * 止めるときの表示は決まった1文だけにし、一覧の場所・中身は出さない（画面の記録やログに残さないため）。
 * tools/diary_publish.js から使われる。tests/diary_words_file.test.js でテストする。
 */
const fs = require("node:fs");
const path = require("node:path");

// 止めるときの決まった文（場所の文字を含めない）
const WORDS_FILE_PROBLEM = "機密の言葉の一覧が正しい場所にありません（環境変数 DIARY_CONFIDENTIAL_WORDS_FILE と HQ_DIR、README の「日記の自動公開」を確認してください）";

/**
 * 場所を、比べられる形（実際の場所・区切りをそろえる・Windows では大文字小文字をそろえる）にする。
 * @param {string} target 場所
 * @returns {string} 比べられる形の場所
 * @example normalizeLocation("C:\\a\\..\\b") // "c:\\b"（Windows のとき）
 */
function normalizeLocation(target) {
  let resolved = path.resolve(target);
  try {
    // ショートカット（シンボリックリンク）で中を指していても見抜けるよう、実際の場所にする
    resolved = fs.realpathSync.native(resolved);
  } catch (error) {
    // まだ無い場所はそのまま比べる
  }
  if (process.platform === "win32") {
    resolved = resolved.toLowerCase();
  }
  return resolved;
}

/**
 * ある場所が、フォルダの中（フォルダそのものを含む）にあるかを確かめる。
 * @param {string} target 調べる場所
 * @param {string} folder フォルダ
 * @returns {boolean} 中にあれば true
 * @example isInsideFolder("/hq/a/b.txt", "/hq") // true
 */
function isInsideFolder(target, folder) {
  const relative = path.relative(normalizeLocation(folder), normalizeLocation(target));
  if (relative === "") {
    return true;
  }
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * 一覧ファイルに、言葉が1つ以上あるか（空行と # で始まる行は数えない。ci/confidential_check.py と同じ数え方）。
 * @param {string} wordsFile 一覧ファイルの場所
 * @returns {boolean} 言葉があれば true
 * @example hasWords("/safe/words.txt") // true
 */
function hasWords(wordsFile) {
  let text;
  try {
    text = fs.readFileSync(wordsFile, "utf8");
  } catch (error) {
    return false;
  }
  return text.split(/\r?\n/).some(function (line) {
    const word = line.trim();
    return word !== "" && !word.startsWith("#");
  });
}

/**
 * 一覧ファイルが正しい場所にあるかを確かめる。次のどれかなら止める：
 * 一覧・運用用のフォルダの指定がない／運用用のフォルダが無い／一覧がない・空／リポジトリの中にある／運用用のフォルダの中にある。
 * @param {string|undefined} wordsFile 一覧ファイルの場所（環境変数 DIARY_CONFIDENTIAL_WORDS_FILE）
 * @param {string|undefined} hqDir 運用用のフォルダの場所（環境変数 HQ_DIR）
 * @param {string} repoDir このリポジトリの場所
 * @returns {{ ok: boolean, message: string }} 進んでよいか・止めるときの決まった文
 * @example checkWordsFileLocation(process.env.DIARY_CONFIDENTIAL_WORDS_FILE, process.env.HQ_DIR, repoDir)
 */
function checkWordsFileLocation(wordsFile, hqDir, repoDir) {
  const stop = { ok: false, message: WORDS_FILE_PROBLEM };
  if (!wordsFile || !hqDir) {
    return stop;
  }
  // 運用用のフォルダの指定が間違っていると「運用用のフォルダの中にない」の確認が効かないので、実在するフォルダだけ認める
  if (!fs.existsSync(hqDir) || !fs.statSync(hqDir).isDirectory()) {
    return stop;
  }
  if (!fs.existsSync(wordsFile) || !fs.statSync(wordsFile).isFile() || !hasWords(wordsFile)) {
    return stop;
  }
  if (isInsideFolder(wordsFile, repoDir) || isInsideFolder(wordsFile, hqDir)) {
    return stop;
  }
  return { ok: true, message: "" };
}

module.exports = { checkWordsFileLocation, isInsideFolder, hasWords, WORDS_FILE_PROBLEM };
