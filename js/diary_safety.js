/*
 * diary_safety.js：日記の文に、公開してはいけない書き方が入っていないかを調べる。画面には触れない
 * 調べるもの：HTMLの記号・URL・メールアドレス・金額の書き方・部屋の数・投資を勧める言い回し・目に見えない書式の文字
 * 主な関数：findUnsafeWritings（文1つを調べ、当てはまった決まりの名前を返す）
 * diary_validate.js から使われる。tests/diary_safety.test.js でテストする。
 * 機械で止めるのは「書き方」だけ。中身として出してよいかは、公開の前に人の目でも確かめる。
 */

// 数字として扱う文字：半角・全角の数字と漢数字（一〜九・十・百・千）。
// 「〇」と「数」は、金額を伏せるときの記号（例「〇万円」「数万円」）なので、金額の決まりでは数字に入れない
const NUMBER_CHARACTERS = "0-9０-９一二三四五六七八九十百千";

// 公開してはいけない書き方の一覧。name は理由として画面・コンソールに出す名前、pattern は見つけ方（正規表現＝文字のパターンで探す書き方）
const UNSAFE_WRITING_RULES = [
  // HTMLの記号。表示は文字として行うが、念のためデータの段階で止める
  { name: "HTMLの記号（< または >）", pattern: /[<>＜＞]/ },
  { name: "URL", pattern: /https?:\/\/|www\./i },
  { name: "メールアドレス", pattern: /[^\s@]+@[^\s@]+\.[^\s@]+/ },
  // 例：「3万」「100円」「二億」「5千円」「数十万円」（数十万の「十万」に当たる）。「〇万円」「数万円」は通る
  { name: "金額の書き方", pattern: new RegExp("[" + NUMBER_CHARACTERS + "]\\s*[円万億]") },
  // 部屋の数は伏せ字（〇・数）でも書かない決まりなので、ここでは「〇」「数」も数字として扱う
  { name: "部屋の数", pattern: new RegExp("[" + NUMBER_CHARACTERS + "〇数]\\s*(室|部屋)") },
  { name: "投資を勧める言い回し", pattern: /おすすめ|オススメ|お勧め|儲かる|買うべき|売るべき|必ず上がる/ },
  // 目に見えない書式の文字（Unicode の分類 Cf：ゼロ幅スペース・単語結合子・ソフトハイフンなど）。
  // 言葉の途中に挟むと、見た目は同じまま上の決まりや機密の言葉の照合をすり抜けうるので、日記と図では使わない
  { name: "目に見えない書式の文字（ゼロ幅スペースなど）", pattern: /\p{Cf}/u }
];

/**
 * 文1つを調べ、公開してはいけない書き方に当たった決まりの名前を返す。
 * 当たった文字そのものは返さない（コンソールなどに機密になりうる文字を出さないため）。
 * @param {string} text 調べる文
 * @returns {string[]} 当たった決まりの名前の一覧。問題がなければ空の配列
 * @example findUnsafeWritings("フォロワー129人になりました") // []
 * @example findUnsafeWritings("家賃が3万上がった")            // ["金額の書き方"]
 */
function findUnsafeWritings(text) {
  if (typeof text !== "string") {
    return [];
  }
  return UNSAFE_WRITING_RULES
    .filter(function (rule) {
      return rule.pattern.test(text);
    })
    .map(function (rule) {
      return rule.name;
    });
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findUnsafeWritings };
}
