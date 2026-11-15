/*
 * toolbox_beacon.js：紹介リンクのカードに、ASPの計測用の小さな画像（1×1。ビーコン）を置く
 * 主な関数：addBeaconImage（カードに計測用画像を1枚置き、読み込めなかったら取り除く）
 * 外部のスクリプトや <iframe> は使わず、<img> 1枚だけにする。URLは toolbox_validate.js の検査を通ったものだけを受け取る。
 * toolbox_view.js から使われる。見た目（カードの角に重ねる置き方）は css/toolbox.css の .tb-beacon。
 */

// 計測用画像の大きさ（px）。ASPのタグと同じ1×1にする
const BEACON_SIZE_PX = 1;

/**
 * カードに計測用画像を1枚置く。読み込みに失敗したら（オフライン・広告ブロック・URL間違いなど）画像を取り除き、
 * 壊れた画像の印が出ないようにする。カードの文字やボタンには影響しない。
 * @param {HTMLElement} card 画像を置くカード
 * @param {string} beaconUrl 検査を通った計測用画像のURL
 * @returns {HTMLImageElement} 置いた画像
 * @example addBeaconImage(card, "https://i.moshimo.com/af/i/impression?a_id=…")
 */
function addBeaconImage(card, beaconUrl) {
  const image = document.createElement("img");
  image.className = "tb-beacon";
  image.width = BEACON_SIZE_PX;
  image.height = BEACON_SIZE_PX;
  // alt を空にして、読み上げソフトに読ませない（飾りではなく計測のためだけの画像なので）
  image.alt = "";
  image.addEventListener("error", function () {
    removeBeaconImage(image);
  });
  // 失敗したときの処理を先に用意してから src を入れる（すぐ失敗した場合も取りこぼさないため）
  image.src = beaconUrl;
  card.appendChild(image);
  return image;
}

/**
 * 計測用画像を画面から取り除く。取り除けない古い環境では、隠すだけにする。
 * @param {HTMLImageElement} image 計測用画像
 * @returns {void}
 * @example removeBeaconImage(image)
 */
function removeBeaconImage(image) {
  image.hidden = true;
  if (typeof image.remove === "function") {
    image.remove();
  }
}

// Node.js（テスト）から require で使えるようにする（ブラウザでは何もしない）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { addBeaconImage, removeBeaconImage };
}
