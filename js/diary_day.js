/*
 * diary_day.js：日記の日付を扱う（形の確認・「N日目」の計算・表示用の文字）。画面には触れない
 * 主な関数：isDiaryDate（YYYY-MM-DD の形で、実在する日付か）、getDayNumber（何日目かを計算）、
 *           formatDayShort（「8日目」）、formatDayLong（「AI会社を始めて8日目」）、formatLocalDate（端末の今日を YYYY-MM-DD に）、
 *           getTodayDayNumber（今日は何日目か）、formatDateJa（「2026年11月16日（月）」）、formatDateDot（「2026.11.16」）
 * 〔第3回〕画面の「Day N」は「N日目」に統一した（初めての人にも、数字の意味が通じるように）。数え方は今までと同じ。
 * diary_validate.js・diary_load.js・日記の表示のファイルから使われる。tests/diary_day.test.js でテストする。
 */

// Day 1 の日付（2026-11-14）。Day N はデータに持たず、この日からの日数で計算する（数え間違いを防ぐため）
const DIARY_DAY_ONE = Date.UTC(2026, 10, 14); // 月は0から数えるので、10＝11月
// 1日の長さ（ミリ秒）。日付どうしの差を日数に直すのに使う
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
// 日付の形：4けたの年-2けたの月-2けたの日
const DIARY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// 曜日の表示（0＝日曜日）
const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * 日付の文字を、時差の影響を受けない時刻（UTC＝世界の基準の時刻）の数に直す。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {number} 1970年からのミリ秒
 * @example toUtcTime("2026-11-14") // Date.UTC(2026, 10, 14)
 */
function toUtcTime(date) {
  const parts = date.split("-").map(Number);
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

/**
 * 日記の日付として使える文字か（YYYY-MM-DD の形で、実在する日付か）を調べる。
 * 2026-02-30 のような、形は合っていても存在しない日付は使わない。
 * @param {*} date 調べる値
 * @returns {boolean} 使えるなら true
 * @example isDiaryDate("2026-11-15") // true
 * @example isDiaryDate("2026-1-5")   // false
 * @example isDiaryDate("../js/main") // false
 */
function isDiaryDate(date) {
  if (typeof date !== "string" || !DIARY_DATE_PATTERN.test(date)) {
    return false;
  }
  // 実在しない日付は、Date に直すと別の日にずれる。元の文字に戻して同じかで確かめる
  const roundTrip = new Date(toUtcTime(date)).toISOString().slice(0, 10);
  return roundTrip === date;
}

/**
 * 日付から何日目かを計算する（1日目 ＝ 2026-11-14）。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {number} 何日目か
 * @example getDayNumber("2026-11-14") // 1
 * @example getDayNumber("2027-02-11") // 90
 */
function getDayNumber(date) {
  // 夏時間などで1時間ずれても日数が変わらないよう、四捨五入する
  return Math.round((toUtcTime(date) - DIARY_DAY_ONE) / MILLISECONDS_PER_DAY) + 1;
}

/**
 * 日付を、画面に出す日本語の形にする。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {string} 「2026年11月16日（月）」の形の文字
 * @example formatDateJa("2026-11-16") // "2026年11月16日（月）"
 */
function formatDateJa(date) {
  const time = new Date(toUtcTime(date));
  return time.getUTCFullYear() + "年" + (time.getUTCMonth() + 1) + "月" + time.getUTCDate() + "日" +
    "（" + WEEKDAY_NAMES[time.getUTCDay()] + "）";
}

/**
 * 「8日目」の形の短い表示にする（カード・ボタンの名前など、せまい所で使う）。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {string} 「8日目」の形の文字
 * @example formatDayShort("2026-11-21") // "8日目"
 */
function formatDayShort(date) {
  return getDayNumber(date) + "日目";
}

/**
 * 「AI会社を始めて8日目」の形の長い表示にする（広い所・1件のページの帯・読み上げ用）。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {string} 「AI会社を始めて8日目」の形の文字
 * @example formatDayLong("2026-11-21") // "AI会社を始めて8日目"
 */
function formatDayLong(date) {
  return "AI会社を始めて" + getDayNumber(date) + "日目";
}

/**
 * 端末の「今日」を、時差の影響を受けない YYYY-MM-DD の文字にする（利用者の暮らす日付で数えるため、端末の日付を使う）。
 * @param {Date} now 今の時刻
 * @returns {string} "YYYY-MM-DD" の形の日付
 * @example formatLocalDate(new Date(2026, 10, 21, 23, 59)) // "2026-11-21"
 */
function formatLocalDate(now) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

/**
 * 端末の「今日」が何日目かを返す（1日目 ＝ 2026-11-14。日記と同じ数え方）。
 * @param {Date} now 今の時刻
 * @returns {number} 何日目か
 * @example getTodayDayNumber(new Date(2026, 10, 21)) // 8
 */
function getTodayDayNumber(now) {
  return getDayNumber(formatLocalDate(now));
}

/**
 * 日付を、点で区切った短い形にする（小さなカード用）。
 * @param {string} date "YYYY-MM-DD" の形の日付
 * @returns {string} 「2026.11.16」の形の文字
 * @example formatDateDot("2026-11-16") // "2026.11.16"
 */
function formatDateDot(date) {
  return date.replace(/-/g, ".");
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isDiaryDate, getDayNumber, formatDateJa, formatDayShort, formatDayLong, formatLocalDate, getTodayDayNumber, formatDateDot
  };
}
