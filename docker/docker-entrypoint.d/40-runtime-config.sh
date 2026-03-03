#!/usr/bin/env sh
set -eu

APP_BASE_URL="${APP_BASE_URL:-https://app.localhost}"
API_BASE_URL="${API_BASE_URL:-https://api.localhost}"
AUTH_AUTHORITY="${AUTH_AUTHORITY:-${AUTH_ISSUER:-https://auth.localhost}}"

APP_ALLOWED_HOST="${APP_ALLOWED_HOST:-$(printf '%s' "$APP_BASE_URL" | sed -E 's#^https?://([^/]+).*$#\1#')}"

TEMPLATE_PATH="/usr/share/nginx/html/assets/runtime-config.template.json"
OUTPUT_PATH="/usr/share/nginx/html/assets/runtime-config.json"

if [ -f "$TEMPLATE_PATH" ]; then
  sed \
    -e "s#__APP_BASE_URL__#${APP_BASE_URL}#g" \
    -e "s#__API_BASE_URL__#${API_BASE_URL}#g" \
    -e "s#__AUTH_API_BASE_URL__#${AUTH_AUTHORITY}#g" \
    -e "s#__AUTH_AUTHORITY__#${AUTH_AUTHORITY}#g" \
    -e "s#__APP_ALLOWED_HOST__#${APP_ALLOWED_HOST}#g" \
    "$TEMPLATE_PATH" > "$OUTPUT_PATH"
fi
