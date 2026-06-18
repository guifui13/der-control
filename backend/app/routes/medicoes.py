from pathlib import Path
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from app.database import get_conn, row_to_dict, now_iso, json_dump, json_load
from app.medicao_engine import gerar_medicao

router = APIRouter(prefix="/medicoes", tags=["Medições"])
BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "storage" / "uploads"
OUTPUT_DIR = BASE_DIR / "storage" / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

@router.get("")
def listar_medicoes(contrato_id: int | None = None):
    sql = """
        SELECT m.*, c.codigo AS contrato_codigo, c.nome AS contrato_nome
        FROM medicoes m
        JOIN contratos c ON c.id = m.contrato_id
    """
    params = []
    if contrato_id:
        sql += " WHERE m.contrato_id = ?"
        params.append(contrato_id)
    sql += " ORDER BY m.created_at DESC"

    with get_conn() as conn:
        rows = conn.execute(sql, params).fetchall()
        data = []
        for r in rows:
            item = row_to_dict(r)
            item["indicadores"] = json_load(item.pop("indicadores_json"))
            item["nao_encontrados"] = json_load(item.pop("nao_encontrados_json"))
            data.append(item)
        return data

@router.post("/gerar")
def gerar(
    contrato_id: int = Form(...),
    competencia: str = Form(...),
    arquivo_eclic: UploadFile = File(...),
    arquivo_controle: UploadFile = File(...),
):
    with get_conn() as conn:
        contrato = conn.execute("SELECT * FROM contratos WHERE id = ?", (contrato_id,)).fetchone()
    if not contrato:
        raise HTTPException(status_code=404, detail="Contrato não encontrado.")

    safe_comp = competencia.replace("/", "-").replace(" ", "_")
    prefixo = f"contrato_{contrato_id}_{safe_comp}_{now_iso().replace(':','-')}"
    eclic_path = UPLOAD_DIR / f"{prefixo}_eclic_{arquivo_eclic.filename}"
    controle_path = UPLOAD_DIR / f"{prefixo}_controle_{arquivo_controle.filename}"
    saida_path = OUTPUT_DIR / f"MEDICAO_{contrato['codigo']}_{safe_comp}.xlsx"

    with eclic_path.open("wb") as f:
        shutil.copyfileobj(arquivo_eclic.file, f)
    with controle_path.open("wb") as f:
        shutil.copyfileobj(arquivo_controle.file, f)

    try:
        excel_bytes, indicadores, nao_encontrados = gerar_medicao(eclic_path, controle_path)
        saida_path.write_bytes(excel_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao gerar medição: {e}")

    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO medicoes
            (contrato_id, competencia, arquivo_eclic, arquivo_controle, arquivo_saida, indicadores_json, nao_encontrados_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (contrato_id, competencia, str(eclic_path), str(controle_path), str(saida_path), json_dump(indicadores), json_dump(nao_encontrados), now_iso())
        )
        conn.commit()
        medicao_id = cur.lastrowid

    return {
        "id": medicao_id,
        "contrato_id": contrato_id,
        "competencia": competencia,
        "arquivo_saida": saida_path.name,
        "indicadores": {
            "total_documentos": indicadores.get("total_documentos", 0),
            "percentual_medido": indicadores.get("percentual_medido", 0),
            "nao_encontrados": len(nao_encontrados) if isinstance(nao_encontrados, list) else 0,
        },
        "download_url": f"/medicoes/{medicao_id}/download",
    }

@router.get("/{medicao_id}/download")
def download_medicao(medicao_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT arquivo_saida FROM medicoes WHERE id = ?", (medicao_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Medição não encontrada.")
    path = Path(row["arquivo_saida"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Arquivo final não encontrado no servidor.")
    return FileResponse(path, filename=path.name, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
