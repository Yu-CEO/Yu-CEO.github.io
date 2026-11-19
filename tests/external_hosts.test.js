/*
 * external_hosts.test.js：3ページ（入口・日記の一覧・日記1件）と js/・css/ が、許可した外部の場所以外を読み込んでいないかと、
 * CSP（読み込んでよい場所の制限）の meta が許可リストと過不足なく一致しているかを確かめる（アクセス解析の仕様 2-5・2-7）
 * 許可リスト：アクセス解析の送り先（js/site_config.js の ANALYTICS_HOST）＋ 道具箱の ASP の計測用画像のホスト（ASP_LIST の beaconHosts。入口だけ）
 * あわせて、照合に使うコメントの消し方（tests/helpers/source_scan.js）が js/ の全ファイルで正しく動くかも確かめる。
 * 失敗したときは、どのファイルの何行目かを日本語で出す。実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { SITE_CONFIG, ASP_LIST } = require("../js/site_config.js");
const { TOOLBOX_DATA } = require("../js/toolbox_data.js");
const { TOOLS_DATA } = require("../js/tools_data.js");
const { isValidAnalyticsHost } = require("../js/analytics_path.js");
const { removeJsComments, findHostsWithLines } = require("./helpers/source_scan.js");

const PORTAL_FOLDER = path.join(__dirname, "..");
const PAGE_FILES = ["index.html", "diary/index.html", "diary/entry.html"];
// 外部のホストを書かずに、読み込み先が同じサイトだけと決める指定（CSP の値は2-5の表のとおり）
const CSP_FIXED_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  "connect-src": ["'self'"],
  "font-src": ["'none'"],
  "frame-src": ["'none'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'none'"]
};
// 名前空間（SVG の決まった名前）。読み込み先ではないので照合から外す
const NAMESPACE_HOSTS = ["www.w3.org"];

/**
 * 計測の送り先のホストの一覧（設定が空なら0件）。
 * @returns {string[]} ホスト名
 */
function analyticsHosts() {
  if (isValidAnalyticsHost(SITE_CONFIG.ANALYTICS_HOST)) {
    return [SITE_CONFIG.ANALYTICS_HOST];
  }
  return [];
}

/**
 * ASP_LIST の計測用画像のホストの一覧。
 * @returns {string[]} ホスト名
 */
function beaconHosts() {
  return ASP_LIST.flatMap(function (asp) {
    return asp.beaconHosts;
  });
}

/**
 * URL の文字からホスト名を取り出す。
 * @param {string} url URL
 * @returns {string} ホスト名
 */
function hostOf(url) {
  return new URL(url).hostname;
}

/**
 * リンク（押したときの移動）にだけ使う外部のホストの一覧。読み込みには使わない。
 * @returns {string[]} ホスト名
 */
function linkOnlyHosts() {
  const urls = [SITE_CONFIG.TIKTOK_URL, SITE_CONFIG.LINE_OPENCHAT_URL, SITE_CONFIG.LINE_OFFICIAL_URL, SITE_CONFIG.ZENN_URL]
    .concat(TOOLBOX_DATA.filter(function (item) { return item.url; }).map(function (item) { return item.url; }))
    .concat(TOOLS_DATA.map(function (tool) { return tool.url; }));
  const aspLinkHosts = ASP_LIST.flatMap(function (asp) {
    return asp.linkHosts;
  });
  return urls.map(hostOf).concat(aspLinkHosts);
}

/**
 * HTMLの中で、外部を読み込むタグ（script・link の stylesheet・iframe・object・embed・img）を行の番号つきで探す。
 * @param {string} html HTMLの中身
 * @returns {{ tag: string, line: number }[]} 問題のあるタグと行
 */
function findExternalLoadTags(html) {
  const problems = [];
  html.split("\n").forEach(function (lineText, lineIndex) {
    const tags = lineText.match(/<(script|link|iframe|object|embed|img)\b[^>]*>/gi) || [];
    tags.forEach(function (tag) {
      const name = tag.slice(1).split(/[\s>]/)[0].toLowerCase();
      const isAlwaysForbidden = name === "iframe" || name === "object" || name === "embed";
      const isLinkButNotStyle = name === "link" && !/rel="stylesheet"/i.test(tag);
      const loadsExternal = /\b(src|href|data)\s*=\s*["']?(https?:)?\/\//i.test(tag);
      if (isAlwaysForbidden || (loadsExternal && !isLinkButNotStyle)) {
        problems.push({ tag: tag, line: lineIndex + 1 });
      }
    });
  });
  return problems;
}

/**
 * HTMLの CSP の meta の中身を、指定の名前 → 値の一覧 にして返す。meta が無ければ null。
 * @param {string} html HTMLの中身
 * @returns {object|null} 例 { "img-src": ["'self'", "https://a.example"] }
 */
function readCsp(html) {
  const match = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/);
  if (!match) {
    return null;
  }
  const directives = {};
  match[1].split(";").forEach(function (part) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length > 0) {
      directives[words[0]] = words.slice(1);
    }
  });
  return directives;
}

/**
 * そのページの img-src にあるべき外部の場所の一覧（2-5 の表）。入口だけ ASP の計測用画像を含む。
 * @param {string} pageFile ページのファイル
 * @returns {string[]} https:// つきの場所（並べ替え済み）
 */
function expectedImageSources(pageFile) {
  let hosts = analyticsHosts();
  if (pageFile === "index.html") {
    hosts = hosts.concat(beaconHosts());
  }
  return hosts.map(function (host) { return "https://" + host; }).sort();
}

/**
 * フォルダの中の決まった拡張子のファイルを全部読む。
 * @param {string} folderName portal の中のフォルダ名
 * @param {string} extension 拡張子（例 ".js"）
 * @returns {{ fileName: string, text: string }[]} ファイル名と中身
 */
function readFolder(folderName, extension) {
  const folder = path.join(PORTAL_FOLDER, folderName);
  return fs.readdirSync(folder)
    .filter(function (fileName) { return fileName.endsWith(extension); })
    .map(function (fileName) {
      return { fileName: folderName + "/" + fileName, text: fs.readFileSync(path.join(folder, fileName), "utf8") };
    });
}

test("2-7-1・AC-12・AC-14：3ページに外部の script・stylesheet・iframe・object・embed・img が無い", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const problems = findExternalLoadTags(html);
    assert.deepStrictEqual(problems, [], problems.map(function (problem) {
      return pageFile + " の " + problem.line + "行目で外部を読み込んでいます：" + problem.tag;
    }).join("\n"));
  });
});

test("AC-14：外部の <script src> を足すと、ファイル名と行の番号つきで見つかる", function () {
  const html = "<html>\n<body>\n<script src=\"https://example.com/a.js\"></script>\n</body>";
  const problems = findExternalLoadTags(html);
  assert.strictEqual(problems.length, 1);
  assert.strictEqual(problems[0].line, 3);
  // 移動のためのリンク（<a href>）は対象外
  assert.deepStrictEqual(findExternalLoadTags("<a href=\"https://example.com/\">x</a>"), []);
});

test("2-7-2・AC-12・AC-14：js/ に書かれた外部の場所は、許可リストかリンク用のURLだけ", function () {
  const allowed = analyticsHosts().concat(beaconHosts(), linkOnlyHosts(), NAMESPACE_HOSTS);
  readFolder("js", ".js").forEach(function (file) {
    findHostsWithLines(removeJsComments(file.text)).forEach(function (found) {
      assert.ok(allowed.includes(found.host),
        file.fileName + " の " + found.line + "行目に、許可リストにない外部の場所（" + found.host + "）があります。"
        + "読み込み先なら仕様（requirements_analytics.md）と CSP を直し、リンクなら設定・データのファイルに書いてください");
    });
  });
});

test("AC-14：js/ に許可リストにない外部の場所を足すと見つかり、コメントの中の例は数えない", function () {
  const code = "// 例 https://example.com/x\nconst a = \"https://evil.example.org/p.gif\";\n/* https://example.net */";
  const hosts = findHostsWithLines(removeJsComments(code));
  assert.deepStrictEqual(hosts, [{ host: "evil.example.org", line: 2 }]);
});

test("2-7-2：コメントを消したあとの js/ の全ファイルに、コメントが残っていない（文字列・正規表現との取り違えが無い）", function () {
  readFolder("js", ".js").forEach(function (file) {
    removeJsComments(file.text).split("\n").forEach(function (lineText, lineIndex) {
      assert.ok(!/^\s*(\/\/|\/\*|\*\/|\*(\s|$))/.test(lineText),
        file.fileName + " の " + (lineIndex + 1) + "行目のコメントが消えていません。tests/helpers/source_scan.js の読み方を確かめてください");
    });
  });
});

test("2-7-2：引用符や // を含む正規表現があっても、コメントだけを消し、文字列のURLは残す", function () {
  const code = [
    "const quotes = /[\"'`]/g; // https://comment.example.com",
    "const slashes = /https?:\\/\\//; /* https://block.example.com */",
    "const ratio = total / count; const url = \"https://evil.example.org/p.gif\";",
    "if (/'/.test(x)) { return \"https://second.example.org\"; }"
  ].join("\n");
  const cleaned = removeJsComments(code);
  assert.strictEqual(cleaned.split("\n").length, 4, "行の数が変わっています");
  assert.deepStrictEqual(findHostsWithLines(cleaned), [
    { host: "evil.example.org", line: 3 },
    { host: "second.example.org", line: 4 }
  ]);
});

test("2-7-2：css/ に url( と @import の外部が無い", function () {
  readFolder("css", ".css").forEach(function (file) {
    file.text.split("\n").forEach(function (lineText, lineIndex) {
      const where = file.fileName + " の " + (lineIndex + 1) + "行目";
      assert.ok(!/url\(\s*["']?(https?:)?\/\//i.test(lineText), where + " で外部のファイルを読み込んでいます");
      assert.ok(!/@import\s+(url\()?\s*["']?(https?:)?\/\//i.test(lineText), where + " で外部のCSSを読み込んでいます");
    });
  });
});

test("2-7-3・AC-13：3ページに CSP があり、img-src の外部は許可リストと過不足なく一致し、ほかの指定は表のとおり", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const csp = readCsp(fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8"));
    assert.ok(csp, pageFile + " に CSP の meta がありません");
    Object.keys(CSP_FIXED_DIRECTIVES).forEach(function (name) {
      assert.deepStrictEqual(csp[name], CSP_FIXED_DIRECTIVES[name], pageFile + " の CSP の " + name + " が仕様（2-5）と違います");
    });
    assert.ok(csp["img-src"] && csp["img-src"][0] === "'self'", pageFile + " の CSP の img-src は 'self' から始めてください");
    const externalImages = csp["img-src"].slice(1).sort();
    assert.deepStrictEqual(externalImages, expectedImageSources(pageFile),
      pageFile + " の CSP の img-src が許可リストと違います。ANALYTICS_HOST・ASP_LIST の beaconHosts を変えたら、img-src も同じにしてください");
    const knownNames = Object.keys(CSP_FIXED_DIRECTIVES).concat(["img-src"]).sort();
    assert.deepStrictEqual(Object.keys(csp).sort(), knownNames, pageFile + " の CSP に仕様にない指定があります");
  });
});

test("2-7-4：計測の送り先は ANALYTICS_HOST だけ（https:// で組み立て、ほかのホストを書いていない）", function () {
  ["analytics_path.js", "analytics_beacon.js", "analytics_main.js"].forEach(function (fileName) {
    const code = removeJsComments(fs.readFileSync(path.join(PORTAL_FOLDER, "js", fileName), "utf8"));
    assert.deepStrictEqual(findHostsWithLines(code), [], fileName + " に送り先のホストが直接書かれています");
  });
});

test("2-7-5：外部の <script>・<link rel=\"stylesheet\"> には integrity（SRI）が付いている（今は0件）", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    const externalTags = (html.match(/<(script|link)\b[^>]*>/gi) || []).filter(function (tag) {
      return /\b(src|href)\s*=\s*["']?(https?:)?\/\//i.test(tag) && (/^<script/i.test(tag) || /rel="stylesheet"/i.test(tag));
    });
    externalTags.forEach(function (tag) {
      assert.ok(/\bintegrity="sha(256|384|512)-/.test(tag), pageFile + " の外部の読み込みに integrity がありません：" + tag);
    });
  });
});

test("AC-11：<noscript> の計測画像を置いていない", function () {
  PAGE_FILES.forEach(function (pageFile) {
    const html = fs.readFileSync(path.join(PORTAL_FOLDER, pageFile), "utf8");
    assert.ok(!/<noscript/i.test(html), pageFile + " に <noscript> があります");
  });
});
