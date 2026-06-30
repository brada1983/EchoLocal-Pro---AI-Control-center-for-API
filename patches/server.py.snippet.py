# Reference snippet inserted by scripts/patch_whisper_server.py into the
# real /opt/whisper-api/server.py on the LXC. Kept here as a literal,
# human-reviewable copy of what the patcher injects — read this before
# running the patcher with --apply.
#
# Tracks in-flight request count + a 200-entry ring buffer of recent
# requests (route/status/latency/error), exposed at GET /metrics. The
# dashboard's server/collectors/metrics-poller.js polls this every ~7s and
# ingests new rows into its own request_log table. Deliberately a poll, not
# a push from here: this server should never depend on the dashboard being
# reachable to keep serving transcriptions.

# --- ECHOLOCAL_METRICS_PATCH: imports ---
import time
import sqlite3
import threading
from collections import deque

# --- ECHOLOCAL_METRICS_PATCH: state ---
_echolocal_inflight = 0
_echolocal_inflight_lock = threading.Lock()
_echolocal_recent = deque(maxlen=200)
_ECHOLOCAL_METRICS_DB = "/opt/whisper-api/metrics.sqlite3"


def _echolocal_init_metrics_db():
    conn = sqlite3.connect(_ECHOLOCAL_METRICS_DB)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS requests (
            ts REAL, route TEXT, status_code INTEGER, latency_ms REAL, error TEXT
        )"""
    )
    conn.commit()
    conn.close()


_echolocal_init_metrics_db()


# --- ECHOLOCAL_METRICS_PATCH: middleware ---
@app.middleware("http")
async def _echolocal_track_requests(request, call_next):
    global _echolocal_inflight
    with _echolocal_inflight_lock:
        _echolocal_inflight += 1
    start = time.time()
    error = None
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    except Exception as exc:
        error = str(exc)
        raise
    finally:
        latency_ms = (time.time() - start) * 1000
        with _echolocal_inflight_lock:
            _echolocal_inflight -= 1
        entry = {
            "ts": time.time(),
            "route": request.url.path,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "error": error,
        }
        _echolocal_recent.append(entry)
        try:
            conn = sqlite3.connect(_ECHOLOCAL_METRICS_DB, timeout=1)
            conn.execute(
                "INSERT INTO requests VALUES (?,?,?,?,?)",
                (entry["ts"], entry["route"], entry["status_code"], entry["latency_ms"], error),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass  # never let metrics persistence break a real transcription request


# --- ECHOLOCAL_METRICS_PATCH: route ---
@app.get("/metrics")
async def _echolocal_metrics():
    with _echolocal_inflight_lock:
        inflight = _echolocal_inflight
    return {"inflight": inflight, "recent": list(_echolocal_recent)}
# --- END ECHOLOCAL_METRICS_PATCH ---
