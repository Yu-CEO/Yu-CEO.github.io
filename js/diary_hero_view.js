/*
 * diary_hero_view.js：3版目の日記の「入口画像」（diary/heroes/YYYY-MM-DD.jpg・1280×720）を表示する部品を作る
 * 場所はデータの文字からは決めず、検査を通った日付（date）と決まった文字（.jpg）から「heroes/<日付>.jpg」と組み立てる（別のファイルを読ませないため）。
 * 使う場所は3つ：日記1件のページの一番上（alt あり・すぐ読み込む）／入口の「最新の日記」カード・日記一覧のカード（飾り扱いで alt なし。一覧は lazy）。
 * 読み込めないときは画像だけを隠す（文字はそのまま読める）。hero のない日は何も作らない。
 * 主な関数：createDiaryHero（画像を作る）。diary_story3_view.js・diary_latest_panel.js・diary_list_view.js から使われる。tests/diary_hero.test.js でテストする。
 */

// Node.js（テスト）では、ほかのファイルの関数を require で読み込んで、ブラウザと同じ名前で使えるようにする
if (typeof module !== "undefined" && module.exports) {
  globalThis.isDiaryDate = require("./diary_day.js").isDiaryDate;
  globalThis.makeDiaryElement = require("./diary_parts.js").makeDiaryElement;
}

// 画像のファイル名の後ろにつける文字（決まった文字だけ。データからは決めない）
const DIARY_HERO_SUFFIX = ".jpg";
// 画像の縦横（px）。16:9。読み込む前に場所を取って、表示のずれを防ぐ
const DIARY_HERO_WIDTH = 1280;
const DIARY_HERO_HEIGHT = 720;
// 使う場所ごとの決まり：class（見た目）・alt を入れるか（カードは見出しが下にあるので飾り扱い）・lazy にするか
// ページの先頭は最初に見える場所なので lazy にしない。入口のカードも同じ理由で lazy にしない。一覧は長いので lazy
const DIARY_HERO_MODES = {
  page: { className: "d-hero", useAlt: true, lazy: false },
  latest: { className: "d-card-hero", useAlt: false, lazy: false },
  list: { className: "d-card-hero", useAlt: false, lazy: true }
};

/**
 * 入口画像の <img> を作る。hero がない・日付の形が違う・使う場所の名前が違うときは null を返し、何も読みに行かない。
 * @param {{ date: string, hero: { alt: string } }} entry 検査を通った日記
 * @param {string} heroFolder diary/heroes/ の場所（1件のページからは "heroes/"）
 * @param {string} mode 使う場所："page"（1件のページ）・"latest"（入口のカード）・"list"（一覧のカード）
 * @returns {HTMLImageElement|null} 画像の要素。出さないときは null
 * @example createDiaryHero(entry, "heroes/", "page") // <img src="heroes/2026-11-21.jpg" alt="…">
 */
function createDiaryHero(entry, heroFolder, mode) {
  const rule = DIARY_HERO_MODES[mode];
  if (rule === undefined || entry.hero === undefined || !isDiaryDate(entry.date)) {
    return null;
  }
  const image = makeDiaryElement("img", rule.className, "");
  image.alt = "";
  if (rule.useAlt) {
    image.alt = entry.hero.alt;
  }
  image.width = DIARY_HERO_WIDTH;
  image.height = DIARY_HERO_HEIGHT;
  image.decoding = "async";
  if (rule.lazy) {
    image.loading = "lazy";
  }
  // 読み込めないときは、画像だけを隠す（壊れた画像の印を見せないため）
  image.addEventListener("error", function () {
    image.hidden = true;
  });
  image.src = heroFolder + entry.date + DIARY_HERO_SUFFIX;
  return image;
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { createDiaryHero };
}
