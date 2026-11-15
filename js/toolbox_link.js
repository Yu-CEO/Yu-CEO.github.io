/*
 * toolbox_link.js：道具1件のリンクの種類から、「リンクを出すか・URL・rel・PRの印・計測用画像・ボタンの文言」を決める（画面には触れない）
 * 主な関数：planToolboxLink（道具1件 → 出し方の決まり）
 * 紹介リンク（affiliate）は rel="sponsored noopener"＋PRの印＋計測用画像、公式リンク（official）は rel="noopener" だけ、
 * リンクなし（none）はボタンを出さない。
 * toolbox_view.js から使われる。tests/toolbox_link.test.js でテストする。
 */

// リンクの rel（リンク先との関係を表す印）。sponsored は「広告のリンク」の印、noopener は開いた先のページから元のページを操作させない印
const TOOLBOX_REL_AFFILIATE = "sponsored noopener";
const TOOLBOX_REL_OFFICIAL = "noopener";
// 外部のサイトは新しいタブで開く（入口ページを閉じずに戻ってこられるように）
const TOOLBOX_LINK_TARGET = "_blank";
// label がないときのボタンの文言
const TOOLBOX_DEFAULT_LABELS = { official: "公式サイト", affiliate: "詳しく見る" };
// 読み上げソフト向けに、ボタンの文言のあとにつける説明
const TOOLBOX_ARIA_SUFFIX_AFFILIATE = "（広告・新しいタブで開きます）";
const TOOLBOX_ARIA_SUFFIX_OFFICIAL = "（新しいタブで開きます）";

/**
 * 検査を通った道具1件から、リンクの出し方を決める。
 * @param {object} item 検査を通った道具1件（toolbox_validate.js の validItems の1つ）
 * @returns {{ showLink: boolean, url: string, target: string, rel: string, showPr: boolean,
 *             beaconUrl: string, label: string, ariaLabel: string }}
 *          showLink：ボタンを出すなら true／showPr：「PR」の印を出すなら true／beaconUrl：置く計測用画像のURL（置かないなら ""）
 * @example planToolboxLink({ name: "VS Code", linkType: "official", url: "https://code.visualstudio.com/" })
 *          // { showLink: true, rel: "noopener", showPr: false, beaconUrl: "", label: "公式サイト", ... }
 * @example planToolboxLink({ name: "A", linkType: "none" }) // { showLink: false, showPr: false, beaconUrl: "", ... }
 */
function planToolboxLink(item) {
  const plan = { showLink: false, url: "", target: "", rel: "", showPr: false, beaconUrl: "", label: "", ariaLabel: "" };
  if (item.linkType !== "affiliate" && item.linkType !== "official") {
    return plan;
  }
  const isAffiliate = item.linkType === "affiliate";
  plan.showLink = true;
  plan.url = item.url;
  plan.target = TOOLBOX_LINK_TARGET;
  plan.label = chooseToolboxLabel(item);
  if (isAffiliate) {
    plan.rel = TOOLBOX_REL_AFFILIATE;
    plan.showPr = true;
    // 計測用画像のURLは、検査で正しくないものが取り除かれたあとの値だけを使う
    if (typeof item.beaconUrl === "string") {
      plan.beaconUrl = item.beaconUrl;
    }
    plan.ariaLabel = plan.label + "：" + item.name + TOOLBOX_ARIA_SUFFIX_AFFILIATE;
  } else {
    plan.rel = TOOLBOX_REL_OFFICIAL;
    plan.ariaLabel = plan.label + "：" + item.name + TOOLBOX_ARIA_SUFFIX_OFFICIAL;
  }
  return plan;
}

/**
 * ボタンの文言を決める。label があればそれ、なければリンクの種類ごとの決まった文言。
 * @param {object} item 道具1件
 * @returns {string} ボタンの文言
 * @example chooseToolboxLabel({ linkType: "official" })                  // "公式サイト"
 * @example chooseToolboxLabel({ linkType: "affiliate", label: "本を見る" }) // "本を見る"
 */
function chooseToolboxLabel(item) {
  if (typeof item.label === "string" && item.label.trim() !== "") {
    return item.label;
  }
  return TOOLBOX_DEFAULT_LABELS[item.linkType];
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { planToolboxLink, chooseToolboxLabel };
}
