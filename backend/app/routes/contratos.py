from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import get_conn, row_to_dict, now_iso

router = APIRouter(prefix="/contratos", tags=["Contratos"])

class ContratoIn(BaseModel):
    codigo: str
    nome: str
    empresa: str | None = ""
    objeto: str | None = ""

@router.get("")
def listar_contratos():
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM contratos ORDER BY created_at DESC").fetchall()
        return [row_to_dict(r) for r in rows]

@router.post("")
def criar_contrato(data: ContratoIn):
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO contratos (codigo, nome, empresa, objeto, created_at) VALUES (?, ?, ?, ?, ?)",
                (data.codigo.strip().upper(), data.nome.strip(), data.empresa or "", data.objeto or "", now_iso())
            )
            conn.commit()
            row = conn.execute("SELECT * FROM contratos WHERE id = ?", (cur.lastrowid,)).fetchone()
            return row_to_dict(row)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Não foi possível criar o contrato: {e}")
