/*
 * toolbox_validate.js：道具箱のデータ（toolbox_data.js）と、ASPの一覧（site_config.js の ASP_LIST）が決まった形かを検査する（画面には触れない）
 * 主な関数：validateAspList（ASPの一覧から正しいものだけを選ぶ）、findToolboxItemProblems（道具1件の問題点）、
 *           findBeaconProblem（計測用画像のURLの問題点）、validateToolbox（表示してよい道具と問題の報告に分ける）
 * 形が正しくない道具は表示しない。計測用画像だけが正しくない道具は、画像なしにして表示する。
 * toolbox_view.js から使われる。tests/toolbox_validate.test.js・tests/toolbox_data.test.js でテストする。
 */

// genre に使ってよい値（"money"＝お金・NISA／"ai"＝AI・開発の道具／"life"＝ふだん使い）
const TOOLBOX_GENRES = ["money", "ai", "life"];
// linkType に使ってよい値（紹介リンク／公式リンク／リンクなし）
const TOOLBOX_LINK_TYPES = ["affiliate", "official", "none"];
// 必ず書く項目
const TOOLBOX_REQUIRED_FIELDS = ["genre", "name", "note", "linkType"];
// 書いてよい項目の名前。これ以外は書き間違い（例：urll）として止める
const TOOLBOX_ALLOWED_FIELDS = ["genre", "name", "note", "linkType", "url", "asp", "beaconUrl", "label"];
// 文字数の上限（カードからはみ出さず、短い体験談にとどめるため）
const TOOLBOX_TEXT_LIMITS = { name: 40, note: 80, label: 20 };
// 道具の文面に使わない言葉（勧誘・成果の約束に見える言い回しを防ぐため）
const TOOLBOX_BANNED_WORDS = ["おすすめ", "オススメ", "お勧め", "儲かる", "必ず", "絶対", "損しない", "買うべき", "始めるべき", "一番お得", "ランキング", "No.1"];
// URL の先頭として認める文字。javascript:・data:・http:// を防ぐ。link_button.js の SAFE_BUTTON_URL_PREFIX と同じルール
const TOOLBOX_SAFE_URL_PREFIX = "https://";

/**
 * 値が「空でない文字」かどうかを調べる。空白だけの文字も空として扱う。
 * @param {*} value 調べる値
 * @returns {boolean} 空でない文字なら true
 * @example isFilledToolboxText("SBI証券") // true
 * @example isFilledToolboxText("  ")      // false
 */
function isFilledToolboxText(value) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * URL が https:// で始まる文字かどうかを調べる。
 * @param {*} url 調べる値
 * @returns {boolean} https:// で始まるなら true
 * @example isSafeToolboxUrl("https://fit-easy.jp/")  // true
 * @example isSafeToolboxUrl("javascript:alert(1)")   // false
 */
function isSafeToolboxUrl(url) {
  return typeof url === "string" && url.startsWith(TOOLBOX_SAFE_URL_PREFIX);
}

/**
 * URL からホスト名（「af.moshimo.com」の部分）を取り出す。読めないURLのときは空の文字を返す。
 * 文字を自分で切り分けず、ブラウザと Node.js にある標準の URL を使う（「@」などを使ったごまかしを防ぐため）。
 * @param {string} url URL
 * @returns {string} ホスト名
 * @example getToolboxHostName("https://px.a8.net/svt/ejp?a8mat=x") // "px.a8.net"
 * @example getToolboxHostName("こわれたURL")                       // ""
 */
function getToolboxHostName(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return "";
  }
}

/**
 * ホスト名の一覧が「空でない文字の配列」かどうかを調べる。
 * @param {*} hosts 調べる値
 * @returns {boolean} 正しければ true
 * @example isHostList(["px.a8.net"]) // true
 * @example isHostList([])            // false
 */
function isHostList(hosts) {
  return Array.isArray(hosts) && hosts.length > 0 && hosts.every(isFilledToolboxText);
}

/**
 * ASPの一覧を検査し、正しいASPだけを返す。id の重複・名前がない・ホストの一覧が空のASPは「ないもの」として扱う。
 * @param {*} aspList site_config.js の ASP_LIST
 * @returns {{ validAsps: object[], problemReports: { position: number, problems: string[] }[] }}
 * @example validateAspList([{ id: "a8", name: "A8.net", linkHosts: ["px.a8.net"], beaconHosts: ["www18.a8.net"] }])
 *          // { validAsps: [そのままの1件], problemReports: [] }
 */
function validateAspList(aspList) {
  const result = { validAsps: [], problemReports: [] };
  if (!Array.isArray(aspList)) {
    result.problemReports.push({ position: 0, problems: ["ASP_LIST が [ ] の形（配列）になっていません"] });
    return result;
  }
  const seenIds = [];
  aspList.forEach(function (asp, index) {
    const problems = [];
    if (asp === null || typeof asp !== "object") {
      problems.push("{ } の形になっていません");
    } else {
      if (!isFilledToolboxText(asp.id)) problems.push("「id」がないか、空です");
      if (!isFilledToolboxText(asp.name)) problems.push("「name」がないか、空です");
      if (!isHostList(asp.linkHosts)) problems.push("「linkHosts」が空か、ホスト名の一覧になっていません");
      if (!isHostList(asp.beaconHosts)) problems.push("「beaconHosts」が空か、ホスト名の一覧になっていません");
      if (seenIds.includes(asp.id)) problems.push("「id」の「" + asp.id + "」がほかのASPと重なっています");
    }
    if (problems.length > 0) {
      result.problemReports.push({ position: index + 1, problems: problems });
      return;
    }
    seenIds.push(asp.id);
    result.validAsps.push(asp);
  });
  return result;
}

/**
 * id から、正しいASPを探す。
 * @param {object[]} validAsps 検査を通ったASPの一覧
 * @param {*} aspId 探す id
 * @returns {object|undefined} 見つかったASP
 * @example findAspById([{ id: "a8" }], "a8") // { id: "a8" }
 */
function findAspById(validAsps, aspId) {
  return validAsps.find(function (asp) {
    return asp.id === aspId;
  });
}

/**
 * 必須の項目・知らない項目名・決まった値・文字数・禁止表現を調べる（リンクの部分以外）。
 * @param {object} item 道具1件
 * @returns {string[]} 問題点の説明の一覧
 * @example findToolboxTextProblems({ genre: "stock", name: "A", note: "B", linkType: "none" })
 *          // ["「genre」が「stock」になっています（…）"]
 */
function findToolboxTextProblems(item) {
  const problems = [];
  Object.keys(item).forEach(function (fieldName) {
    if (!TOOLBOX_ALLOWED_FIELDS.includes(fieldName)) {
      problems.push("決まっていない項目名「" + fieldName + "」があります（書き間違いがないか確かめてください）");
    }
  });
  TOOLBOX_REQUIRED_FIELDS.forEach(function (fieldName) {
    if (!isFilledToolboxText(item[fieldName])) problems.push("「" + fieldName + "」がないか、空です");
  });
  if (isFilledToolboxText(item.genre) && !TOOLBOX_GENRES.includes(item.genre)) {
    problems.push("「genre」が「" + item.genre + "」になっています（「" + TOOLBOX_GENRES.join("」「") + "」のどれかにしてください）");
  }
  if (isFilledToolboxText(item.linkType) && !TOOLBOX_LINK_TYPES.includes(item.linkType)) {
    problems.push("「linkType」が「" + item.linkType + "」になっています（「" + TOOLBOX_LINK_TYPES.join("」「") + "」のどれかにしてください）");
  }
  Object.keys(TOOLBOX_TEXT_LIMITS).forEach(function (fieldName) {
    const text = item[fieldName];
    if (typeof text === "string" && text.length > TOOLBOX_TEXT_LIMITS[fieldName]) {
      problems.push("「" + fieldName + "」が" + TOOLBOX_TEXT_LIMITS[fieldName] + "文字を超えています（" + text.length + "文字）");
    }
  });
  problems.push.apply(problems, findBannedWordProblems(item));
  return problems;
}

/**
 * name・note・label に禁止表現が入っていないかを調べる。
 * @param {object} item 道具1件
 * @returns {string[]} 問題点の説明の一覧
 * @example findBannedWordProblems({ note: "必ず儲かる" }) // ["「note」に禁止表現「儲かる」…", "…「必ず」…"]
 */
function findBannedWordProblems(item) {
  const problems = [];
  ["name", "note", "label"].forEach(function (fieldName) {
    const text = item[fieldName];
    if (typeof text !== "string") return;
    TOOLBOX_BANNED_WORDS.forEach(function (word) {
      if (text.includes(word)) problems.push("「" + fieldName + "」に使わない言葉「" + word + "」が入っています");
    });
  });
  return problems;
}

/**
 * リンクの部分（url・asp）を調べる。紹介・公式は https:// のURLが必要。紹介はASPとホスト名も合っている必要がある。
 * @param {object} item 道具1件
 * @param {object[]} validAsps 検査を通ったASPの一覧
 * @returns {string[]} 問題点の説明の一覧
 * @example findToolboxLinkProblems({ linkType: "official", url: "http://x" }, []) // ["「url」が https:// で始まっていません"]
 */
function findToolboxLinkProblems(item, validAsps) {
  const problems = [];
  if (item.linkType !== "affiliate" && item.linkType !== "official") {
    if (item.asp !== undefined) problems.push("紹介リンクではないのに「asp」が書かれています");
    return problems;
  }
  if (!isSafeToolboxUrl(item.url)) {
    problems.push("「url」がないか、https:// で始まっていません");
  }
  if (item.linkType === "official") {
    if (item.asp !== undefined) problems.push("公式リンクなのに「asp」が書かれています");
    return problems;
  }
  const asp = findAspById(validAsps, item.asp);
  if (asp === undefined) {
    problems.push("「asp」がないか、ASP_LIST にない名前（" + item.asp + "）です");
  } else if (isSafeToolboxUrl(item.url) && !asp.linkHosts.includes(getToolboxHostName(item.url))) {
    problems.push("「url」のホスト名が " + asp.name + " の紹介リンクのホスト（" + asp.linkHosts.join("・") + "）ではありません");
  }
  return problems;
}

/**
 * 道具1件の問題点を調べて、日本語の説明の一覧を返す。問題がなければ空の配列。計測用画像の問題はここでは調べない。
 * @param {*} item 道具1件
 * @param {object[]} validAsps 検査を通ったASPの一覧（validateAspList の validAsps）
 * @returns {string[]} 問題点の説明の一覧
 * @example findToolboxItemProblems({ genre: "ai", name: "VS Code", note: "使っています", linkType: "official", url: "https://code.visualstudio.com/" }, []) // []
 */
function findToolboxItemProblems(item, validAsps) {
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    return ["{ } の形になっていません"];
  }
  return findToolboxTextProblems(item).concat(findToolboxLinkProblems(item, validAsps));
}

/**
 * 計測用画像のURL（beaconUrl）の問題点を調べる。書かれていなければ問題なし（空の文字）。
 * @param {object} item 形の検査を通った道具1件
 * @param {object[]} validAsps 検査を通ったASPの一覧
 * @returns {string} 問題点の説明。問題がなければ ""
 * @example findBeaconProblem({ linkType: "official", beaconUrl: "https://i.moshimo.com/x" }, []) // "紹介リンクではないので…"
 */
function findBeaconProblem(item, validAsps) {
  if (item.beaconUrl === undefined || item.beaconUrl === "") {
    return "";
  }
  if (item.linkType !== "affiliate") {
    return "紹介リンクではないので、計測用画像（beaconUrl）は置きません";
  }
  if (!isSafeToolboxUrl(item.beaconUrl)) {
    return "計測用画像（beaconUrl）が https:// で始まっていないので、画像なしで表示します";
  }
  // 形の検査を通った紹介リンクなので、asp は必ず検査を通った ASP_LIST の中にある
  const asp = findAspById(validAsps, item.asp);
  if (!asp.beaconHosts.includes(getToolboxHostName(item.beaconUrl))) {
    return "計測用画像（beaconUrl）のホスト名が " + asp.name + " の計測用のホストではないので、画像なしで表示します";
  }
  return "";
}

/**
 * 道具1件の、表示に使う写しを作る（元のデータは書き換えない）。
 * リンクなしなのに url がある・計測用画像が正しくない、という「消すほどではない問題」はここで直し、注意の文を返す。
 * @param {object} item 形の検査を通った道具1件
 * @param {object[]} validAsps 検査を通ったASPの一覧
 * @returns {{ item: object, notices: string[] }} 表示に使う写しと、注意の文の一覧
 * @example cleanToolboxItem({ genre: "ai", name: "A", note: "B", linkType: "none", url: "https://x" }, [])
 *          // { item: { genre: "ai", name: "A", note: "B", linkType: "none" }, notices: ["リンクなし（none）なのに…"] }
 */
function cleanToolboxItem(item, validAsps) {
  const copy = Object.assign({}, item);
  const notices = [];
  if (copy.linkType === "none" && copy.url !== undefined && copy.url !== "") {
    notices.push("リンクなし（none）なのに「url」が入っているので、リンクなしで表示します");
  }
  if (copy.linkType === "none") {
    delete copy.url;
  }
  const beaconProblem = findBeaconProblem(copy, validAsps);
  if (beaconProblem !== "") {
    notices.push(beaconProblem);
    delete copy.beaconUrl;
  }
  return { item: copy, notices: notices };
}

/**
 * 道具の一覧を、表示してよい道具と、問題の報告に分ける。正しくない道具があっても、ほかの正しい道具はそのまま返す。
 * @param {*} items 道具の一覧（toolbox_data.js の TOOLBOX_DATA）
 * @param {*} aspList ASPの一覧（site_config.js の ASP_LIST）
 * @returns {{ validItems: object[], validAsps: object[], problemReports: { position: number, problems: string[] }[],
 *             noticeReports: { position: number, notice: string }[], aspProblemReports: object[] }}
 *          validItems：表示してよい道具（データに書いた順）／problemReports：表示しない道具（position は何件目か・1から）／
 *          noticeReports：表示はするが注意を出す道具／aspProblemReports：ASP_LIST の正しくないASP
 * @example validateToolbox([], ASP_LIST) // { validItems: [], problemReports: [], ... }
 */
function validateToolbox(items, aspList) {
  const aspResult = validateAspList(aspList);
  const result = {
    validItems: [],
    validAsps: aspResult.validAsps,
    problemReports: [],
    noticeReports: [],
    aspProblemReports: aspResult.problemReports
  };
  if (!Array.isArray(items)) {
    result.problemReports.push({ position: 0, problems: ["道具の一覧が [ ] の形（配列）になっていません"] });
    return result;
  }
  items.forEach(function (item, index) {
    const position = index + 1;
    const problems = findToolboxItemProblems(item, aspResult.validAsps);
    if (problems.length > 0) {
      result.problemReports.push({ position: position, problems: problems });
      return;
    }
    const cleaned = cleanToolboxItem(item, aspResult.validAsps);
    cleaned.notices.forEach(function (notice) {
      result.noticeReports.push({ position: position, notice: notice });
    });
    result.validItems.push(cleaned.item);
  });
  return result;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TOOLBOX_BANNED_WORDS, getToolboxHostName, validateAspList, findToolboxItemProblems,
    findBeaconProblem, cleanToolboxItem, validateToolbox
  };
}
