/*
 * diary_audit.test.js：tools/diary_audit.js（確認担当の PASS の記録と、上げる中身の指紋の照合）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const { computeFingerprint, checkAuditRecord, auditRecordLocation, FINGERPRINT_LENGTH } = require("../tools/diary_audit.js");

const FILES = [
  { path: "diary/entries/2026-11-16.json", content: Buffer.from("{\"a\":1}") },
  { path: "diary/entries/index.json", content: Buffer.from("[\"2026-11-16\"]") }
];

test("指紋は16文字で、並び順に左右されず、中身が1文字変わると変わる", function () {
  const fingerprint = computeFingerprint(FILES);
  assert.match(fingerprint, new RegExp("^[0-9a-f]{" + FINGERPRINT_LENGTH + "}$"));
  assert.strictEqual(computeFingerprint(FILES.slice().reverse()), fingerprint);
  const changed = [FILES[0], { path: FILES[1].path, content: Buffer.from("[\"2026-11-17\"]") }];
  assert.notStrictEqual(computeFingerprint(changed), fingerprint);
});

test("記録が PASS で指紋が合えば進む（全角・半角のコロンのどちらでもよい）", function () {
  const fingerprint = computeFingerprint(FILES);
  assert.deepStrictEqual(checkAuditRecord("# 日記の確認\n判定：PASS\n指紋：" + fingerprint + "\n", fingerprint), []);
  assert.deepStrictEqual(checkAuditRecord("判定: PASS\n指紋: " + fingerprint, fingerprint), []);
});

test("記録が無い・FAIL・判定の行が無い・指紋が違う・指紋が無い、は止める", function () {
  const fingerprint = computeFingerprint(FILES);
  assert.match(checkAuditRecord(null, fingerprint)[0], /記録がありません/);
  assert.match(checkAuditRecord("判定：FAIL\n指紋：" + fingerprint, fingerprint)[0], /PASS ではありません/);
  assert.match(checkAuditRecord("PASS だと思う\n指紋：" + fingerprint, fingerprint)[0], /PASS ではありません/);
  assert.match(checkAuditRecord("判定：PASS\n指紋：0000000000000000", fingerprint)[0], /指紋が合いません/);
  assert.match(checkAuditRecord("判定：PASS", fingerprint)[0], /指紋が合いません/);
});

test("記録の置き場所は、運用用のフォルダの security/diary_audit/<日付>.md", function () {
  const hq = path.join("base", "hq");
  assert.strictEqual(auditRecordLocation(hq, "2026-11-16"), path.join(hq, "security", "diary_audit", "2026-11-16.md"));
});

test("L11：判定の行・指紋の行がそれぞれ1つだけのときだけ進む（追記された2つ目があれば止める）", function () {
  const fingerprint = computeFingerprint(FILES);
  assert.match(checkAuditRecord("判定：PASS\n指紋：" + fingerprint + "\n判定：FAIL", fingerprint)[0], /PASS ではありません/);
  assert.match(checkAuditRecord("判定：PASS\n判定：PASS\n指紋：" + fingerprint, fingerprint)[0], /PASS ではありません/);
  assert.match(checkAuditRecord("判定：PASS\n指紋：" + fingerprint + "\n指紋：" + fingerprint, fingerprint)[0], /指紋が合いません/);
  assert.match(checkAuditRecord("判定：PASS（たぶん）\n指紋：" + fingerprint, fingerprint)[0], /PASS ではありません/);
});
