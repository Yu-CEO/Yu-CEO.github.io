/*
 * contact_main.js：問い合わせページ（contact.html）の流れだけを書くファイル
 * 設定ファイルのフォームのURLを contact_link.js で判定し、正しければボタンにリンクを入れて表示する。正しくなければボタンを隠し、
 * 説明の文（id=contact-form-missing）を出して、コンソールに直し方を出す。
 * contact.html の <script> の最後（計測の前）に読み込まれる。設定は site_config.js。
 */

/**
 * フォームへのボタンを、設定に合わせて出す・隠す。
 * @param {Document} documentObject 画面（document）
 * @param {object} config SITE_CONFIG
 * @param {Console} consoleObject コンソール（警告を出す先）
 * @returns {void}
 * @example showContactButton(document, SITE_CONFIG, console)
 */
function showContactButton(documentObject, config, consoleObject) {
  const button = documentObject.getElementById("contact-form-button");
  const missingNotice = documentObject.getElementById("contact-form-missing");
  if (button === null) {
    consoleObject.warn("id「contact-form-button」のボタンが contact.html に見つかりません。id の書き間違いがないか確かめてください。");
    return;
  }
  const link = buildContactLink(config.CONTACT_FORM_URL);
  if (link.show) {
    button.href = link.href;
    button.target = link.target;
    button.rel = link.rel;
    button.hidden = false;
    return;
  }
  button.removeAttribute("href");
  button.hidden = true;
  if (missingNotice !== null) {
    missingNotice.hidden = false;
  }
  consoleObject.warn(link.warning);
}

if (typeof document !== "undefined" && typeof SITE_CONFIG !== "undefined" && typeof buildContactLink === "function") {
  showContactButton(document, SITE_CONFIG, console);
}
