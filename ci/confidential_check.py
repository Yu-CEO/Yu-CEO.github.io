"""
機密チェック（confidential_check.py）

役割：
    GitHubに上がるファイルの中に、外に出してはいけない情報が入っていないかを探す。
    見つかったら「どのファイルの何行目か」を表示して、エラー（終了コード1）で終わる。
    CI（GitHub Actions）と、手元での確認の両方で使う。

探すもの：
    1. 決まった形の情報（メールアドレス・パソコン内の場所・APIキーなど）… このファイルに書いてある
    2. 機密の言葉（会社名など）… このファイルには書かない。次のどちらかで渡す
       - 環境変数 CONFIDENTIAL_WORDS（GitHubの Secrets に登録したものがCIで渡される。1行に1語）
       - 手元のファイル .confidential_words.txt（.gitignore で除外する。1行に1語）

使い方：
    python ci/confidential_check.py                  … 手元での確認（言葉のリストがなくても「注意」を出して続ける）
    python ci/confidential_check.py --require-words  … CIでの確認（言葉のリストが空なら、その時点で失敗にする）
    python ci/confidential_check.py --words-file <一覧ファイル>
        … 日記の自動公開（tools/diary_publish.js）での確認。言葉はその一覧ファイルだけから読み、
          環境変数・.confidential_words.txt は使わない。一覧が読めない・空なら失敗にする。
          一覧の場所と中身は表示しない（ログに残さないため）

ファイルの長さ：
    約300行と目安を少し超えるが、CI と手元で同じ1本のスクリプトをそのまま動かせるよう（ほかのファイルを読み込まない形で）1つにしている。

機密の言葉の照合のしかた（書き方を変えてすり抜けるのを防ぐため、3通りで調べる）：
    1. 1行ずつ、そのままの文字で
    2. 1行ずつ、全角・半角や空白の違いをそろえた文字で（NFKC：全角英数字を半角にするなどの決まった直し方。
       空白と目に見えない書式の文字（ゼロ幅スペースなど）は取り除く）
    3. ファイル全体で：JSON は読み込んだあとの文字（バックスラッシュと u と4文字の書き方も元の文字に戻る）、SVG はタグの外の文字を
       すべてつなげ、2 と同じようにそろえた文字で（言葉を2行や2つの <text> に分けた書き方も見つけるため）
"""

import html
import json
import os
import re
import subprocess
import sys
import unicodedata

# --- 設定 -------------------------------------------------------------

# 決まった形の情報。名前は、見つかったときの表示に使う
PATTERNS = {
    "メールアドレス": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "パソコン内の場所（ユーザー名が入る）": re.compile(r"[A-Za-z]:\\Users\\[^\\\s]+", re.IGNORECASE),
    "APIキー（OpenAI・Anthropic形式）": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "GitHubのトークン": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "AWSのキー": re.compile(r"AKIA[0-9A-Z]{16}"),
    "秘密鍵": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
}

# メールアドレスのうち、公開してよいもの（GitHubのコミット用の匿名アドレスなど）
ALLOWED_EMAIL_ENDINGS = ("@users.noreply.github.com", "@example.com", "@noreply.anthropic.com")

# 中身を読まないファイル（画像などの文字でないファイル）
SKIP_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".ico", ".mp4", ".wav", ".zip", ".pdf", ".woff", ".woff2")

# このファイル自体は、パターンの説明を含むので調べない
THIS_FILE = "ci/confidential_check.py"

LOCAL_WORDS_FILE = ".confidential_words.txt"

# このオプションを付けると、機密の言葉のリストが空のときに失敗（終了コード1）にする。
# CIで Secrets（CONFIDENTIAL_WORDS）の登録を忘れたまま「合格」になるのを防ぐため。
# 付けないとき（手元での確認）は、これまでどおり「注意」を出して続ける。
REQUIRE_WORDS_OPTION = "--require-words"

# このオプションのすぐ後ろに、機密の言葉の一覧ファイルの場所を書く（リポジトリの外に置いた一覧を使うため）
WORDS_FILE_OPTION = "--words-file"


# --- 機密の言葉を読み込む ----------------------------------------------

def load_secret_words():
    """
    機密の言葉のリストを読み込む。
    受け取るもの：なし（環境変数と手元のファイルを見る）
    返すもの：言葉のリスト（空行と # で始まる行は除く）
    """
    lines = []
    lines += os.environ.get("CONFIDENTIAL_WORDS", "").splitlines()
    if os.path.exists(LOCAL_WORDS_FILE):
        with open(LOCAL_WORDS_FILE, encoding="utf-8") as file:
            lines += file.read().splitlines()

    return clean_words(lines)


def clean_words(lines):
    """
    行の一覧から、機密の言葉だけを取り出す。
    受け取るもの：行の一覧
    返すもの：言葉のリスト（前後の空白を取り、空行と # で始まる行は除く）
    """
    words = []
    for line in lines:
        word = line.strip()
        if word and not word.startswith("#"):
            words.append(word)
    return words


def load_words_file(words_file):
    """
    --words-file で指定された一覧ファイルだけから、機密の言葉を読み込む。
    受け取るもの：一覧ファイルの場所
    返すもの：言葉のリスト。読めないときは None（場所を表示しないため、理由は呼ぶ側で決まった文にする）
    """
    try:
        with open(words_file, encoding="utf-8-sig") as file:
            return clean_words(file.read().splitlines())
    except (OSError, UnicodeDecodeError):
        return None


def read_words_file_option(arguments):
    """
    コマンドの引数から --words-file の値を取り出す。
    受け取るもの：引数の一覧（sys.argv[1:]）
    返すもの：一覧ファイルの場所。オプションがなければ None、値がなければ ""（失敗にする）
    """
    if WORDS_FILE_OPTION not in arguments:
        return None
    position = arguments.index(WORDS_FILE_OPTION) + 1
    if position >= len(arguments):
        return ""
    return arguments[position]


# --- 調べるファイルの一覧 -----------------------------------------------

def list_target_files():
    """
    GitHubに上がる予定のファイルの一覧を返す。
    git の管理下なら「git が追跡する＋追跡予定のファイル」（.gitignore で除外したものは入らない）。
    git がない場所では、フォルダの中を全部たどる。
    """
    try:
        result = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
            capture_output=True, text=True, encoding="utf-8", check=True,
        )
        return [path for path in result.stdout.splitlines() if path]
    except (subprocess.CalledProcessError, FileNotFoundError):
        files = []
        for folder, subfolders, names in os.walk("."):
            # 作業用のフォルダは調べない
            subfolders[:] = [s for s in subfolders if s not in (".git", ".venv", "node_modules", "__pycache__")]
            for name in names:
                files.append(os.path.relpath(os.path.join(folder, name)).replace("\\", "/"))
        return files


# --- 1つのファイルを調べる ----------------------------------------------

def normalize_text(text):
    """
    照合のために文字をそろえる（全角・半角の違い・大文字小文字・空白・目に見えない書式の文字をなくす）。
    受け取るもの：文字
    返すもの：そろえた文字（例：「Ａ Ｂ」→「ab」）
    目に見えない書式の文字（Unicode の分類 Cf：ゼロ幅スペース・単語結合子・ソフトハイフンなど）は、
    言葉の途中に挟むと見た目は同じまま照合をすり抜けうるので、先に取り除く。
    """
    visible = "".join(char for char in text if unicodedata.category(char) != "Cf")
    normalized = unicodedata.normalize("NFKC", visible)
    return re.sub(r"\s+", "", normalized).casefold()


def collect_json_strings(value):
    """
    JSON を読み込んだ中身から、文字（項目の名前と値）をすべて取り出す。
    受け取るもの：json.loads の結果
    返すもの：文字のリスト（出てきた順）
    """
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        strings = []
        for key, item in value.items():
            strings.append(key)
            strings += collect_json_strings(item)
        return strings
    if isinstance(value, list):
        strings = []
        for item in value:
            strings += collect_json_strings(item)
        return strings
    return []


def joined_document_text(path, text):
    """
    ファイル全体を照合するための文字を作る。JSON は読み込んだあとの文字、SVG はタグの外の文字をつなげたもの。
    受け取るもの：ファイルの場所・中身
    返すもの：つなげた文字（JSON・SVG 以外や、JSON として読めないときは ""）
    """
    lowered = path.lower()
    if lowered.endswith(".json"):
        try:
            return "".join(collect_json_strings(json.loads(text)))
        except ValueError:
            return ""
    if lowered.endswith(".svg"):
        return html.unescape("".join(re.findall(r">([^<]*)<", text)))
    return ""


def find_pattern_matches(line):
    """
    1行の中の、決まった形の情報（メールアドレスなど）の種類を返す。公開してよいメールアドレスは除く。
    受け取るもの：1行の文字
    返すもの：種類の名前のリスト
    """
    kinds = []
    for kind, pattern in PATTERNS.items():
        for match in pattern.finditer(line):
            if kind == "メールアドレス" and match.group().lower().endswith(ALLOWED_EMAIL_ENDINGS):
                continue
            kinds.append(kind)
    return kinds


def word_found_in(word, normalized_word, text):
    """
    言葉が、そのままの文字か、そろえた文字のどちらかに入っているかを確かめる。
    受け取るもの：言葉・そろえた言葉・調べる文字
    返すもの：入っていれば True
    """
    if word in text:
        return True
    return bool(normalized_word) and normalized_word in normalize_text(text)


def check_file(path, secret_words):
    """
    1つのファイルを、1行ずつと、ファイル全体（JSON・SVG）で調べる。
    返すもの：見つかったものの一覧 [(行番号、または「全体」, 種類), ...]
    機密の言葉そのものは表示しない（CIのログに残さないため）。
    """
    findings = []
    try:
        # utf-8-sig：先頭に BOM（文字の並び方の印）があれば取り除いて読む（BOM 付きの JSON も全体で照合できるように）
        with open(path, encoding="utf-8-sig") as file:
            text = file.read()
    except (UnicodeDecodeError, OSError):
        return findings  # 文字のファイルでなければ飛ばす

    normalized_words = [normalize_text(word) for word in secret_words]
    found_word_numbers = set()
    for line_number, line in enumerate(text.splitlines(), start=1):
        for kind in find_pattern_matches(line):
            findings.append((line_number, kind))
        for index, word in enumerate(secret_words, start=1):
            if word_found_in(word, normalized_words[index - 1], line):
                findings.append((line_number, f"機密の言葉（リストの{index}番目）"))
                found_word_numbers.add(index)

    # 1行ずつでは見つからなかった言葉だけ、ファイル全体の文字で探す（同じ言葉を二重に数えないため）
    document_text = joined_document_text(path, text)
    for index, word in enumerate(secret_words, start=1):
        if index not in found_word_numbers and document_text and word_found_in(word, normalized_words[index - 1], document_text):
            findings.append(("全体", f"機密の言葉（リストの{index}番目・ファイル全体の文字をつなげて照合）"))
    return findings


# --- 全体の流れ ---------------------------------------------------------

def choose_secret_words(arguments):
    """
    どの一覧の言葉で照合するかを決めて、言葉のリストを返す。
    受け取るもの：コマンドの引数の一覧（sys.argv[1:]）
    返すもの：言葉のリスト（空のこともある）。続けられないときは、理由を表示して終了コード1で終わる
    決め方：
        --words-file あり → その一覧ファイルだけを使う（読めない・空なら終わる。場所と中身は表示しない）
        --words-file なし → 環境変数 CONFIDENTIAL_WORDS と .confidential_words.txt を使う
                            （--require-words があり、空なら終わる。なければ「注意」を出して続ける）
    """
    words_file = read_words_file_option(arguments)
    if words_file is not None:
        secret_words = load_words_file(words_file) if words_file else None
        if not secret_words:
            # 自動公開では一覧が必須。場所と中身は表示しない
            print("機密チェック：NG。--words-file の機密の言葉の一覧が読めないか、空です。")
            sys.exit(1)
        return secret_words

    secret_words = load_secret_words()
    if not secret_words and REQUIRE_WORDS_OPTION in arguments:
        # CIでは、言葉のリストがないまま調べても意味がないので、ここで止める
        print("機密チェック：NG。機密の言葉のリストが空です（--require-words 指定）。")
        print("GitHubの Settings → Secrets and variables → Actions → Secrets に CONFIDENTIAL_WORDS（1行に1語）を登録してください。")
        sys.exit(1)
    if not secret_words:
        print("注意：機密の言葉のリストがありません（CONFIDENTIAL_WORDS / .confidential_words.txt）。決まった形の情報だけを調べます。")
    return secret_words


def main():
    """
    機密チェックの入口。流れは「照合に使う言葉を決める → 上がる予定の全ファイルを調べる → 結果を出す」だけ。
    受け取るもの：なし（コマンドの引数 --require-words・--words-file と、環境変数・手元のファイルを見る）
    返すもの：なし。見つからなければ「OK」を出して終了コード0、見つかれば場所を出して終了コード1で終わる
    """
    secret_words = choose_secret_words(sys.argv[1:])

    total = 0
    for path in list_target_files():
        if path == THIS_FILE or path.lower().endswith(SKIP_EXTENSIONS):
            continue
        for line_number, kind in check_file(path, secret_words):
            print(f"見つかりました：{path}:{line_number} — {kind}")
            total += 1

    if total:
        print(f"\n機密チェック：NG（{total}件）。上の場所を直してから、もう一度実行してください。")
        sys.exit(1)
    print("機密チェック：OK")


if __name__ == "__main__":
    main()
