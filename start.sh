#!/usr/bin/env bash
set -e

PERSISTENT="/data-root"
APP_DIR="/opt/render/project/src"

mkdir -p "$PERSISTENT/data"
mkdir -p "$PERSISTENT/uploads"

# Only symlink if not already linked
if [ ! -L "$APP_DIR/data" ]; then
  rm -rf "$APP_DIR/data"
  ln -sf "$PERSISTENT/data" "$APP_DIR/data"
fi

if [ ! -L "$APP_DIR/public/uploads" ]; then
  rm -rf "$APP_DIR/public/uploads"
  ln -sf "$PERSISTENT/uploads" "$APP_DIR/public/uploads"
fi

exec npm start
