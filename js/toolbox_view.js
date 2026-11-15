/*
 * toolbox_view.js：検査を通った道具を、ジャンルごとのカードにして「Yuの道具箱」パネルに並べる
 * 主な関数：showToolbox（検査→問題の報告→カードの表示→PR表示・注意書きの出し分け→0件ならパネルごと隠す、までの流れ）、
 *           groupToolboxByGenre（ジャンルの順に分ける）、buildToolboxDisclaimer（注意書きの文を作る）※この2つは画面に触れない
 * PR表示と注意書きの後半（広告・計測の文）は、表示中の道具から自動で決める（手で切り替える設定は作らない）。
 * main.js から使われる。検査は toolbox_validate.js、リンクの出し方は toolbox_link.js、計測用画像は toolbox_beacon.js。
 * tests/toolbox_view.test.js でテストする。
 */

// ジャンルの表示の順番と見出しの文言（お金・NISA → AI・開発の道具 → ふだん使い）
const TOOLBOX_GENRE_ORDER = [
  { genre: "money", label: "お金・NISA" },
  { genre: "ai", label: "AI・開発の道具" },
  { genre: "life", label: "ふだん使い" }
];
// 注意書きの前半（いつも出す）
const TOOLBOX_DISCLAIMER_BASE = "ここで紹介しているのは、Yuが実際に使っている（使ったことがある）物です。証券口座の紹介は個人の利用体験で、特定の金融商品や売買をすすめるものではありません。口座の開設や投資の判断はご自身で行い、最新の条件は各社の公式サイトでご確認ください。";
// 注意書きの後半1文目（紹介リンクが1件以上あるときだけ出す。広告がないのに広告と書かないため）
const TOOLBOX_DISCLAIMER_AD = "リンクの一部はアフィリエイト広告（PR）で、リンクから申し込みや購入があると運営者に報酬が入ることがあります。";
// 注意書きの後半2文目（計測用画像を1枚以上置くときだけ出す）。{ASP名} の部分に、実際に置いているASPの名前が入る
const TOOLBOX_DISCLAIMER_BEACON_BEFORE = "広告の表示回数を数えるため、このページを開くと、アフィリエイトサービス（";
const TOOLBOX_DISCLAIMER_BEACON_AFTER = "）の計測用の画像を読み込み、その会社と通信します（計測のためにCookieなどが使われることがあります）。";
// 複数のASPの名前をつなぐ記号（例：「A8.net・もしもアフィリエイト」）
const TOOLBOX_ASP_NAME_JOINER = "・";
// index.html に書いた部品の id
const TOOLBOX_IDS = { panel: "toolbox", pr: "toolbox-pr", genres: "toolbox-genres", disclaimer: "toolbox-disclaimer" };

/**
 * 道具を、決まったジャンルの順に分ける。同じジャンルの中はデータに書いた順。道具がないジャンルは入れない。
 * @param {object[]} items 検査を通った道具の一覧
 * @returns {{ genre: string, label: string, items: object[] }[]} ジャンルごとのまとまり
 * @example groupToolboxByGenre([{ genre: "life", name: "A" }, { genre: "money", name: "B" }])
 *          // [{ genre: "money", label: "お金・NISA", items: [B] }, { genre: "life", label: "ふだん使い", items: [A] }]
 */
function groupToolboxByGenre(items) {
  const groups = [];
  TOOLBOX_GENRE_ORDER.forEach(function (genreInfo) {
    const itemsInGenre = items.filter(function (item) {
      return item.genre === genreInfo.genre;
    });
    if (itemsInGenre.length > 0) {
      groups.push({ genre: genreInfo.genre, label: genreInfo.label, items: itemsInGenre });
    }
  });
  return groups;
}

/**
 * 計測用画像を置く道具の、ASPの表示名を重ならないように集める（ASP_LIST に書いた順）。
 * @param {object[]} items 検査を通った道具の一覧
 * @param {object[]} validAsps 検査を通ったASPの一覧
 * @returns {string[]} ASPの表示名の一覧
 * @example collectBeaconAspNames([{ linkType: "affiliate", asp: "moshimo", url: "https://af.moshimo.com/x", beaconUrl: "https://i.moshimo.com/y" }], ASP_LIST)
 *          // ["もしもアフィリエイト"]
 */
function collectBeaconAspNames(items, validAsps) {
  const names = [];
  validAsps.forEach(function (asp) {
    const hasBeacon = items.some(function (item) {
      return item.asp === asp.id && planToolboxLink(item).beaconUrl !== "";
    });
    if (hasBeacon) {
      names.push(asp.name);
    }
  });
  return names;
}

/**
 * 道具箱の注意書きの文を作る。後半の2文は、紹介リンク・計測用画像があるときだけつける（事実と違う説明を出さないため）。
 * @param {number} affiliateCount 表示している紹介リンクの数
 * @param {string[]} beaconAspNames 計測用画像を置いているASPの表示名
 * @returns {string} 注意書きの文
 * @example buildToolboxDisclaimer(0, [])                       // 前半だけ
 * @example buildToolboxDisclaimer(1, ["もしもアフィリエイト"]) // 前半＋広告の文＋「…アフィリエイトサービス（もしもアフィリエイト）の計測用の画像…」
 */
function buildToolboxDisclaimer(affiliateCount, beaconAspNames) {
  let text = TOOLBOX_DISCLAIMER_BASE;
  if (affiliateCount > 0) {
    text += TOOLBOX_DISCLAIMER_AD;
  }
  if (beaconAspNames.length > 0) {
    text += TOOLBOX_DISCLAIMER_BEACON_BEFORE + beaconAspNames.join(TOOLBOX_ASP_NAME_JOINER) + TOOLBOX_DISCLAIMER_BEACON_AFTER;
  }
  return text;
}

/**
 * 決まったタグ・クラス・文字で、画面の部品を1つ作る。文字は textContent で入れる（データの文字をHTMLとして読ませないため）。
 * @param {string} tagName タグの名前
 * @param {string} className クラス名
 * @param {string} text 中に入れる文字
 * @returns {HTMLElement} 作った部品
 * @example createToolboxElement("p", "tb-note", "使っています")
 */
function createToolboxElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

/**
 * カードの下の行（左に「PR」の印、右にボタン）を作る。
 * @param {object} plan planToolboxLink が返したリンクの出し方
 * @returns {HTMLElement} 下の行
 * @example createToolboxCardFoot(planToolboxLink(item))
 */
function createToolboxCardFoot(plan) {
  const foot = createToolboxElement("div", "tb-foot", "");
  if (plan.showPr) {
    const prBadge = createToolboxElement("span", "tb-pr", "PR");
    prBadge.setAttribute("aria-label", "広告（PR）");
    foot.appendChild(prBadge);
  }
  const button = createToolboxElement("a", "tb-btn", plan.label);
  button.href = plan.url;
  button.target = plan.target;
  button.rel = plan.rel;
  button.setAttribute("aria-label", plan.ariaLabel);
  foot.appendChild(button);
  return foot;
}

/**
 * 道具1件のカード（名前・Yuの一言・リンクがあれば下の行・計測用画像）を作る。
 * リンクなしの道具は下の行を作らない（ボタンの場所を空けないため）。
 * @param {object} item 検査を通った道具1件
 * @returns {HTMLElement} カード（<li>）
 * @example createToolboxCard({ genre: "ai", name: "VS Code", note: "…", linkType: "official", url: "https://code.visualstudio.com/" })
 */
function createToolboxCard(item) {
  const plan = planToolboxLink(item);
  const card = createToolboxElement("li", "tb-card", "");
  card.appendChild(createToolboxElement("h4", "tb-name", item.name));
  card.appendChild(createToolboxElement("p", "tb-note", item.note));
  if (plan.showLink) {
    card.appendChild(createToolboxCardFoot(plan));
  }
  if (plan.beaconUrl !== "") {
    addBeaconImage(card, plan.beaconUrl);
  }
  return card;
}

/**
 * 正しくない道具・ASP・注意のある道具を、コンソールに日本語で出す。データを直す人のための表示。
 * @param {object} result validateToolbox が返した結果
 * @returns {void}
 * @example reportToolboxProblems(validateToolbox(TOOLBOX_DATA, ASP_LIST))
 */
function reportToolboxProblems(result) {
  result.aspProblemReports.forEach(function (report) {
    let where = report.position + "件目";
    if (report.position === 0) {
      where = "全体";
    }
    console.warn("ASPの一覧（js/site_config.js の ASP_LIST）の" + where + "が正しくないため、ないものとして扱いました：" + report.problems.join("／") + "。js/site_config.js の ASP_LIST を直してください。");
  });
  result.problemReports.forEach(function (report) {
    let where = report.position + "件目";
    if (report.position === 0) {
      where = "データ全体";
    }
    console.warn("道具箱のデータ（js/toolbox_data.js）の" + where + "が正しくないため、表示しませんでした：" + report.problems.join("／") + "。js/toolbox_data.js を直してください。");
  });
  result.noticeReports.forEach(function (report) {
    console.warn("道具箱のデータ（js/toolbox_data.js）の" + report.position + "件目：" + report.notice + "。");
  });
}

/**
 * 道具箱のデータを検査し、ジャンルごとのカードを並べ、PR表示と注意書きを出し分ける。表示できる道具が0件ならパネルごと隠す。
 * @param {*} items 道具の一覧（toolbox_data.js の TOOLBOX_DATA）
 * @param {*} aspList ASPの一覧（site_config.js の ASP_LIST）
 * @returns {number} 表示した道具の数（パネルが見つからないときは 0）
 * @example showToolbox(TOOLBOX_DATA, ASP_LIST) // 7
 */
function showToolbox(items, aspList) {
  const panel = document.getElementById(TOOLBOX_IDS.panel);
  const genresArea = document.getElementById(TOOLBOX_IDS.genres);
  if (panel === null || genresArea === null) {
    console.warn("道具箱のパネル（id「" + TOOLBOX_IDS.panel + "」「" + TOOLBOX_IDS.genres + "」）が index.html に見つかりません。id の書き間違いがないか確かめてください。");
    return 0;
  }
  const result = validateToolbox(items, aspList);
  reportToolboxProblems(result);

  genresArea.textContent = "";
  groupToolboxByGenre(result.validItems).forEach(function (group) {
    const section = createToolboxElement("section", "tb-genre", "");
    section.appendChild(createToolboxElement("h3", "tb-genre-title", group.label));
    const list = createToolboxElement("ul", "tb-list", "");
    group.items.forEach(function (item) {
      list.appendChild(createToolboxCard(item));
    });
    section.appendChild(list);
    genresArea.appendChild(section);
  });

  const affiliateCount = result.validItems.filter(function (item) {
    return item.linkType === "affiliate";
  }).length;
  showToolboxNotices(affiliateCount, collectBeaconAspNames(result.validItems, result.validAsps));
  panel.hidden = result.validItems.length === 0;
  return result.validItems.length;
}

/**
 * PR表示（紹介リンクが1件以上のときだけ）と、注意書きの文を画面に入れる。
 * @param {number} affiliateCount 表示している紹介リンクの数
 * @param {string[]} beaconAspNames 計測用画像を置いているASPの表示名
 * @returns {void}
 * @example showToolboxNotices(1, ["もしもアフィリエイト"])
 */
function showToolboxNotices(affiliateCount, beaconAspNames) {
  const prNotice = document.getElementById(TOOLBOX_IDS.pr);
  if (prNotice !== null) {
    prNotice.hidden = affiliateCount === 0;
  }
  const disclaimer = document.getElementById(TOOLBOX_IDS.disclaimer);
  if (disclaimer !== null) {
    disclaimer.textContent = buildToolboxDisclaimer(affiliateCount, beaconAspNames);
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    groupToolboxByGenre, collectBeaconAspNames, buildToolboxDisclaimer, createToolboxCard,
    reportToolboxProblems, showToolbox
  };
}
