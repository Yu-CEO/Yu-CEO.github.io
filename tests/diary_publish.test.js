/*
 * diary_publish.test.js：tools/diary_publish.js（--check・--push の流れ）の自動テスト
 * 練習用リポジトリと差し替えた run は tests/helpers/practice_repo.js が作る（本物の push はしない）。
 * 機密の言葉の照合は本物の ci/confidential_check.py を使う（Python が無いときは、そのテストを飛ばす）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { main } = require("../tools/diary_publish.js");
const { DIARY_AUTHOR_NAME, DIARY_AUTHOR_EMAIL } = require("../tools/diary_git.js");
const {
  TODAY, TEST_WORD, FIXTURES, SKIP_REASON, gitIn, writeFile, addTodayEntry, makeContext,
  writeAuditRecord, checkAndGetFingerprint, withWorld, assertStoppedWithoutPush
} = require("./helpers/practice_repo.js");

test("AC-13・AC-56：日記1件＋index.json だけなら --check は PASS、--push は決まった作成者・メッセージ・ファイルだけで push", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const run = makeContext(world);
    assert.strictEqual(main(["--push"], run.context), 0, run.record.logs.join("\n"));
    assert.strictEqual(run.record.pushes.length, 1);
    const lines = run.record.pushes[0].split("\n").filter(Boolean);
    assert.strictEqual(lines[0], DIARY_AUTHOR_NAME + " <" + DIARY_AUTHOR_EMAIL + ">");
    assert.strictEqual(lines[1], "日記を追加：" + TODAY);
    assert.deepStrictEqual(lines.slice(2).sort(), ["diary/entries/" + TODAY + ".json", "diary/entries/index.json"]);
  });
});

test("AC-55・AC-56：その日の図1つ（figure あり）も一緒なら PASS で、図も同じ commit に入る", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    const withFigure = JSON.parse(fs.readFileSync(path.join(FIXTURES, "diary_entries", "2026-11-17.json"), "utf8"));
    addTodayEntry(world.repo, function (text) {
      const entry = JSON.parse(text);
      entry.figure = withFigure.figure;
      return JSON.stringify(entry, null, 2);
    });
    writeFile(world.repo, "diary/figures/" + TODAY + ".svg", fs.readFileSync(path.join(FIXTURES, "diary_figures", "2026-11-17.svg"), "utf8"));
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const run = makeContext(world);
    assert.strictEqual(main(["--push"], run.context), 0, run.record.logs.join("\n"));
    assert.ok(run.record.pushes[0].includes("diary/figures/" + TODAY + ".svg"));
  });
});

test("AC-14：js/main.js・ci.yml・過去の日記が一緒に変わっていると止まり、決まった文が出る", { skip: SKIP_REASON }, function () {
  ["js/main.js", ".github/workflows/ci.yml", "diary/entries/2026-11-15.json"].forEach(function (otherFile) {
    withWorld(function (world) {
      addTodayEntry(world.repo);
      fs.appendFileSync(path.join(world.repo, otherFile), "\n");
      writeAuditRecord(world, "0000000000000000");
      ["--check", "--push"].forEach(function (mode) {
        const run = makeContext(world);
        assertStoppedWithoutPush(world, run, main([mode], run.context), /通常の \/dev フローとCEO承認が必要です/);
      });
    });
  });
});

test("AC-15：一覧の言葉を日記に書くと止まり、表示に言葉そのものは出ない。一覧が空でも止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo, function (text) {
      return text.replace("\"title\": \"", "\"title\": \"" + TEST_WORD);
    });
    const run = makeContext(world);
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /機密の言葉の照合で止まりました/);
    assert.ok(!run.record.logs.join("\n").includes(TEST_WORD));
    fs.writeFileSync(world.wordsFile, "", "utf8");
    const emptyRun = makeContext(world);
    assertStoppedWithoutPush(world, emptyRun, main(["--check"], emptyRun.context), /機密の言葉の一覧が正しい場所にありません/);
  });
});

test("AC-52：一覧の環境変数が未設定・運用用のフォルダの中にあるときは止まり、場所は表示されない", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    const insideHq = path.join(world.hq, "words.txt");
    fs.writeFileSync(insideHq, TEST_WORD, "utf8");
    [{ DIARY_CONFIDENTIAL_WORDS_FILE: "" }, { DIARY_CONFIDENTIAL_WORDS_FILE: insideHq }].forEach(function (env) {
      const run = makeContext(world, { env: env });
      assertStoppedWithoutPush(world, run, main(["--check"], run.context), /機密の言葉の一覧が正しい場所にありません/);
      assert.ok(!run.record.logs.join("\n").includes(world.base));
    });
  });
});

test("AC-16：AC-11 の書き方を含む日記・未来の日付の日記は止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo, function (text) {
      return text.replace("\"title\": \"", "\"title\": \"おすすめ");
    });
    const run = makeContext(world);
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /投資を勧める言い回し/);
  });
  withWorld(function (world) {
    addTodayEntry(world.repo);
    const run = makeContext(world);
    run.context.today = "2026-11-15";
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /未来の日付/);
    run.context.today = "2026-11-18";
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /古すぎます/);
  });
});

test("AC-16：ブランチが main でない・GitHub の main とずれている・作成者の設定が違う、は止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const behind = makeContext(world, { remoteHead: "0123456789abcdef0123456789abcdef01234567\n" });
    assertStoppedWithoutPush(world, behind, main(["--push"], behind.context), /GitHub の main とずれています/);
    gitIn(world.repo, ["config", "user.email", "someone@example.com"]);
    const author = makeContext(world);
    assertStoppedWithoutPush(world, author, main(["--push"], author.context), /作成者の設定が違います/);
    gitIn(world.repo, ["config", "user.email", DIARY_AUTHOR_EMAIL]);
    gitIn(world.repo, ["checkout", "-q", "-b", "practice"]);
    const branch = makeContext(world);
    assertStoppedWithoutPush(world, branch, main(["--push"], branch.context), /ブランチが main ではありません/);
  });
});

test("③ 確認担当：PASS の記録が無い・FAIL・確認のあとで中身が変わった、は止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    const noRecord = makeContext(world);
    assertStoppedWithoutPush(world, noRecord, main(["--push"], noRecord.context), /確認の記録がありません/);
    const fingerprint = checkAndGetFingerprint(world);
    writeAuditRecord(world, fingerprint, "FAIL");
    const failed = makeContext(world);
    assertStoppedWithoutPush(world, failed, main(["--push"], failed.context), /PASS ではありません/);
    writeAuditRecord(world, fingerprint);
    fs.appendFileSync(path.join(world.repo, "diary/entries/" + TODAY + ".json"), "\n");
    const changed = makeContext(world);
    assertStoppedWithoutPush(world, changed, main(["--push"], changed.context), /指紋が合いません/);
  });
});

test("AC-51：--push は commit の直前と push の直前の2回照合し、2回目で止まれば commit を取り消して push しない", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const passed = makeContext(world);
    assert.strictEqual(main(["--push"], passed.context), 0, passed.record.logs.join("\n"));
    assert.strictEqual(passed.record.checks, 2);
  });
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const run = makeContext(world, { failSecondCheck: true });
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /commit を取り消しました/);
    // 取り消しても、日記の変更は手元に残る
    assert.ok(fs.existsSync(path.join(world.repo, "diary/entries/" + TODAY + ".json")));
  });
});

test("使い方：--check・--push 以外では何もせず、使い方を出す", function () {
  const logs = [];
  assert.strictEqual(main([], { log: function (text) { logs.push(text); } }), 1);
  assert.match(logs[0], /--check/);
});

test("M1：日記の JSON に \\uXXXX の書き方があると、--check・--push は止まる（照合のすり抜けを防ぐ）", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    // テスト用の言葉を \uXXXX の書き方にして title に入れる（読み込むと元の言葉に戻る書き方）
    const escaped = TEST_WORD.split("").map(function (char) {
      return "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0");
    }).join("");
    addTodayEntry(world.repo, function (text) {
      return text.replace("\"title\": \"", "\"title\": \"" + escaped);
    });
    writeAuditRecord(world, "0000000000000000");
    ["--check", "--push"].forEach(function (mode) {
      const run = makeContext(world);
      assertStoppedWithoutPush(world, run, main([mode], run.context), /\\uXXXX の書き方があります/);
    });
  });
});

test("L11：確認の記録に判定の行が2つ（PASS のあとに FAIL や PASS を書き足した）ときは止まる", { skip: SKIP_REASON }, function () {
  ["判定：FAIL\n", "判定：PASS\n"].forEach(function (extraLine) {
    withWorld(function (world) {
      addTodayEntry(world.repo);
      writeAuditRecord(world, checkAndGetFingerprint(world), "PASS", extraLine);
      const run = makeContext(world);
      assertStoppedWithoutPush(world, run, main(["--push"], run.context), /PASS ではありません/);
    });
  });
});

test("L12：push 先が公開サイトのリポジトリでないときは、commit・push しない", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const run = makeContext(world, { pushUrl: "https://github.com/someone/other.git" });
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /push 先が公開サイトのリポジトリではありません/);
  });
});

test("L12：環境変数で作成者が変わった commit は取り消し、push しない", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const run = makeContext(world, { commandEnv: { GIT_AUTHOR_NAME: "someone", GIT_AUTHOR_EMAIL: "someone@example.com" } });
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /commit の作成者が決まったものではありません/);
    assert.ok(fs.existsSync(path.join(world.repo, "diary/entries/" + TODAY + ".json")));
  });
});

test("N2：origin に push 先が2つ登録されていると（公開サイトの URL を含んでいても）、commit・push しない", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addTodayEntry(world.repo);
    writeAuditRecord(world, checkAndGetFingerprint(world));
    const twoUrls = "https://github.com/Yu-CEO/Yu-CEO.github.io.git\nhttps://github.com/someone/other.git";
    const run = makeContext(world, { pushUrl: twoUrls });
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /push 先が公開サイトのリポジトリではありません/);
  });
});
