/*
 * avatar_image.test.js：公開する画像（assets/yu.jpg・assets/tool_simulator.jpg）の確認
 * ファイルの大きさ・縦横のピクセル数・写真の埋め込み情報（EXIF＝撮影日時や機種などの情報、コメントなど）がないことを調べる。
 * 外部ライブラリは使わず、Node.js 標準の機能でJPEGファイルの中身を読む。
 * 実行方法：portal フォルダで `node --test`
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const PORTAL_FOLDER = path.join(__dirname, "..");
const AVATAR_PATH = path.join(PORTAL_FOLDER, "assets", "yu.jpg");
const SCREENSHOT_PATH = path.join(PORTAL_FOLDER, "assets", "tool_simulator.jpg");
// 仕様の「200KB程度以下・長辺1400px程度以下」（スマホの通信でも重くならない大きさ）
const MAX_AVATAR_BYTES = 200 * 1024;
const MAX_AVATAR_LONG_SIDE = 1400;
// JPEGの中の区切りの印（マーカー）の番号
const MARKER_APP0 = 0xE0;        // JFIF（画像の基本情報）。埋め込み情報ではないので、あってよい
const MARKER_APP_LAST = 0xEF;    // APP1〜APP15 に EXIF・XMP（編集ソフトの情報）などが入る
const MARKER_COMMENT = 0xFE;     // コメント
const MARKER_START_OF_SCAN = 0xDA; // ここから先は画像の本体
const SIZE_MARKERS = [0xC0, 0xC1, 0xC2]; // 縦横のピクセル数が書いてある印

/**
 * JPEGファイルの中の区切り（マーカー）を、画像の本体が始まるところまで順に読み出す。
 * @param {Buffer} bytes JPEGファイルの中身
 * @returns {{ marker: number, width?: number, height?: number }[]} 見つかった印の一覧
 */
function readJpegMarkers(bytes) {
  assert.strictEqual(bytes.readUInt16BE(0), 0xFFD8, "JPEGファイルになっていません");
  const markers = [];
  let offset = 2;
  while (offset < bytes.length && bytes[offset] === 0xFF) {
    const marker = bytes[offset + 1];
    const entry = { marker: marker };
    markers.push(entry);
    if (marker === MARKER_START_OF_SCAN) {
      break;
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (SIZE_MARKERS.includes(marker)) {
      entry.height = bytes.readUInt16BE(offset + 5);
      entry.width = bytes.readUInt16BE(offset + 7);
    }
    offset += 2 + length;
  }
  return markers;
}

/**
 * 埋め込み情報（APP1〜APP15・コメント）の印があるかを調べる。
 * @param {{ marker: number }[]} markers readJpegMarkers の結果
 * @returns {number[]} 見つかった埋め込み情報の印の番号
 */
function findEmbeddedInfoMarkers(markers) {
  return markers
    .map(function (entry) {
      return entry.marker;
    })
    .filter(function (marker) {
      const isAppMarker = marker > MARKER_APP0 && marker <= MARKER_APP_LAST;
      return isAppMarker || marker === MARKER_COMMENT;
    });
}

/**
 * 画像の縦横のピクセル数を返す。
 * @param {{ marker: number, width?: number, height?: number }[]} markers readJpegMarkers の結果
 * @returns {{ width: number, height: number }} 縦横のピクセル数
 */
function findImageSize(markers) {
  const sizeEntry = markers.find(function (entry) {
    return SIZE_MARKERS.includes(entry.marker);
  });
  assert.ok(sizeEntry, "画像の縦横のピクセル数が見つかりません");
  return { width: sizeEntry.width, height: sizeEntry.height };
}

test("AC-20：assets/yu.jpg は約200KB以下で、長辺が約1400px以下", function () {
  const bytes = fs.readFileSync(AVATAR_PATH);
  assert.ok(bytes.length <= MAX_AVATAR_BYTES, "yu.jpg が " + bytes.length + " バイトで、大きすぎます");
  const size = findImageSize(readJpegMarkers(bytes));
  assert.ok(Math.max(size.width, size.height) <= MAX_AVATAR_LONG_SIDE, "yu.jpg の長辺が大きすぎます");
});

test("AC-20：assets/yu.jpg に EXIF・コメントなどの埋め込み情報がない", function () {
  const markers = readJpegMarkers(fs.readFileSync(AVATAR_PATH));
  assert.deepStrictEqual(findEmbeddedInfoMarkers(markers), []);
});

test("AC-20：元の Yu.png はリポジトリ（portal フォルダ）に入っていない", function () {
  assert.strictEqual(fs.existsSync(path.join(PORTAL_FOLDER, "Yu.png")), false);
  assert.strictEqual(fs.existsSync(path.join(PORTAL_FOLDER, "assets", "Yu.png")), false);
});

test("AC-35：assets/tool_simulator.jpg は 500×710 のままで、埋め込み情報がない", function () {
  const markers = readJpegMarkers(fs.readFileSync(SCREENSHOT_PATH));
  assert.deepStrictEqual(findImageSize(markers), { width: 500, height: 710 });
  assert.deepStrictEqual(findEmbeddedInfoMarkers(markers), []);
});
