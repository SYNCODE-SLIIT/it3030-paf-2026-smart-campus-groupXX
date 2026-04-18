#!/bin/sh
set -eu

POLL_INTERVAL_SECONDS="${RELOAD_POLL_INTERVAL_SECONDS:-2}"
APP_PID=""
FIRST_RUN="true"

hash_inputs() {
  find src/main/java src/main/resources -type f 2>/dev/null | sort | xargs -r sha1sum
  if [ -f pom.xml ]; then
    sha1sum pom.xml
  fi
}

snapshot_hash() {
  hash_inputs | sha1sum | awk '{ print $1 }'
}

start_app() {
  echo "[autoreload] Starting backend process..."
  if [ "${FIRST_RUN}" = "true" ]; then
    mvn -Dspring-boot.run.excludeDevtools=true clean spring-boot:run &
    FIRST_RUN="false"
  else
    mvn -Dspring-boot.run.excludeDevtools=true spring-boot:run &
  fi
  APP_PID=$!
}

stop_app() {
  if [ -n "${APP_PID}" ] && kill -0 "${APP_PID}" 2>/dev/null; then
    echo "[autoreload] Stopping backend process ${APP_PID}..."
    kill "${APP_PID}" 2>/dev/null || true
    wait "${APP_PID}" 2>/dev/null || true
  fi
  APP_PID=""
}

shutdown() {
  stop_app
  exit 0
}

trap shutdown INT TERM

LAST_HASH="$(snapshot_hash)"
start_app

while true; do
  sleep "${POLL_INTERVAL_SECONDS}"
  CURRENT_HASH="$(snapshot_hash)"

  if [ -n "${APP_PID}" ] && ! kill -0 "${APP_PID}" 2>/dev/null; then
    EXIT_STATUS=0
    wait "${APP_PID}" || EXIT_STATUS=$?
    APP_PID=""

    if [ "${CURRENT_HASH}" = "${LAST_HASH}" ]; then
      echo "[autoreload] Backend process exited with status ${EXIT_STATUS}. Waiting for source changes before restarting..."
      continue
    fi
  fi

  if [ "${CURRENT_HASH}" != "${LAST_HASH}" ]; then
    echo "[autoreload] Source change detected. Starting backend..."
    LAST_HASH="${CURRENT_HASH}"
    stop_app
    start_app
  fi
done
