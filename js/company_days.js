/*
 * company_days.js：最初の画面の「会社づくりN日目」を出す（1日目＝2026-11-14。数え方は日記と同じ）
 * 主な関数：showCompanyDays。使うもの：diary_day.js。main.js から使われる。tests/officer.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.getTodayDayNumber = require("./diary_day.js").getTodayDayNumber;
}

/**
 * 「会社づくりN日目」の札を出す。部品がなければ何もしない。
 * @param {Date} now 今の時刻
 * @returns {boolean} 出せたら true
 * @example showCompanyDays(new Date())
 */
function showCompanyDays(now) {
  const label = document.getElementById("company-days");
  if (label === null) {
    return false;
  }
  label.textContent = "会社づくり" + getTodayDayNumber(now) + "日目";
  label.hidden = false;
  return true;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { showCompanyDays };
}
