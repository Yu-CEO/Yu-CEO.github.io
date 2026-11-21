/*
 * diary_validate_format3.js：3版目（"format": 3）の日記1件が決まった形か、公開してはいけない書き方がないかを調べる。画面には触れない
 * 2版目との違い：太字・ハイライト（** と ==）が書ける項目がある／今日の学び takeaway／2枚目の図 figure2／入口画像 hero／文字数は記号を除いて数える。
 * 主な関数：findFormat3Problems（日記1件の問題点を日本語の一覧で返す。空なら正しい）、countFormat3Characters（本文の合計の文字数）
 * 強調の数・本文の合計の文字数の数え方は diary_format3_counts.js に、図（figure・figure2）と入口画像（hero）の説明の検査は diary_validate_format3_media.js に分けた。
 * 使うもの：diary_markup.js（強調の読み取り）・diary_validate.js の部品（checkUnknownFields・checkPick など）・diary_safety.js・diary_speakers.js。
 * diary_format.js から使われる。tests/diary_validate_format3.test.js でテストする。形の見分けと日付の決まりは diary_format.js が調べる。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.findUnsafeWritings = require("./diary_safety.js").findUnsafeWritings;
  globalThis.isKnownSpeaker = require("./diary_speakers.js").isKnownSpeaker;
  const oldFormatParts = require("./diary_validate.js");
  globalThis.countCharacters = oldFormatParts.countCharacters;
  globalThis.checkUnknownFields = oldFormatParts.checkUnknownFields;
  globalThis.checkPick = oldFormatParts.checkPick;
  // 図・入口画像の検査（diary_validate_format3_media.js）が、ここの関数 checkPlainText を使うため（ブラウザでは同じ名前が最初から共有される）
  globalThis.checkPlainText = checkPlainText;
  const mediaParts = require("./diary_validate_format3_media.js");
  globalThis.checkFigureDescription = mediaParts.checkFigureDescription;
  globalThis.checkHeroDescription = mediaParts.checkHeroDescription;
  const markupParts = require("./diary_markup.js");
  globalThis.parseMarkup = markupParts.parseMarkup;
  globalThis.stripMarkup = markupParts.stripMarkup;
  globalThis.countVisibleCharacters = markupParts.countVisibleCharacters;
  globalThis.countMarkupUses = markupParts.countMarkupUses;
  globalThis.hasMarkupSymbols = markupParts.hasMarkupSymbols;
  const countParts = require("./diary_format3_counts.js");
  globalThis.checkMarkupCounts = countParts.checkMarkupCounts;
  globalThis.checkFormat3Total = countParts.checkFormat3Total;
}

// 3版目の日記に書いてよい項目の名前。これ以外の項目があると形の誤りにする
const FORMAT3_ALLOWED_FIELDS = [
  "format", "date", "title", "summary", "problem", "lines", "decision", "result", "takeaway", "pick", "figure", "figure2", "hero"
];
// 旧形式だけの項目。3版目に混ざっていたら、分かりやすい理由で止める
const FORMAT3_OLD_ONLY_FIELDS = ["agenda", "decisions", "lessons"];
// セリフ1つに書いてよい項目の名前
const FORMAT3_LINE_FIELDS = ["speaker", "text"];
// 文字の長さの上限（記号を除いた、読者に見える文字数）
const FORMAT3_MAX_TITLE = 40;
const FORMAT3_MAX_SUMMARY = 120;
const FORMAT3_MAX_DECISION = 120;
const FORMAT3_MAX_TAKEAWAY = 60;
// 記号を含めたもとの長さの歯止め（上限＋この文字数）。記号を大量に並べたデータを止めるため。強調は多くても数か所なので20文字あれば足りる
const FORMAT3_MARKUP_ALLOWANCE = 20;
// 文の配列の決まり：min〜max 個・1つあたり maxLength 文字まで
const FORMAT3_LIST_RULES = {
  problem: { min: 1, max: 3, maxLength: 200 },
  result: { min: 1, max: 3, maxLength: 120 }
};
const FORMAT3_LINES_RULE = { min: 2, max: 8, maxLength: 80 };
// 今日の学びが1文かを見るための、文の終わりの記号
const FORMAT3_SENTENCE_ENDINGS = "。！？";

/**
 * 公開してはいけない書き方に当たった決まりの名前を、重ならないように足す。
 * @param {string} text 調べる文
 * @param {string[]} foundNames 見つけた決まりの名前（足していく）
 * @returns {void}
 * @example collectUnsafeNames("3万", names) // names に「金額の書き方」が足される
 */
function collectUnsafeNames(text, foundNames) {
  findUnsafeWritings(text).forEach(function (ruleName) {
    if (!foundNames.includes(ruleName)) {
      foundNames.push(ruleName);
    }
  });
}

/**
 * 強調を書けない項目の文を調べる（空でない・上限以内・強調の記号がない・公開してはいけない書き方がない）。
 * @param {*} text 調べる値
 * @param {string} label 問題の説明に出す場所の名前
 * @param {number} maxLength 文字数の上限
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkPlainText("見出し", "「title」", 40, problems)
 */
function checkPlainText(text, label, maxLength, problems) {
  if (typeof text !== "string" || text.trim() === "") {
    problems.push(label + "がないか、空です");
    return;
  }
  if (hasMarkupSymbols(text)) {
    problems.push(label + "に、強調の記号（** や ==）は書けません");
  }
  if (countCharacters(text) > maxLength) {
    problems.push(label + "が" + maxLength + "文字を超えています");
  }
  const foundNames = [];
  collectUnsafeNames(text, foundNames);
  foundNames.forEach(function (ruleName) {
    problems.push(label + "に、公開してはいけない書き方（" + ruleName + "）があります");
  });
}

/**
 * 強調を書ける項目の文を調べる。順番：①もとの文字で書き方を調べる → ②強調の形 → ③記号を外した文字で書き方と文字数を調べる。
 * ③をするのは、3**万** のように記号で区切って ① をすり抜ける書き方を止めるため。
 * @param {*} text 調べる値
 * @param {string} label 問題の説明に出す場所の名前
 * @param {number} maxLength 文字数の上限（記号を除いた数）
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkMarkedText("**大事**な所", "「decision」", 120, problems)
 */
function checkMarkedText(text, label, maxLength, problems) {
  if (typeof text !== "string" || text.trim() === "") {
    problems.push(label + "がないか、空です");
    return;
  }
  const foundNames = [];
  collectUnsafeNames(text, foundNames);
  const parsed = parseMarkup(text);
  parsed.problems.forEach(function (reason) {
    problems.push(label + "：" + reason);
  });
  if (parsed.problems.length === 0) {
    if (countVisibleCharacters(text) > maxLength) {
      problems.push(label + "が（記号を除いて）" + maxLength + "文字を超えています");
    }
    collectUnsafeNames(stripMarkup(text), foundNames);
  }
  if (countCharacters(text) > maxLength + FORMAT3_MARKUP_ALLOWANCE) {
    problems.push(label + "が、記号を含めて " + (maxLength + FORMAT3_MARKUP_ALLOWANCE) + " 文字を超えています");
  }
  foundNames.forEach(function (ruleName) {
    problems.push(label + "に、公開してはいけない書き方（" + ruleName + "）があります");
  });
}

/**
 * 強調を書ける文の配列（問題・結果）を調べる。
 * @param {*} list 調べる値
 * @param {string} fieldName 項目の名前
 * @param {{ min: number, max: number, maxLength: number }} rule 個数と文字数の決まり
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkMarkedList(["段落"], "problem", FORMAT3_LIST_RULES.problem, problems)
 */
function checkMarkedList(list, fieldName, rule, problems) {
  if (!Array.isArray(list)) {
    problems.push("「" + fieldName + "」が [ ] の形（配列）になっていません");
    return;
  }
  if (list.length < rule.min || list.length > rule.max) {
    problems.push("「" + fieldName + "」の数が " + rule.min + "〜" + rule.max + " 個になっていません");
  }
  list.forEach(function (text, index) {
    checkMarkedText(text, "「" + fieldName + "」の" + (index + 1) + "つ目", rule.maxLength, problems);
  });
}

/**
 * セリフの配列を調べる（話者が決まった名前か・項目・個数・セリフの文字。強調は text にだけ書ける）。
 * @param {*} lines 調べる値
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkMarkedLines([{ speaker: "秘書", text: "始めます" }], problems)
 */
function checkMarkedLines(lines, problems) {
  if (!Array.isArray(lines)) {
    problems.push("「lines」が [ ] の形（配列）になっていません");
    return;
  }
  if (lines.length < FORMAT3_LINES_RULE.min || lines.length > FORMAT3_LINES_RULE.max) {
    problems.push("「lines」の数が " + FORMAT3_LINES_RULE.min + "〜" + FORMAT3_LINES_RULE.max + " 個になっていません");
  }
  lines.forEach(function (line, index) {
    const where = "「lines」の" + (index + 1) + "つ目";
    if (line === null || typeof line !== "object" || Array.isArray(line)) {
      problems.push(where + "が { } の形になっていません");
      return;
    }
    checkUnknownFields(line, FORMAT3_LINE_FIELDS, where + "に、", problems);
    if (typeof line.speaker === "string" && hasMarkupSymbols(line.speaker)) {
      problems.push(where + "の話者に、強調の記号（** や ==）は書けません");
    } else if (!isKnownSpeaker(line.speaker)) {
      problems.push(where + "の話者が、決まった名前になっていません");
    }
    checkMarkedText(line.text, where + "のセリフ", FORMAT3_LINES_RULE.maxLength, problems);
  });
}

/**
 * 今日の学び takeaway を調べる。書かなくてよいが、書くなら1文・60文字以内（記号を除く）・改行なし。
 * @param {*} takeaway 調べる値
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkTakeaway("図にすると文章が減る。", problems)
 */
function checkTakeaway(takeaway, problems) {
  if (takeaway === undefined) {
    return;
  }
  checkMarkedText(takeaway, "「takeaway」", FORMAT3_MAX_TAKEAWAY, problems);
  if (typeof takeaway !== "string") {
    return;
  }
  if (/[\r\n]/.test(takeaway)) {
    problems.push("「takeaway」に改行は書けません");
  }
  const visible = stripMarkup(takeaway).trim();
  const lastCharacter = visible.slice(-1);
  let body = visible;
  if (FORMAT3_SENTENCE_ENDINGS.includes(lastCharacter)) {
    body = visible.slice(0, -1);
  }
  const hasEndingInside = Array.from(body).some(function (character) {
    return FORMAT3_SENTENCE_ENDINGS.includes(character);
  });
  if (hasEndingInside) {
    problems.push("「takeaway」は1文にしてください（途中に「。」「！」「？」があります）");
  }
}

/**
 * 項目の名前が決まったものだけかを調べる。旧形式の項目は「混ざっている」という理由にする。
 * @param {object} entry 日記1件
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkFormat3Fields({ format: 3, agenda: [] }, problems)
 */
function checkFormat3Fields(entry, problems) {
  Object.keys(entry).forEach(function (fieldName) {
    if (FORMAT3_OLD_ONLY_FIELDS.includes(fieldName)) {
      problems.push("3版目の日記に、旧形式の項目「" + fieldName + "」が混ざっています");
    } else if (!FORMAT3_ALLOWED_FIELDS.includes(fieldName)) {
      problems.push("決まっていない項目「" + fieldName + "」があります");
    }
  });
}

/**
 * 3版目の日記1件の問題点を、日本語の説明の一覧で返す。空の配列なら、正しい。
 * format が 3 かどうか・日付が「2版目の最後の日」の次の日以降かどうかは、呼び出す側（diary_format.js）が調べる。
 * @param {*} entry 日記1件（JSONを読み込んだもの）
 * @param {string} fileDate ファイル名の日付（"YYYY-MM-DD"）。date と同じでなければ誤りにする
 * @returns {string[]} 問題点の説明の一覧
 * @example findFormat3Problems(entry, "2026-11-20") // []
 */
function findFormat3Problems(entry, fileDate) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return ["日記のデータが { } の形になっていません"];
  }
  const problems = [];
  checkFormat3Fields(entry, problems);
  if (!isDiaryDate(entry.date)) {
    problems.push("「date」が YYYY-MM-DD の形（実在する日付）になっていません");
  } else if (entry.date !== fileDate) {
    problems.push("「date」がファイル名の日付と違います");
  }
  checkPlainText(entry.title, "「title」", FORMAT3_MAX_TITLE, problems);
  checkPlainText(entry.summary, "「summary」", FORMAT3_MAX_SUMMARY, problems);
  checkMarkedList(entry.problem, "problem", FORMAT3_LIST_RULES.problem, problems);
  checkMarkedLines(entry.lines, problems);
  checkMarkedText(entry.decision, "「decision」", FORMAT3_MAX_DECISION, problems);
  checkMarkedList(entry.result, "result", FORMAT3_LIST_RULES.result, problems);
  checkTakeaway(entry.takeaway, problems);
  checkPick(entry.pick, entry.lines, problems);
  checkFigureDescription(entry.figure, "figure", problems);
  checkFigureDescription(entry.figure2, "figure2", problems);
  checkHeroDescription(entry.hero, problems);
  // 強調の数と合計の文字数は、ほかの形が正しいときだけ数える（形が崩れていると正しく数えられないため）
  if (problems.length === 0) {
    checkMarkupCounts(entry, problems);
    checkFormat3Total(entry, problems);
  }
  return problems;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  const countExports = require("./diary_format3_counts.js");
  module.exports = {
    findFormat3Problems, countFormat3Characters: countExports.countFormat3Characters, listMarkedBlocks: countExports.listMarkedBlocks
  };
}
