/*
 * diary_svg_check.test.js：js/diary_svg_check.js（日記の図＝SVGの検査と、図の中の文字の取り出し）の自動テスト
 * 正しい図の例は tests/fixtures/diary_figures/2026-11-17.svg（デザインの見本と同じ図・テスト用）。
 * それを1か所だけ書き換えた図で、決まりに当たると止まることを確かめる。
 * AC-50 の「機密の言葉の照合（ci/confidential_check.py）がSVGも調べる」ことは、テスト用の言葉を一時フォルダで照合して確かめる。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const { findSvgProblems, extractSvgTexts } = require("../js/diary_svg_check.js");

const GOOD_SVG = fs.readFileSync(path.join(__dirname, "fixtures", "diary_figures", "2026-11-17.svg"), "utf8");
const SVG_HEAD = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300 100\">";
const CONFIDENTIAL_CHECK = path.join(__dirname, "..", "ci", "confidential_check.py");
// 照合のテストに使う、テスト用の言葉（実際の機密の言葉ではない）
const TEST_SECRET_WORD = "テスト用ひみつ語";

/**
 * 正しい図の </svg> の直前に、1行足した図を作る。
 * @param {string} extraLine 足す行
 * @returns {string} 書き換えた図
 */
function svgWith(extraLine) {
  return GOOD_SVG.replace("</svg>", extraLine + "\n</svg>");
}

/**
 * 問題点の一覧に、決まった文字を含むものがあるかを確かめる。
 * @param {string[]} problems 問題点の一覧
 * @param {RegExp} pattern 探す文字のパターン
 */
function assertHasProblem(problems, pattern) {
  const found = problems.some(function (problem) {
    return pattern.test(problem);
  });
  assert.ok(found, "見つからない問題：" + pattern + " ／ 出た問題：" + problems.join("／"));
}

/**
 * 使える Python のコマンド名を探す（CI の ubuntu では python3、Windows では python のことが多い）。
 * @returns {string} コマンド名。見つからなければ ""
 */
function findPython() {
  const candidates = ["python3", "python"];
  for (const command of candidates) {
    const result = childProcess.spawnSync(command, ["--version"], { encoding: "utf8" });
    if (result.status === 0) {
      return command;
    }
  }
  return "";
}

test("AC-48：許可した要素・属性だけで描いた図（デザインの見本）は通る", function () {
  assert.deepStrictEqual(findSvgProblems(GOOD_SVG), []);
});

test("AC-48：使えない要素（script・foreignObject・image・use・a・style・tspan・animate）は、何行目かつきで止まる", function () {
  const elements = [
    "<script>x</script>",
    "<foreignObject width=\"1\" height=\"1\"></foreignObject>",
    "<image width=\"1\" height=\"1\"/>",
    "<use x=\"1\"/>",
    "<a x=\"1\"></a>",
    "<style>rect{}</style>",
    "<text x=\"1\" y=\"1\"><tspan>文字</tspan></text>",
    "<animate x=\"1\"/>"
  ];
  elements.forEach(function (line) {
    const name = line.match(/<(\w+)/)[1];
    const problems = findSvgProblems(svgWith(line));
    assertHasProblem(problems, /^\d+行目：/);
    const hasReason = problems.some(function (problem) {
      return problem.includes("<" + name + ">") || problem.includes("<tspan>");
    });
    assert.ok(hasReason, line + " で止まりません：" + problems.join("／"));
  });
});

test("AC-48：on で始まる属性・href・xlink:href・style 属性は止まる", function () {
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" onload=\"alert(1)\"/>")), /on で始まる属性（onload）/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" href=\"#a\"/>")), /リンクの属性（href）/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" xlink:href=\"#a\"/>")), /リンクの属性（xlink:href）/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" style=\"fill:red\"/>")), /style 属性は使えません/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" class=\"a\"/>")), /使えない属性「class」/);
});

test("AC-48：url(https://…)・外部フォント・xmlns の別の値は止まる。url(#名前) は通る", function () {
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" fill=\"url(https://example.com/a)\"/>")), /url\(…\) は同じファイルの中/);
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\" font-family=\"WebFont\">文字</text>")), /font-family は sans-serif・serif・monospace だけ/);
  assertHasProblem(findSvgProblems(GOOD_SVG.replace("http://www.w3.org/2000/svg", "http://example.com/svg")), /xmlns は/);
  assert.deepStrictEqual(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" fill=\"url(#ab)\"/>")), []);
});

test("AC-48：<!DOCTYPE・<!ENTITY・&#x…; の文字参照・コメント・<![CDATA[・<?xml-stylesheet は止まる", function () {
  assertHasProblem(findSvgProblems("<!DOCTYPE svg>\n" + GOOD_SVG.replace(/^<\?xml[^>]*>\n/, "")), /1行目：<!DOCTYPE は使えません/);
  assertHasProblem(findSvgProblems(svgWith("<!ENTITY a \"b\">")), /<!ENTITY は使えません/);
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\">&#x4E07;</text>")), /& で始まる文字参照/);
  assertHasProblem(findSvgProblems(svgWith("<!-- メモ -->")), /コメント（<!-- -->） は使えません/);
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\"><![CDATA[文字]]></text>")), /<!\[CDATA\[ は使えません/);
  assertHasProblem(findSvgProblems(svgWith("<?xml-stylesheet href=\"a.css\"?>")), /<\?xml-stylesheet は使えません/);
});

test("AC-48：30KBを超える図・viewBox がない図は止まる", function () {
  const padding = "<rect width=\"1\" height=\"1\" fill=\"#ffffff\"/>\n".repeat(800);
  assertHasProblem(findSvgProblems(svgWith(padding)), /30KB を超えています/);
  assertHasProblem(findSvgProblems(GOOD_SVG.replace(" viewBox=\"0 0 300 290\"", "")), /<svg> に viewBox がありません/);
});

test("AC-49：図の中の <text>・<title>・<desc> に 3万・二億・2室・おすすめ・https:// があると止まり、「〇万円」は通る", function () {
  ["3万", "二億", "2室", "おすすめ", "https://a"].forEach(function (word) {
    assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\">" + word + "</text>")), /<text> の文字に、公開してはいけない書き方/);
    assertHasProblem(findSvgProblems(svgWith("<desc>" + word + "</desc>")), /<desc> の文字に、公開してはいけない書き方/);
  });
  assertHasProblem(findSvgProblems(GOOD_SVG.replace("道すじの変化", "3万の変化")), /<title> の文字に、公開してはいけない書き方（金額の書き方）/);
  assert.deepStrictEqual(findSvgProblems(svgWith("<text x=\"1\" y=\"1\">〇万円</text>")), []);
});

test("AC-50：<text> の途中で改行している図・<text> が30文字を超える図・文字の合計が200文字を超える図は止まる", function () {
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\">前半\n後半</text>")), /途中で改行せず、1行で書いてください/);
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\">" + "あ".repeat(31) + "</text>")), /<text> 1つの文字が 30 文字を超えています/);
  assertHasProblem(findSvgProblems(svgWith(("<text x=\"1\" y=\"1\">" + "あ".repeat(30) + "</text>\n").repeat(7))), /図の中の文字の合計が 200 文字を超えています/);
});

test("形の崩れ：文字が <text> の外にある・タグが閉じていない・閉じるタグが合わない・属性が 名前=\"値\" でない、は止まる", function () {
  assertHasProblem(findSvgProblems(svgWith("<g>外の文字</g>")), /文字は <text>・<title>・<desc> の中だけ/);
  assertHasProblem(findSvgProblems(GOOD_SVG.replace("</svg>", "")), /すべてのタグが閉じられている形/);
  assertHasProblem(findSvgProblems(svgWith("<g></text>")), /閉じるタグ <\/text> が、開いたタグと合っていません/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=1/>")), /タグの書き方が読み取れません/);
  assertHasProblem(findSvgProblems(svgWith("<text x=\"1\" y=\"1\"><rect/></text>")), /の中に、要素 <rect> は入れられません/);
  assert.deepStrictEqual(findSvgProblems(""), ["図のファイルが空か、文字として読めません"]);
});

test("図の中の文字を、何行目・どの要素・文字の組で取り出す", function () {
  const texts = extractSvgTexts(SVG_HEAD + "\n<title>図の題名</title>\n<text x=\"1\" y=\"1\">見出し</text>\n</svg>");
  assert.deepStrictEqual(texts, [
    { line: 2, element: "title", text: "図の題名" },
    { line: 3, element: "text", text: "見出し" }
  ]);
});

test("AC-50：<text> に1行で書いた機密の言葉は、ci/confidential_check.py（手元・CIと同じもの）で検出される", function (context) {
  const python = findPython();
  if (python === "") {
    context.skip("Python が見つからないため、このテストは飛ばします（CI では機密チェックの手順で同じ照合をします）");
    return;
  }
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "diary-svg-"));
  try {
    fs.writeFileSync(path.join(folder, "figure.svg"), svgWith("<text x=\"1\" y=\"1\">" + TEST_SECRET_WORD + "</text>"), "utf8");
    const result = childProcess.spawnSync(python, [CONFIDENTIAL_CHECK], {
      cwd: folder,
      encoding: "utf8",
      env: Object.assign({}, process.env, { CONFIDENTIAL_WORDS: TEST_SECRET_WORD, PYTHONIOENCODING: "utf-8", GIT_CEILING_DIRECTORIES: path.dirname(folder) })
    });
    assert.strictEqual(result.status, 1, "機密の言葉が検出されませんでした：" + result.stdout);
    assert.match(result.stdout, /figure\.svg:\d+ — 機密の言葉/);
    assert.ok(!result.stdout.includes(TEST_SECRET_WORD), "結果に言葉そのものが出ています");
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test("セキュリティ審査 L6：色の属性（fill・stroke・stop-color・marker-*）は、#色・決まった色名・none・url(#名前) だけ", function () {
  const stopped = [
    "<rect width=\"1\" height=\"1\" fill=\"javascript:alert(1)\"/>",
    "<rect width=\"1\" height=\"1\" fill=\"red\"/>",
    "<rect width=\"1\" height=\"1\" stroke=\"rgb(1,2,3)\"/>",
    "<stop offset=\"0\" stop-color=\"#12345\"/>",
    "<line x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\" marker-end=\"#ffffff\"/>"
  ];
  stopped.forEach(function (line) {
    assert.ok(findSvgProblems(svgWith(line)).length > 0, line + " で止まりません");
  });
  assertHasProblem(findSvgProblems(svgWith(stopped[1])), /色の値は #から始まる色/);
  const passed = [
    "<rect width=\"1\" height=\"1\" fill=\"#2563a8\" stroke=\"#fff\"/>",
    "<rect width=\"1\" height=\"1\" fill=\"none\" stroke=\"white\"/>",
    "<line x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\" marker-start=\"url(#ag)\" marker-end=\"none\"/>",
    "<g transform=\"translate(-17,-4) scale(1.5)\"></g>"
  ];
  passed.forEach(function (line) {
    assert.deepStrictEqual(findSvgProblems(svgWith(line)), [], line + " が止まりました");
  });
});

test("セキュリティ審査 L6：url( は大文字小文字・\\ を混ぜた書き方でも止まる。transform 以外で ( は使えない", function () {
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" fill=\"URL(https://example.com/a)\"/>")), /url\(…\) は同じファイルの中/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" fill=\"u\\rl(https://example.com/a)\"/>")), /url\(…\) は同じファイルの中/);
  assertHasProblem(findSvgProblems(svgWith("<rect width=\"1\" height=\"1\" stroke-width=\"calc(1)\"/>")), /\( は url\(#名前\) と transform の中だけ/);
  assertHasProblem(findSvgProblems(svgWith("<g transform=\"url(#a)\"></g>")), /url\(…\)|transform は/);
});

test("セキュリティ審査 L7：言葉を2つの <text> に分けても、全部つなげた文で照合して止まる", function () {
  const split = "<text x=\"1\" y=\"1\">3</text>\n<text x=\"1\" y=\"2\">万</text>";
  assertHasProblem(findSvgProblems(svgWith(split)), /全部つなげると、公開してはいけない書き方（金額の書き方）/);
  const splitWord = "<text x=\"1\" y=\"1\">おす</text>\n<text x=\"1\" y=\"2\">すめ</text>";
  assertHasProblem(findSvgProblems(svgWith(splitWord)), /全部つなげると、公開してはいけない書き方（投資を勧める言い回し）/);
});

test("AC-75：図の中の <text> に ** か == があると止まる。記号を2つの <text> に分けても止まる", function () {
  const bold = findSvgProblems(svgWith('<text x="1" y="1" font-family="sans-serif">**強調**</text>'));
  assert.ok(bold.some(function (problem) { return /強調の記号/.test(problem); }), bold.join("／"));
  const mark = findSvgProblems(svgWith('<text x="1" y="1" font-family="sans-serif">==強調==</text>'));
  assert.ok(mark.some(function (problem) { return /強調の記号/.test(problem); }), mark.join("／"));
  const split = findSvgProblems(svgWith('<text x="1" y="1" font-family="sans-serif">*</text>' + "\n" + '<text x="2" y="1" font-family="sans-serif">*</text>'));
  assert.ok(split.some(function (problem) { return /つなげると、強調の記号/.test(problem); }), split.join("／"));
});

test("AC-75：2枚目の図の見本（テスト用）にも、同じ図の検査が通る。<script> を足すと止まる", function () {
  const second = fs.readFileSync(path.join(__dirname, "fixtures", "diary_figures", "2026-11-20-2.svg"), "utf8");
  assert.deepStrictEqual(findSvgProblems(second), []);
  assert.ok(findSvgProblems(second.replace("</svg>", "<script>1</script></svg>")).length > 0);
  assert.ok(findSvgProblems(second.replace("文章が減った", "3万")).length > 0);
});
