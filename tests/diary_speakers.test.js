/*
 * diary_speakers.test.js：js/diary_speakers.js（話者の決まった表と顔のアイコン）の自動テスト
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { installFakeDocument } = require("./helpers/fake_dom.js");
const { DIARY_SPEAKERS, isKnownSpeaker, getSpeakerInfo, createSpeakerFace, getSolidFacePath } = require("../js/diary_speakers.js");

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

test("AC-32：顔のアイコンは faces/ の立体の絵を使い、読み上げでは読まない", function () {
  installFakeDocument({});
  const face = createSpeakerFace("アオイ", "avatar-small", "../assets/speakers.svg");
  assert.match(face.className, /avatar sp-aoi avatar-small/);
  assert.strictEqual(face.getAttribute("aria-hidden"), "true");
  const image = face.children[0];
  assert.strictEqual(image.getAttribute("src"), "../assets/faces/aoi.webp");
  assert.strictEqual(image.getAttribute("alt"), "");
  assert.strictEqual(image.getAttribute("loading"), "lazy");
  assert.strictEqual(image.getAttribute("width"), "192");
});

test("AC-12・AC-35：表にない名前は話者として認めず、絵も出さない", function () {
  installFakeDocument({});
  assert.strictEqual(isKnownSpeaker("部長"), false);
  assert.strictEqual(isKnownSpeaker("toString"), false);
  assert.strictEqual(getSpeakerInfo("部長"), null);
  assert.strictEqual(createSpeakerFace("../evil", "", "assets/speakers.svg"), null);
});

test("立体の顔：Yu は線画のまま、8人は webp。絵の名前は表の key だけで、日記のデータは入らない", function () {
  installFakeDocument({});
  const yu = createSpeakerFace("Yu", "", "assets/speakers.svg");
  assert.strictEqual(yu.children[0].children[0].getAttribute("href"), "assets/speakers.svg#yu");
  Object.keys(DIARY_SPEAKERS).forEach(function (name) {
    const info = DIARY_SPEAKERS[name];
    assert.strictEqual(info.solid, name !== "Yu");
    assert.match(info.key, /^[a-z]+$/);
  });
  assert.strictEqual(getSolidFacePath("assets/speakers.svg", "cfo"), "assets/faces/cfo.webp");
  assert.strictEqual(createSpeakerFace("../../x", "", "assets/speakers.svg"), null);
});

test("立体の顔：8枚とも存在し30KB以下で、EXIF・XMP などの埋め込み情報がない", function () {
  Object.keys(DIARY_SPEAKERS).forEach(function (name) {
    const info = DIARY_SPEAKERS[name];
    if (!info.solid) {
      return;
    }
    const bytes = fs.readFileSync(path.join(__dirname, "..", "assets", "faces", info.key + ".webp"));
    assert.ok(bytes.length <= 30 * 1024, info.key + " が大きすぎます");
    assert.strictEqual(bytes.toString("latin1", 0, 4), "RIFF");
    assert.ok(!/EXIF|XMP |ICCP/.test(bytes.toString("latin1")), info.key + " に埋め込み情報があります");
  });
});

test("立体の顔：読み込み失敗のときは絵だけ隠す（丸の色は残る）", function () {
  const document = installFakeDocument({});
  const originalCreate = document.createElement;
  let handler = null;
  let createdImage = null;
  // 画像に登録された error の処理を取り出すため、作った img の addEventListener を差し替える
  document.createElement = function (tagName) {
    const element = originalCreate(tagName);
    if (tagName === "img") {
      createdImage = element;
      element.style = {};
      element.addEventListener = function (type, listener) {
        if (type === "error") {
          handler = listener;
        }
      };
    }
    return element;
  };
  const face = createSpeakerFace("CFO", "", "assets/speakers.svg");
  assert.strictEqual(typeof handler, "function");
  handler();
  assert.strictEqual(createdImage.style.display, "none");
  assert.match(face.className, /sp-cfo/);
});
