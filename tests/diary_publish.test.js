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

// ---- 〔v4〕3版目（format 3）・2枚目の図・記号を外した文字の照合 ----
const FORMAT3_DATE = "2026-11-20";
const os = require("node:os");

/**
 * 3版目の日記（テスト用の仮の日記）と index.json の1行追加を置く。図は withFigures が true のとき、1枚目と2枚目を置く。
 * @param {object} world makeWorld の結果
 * @param {function(object): void} [edit] 日記（読み込んだ JSON）を書き換える関数
 * @param {boolean} [withFigures] 図を置くか（既定は置く）
 */
function addFormat3Entry(world, edit, withFigures) {
  const entry = JSON.parse(fs.readFileSync(path.join(FIXTURES, "diary_entries", FORMAT3_DATE + ".json"), "utf8"));
  if (edit) {
    edit(entry);
  }
  writeFile(world.repo, "diary/entries/" + FORMAT3_DATE + ".json", JSON.stringify(entry, null, 2) + "\n");
  writeFile(world.repo, "diary/entries/index.json", "[\"2026-11-15\", \"" + FORMAT3_DATE + "\"]\n");
  if (withFigures !== false) {
    ["", "-2"].forEach(function (suffix) {
      const svg = fs.readFileSync(path.join(FIXTURES, "diary_figures", FORMAT3_DATE + suffix + ".svg"), "utf8");
      writeFile(world.repo, "diary/figures/" + FORMAT3_DATE + suffix + ".svg", svg);
    });
  }
}

/**
 * 3版目の日の context を作る（今日の日付を 3版目の日に合わせる）。
 * @param {object} world makeWorld の結果
 * @param {object} [options] makeContext の options
 * @returns {object} makeContext の結果
 */
function makeFormat3Context(world, options) {
  const run = makeContext(world, options);
  run.context.today = FORMAT3_DATE;
  return run;
}

/**
 * 3版目の日の確認担当の記録（PASS と指紋）を書く。
 * @param {object} world makeWorld の結果
 * @param {string} fingerprint 指紋
 */
function writeFormat3AuditRecord(world, fingerprint) {
  const folder = path.join(world.hq, "security", "diary_audit");
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, FORMAT3_DATE + ".md"), "判定：PASS\n指紋：" + fingerprint + "\n", "utf8");
}

/**
 * --check を動かして指紋を取り出す（3版目の日）。
 * @param {object} world makeWorld の結果
 * @returns {string} 指紋
 */
function format3Fingerprint(world) {
  const run = makeFormat3Context(world);
  assert.strictEqual(main(["--check"], run.context), 0, run.record.logs.join("\n"));
  return run.record.logs.join("\n").match(/指紋：([0-9a-f]{16})/)[1];
}

/**
 * 一時フォルダの中の、記号を外した文字の書き出しフォルダ（diary-plain-…）の数を数える（消し忘れの確認用）。
 * @returns {number} フォルダの数
 */
function countPlainFolders() {
  return fs.readdirSync(os.tmpdir()).filter(function (name) {
    return name.startsWith("diary-plain-") && !name.startsWith("diary-plain-test-");
  }).length;
}

test("AC-76：3版目の日記1件＋index.json＋図＋2枚目の図なら --check は PASS。--push は4つのファイルだけを同じ commit に入れる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addFormat3Entry(world);
    writeFormat3AuditRecord(world, format3Fingerprint(world));
    const run = makeFormat3Context(world);
    assert.strictEqual(main(["--push"], run.context), 0, run.record.logs.join("\n"));
    const lines = run.record.pushes[0].split("\n").filter(Boolean);
    assert.deepStrictEqual(lines.slice(2).sort(), [
      "diary/entries/" + FORMAT3_DATE + ".json",
      "diary/entries/index.json",
      "diary/figures/" + FORMAT3_DATE + "-2.svg",
      "diary/figures/" + FORMAT3_DATE + ".svg"
    ]);
  });
});

test("AC-76：2枚目の図を1文字変えると指紋が変わる。2枚目を変えた版では、前の指紋の記録で --push が止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addFormat3Entry(world);
    const before = format3Fingerprint(world);
    fs.appendFileSync(path.join(world.repo, "diary/figures/" + FORMAT3_DATE + "-2.svg"), "\n");
    const after = format3Fingerprint(world);
    assert.notStrictEqual(before, after);
    writeFormat3AuditRecord(world, before);
    const run = makeFormat3Context(world);
    assertStoppedWithoutPush(world, run, main(["--push"], run.context), /指紋が合いません/);
  });
});

test("AC-76：figure2 があるのに -2.svg がない・figure2 がないのに -2.svg がある・-3.svg がある、は止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addFormat3Entry(world);
    fs.rmSync(path.join(world.repo, "diary/figures/" + FORMAT3_DATE + "-2.svg"));
    const run = makeFormat3Context(world);
    assertStoppedWithoutPush(world, run, main(["--check"], run.context), /figure2 があるのに/);
  });
  withWorld(function (world) {
    addFormat3Entry(world, function (entry) { delete entry.figure2; });
    const run = makeFormat3Context(world);
    assertStoppedWithoutPush(world, run, main(["--check"], run.context), /figure2 がないのに/);
  });
  withWorld(function (world) {
    addFormat3Entry(world);
    writeFile(world.repo, "diary/figures/" + FORMAT3_DATE + "-3.svg", "<svg/>");
    const run = makeFormat3Context(world);
    assertStoppedWithoutPush(world, run, main(["--check"], run.context), /通常の \/dev フローとCEO承認が必要です/);
  });
});

test("AC-75：2枚目の図に <script> や図の中の金額があると、--check は止まる", { skip: SKIP_REASON }, function () {
  withWorld(function (world) {
    addFormat3Entry(world);
    const second = "diary/figures/" + FORMAT3_DATE + "-2.svg";
    const text = fs.readFileSync(path.join(world.repo, second), "utf8");
    fs.writeFileSync(path.join(world.repo, second), text.replace("</svg>", "<script>1</script></svg>"), "utf8");
    const run = makeFormat3Context(world);
    assertStoppedWithoutPush(world, run, main(["--check"], run.context), /2枚目の図：/);
  });
});

test("AC-77：機密の言葉を ** で分けて書くと、行ごとの照合はすり抜けるが、記号を外した文字の照合で止まる。言葉は表示されず、一時ファイルも残らない", { skip: SKIP_REASON }, function () {
  const foldersBefore = countPlainFolders();
  withWorld(function (world) {
    // 「テスト用ひみつ語」の途中に ** を入れる（1文字目のあとと最後に記号）
    addFormat3Entry(world, function (entry) {
      entry.decision = "（テスト用）テ**スト用ひみつ語**を決める";
    });
    const raw = fs.readFileSync(path.join(world.repo, "diary/entries/" + FORMAT3_DATE + ".json"), "utf8");
    assert.ok(!raw.includes(TEST_WORD), "準備：もとの文字には言葉が1続きで入っていない");
    ["--check", "--push"].forEach(function (mode) {
      const run = makeFormat3Context(world);
      assertStoppedWithoutPush(world, run, main([mode], run.context), /記号を外した文字の機密の言葉の照合で止まりました/);
      const logs = run.record.logs.join("\n");
      assert.ok(!logs.includes(TEST_WORD));
      assert.match(logs, new RegExp(FORMAT3_DATE + "__decision-1\.txt"));
    });
  });
  assert.strictEqual(countPlainFolders(), foldersBefore, "記号を外した文字の一時フォルダが残っています");
});

test("AC-77：3版目の日記でも、通る日は一時フォルダが残らず、--push の照合は（本体＋記号を外した文字）× 2回", { skip: SKIP_REASON }, function () {
  const foldersBefore = countPlainFolders();
  withWorld(function (world) {
    addFormat3Entry(world);
    writeFormat3AuditRecord(world, format3Fingerprint(world));
    const run = makeFormat3Context(world);
    assert.strictEqual(main(["--push"], run.context), 0, run.record.logs.join("\n"));
    assert.strictEqual(run.record.checks, 4);
  });
  assert.strictEqual(countPlainFolders(), foldersBefore);
});
