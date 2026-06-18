import json
import sqlite3
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "sigmed.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contratos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT NOT NULL UNIQUE,
                nome TEXT NOT NULL,
                empresa TEXT,
                objeto TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS medicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                contrato_id INTEGER NOT NULL,
                competencia TEXT NOT NULL,
                arquivo_eclic TEXT NOT NULL,
                arquivo_controle TEXT NOT NULL,
                arquivo_saida TEXT NOT NULL,
                indicadores_json TEXT NOT NULL,
                nao_encontrados_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id)
            )
            """
        )
        conn.commit()


def row_to_dict(row):
    return dict(row) if row else None


def now_iso():
    return datetime.now().isoformat(timespec="seconds")


def json_dump(data):
    return json.dumps(data, ensure_ascii=False, default=str)


def json_load(text):
    return json.loads(text) if text else None
