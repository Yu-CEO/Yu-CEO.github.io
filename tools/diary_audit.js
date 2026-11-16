/*
 * diary_audit.js：確認担当（公開してよいかを人の目で確かめる担当）の確認（PASS）を、上げるファイルの中身と結びつけて確かめる（requirements_diary.md 2-5 の③）
 * 主な関数：computeFingerprint（上げるファイルの中身から「指紋」を作る）、checkAuditRecord（確認の記録が PASS で、指紋が今の中身と同じか）、
 *   auditRecordLocation（確認の記録の置き場所）
 * しくみ：--check が指紋（16文字）を表示する → 運用担当が日記と指紋を確認担当に渡す → 確認担当は確認して、
 *   運用用のフォルダ（リポジトリの外）の security/diary_audit/<日付>.md に「判定：PASS」と「指紋：<16文字>」を書く → --push はその記録を読み、
 *   PASS で、指紋が今の中身と同じときだけ進む（確認のあとで日記を書き換えたら、指紋が変わって止まる）。
 *   判定の行・指紋の行は、それぞれちょうど1つだけ認める（PASS のあとに FAIL を書き足した記録などを、PASS と読まないため）。
 * tools/diary_publish.js から使われる。tests/diary_audit.test.js でテストする。
 */
const crypto = require("node:crypto");
const path = require("node:path");

// 指紋の長さ（文字）。SHA-256（中身から決まる文字の並びを作る方法）の先頭16文字。書き写しやすく、16文字＝64ビット分あるので偶然の一致はまず起きない
const FINGERPRINT_LENGTH = 16;
// 運用用のフォルダ（環境変数 HQ_DIR。リポジトリの外）の中の、確認の記録を置くフォルダ（記録に機密は書かない）
const AUDIT_RECORD_FOLDER = "security";
const AUDIT_RECORD_SUBFOLDER = "diary_audit";
// 記録の中の判定の行・指紋の行の形（全角・半角のコロンのどちらでもよい）
const VERDICT_PATTERN = /^判定\s*[：:]\s*(PASS|FAIL)\s*$/;
const FINGERPRINT_PATTERN = /^指紋\s*[：:]\s*([0-9a-f]+)\s*$/;

/**
 * 上げるファイルの中身から指紋を作る。ファイルの場所と中身の両方を使い、並び順には左右されない。
 * @param {{ path: string, content: Buffer }[]} files 上げるファイルの場所と中身
 * @returns {string} 指紋（16文字の 0-9a-f）
 * @example computeFingerprint([{ path: "diary/entries/index.json", content: Buffer.from("[]") }]) // "…16文字…"
 */
function computeFingerprint(files) {
  const sorted = files.slice().sort(function (left, right) {
    return left.path < right.path ? -1 : 1;
  });
  const hash = crypto.createHash("sha256");
  sorted.forEach(function (file) {
    // 区切り（\0）を入れて、場所と中身の境目がずれても同じ指紋にならないようにする
    hash.update(file.path + "\0");
    hash.update(file.content);
    hash.update("\0");
  });
  return hash.digest("hex").slice(0, FINGERPRINT_LENGTH);
}

/**
 * 確認の記録の置き場所を返す。
 * @param {string} hqDir 運用用のフォルダの場所
 * @param {string} date 日記の日付
 * @returns {string} 記録のファイルの場所
 * @example auditRecordLocation(hqDir, "2026-11-16") // "<運用用のフォルダ>/security/diary_audit/2026-11-16.md"
 */
function auditRecordLocation(hqDir, date) {
  return path.join(hqDir, AUDIT_RECORD_FOLDER, AUDIT_RECORD_SUBFOLDER, date + ".md");
}

/**
 * 確認の記録が「PASS」で、指紋が今の中身と同じかを確かめる。
 * @param {string|null} recordText 記録の中身（ファイルが無ければ null）
 * @param {string} fingerprint 今の中身の指紋
 * @returns {string[]} 問題点（なければ空）
 * @example checkAuditRecord("判定：PASS\n指紋：0123456789abcdef", "0123456789abcdef") // []
 */
function checkAuditRecord(recordText, fingerprint) {
  if (recordText === null) {
    return ["確認担当の確認の記録がありません（運用用のフォルダの security/diary_audit/<日付>.md）。確認を頼んでから、もう一度実行してください"];
  }
  const verdict = readOnlyLine(recordText, "判定", VERDICT_PATTERN);
  if (verdict !== "PASS") {
    return ["確認担当の判定が PASS ではありません（判定の行は「判定：PASS」の1行だけにします）。理由を伝え、直した版で --check からやり直してください"];
  }
  const recorded = readOnlyLine(recordText, "指紋", FINGERPRINT_PATTERN);
  if (recorded !== fingerprint) {
    return ["確認担当が確認した中身と、今の日記の中身が違います（指紋が合いません。指紋の行は1行だけにします）。今の版で確認を頼み直してください"];
  }
  return [];
}

/**
 * 記録の中から、決まった言葉で始まる行を探す。その行がちょうど1つで、決まった形のときだけ値を返す。
 * @param {string} recordText 記録の中身
 * @param {string} label 行の始まりの言葉（「判定」「指紋」）
 * @param {RegExp} pattern 行の形（値を1つ取り出す）
 * @returns {string} 取り出した値。行が無い・2つ以上・形が違うときは ""
 * @example readOnlyLine("判定：PASS\n判定：FAIL", "判定", VERDICT_PATTERN) // ""
 */
function readOnlyLine(recordText, label, pattern) {
  const lines = recordText.split(/\r?\n/).filter(function (line) {
    return line.trim().startsWith(label);
  });
  if (lines.length !== 1) {
    return "";
  }
  const match = lines[0].trim().match(pattern);
  return match ? match[1] : "";
}

module.exports = { computeFingerprint, checkAuditRecord, auditRecordLocation, FINGERPRINT_LENGTH };
