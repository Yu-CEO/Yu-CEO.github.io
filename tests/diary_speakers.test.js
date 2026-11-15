/*
 * diary_speakers.test.js：js/diary_speakers.js（話者の決まった表と顔のアイコン）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { installFakeDocument } = require("./helpers/fake_dom.js");
const { DIARY_SPEAKERS, isKnownSpeaker, getSpeakerInfo, createSpeakerFace } = require("../js/diary_speakers.js");

const NINE_SPEAKERS = ["秘書", "アオイ", "CMO", "プロデューサー", "ブランドディレクター", "CFO", "CTO", "CISO", "Yu"];
const SVG_TEXT = fs.readFileSync(path.join(__dirname, "..", "assets", "speakers.svg"), "utf8");

test("AC-32：9人すべてに、絵の名前・色のクラス・役の説明があり、speakers.svg に絵がある", function () {
  assert.deepStrictEqual(Object.keys(DIARY_SPEAKERS), NINE_SPEAKERS);
  NINE_SPEAKERS.forEach(function (name) {
    const info = getSpeakerInfo(name);
    assert.ok(info.key && info.className && info.role, name + " の表が足りません");
    assert.ok(SVG_TEXT.includes('<symbol id="' + info.key + '"'), name + " の絵が speakers.svg にありません");
  });
});

test("AC-32：speakers.svg は外部の画像を読み込まない", function () {
  // 決まった名前空間の文字（http://www.w3.org/2000/svg）以外に、http の場所が書かれていないこと
  const withoutNamespace = SVG_TEXT.replace('xmlns="http://www.w3.org/2000/svg"', "");
  assert.ok(!/https?:|<image|xlink:href|url\(/.test(withoutNamespace));
});

test("AC-32：顔のアイコンは speakers.svg の決まった絵を使い、読み上げでは読まない", function () {
  installFakeDocument({});
  const face = createSpeakerFace("アオイ", "avatar-small", "../assets/speakers.svg");
  assert.match(face.className, /avatar sp-aoi avatar-small/);
  assert.strictEqual(face.getAttribute("aria-hidden"), "true");
  const use = face.children[0].children[0];
  assert.strictEqual(use.getAttribute("href"), "../assets/speakers.svg#aoi");
});

test("AC-12・AC-35：表にない名前は話者として認めず、絵も出さない", function () {
  installFakeDocument({});
  assert.strictEqual(isKnownSpeaker("部長"), false);
  assert.strictEqual(isKnownSpeaker("toString"), false);
  assert.strictEqual(getSpeakerInfo("部長"), null);
  assert.strictEqual(createSpeakerFace("../evil", "", "assets/speakers.svg"), null);
});
