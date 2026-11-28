/*
 * officer.test.js：AI役員の発言（js/officer_data.js・officer_view.js）と「会社づくりN日目」（js/company_days.js）のテスト
 * 発言は、公開している日記（diary/entries/）の本人のせりふと一致することを確かめる（作った言葉を載せないため）。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createFakeElement, installFakeDocument } = require("./helpers/fake_dom.js");
const { OFFICER_QUOTES } = require("../js/officer_data.js");
const { buildOfficerTexts, showOfficers } = require("../js/officer_view.js");
const { showCompanyDays } = require("../js/company_days.js");

const PORTAL_FOLDER = path.join(__dirname, "..");

test("役員8人の発言は、出典の日の日記にある本人のせりふと一致し、顔の絵がある", function () {
  assert.strictEqual(OFFICER_QUOTES.length, 8);
  OFFICER_QUOTES.forEach(function (quote) {
    const file = path.join(PORTAL_FOLDER, "diary", "entries", quote.date + ".json");
    const entry = JSON.parse(fs.readFileSync(file, "utf8"));
    // 続けて話したせりふはつなげ、強調の記号は外して比べる
    const said = entry.lines
      .filter(function (line) { return line.speaker === quote.name; })
      .map(function (line) { return line.text; })
      .join("")
      .replace(/\*\*|==/g, "");
    assert.ok(said.includes(quote.text.replace(/…$/, "")), quote.name + "（" + quote.date + "）の発言が日記と違います");
    assert.ok(fs.existsSync(path.join(PORTAL_FOLDER, "assets", "faces", quote.face + ".webp")), quote.face);
  });
});

test("出す文字は、名前と役・かぎかっこの発言・N日目と日付のリンク", function () {
  const texts = buildOfficerTexts({ name: "CFO", role: "お金の管理", text: "あ", date: "2026-11-20" });
  assert.deepStrictEqual(texts, {
    who: "CFO｜お金の管理", text: "「あ」",
    linkText: "7日目（2026.11.20）の会議を読む ›", href: "diary/entry.html?date=2026-11-20"
  });
});

test("顔のボタンが8つ並び、押されている印は出している1人だけ", function () {
  const parts = {
    "officer-faces": createFakeElement("div"), "officer-name": createFakeElement("span"),
    "officer-line": createFakeElement("blockquote"), "officer-link": createFakeElement("a")
  };
  installFakeDocument(parts);
  assert.strictEqual(showOfficers(OFFICER_QUOTES, 2), true);
  const buttons = parts["officer-faces"].children;
  assert.strictEqual(buttons.length, 8);
  assert.deepStrictEqual(buttons.map(function (button) { return button.getAttribute("aria-pressed"); }).indexOf("true"), 2);
  assert.match(parts["officer-name"].textContent, /^CMO｜/);
});

test("「会社づくりN日目」は 2026-11-14 を1日目として数える", function () {
  const label = createFakeElement("b");
  label.hidden = true;
  installFakeDocument({ "company-days": label });
  assert.strictEqual(showCompanyDays(new Date(2026, 10, 28, 12, 0)), true);
  assert.strictEqual(label.textContent, "会社づくり15日目");
  assert.strictEqual(label.hidden, false);
});
