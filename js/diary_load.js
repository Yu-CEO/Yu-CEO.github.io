/*
 * diary_load.js：日記のデータ（diary/entries/ の中のJSON）を読み込む
 * 主な関数：loadDiaryIndex（公開する日付の一覧を読む）、loadCheckedEntry（1日分を読み、検査を通ったものだけ返す）、
 *           loadAllCheckedEntries（全部を新しい順に読む）、loadEntryByDate（日付を1つ指定して読む）、
 *           isUsableDate（読み込みの場所に使ってよい日付か）、sortNewestFirst（新しい順に並べる）
 * 読み込むのは同じサイトの diary/entries/ の中だけ。日付は「YYYY-MM-DD の形」かつ「一覧にある」ときだけ場所に使う
 * （../ などで別のファイルを読ませないため）。読み込めないときは null を返し、画面を止めない。
 * 日記の一覧・1件のページと入口ページのパネルから使われる。tests/diary_load.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.findEntryProblems = require("./diary_format.js").findEntryProblems;
}

// 日付の一覧のファイル名（diary/entries/ の中）
const DIARY_INDEX_FILE = "index.json";
// 1日分のファイル名の後ろにつける文字（例 "2026-11-16" ＋ ".json"）
const DIARY_ENTRY_SUFFIX = ".json";

/**
 * 同じサイトのJSONファイルを読み込む。読めない・JSONでないときは null を返す（エラーで止めない）。
 * @param {string} url 読み込む場所（相対パス）
 * @returns {Promise<*>} 読み込んだデータ、または null
 * @example fetchJsonOrNull("diary/entries/index.json")
 */
function fetchJsonOrNull(url) {
  // ファイルを直接開いたとき（file://）など、fetch（ファイルを読み込むブラウザの機能）が使えない場合もある
  if (typeof fetch !== "function") {
    return Promise.resolve(null);
  }
  // no-cache：新しい日記を足したあとも、古い一覧が出たままにならないようにする
  return fetch(url, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) {
        return null;
      }
      return response.json();
    })
    .catch(function () {
      return null;
    });
}

/**
 * 日付の一覧のデータから、使える日付だけを取り出す。配列でなければ null（読み込めない扱い）。
 * @param {*} data index.json の中身
 * @returns {string[]|null} 使える日付の一覧（重複なし）
 * @example parseDiaryIndex(["2026-11-15", "abc"]) // ["2026-11-15"]
 */
function parseDiaryIndex(data) {
  if (!Array.isArray(data)) {
    return null;
  }
  const dates = [];
  data.forEach(function (date) {
    if (isDiaryDate(date) && !dates.includes(date)) {
      dates.push(date);
    }
  });
  return dates;
}

/**
 * 日付を新しい順に並べた、新しい配列を返す（元の配列は並べ替えない）。
 * YYYY-MM-DD の形なら、文字の大小の比べ方がそのまま日付の前後になる。
 * @param {string[]} dates 日付の一覧
 * @returns {string[]} 新しい順の日付の一覧
 * @example sortNewestFirst(["2026-11-14", "2026-11-16"]) // ["2026-11-16", "2026-11-14"]
 */
function sortNewestFirst(dates) {
  return dates.slice().sort().reverse();
}

/**
 * 読み込みの場所に使ってよい日付か（YYYY-MM-DD の形で、公開する日付の一覧にある）を調べる。
 * @param {*} date 調べる値（URLの ?date= の値など）
 * @param {string[]} knownDates 公開する日付の一覧
 * @returns {boolean} 使ってよいなら true
 * @example isUsableDate("2026-11-15", ["2026-11-15"]) // true
 * @example isUsableDate("../js/main", ["2026-11-15"]) // false
 */
function isUsableDate(date, knownDates) {
  return isDiaryDate(date) && knownDates.includes(date);
}

/**
 * 公開する日付の一覧（index.json）を読み込み、新しい順にして返す。読み込めないときは null。
 * @param {string} folder diary/entries/ の場所（ページの場所によって "diary/entries/" か "entries/"）
 * @returns {Promise<string[]|null>} 新しい順の日付の一覧
 * @example loadDiaryIndex("entries/").then(function (dates) { ... })
 */
function loadDiaryIndex(folder) {
  return fetchJsonOrNull(folder + DIARY_INDEX_FILE).then(function (data) {
    const dates = parseDiaryIndex(data);
    if (dates === null) {
      return null;
    }
    return sortNewestFirst(dates);
  });
}

/**
 * 1日分の日記を読み込み、検査（diary_format.js が形を見分けて呼ぶ検査）を通ったものだけを返す。
 * 使えない日付・読み込めない・形が正しくないときは null を返し、正しくないときはコンソールに理由を日本語で出す。
 * @param {string} folder diary/entries/ の場所
 * @param {*} date 読み込む日付
 * @param {string[]} knownDates 公開する日付の一覧（ここにない日付は読みに行かない）
 * @returns {Promise<object|null>} 日記1件、または null
 * @example loadCheckedEntry("entries/", "2026-11-16", dates)
 */
function loadCheckedEntry(folder, date, knownDates) {
  if (!isUsableDate(date, knownDates)) {
    return Promise.resolve(null);
  }
  return fetchJsonOrNull(folder + date + DIARY_ENTRY_SUFFIX).then(function (entry) {
    if (entry === null) {
      return null;
    }
    const problems = findEntryProblems(entry, date);
    if (problems.length > 0) {
      console.warn(
        "日記（" + date + "）が正しくないため、表示しませんでした：" + problems.join("／") +
        "。diary/entries/" + date + ".json を直してください。"
      );
      return null;
    }
    return entry;
  });
}

/**
 * 公開する日記を全部読み込み、検査を通ったものだけを新しい順に返す。一覧が読み込めないときは null。
 * 1件だけ読めない・正しくないときは、その1件を飛ばしてほかを返す。
 * @param {string} folder diary/entries/ の場所
 * @returns {Promise<object[]|null>} 日記の一覧（新しい順）
 * @example loadAllCheckedEntries("entries/").then(function (entries) { ... })
 */
function loadAllCheckedEntries(folder) {
  return loadDiaryIndex(folder).then(function (dates) {
    if (dates === null) {
      return null;
    }
    const loadings = dates.map(function (date) {
      return loadCheckedEntry(folder, date, dates);
    });
    return Promise.all(loadings).then(function (entries) {
      return entries.filter(function (entry) {
        return entry !== null;
      });
    });
  });
}

/**
 * 日付を1つ指定して、その日の日記を読み込む（一覧にない日付・読めない・正しくないときは null）。
 * @param {string} folder diary/entries/ の場所
 * @param {*} date 読みたい日付（URLの ?date= の値など。そのまま場所には使わず、一覧と照らしてから使う）
 * @returns {Promise<object|null>} 日記1件、または null
 * @example loadEntryByDate("entries/", "2026-11-16")
 */
function loadEntryByDate(folder, date) {
  return loadDiaryIndex(folder).then(function (dates) {
    if (dates === null) {
      return null;
    }
    return loadCheckedEntry(folder, date, dates);
  });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseDiaryIndex, sortNewestFirst, isUsableDate, loadDiaryIndex, loadCheckedEntry,
    loadAllCheckedEntries, loadEntryByDate
  };
}
