/*
 * diary_validate.js：日記1件のデータが決まった形か、公開してはいけない書き方がないかを調べる。画面には触れない
 * 〔v3〕このファイルは旧形式（format なし。2026-11-15 以前の日記）の検査。形の見分けと日付の決まりは diary_format.js、
 * 新しい形（format 2）は diary_validate_story.js が受け持つ。checkText などの部品は新しい形の検査でも使う。
 * 主な関数：findDiaryProblems（日記1件の問題点を日本語の一覧で返す。空なら正しい）
 * 同じ検査を、日記の画面（一覧・1件・入口のパネル）と自動テスト（CI）の両方で使う。
 * 使うもの：diary_day.js（日付）・diary_safety.js（書き方）・diary_speakers.js（話者の名前）。
 * tests/diary_validate.test.js・tests/diary_data.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
// （ブラウザでは、先に読み込んだ <script> の関数がそのまま使える）
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.findUnsafeWritings = require("./diary_safety.js").findUnsafeWritings;
  globalThis.isKnownSpeaker = require("./diary_speakers.js").isKnownSpeaker;
}

// 日記1件に書いてよい項目の名前。これ以外の項目があると形の誤りにする（知らない項目が画面に出ないように）
const DIARY_ALLOWED_FIELDS = ["date", "title", "summary", "agenda", "lines", "decisions", "lessons", "pick"];
// セリフ1つに書いてよい項目の名前
const DIARY_LINE_FIELDS = ["speaker", "text"];
// 文字の長さの上限（文字数）
const DIARY_MAX_TITLE = 40;
const DIARY_MAX_SUMMARY = 120;
// 文の配列の決まり：min〜max 個・1つあたり maxLength 文字まで
const DIARY_LIST_RULES = {
  agenda: { min: 1, max: 3, maxLength: 60 },
  decisions: { min: 0, max: 5, maxLength: 80 },
  lessons: { min: 1, max: 3, maxLength: 100 }
};
const DIARY_LINES_RULE = { min: 2, max: 8, maxLength: 80 };
// 本文の合計の文字数（見出し・抜粋・議題・セリフ・決定・失敗と学び）。1〜3分で読める量
const DIARY_MIN_TOTAL = 300;
const DIARY_MAX_TOTAL = 1500;

/**
 * 文字数を数える。絵文字など2つ分の文字でできた字も1文字として数える。
 * @param {string} text 文
 * @returns {number} 文字数
 * @example countCharacters("日記") // 2
 */
function countCharacters(text) {
  return Array.from(text).length;
}

/**
 * 1つの文が「空でない・上限以内の文字・公開してはいけない書き方がない」かを調べ、問題を problems に足す。
 * @param {*} text 調べる値
 * @param {string} label 問題の説明に出す場所の名前（例「「title」」）
 * @param {number} maxLength 文字数の上限
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkText("見出し", "「title」", 40, problems)
 */
function checkText(text, label, maxLength, problems) {
  if (typeof text !== "string" || text.trim() === "") {
    problems.push(label + "がないか、空です");
    return;
  }
  if (countCharacters(text) > maxLength) {
    problems.push(label + "が" + maxLength + "文字を超えています");
  }
  findUnsafeWritings(text).forEach(function (ruleName) {
    problems.push(label + "に、公開してはいけない書き方（" + ruleName + "）があります");
  });
}

/**
 * 決まった項目以外の項目がないかを調べ、問題を problems に足す。
 * @param {object} target 調べる { } のデータ
 * @param {string[]} allowedFields 書いてよい項目の名前
 * @param {string} where 問題の説明に出す場所の名前
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkUnknownFields({ title: "a", color: "red" }, DIARY_ALLOWED_FIELDS, "", problems)
 */
function checkUnknownFields(target, allowedFields, where, problems) {
  Object.keys(target).forEach(function (fieldName) {
    if (!allowedFields.includes(fieldName)) {
      problems.push(where + "決まっていない項目「" + fieldName + "」があります");
    }
  });
}

/**
 * 文の配列（議題・決定・失敗と学び）を調べ、問題を problems に足す。
 * @param {*} list 調べる値
 * @param {string} fieldName 項目の名前（"agenda" など）
 * @param {{ min: number, max: number, maxLength: number }} rule 個数と文字数の決まり
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkTextList(["議題"], "agenda", DIARY_LIST_RULES.agenda, problems)
 */
function checkTextList(list, fieldName, rule, problems) {
  if (!Array.isArray(list)) {
    problems.push("「" + fieldName + "」が [ ] の形（配列）になっていません");
    return;
  }
  if (list.length < rule.min || list.length > rule.max) {
    problems.push("「" + fieldName + "」の数が " + rule.min + "〜" + rule.max + " 個になっていません");
  }
  list.forEach(function (text, index) {
    checkText(text, "「" + fieldName + "」の" + (index + 1) + "つ目", rule.maxLength, problems);
  });
}

/**
 * セリフの配列を調べ、問題を problems に足す（話者が決まった名前か・項目・文字数・書き方）。
 * @param {*} lines 調べる値
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkLines([{ speaker: "秘書", text: "始めます" }], problems)
 */
function checkLines(lines, problems) {
  if (!Array.isArray(lines)) {
    problems.push("「lines」が [ ] の形（配列）になっていません");
    return;
  }
  if (lines.length < DIARY_LINES_RULE.min || lines.length > DIARY_LINES_RULE.max) {
    problems.push("「lines」の数が " + DIARY_LINES_RULE.min + "〜" + DIARY_LINES_RULE.max + " 個になっていません");
  }
  lines.forEach(function (line, index) {
    const where = "「lines」の" + (index + 1) + "つ目";
    if (line === null || typeof line !== "object" || Array.isArray(line)) {
      problems.push(where + "が { } の形になっていません");
      return;
    }
    checkUnknownFields(line, DIARY_LINE_FIELDS, where + "に、", problems);
    if (!isKnownSpeaker(line.speaker)) {
      problems.push(where + "の話者が、決まった名前になっていません");
    }
    checkText(line.text, where + "のセリフ", DIARY_LINES_RULE.maxLength, problems);
  });
}

/**
 * 「今日の一言」の番号 pick を調べる。書かなくてよいが、書くなら 1〜セリフの数 の整数にする。
 * @param {*} pick 調べる値
 * @param {*} lines セリフの配列
 * @param {string[]} problems 問題を足していく一覧
 * @returns {void}
 * @example checkPick(2, [{}, {}, {}], problems) // 問題なし
 */
function checkPick(pick, lines, problems) {
  if (pick === undefined) {
    return;
  }
  let lineCount = 0;
  if (Array.isArray(lines)) {
    lineCount = lines.length;
  }
  if (!Number.isInteger(pick) || pick < 1 || pick > lineCount) {
    problems.push("「pick」は 1〜" + lineCount + " の整数にしてください（書かなくてもよい）");
  }
}

/**
 * 本文の合計の文字数を数える（見出し・抜粋・議題・セリフ・決定・失敗と学び）。形が正しいデータだけに使う。
 * @param {object} entry 日記1件
 * @returns {number} 合計の文字数
 * @example countTotalCharacters(entry) // 640
 */
function countTotalCharacters(entry) {
  const texts = [entry.title, entry.summary]
    .concat(entry.agenda, entry.decisions, entry.lessons)
    .concat(entry.lines.map(function (line) {
      return line.text;
    }));
  return texts.reduce(function (total, text) {
    return total + countCharacters(text);
  }, 0);
}

/**
 * 日記1件の問題点を、日本語の説明の一覧で返す。空の配列なら、正しい（表示・公開してよい）。
 * @param {*} entry 日記1件（JSONを読み込んだもの）
 * @param {string} fileDate ファイル名の日付（"YYYY-MM-DD"）。date と同じでなければ誤りにする
 * @returns {string[]} 問題点の説明の一覧
 * @example findDiaryProblems(entry, "2026-11-16") // []
 */
function findDiaryProblems(entry, fileDate) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    return ["日記のデータが { } の形になっていません"];
  }
  const problems = [];
  checkUnknownFields(entry, DIARY_ALLOWED_FIELDS, "", problems);
  if (!isDiaryDate(entry.date)) {
    problems.push("「date」が YYYY-MM-DD の形（実在する日付）になっていません");
  } else if (entry.date !== fileDate) {
    problems.push("「date」がファイル名の日付と違います");
  }
  checkText(entry.title, "「title」", DIARY_MAX_TITLE, problems);
  checkText(entry.summary, "「summary」", DIARY_MAX_SUMMARY, problems);
  checkTextList(entry.agenda, "agenda", DIARY_LIST_RULES.agenda, problems);
  checkLines(entry.lines, problems);
  checkTextList(entry.decisions, "decisions", DIARY_LIST_RULES.decisions, problems);
  checkTextList(entry.lessons, "lessons", DIARY_LIST_RULES.lessons, problems);
  checkPick(entry.pick, entry.lines, problems);
  // 合計の文字数は、ほかの形が正しいときだけ数える（形が崩れていると正しく数えられないため）
  if (problems.length === 0) {
    const total = countTotalCharacters(entry);
    if (total < DIARY_MIN_TOTAL || total > DIARY_MAX_TOTAL) {
      problems.push("本文の合計が " + DIARY_MIN_TOTAL + "〜" + DIARY_MAX_TOTAL + " 文字になっていません（今は " + total + " 文字）");
    }
  }
  return problems;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  // 部品の検査（checkText など）は、新しい形の検査（diary_validate_story.js）でも同じものを使う
  module.exports = {
    findDiaryProblems, countTotalCharacters, countCharacters, checkText, checkUnknownFields, checkTextList, checkLines, checkPick
  };
}
