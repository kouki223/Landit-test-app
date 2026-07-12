#!/usr/bin/env bash
#
# check-setup.sh — `docker compose up` の前に環境が整っているかを確認するスクリプト
#
# 確認項目:
#   1. .env が存在し、Google APIキーが設定されているか
#   2. Docker / Docker Compose が使えるか（デーモン起動含む）
#   3. 実行時に使うポート(3000 / API / DB)が空いているか
#
# 使い方:  ./check-setup.sh
# 終了コード: すべて必須項目OKなら 0、必須項目にNGがあれば 1

set -uo pipefail
cd "$(dirname "$0")"

# ---- 表示ヘルパー ---------------------------------------------------------
if [ -t 1 ]; then
  GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=""; YELLOW=""; RED=""; BOLD=""; RESET=""
fi

fail_count=0
warn_count=0

ok()   { printf "  ${GREEN}✓ PASS${RESET} %s\n" "$1"; }
warn() { printf "  ${YELLOW}▲ WARN${RESET} %s\n" "$1"; warn_count=$((warn_count + 1)); }
err()  { printf "  ${RED}✗ FAIL${RESET} %s\n" "$1"; fail_count=$((fail_count + 1)); }
section() { printf "\n${BOLD}%s${RESET}\n" "$1"; }

# .env から特定キーの値を取り出す（サブシェルで安全に）
get_env() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r'; }

# 指定ポートを LISTEN しているプロセス（"コマンド PID"）を返す。空なら未使用。
port_listener() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$p" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $1" (pid "$2")"; exit}'
  else
    # lsof が無い環境向けのフォールバック（使用中かどうかのみ）
    if command -v nc >/dev/null 2>&1 && nc -z localhost "$p" >/dev/null 2>&1; then
      echo "unknown process"
    fi
  fi
}

printf "${BOLD}=== 環境セットアップ確認 (check-setup.sh) ===${RESET}\n"

# ---- 1. .env と APIキー ---------------------------------------------------
section "1. .env / APIキー"
if [ ! -f .env ]; then
  err ".env が存在しません（'cp .env.example .env' を実行してください）"
else
  ok ".env が存在します"

  # API key がAIzaの形式で始まる想定で、API key が未設定の場合は警告を表示する(違う場合も存在する可能性あり)ため、API keyが正しい場合はwarnは無視して良い
  check_key() {
    local name="$1" value
    value="$(get_env "$name")"
    if [ -z "${value}" ]; then
      err "${name} が未設定です"
    elif printf '%s' "${value}" | grep -qi '^dummy'; then
      warn "${name} がダミー値のままです（地図/住所は本来の動作をしません）"
    elif ! printf '%s' "${value}" | grep -q '^AIza'; then
      warn "${name} は設定済みですが Google のキー形式(AIza...)ではないようです"
    else
      ok "${name} が設定されています"
    fi
  }
  check_key NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  check_key GOOGLE_GEOCODING_API_KEY
fi

# ---- 2. Docker ------------------------------------------------------------
section "2. Docker / Docker Compose"
if ! command -v docker >/dev/null 2>&1; then
  err "docker コマンドが見つかりません（Docker Desktop をインストールしてください）"
else
  ok "docker コマンドが利用可能です"
  if docker info >/dev/null 2>&1; then
    ok "Docker デーモンが起動しています"
  else
    err "Docker デーモンが起動していません（Docker Desktop を起動してください）"
  fi
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose (v2) が利用可能です"
  else
    err "docker compose が使えません（Compose v2 が必要です）"
  fi
fi

# ---- 3. ポート ------------------------------------------------------------
section "3. ポートの空き状況"
FE_PORT=3000
API_PORT="$(get_env BACKEND_PORT)"; API_PORT="${API_PORT:-4000}"
DB_PORT="$(get_env POSTGRES_PORT)"; DB_PORT="${DB_PORT:-5433}"

check_port() {
  local p="$1" label="$2" listener
  listener="$(port_listener "$p")"
  if [ -z "${listener}" ]; then
    ok "ポート ${p} (${label}) は空いています"
  elif printf '%s' "${listener}" | grep -qiE 'docker|com.docke'; then
    warn "ポート ${p} (${label}) は Docker が使用中 → 本アプリが既に起動している可能性があります（問題なし）"
  else
    err "ポート ${p} (${label}) は他プロセスが使用中: ${listener}"
  fi
}
check_port "${FE_PORT}" "Frontend"
check_port "${API_PORT}" "Backend API"
check_port "${DB_PORT}" "PostgreSQL"

# ---- サマリ ---------------------------------------------------------------
section "結果"
if [ "${fail_count}" -eq 0 ] && [ "${warn_count}" -eq 0 ]; then
  printf "${GREEN}すべてのチェックをパスしました。'docker compose up --build' を実行できます。${RESET}\n"
  exit 0
elif [ "${fail_count}" -eq 0 ]; then
  printf "${YELLOW}必須項目はOKですが、注意(WARN)が %d 件あります。上記を確認してください。${RESET}\n" "${warn_count}"
  exit 0
else
  printf "${RED}NG(FAIL)が %d 件あります。上記を解消してから起動してください。${RESET}\n" "${fail_count}"
  exit 1
fi
