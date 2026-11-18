/*
 * diary_changes.js：変更されたファイルの一覧から「その日の日記だけの変更か」を判定する（git・ファイル・画面に触れない計算だけ）
 * 主な関数：parseGitStatus（git status の結果を一覧にする）、judgeDiaryChanges（日記だけの変更か・その日の日付・上げるファイル）、
 *   checkIndexChange（index.json に日付が1つ足されただけか）、checkFigureMatch（JSON の figure と図のファイルが合うか）、
 *   checkPublishDate（今日か前の日の日付か）
 * 自動で上げてよいのは、その日の diary/entries/<日付>.json（新しい1つ）・diary/entries/index.json（1行追加）・
 *   diary/figures/<日付>.svg（新しい0〜1つ）・〔v4〕diary/figures/<日付>-2.svg（2枚目の図。新しい0〜1つ）だけ（requirements_diary.md 2-5）。
 *   それ以外（-3.svg・別の日の図など）が1つでもあれば止める。
 * tools/diary_publish.js から使われる。tests/diary_changes.test.js でテストする。
 */

// 自動公開を止めたときに必ず出す文（どんな理由でも、ほかの変更は人が確かめるため）
const NEEDS_DEV_FLOW_MESSAGE = "通常の /dev フローとCEO承認が必要です";
const INDEX_FILE = "diary/entries/index.json";
// 新しい日記・図のファイルの形（日付は YYYY-MM-DD）
const ENTRY_FILE_PATTERN = /^diary\/entries\/(\d{4}-\d{2}-\d{2})\.json$/;
const FIGURE_FILE_PATTERN = /^diary\/figures\/(\d{4}-\d{2}-\d{2})\.svg$/;
// 〔v4〕2枚目の図（3版目の figure2）。-2 の連番だけを認め、-1・-3 などは「それ以外」として止める
const FIGURE2_FILE_PATTERN = /^diary\/figures\/(\d{4}-\d{2}-\d{2})-2\.svg$/;
// git status の2文字の状態のうち「新しいファイル」と認めるもの（?? はまだ git に足していない、A  は足した）
const NEW_FILE_STATES = ["??", "A "];
// index.json の状態として認めるもの（変更だけ。削除・名前の変更は不可）
const MODIFIED_STATES = [" M", "M ", "MM"];
// 1日の長さ（ミリ秒）。前の日の日付を求めるのに使う
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `git status --porcelain=v1 -z --untracked-files=all` の結果を、状態とファイルの場所の一覧にする。
 * 名前の変更（R・C）は元の場所も続くので、両方を一覧に入れる（どちらも止める対象になる）。
 * @param {string} output git status の出力（区切りは \0）
 * @returns {{ state: string, path: string }[]} 変更の一覧
 * @example parseGitStatus("?? diary/entries/2026-11-16.json\0") // [{ state: "??", path: "diary/entries/2026-11-16.json" }]
 */
function parseGitStatus(output) {
  const parts = output.split("\0").filter(function (part) { return part !== ""; });
  const changes = [];
  for (let index = 0; index < parts.length; index += 1) {
    const state = parts[index].slice(0, 2);
    changes.push({ state: state, path: parts[index].slice(3) });
    if (state[0] === "R" || state[0] === "C") {
      // 名前の変更は、次の1つが元の場所
      index += 1;
      changes.push({ state: state, path: parts[index] });
    }
  }
  return changes;
}

/**
 * 変更の一覧が「その日の日記1件＋index.json＋（あれば）その日の図1つ」だけかを判定する。
 * @param {{ state: string, path: string }[]} changes 変更の一覧
 * @returns {{ ok: boolean, date: string, files: string[], hasFigure: boolean, hasFigure2: boolean, problems: string[] }}
 *   ok：進んでよいか／date：日記の日付／files：上げるファイル／hasFigure：図があるか／hasFigure2：2枚目の図があるか／problems：止めた理由（日本語）
 * @example judgeDiaryChanges([{ state: "??", path: "diary/entries/2026-11-16.json" }, { state: " M", path: "diary/entries/index.json" }])
 */
function judgeDiaryChanges(changes) {
  const problems = [];
  const entryDates = [];
  const figureDates = [];
  const figure2Dates = [];
  let indexChanged = false;
  changes.forEach(function (change) {
    const kind = classifyChange(change);
    if (kind.type === "entry") {
      entryDates.push(kind.date);
    } else if (kind.type === "figure") {
      figureDates.push(kind.date);
    } else if (kind.type === "figure2") {
      figure2Dates.push(kind.date);
    } else if (kind.type === "index") {
      indexChanged = true;
    } else {
      problems.push("自動で上げられない変更があります：" + change.path + "（" + describeState(change.state) + "）");
    }
  });
  addCountProblems(problems, entryDates, figureDates, figure2Dates, indexChanged);
  return buildJudgement(problems, entryDates, figureDates, figure2Dates);
}

/**
 * 変更1つが、新しい日記・新しい図（1枚目・2枚目）・index.json の変更・それ以外のどれかを見分ける。
 * @param {{ state: string, path: string }} change 変更1つ
 * @returns {{ type: string, date: string }} type は "entry"・"figure"・"figure2"・"index"・"other"
 * @example classifyChange({ state: "??", path: "diary/figures/2026-11-16.svg" }) // { type: "figure", date: "2026-11-16" }
 */
function classifyChange(change) {
  const isNewFile = NEW_FILE_STATES.includes(change.state);
  const entryMatch = change.path.match(ENTRY_FILE_PATTERN);
  if (isNewFile && entryMatch) {
    return { type: "entry", date: entryMatch[1] };
  }
  const figureMatch = change.path.match(FIGURE_FILE_PATTERN);
  if (isNewFile && figureMatch) {
    return { type: "figure", date: figureMatch[1] };
  }
  const figure2Match = change.path.match(FIGURE2_FILE_PATTERN);
  if (isNewFile && figure2Match) {
    return { type: "figure2", date: figure2Match[1] };
  }
  if (change.path === INDEX_FILE && MODIFIED_STATES.includes(change.state)) {
    return { type: "index", date: "" };
  }
  return { type: "other", date: "" };
}

/**
 * git の状態の2文字を、日本語の短い説明にする（止めた理由の表示用）。
 * @param {string} state 状態の2文字
 * @returns {string} 説明
 * @example describeState(" M") // "既にあるファイルの変更"
 */
function describeState(state) {
  if (state === "??" || state[0] === "A") {
    return "新しいファイル";
  }
  if (state.includes("D")) {
    return "削除";
  }
  if (state[0] === "R" || state[0] === "C") {
    return "名前の変更";
  }
  return "既にあるファイルの変更";
}

/**
 * 日記・図・index.json の数が決まりどおりかを確かめ、違えば理由を足す。
 * @param {string[]} problems 理由を足す一覧
 * @param {string[]} entryDates 新しい日記の日付
 * @param {string[]} figureDates 新しい図（1枚目）の日付
 * @param {string[]} figure2Dates 新しい2枚目の図の日付
 * @param {boolean} indexChanged index.json が変わったか
 * @returns {void}
 * @example addCountProblems([], ["2026-11-16"], [], [], true)
 */
function addCountProblems(problems, entryDates, figureDates, figure2Dates, indexChanged) {
  if (entryDates.length !== 1) {
    problems.push("新しい日記のファイルは1つだけにしてください（今は " + entryDates.length + " 個）");
  }
  if (!indexChanged) {
    problems.push("diary/entries/index.json に日付が足されていません");
  }
  if (figureDates.length > 1) {
    problems.push("図は1日1つだけです（今は " + figureDates.length + " 個）");
  }
  if (figure2Dates.length > 1) {
    problems.push("2枚目の図は1日1つだけです（今は " + figure2Dates.length + " 個）");
  }
  figureDates.concat(figure2Dates).forEach(function (figureDate) {
    if (entryDates.length === 1 && figureDate !== entryDates[0]) {
      problems.push("日記と別の日の図があります：" + figureDate);
    }
  });
}

/**
 * 判定の結果をまとめる。止める理由があれば、最後に「通常の /dev フロー…」を足す。
 * @param {string[]} problems 止めた理由
 * @param {string[]} entryDates 新しい日記の日付
 * @param {string[]} figureDates 新しい図（1枚目）の日付
 * @param {string[]} figure2Dates 新しい2枚目の図の日付
 * @returns {{ ok: boolean, date: string, files: string[], hasFigure: boolean, hasFigure2: boolean, problems: string[] }} 判定の結果
 * @example buildJudgement([], ["2026-11-16"], [], [])
 */
function buildJudgement(problems, entryDates, figureDates, figure2Dates) {
  if (problems.length > 0) {
    return { ok: false, date: "", files: [], hasFigure: false, hasFigure2: false, problems: problems.concat([NEEDS_DEV_FLOW_MESSAGE]) };
  }
  const date = entryDates[0];
  const files = ["diary/entries/" + date + ".json", INDEX_FILE];
  if (figureDates.length === 1) {
    files.push("diary/figures/" + date + ".svg");
  }
  if (figure2Dates.length === 1) {
    files.push("diary/figures/" + date + "-2.svg");
  }
  return {
    ok: true, date: date, files: files, hasFigure: figureDates.length === 1, hasFigure2: figure2Dates.length === 1, problems: []
  };
}

/**
 * index.json が「前の一覧の後ろに、その日の日付が1つ足されただけ」かを確かめる。
 * @param {*} previousList 前の commit の index.json の中身
 * @param {*} currentList 今の index.json の中身
 * @param {string} date 日記の日付
 * @returns {string[]} 問題点（なければ空）
 * @example checkIndexChange(["2026-11-15"], ["2026-11-15", "2026-11-16"], "2026-11-16") // []
 */
function checkIndexChange(previousList, currentList, date) {
  if (!Array.isArray(previousList) || !Array.isArray(currentList)) {
    return ["diary/entries/index.json が配列ではありません", NEEDS_DEV_FLOW_MESSAGE];
  }
  const expected = previousList.concat([date]);
  if (previousList.includes(date) || JSON.stringify(currentList) !== JSON.stringify(expected)) {
    return ["diary/entries/index.json は、最後に " + date + " を1つ足すだけにしてください", NEEDS_DEV_FLOW_MESSAGE];
  }
  return [];
}

/**
 * 日記の JSON の figure・figure2 と、図のファイル（<日付>.svg・<日付>-2.svg）があるかが合っているかを確かめる。
 * @param {object} entry 日記のデータ
 * @param {boolean} hasFigureFile 図（1枚目）のファイルがあるか
 * @param {boolean} [hasFigure2File] 2枚目の図のファイルがあるか（書かなければ「ない」）
 * @returns {string[]} 問題点（なければ空）
 * @example checkFigureMatch({ figure: { alt: "a", caption: "b" } }, false) // ["日記に figure があるのに、図のファイルがありません"]
 */
function checkFigureMatch(entry, hasFigureFile, hasFigure2File) {
  const hasFigureItem = Boolean(entry) && entry.figure !== undefined;
  const hasFigure2Item = Boolean(entry) && entry.figure2 !== undefined;
  const problems = [];
  // 図のファイルを足せば、このまま自動で出せる（ほかの変更ではない）ので、足りないときは「通常の /dev フロー」の文は付けない
  if (hasFigureItem && !hasFigureFile) {
    problems.push("日記に figure があるのに、図のファイルがありません");
  }
  if (!hasFigureItem && hasFigureFile) {
    problems.push("日記に figure がないのに、図のファイルがあります", NEEDS_DEV_FLOW_MESSAGE);
  }
  if (hasFigure2Item && !hasFigure2File) {
    problems.push("日記に figure2 があるのに、2枚目の図のファイル（-2.svg）がありません");
  }
  if (!hasFigure2Item && hasFigure2File) {
    problems.push("日記に figure2 がないのに、2枚目の図のファイル（-2.svg）があります", NEEDS_DEV_FLOW_MESSAGE);
  }
  return problems;
}

/**
 * 前の日の日付を求める。
 * 日付の文字（YYYY-MM-DD）だけで計算するため、時差・夏時間の影響を受けない世界標準時（末尾の Z）の0時として読み、1日戻す。
 * @param {string} date 日付（YYYY-MM-DD）
 * @returns {string} 前の日の日付（YYYY-MM-DD）
 * @example previousDate("2026-12-01") // "2026-11-30"
 */
function previousDate(date) {
  const midnightUtc = Date.parse(date + "T00:00:00Z");
  const previousMidnight = new Date(midnightUtc - ONE_DAY_MS);
  return previousMidnight.toISOString().slice(0, 10);
}

/**
 * 日記の日付が、今日か前の日（夜中の0時をまたいだ会議のため）かを確かめる。
 * @param {string} date 日記の日付（YYYY-MM-DD）
 * @param {string} today 今日の日付（YYYY-MM-DD・手元の時計）
 * @returns {string[]} 問題点（なければ空）
 * @example checkPublishDate("2026-11-15", "2026-11-16") // []
 */
function checkPublishDate(date, today) {
  if (date === today || date === previousDate(today)) {
    return [];
  }
  if (date > today) {
    return ["未来の日付の日記は自動で公開できません：" + date];
  }
  return ["今日か前の日の日記だけを自動で公開できます（" + date + " は古すぎます。さかのぼりは通常の承認で出します）"];
}

module.exports = {
  parseGitStatus,
  judgeDiaryChanges,
  checkIndexChange,
  checkFigureMatch,
  checkPublishDate,
  previousDate,
  NEEDS_DEV_FLOW_MESSAGE
};
