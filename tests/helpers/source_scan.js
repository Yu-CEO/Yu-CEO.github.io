/*
 * source_scan.js：テスト用の道具。JSのコメントを消す・文字の中の外部のホストを行の番号つきで探す
 * 主な関数：removeJsComments（コメントを空白に置き換える）、findHostsWithLines（http://・https://・//ホスト を探す）
 * 文字列（"…"・'…'・`…`）と正規表現（/…/）の中身はコメントと取り違えないよう、そのまま残して読み飛ばす。
 * 限界：テンプレート文字列の中の ${ … } の入れ子は区別しない（このサイトのJSでは使っていない）。
 *   取り違えたときに気づけるよう、tests/external_hosts.test.js が「js/ の全ファイルでコメントが残っていない」ことを確かめる。
 * tests/external_hosts.test.js から使われる（このファイル自体はテストではない）。
 */

// 文字の中の http://・https://・//ホスト を見つける形（ホストは「名前.英字2文字以上」）
const URL_HOST_PATTERN = /(?:https?:)?\/\/([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
// この文字のすぐあとの / は「割り算」ではなく「正規表現の始まり」と見なす（JSの文法の決まり）
const REGEX_ALLOWED_AFTER = "(,=:[!&|?{};+-*%<>~^";
// この言葉のすぐあとの / も正規表現の始まり（例 return /a/.test(x)）
const REGEX_ALLOWED_AFTER_WORDS = ["return", "typeof", "case", "in", "of", "new", "delete", "void", "throw"];

/**
 * 文字列を、閉じる引用符まで読み飛ばす。\ のあとの1文字は引用符でも閉じない（\" は文字列の中の " のため）。
 * @param {string} code JSの中身
 * @param {number} start 開く引用符の位置
 * @returns {number} 閉じる引用符の次の位置
 * @example skipString('"a\\"b" x', 0) // 6
 */
function skipString(code, start) {
  const quote = code[start];
  let index = start + 1;
  while (index < code.length && code[index] !== quote) {
    // \ のあとの文字は特別な意味を持たないので、2文字まとめて進む
    index += code[index] === "\\" ? 2 : 1;
  }
  return Math.min(index + 1, code.length);
}

/**
 * 正規表現（/…/flags）を最後まで読み飛ばす。[ ] の中の / と \ のあとの文字は終わりにしない。
 * @param {string} code JSの中身
 * @param {number} start 始まりの / の位置
 * @returns {number} 正規表現（flags を含む）の次の位置
 * @example skipRegex("/[/]a/g;", 0) // 7
 */
function skipRegex(code, start) {
  let index = start + 1;
  let inClass = false;
  while (index < code.length && code[index] !== "\n") {
    const char = code[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    if (char === "[") {
      inClass = true;
    } else if (char === "]") {
      inClass = false;
    } else if (char === "/" && !inClass) {
      break;
    }
    index += 1;
  }
  index += 1;
  // 後ろの flags（g・i など）も正規表現の一部
  while (index < code.length && /[a-z]/i.test(code[index])) {
    index += 1;
  }
  return index;
}

/**
 * その位置の / が正規表現の始まりかを、直前の文字（空白は飛ばす）で決める。
 * @param {string} code JSの中身
 * @param {number} index / の位置
 * @returns {boolean} 正規表現の始まりなら true
 * @example startsRegex("x = /a/", 4) // true
 */
function startsRegex(code, index) {
  const before = code.slice(0, index).trimEnd();
  if (before === "") {
    return true;
  }
  if (REGEX_ALLOWED_AFTER.includes(before[before.length - 1])) {
    return true;
  }
  const lastWord = (before.match(/[A-Za-z_$]+$/) || [""])[0];
  return REGEX_ALLOWED_AFTER_WORDS.includes(lastWord);
}

/**
 * コメントの終わりの位置を返す（/* … *\/ は *\/ の次、// … は行の終わり）。
 * @param {string} code JSの中身
 * @param {number} start コメントの始まりの位置
 * @returns {number} コメントの次の位置
 * @example findCommentEnd("// a\nb", 0) // 4
 */
function findCommentEnd(code, start) {
  const isBlock = code[start + 1] === "*";
  const end = code.indexOf(isBlock ? "*/" : "\n", start + 2);
  if (end === -1) {
    return code.length;
  }
  return isBlock ? end + 2 : end;
}

/**
 * JSのコメント（/* … *\/ と // …）を空白へ置き換える。文字列・正規表現の中はそのまま残す。
 * 改行は残すので、行の番号は元のファイルと同じになる（失敗の表示で「何行目」を正しく出すため）。
 * @param {string} code JSの中身
 * @returns {string} コメントを消した中身
 * @example removeJsComments('a = "http://x"; // b') // 'a = "http://x";     '
 */
function removeJsComments(code) {
  let result = "";
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];
    let stop = index + 1;
    if (char === "/" && (next === "*" || next === "/")) {
      stop = findCommentEnd(code, index);
      result += code.slice(index, stop).replace(/[^\n]/g, " ");
      index = stop;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      stop = skipString(code, index);
    } else if (char === "/" && startsRegex(code, index)) {
      stop = skipRegex(code, index);
    }
    result += code.slice(index, stop);
    index = stop;
  }
  return result;
}

/**
 * 文字の中の外部のホストを、行の番号つきで探す。
 * @param {string} text 調べる中身
 * @returns {{ host: string, line: number }[]} 見つかったホストと行（1から数える）
 * @example findHostsWithLines('a\n"https://x.com/"') // [{ host: "x.com", line: 2 }]
 */
function findHostsWithLines(text) {
  const found = [];
  text.split("\n").forEach(function (lineText, lineIndex) {
    for (const match of lineText.matchAll(URL_HOST_PATTERN)) {
      found.push({ host: match[1].toLowerCase(), line: lineIndex + 1 });
    }
  });
  return found;
}

module.exports = { removeJsComments, findHostsWithLines };
