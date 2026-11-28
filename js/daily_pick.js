/*
 * daily_pick.js：開くたびに「前回と違う番号」を選ぶ（今日の色・今日の絵・最初に出す役員の発言）。画面には触れない
 * 主な関数：pickNewIndex。端末に残すのは前回の番号だけ（localStorage＝ブラウザの中の小さな保存場所）。
 * main.js から使われる。tests/paint.test.js でテストする。
 */

/**
 * 0 から count-1 の番号を、前回と違うものにして選び、保存する。
 * 保存できない端末（プライベート表示など）では、エラーにせず自由に選ぶ。
 * @param {string} key 保存の名前
 * @param {number} count 選べる数
 * @param {function(): number} rand 0以上1未満の乱数
 * @param {function(): Storage} getStorage 保存場所を返す関数（取り出すだけでエラーになる端末があるため関数で受け取る）
 * @returns {number} 選んだ番号
 * @example pickNewIndex("home-theme", 5, Math.random, function () { return localStorage; }) // 3
 */
function pickNewIndex(key, count, rand, getStorage) {
  let last = -1;
  let next = Math.floor(rand() * count);
  try {
    const saved = getStorage().getItem(key);
    if (saved !== null) {
      last = Number(saved);
    }
  } catch (error) {
    last = -1;
  }
  if (next === last) {
    next = (next + 1) % count;
  }
  try {
    getStorage().setItem(key, String(next));
  } catch (error) {
    // 保存できなくても、今回の表示には困らないので何もしない
  }
  return next;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { pickNewIndex };
}
