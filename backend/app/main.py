from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routes.contratos import router as contratos_router
from app.routes.medicoes import router as medicoes_router

app = FastAPI(title="SIGMED-DER API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def healthcheck():
    return {"status": "online", "sistema": "SIGMED-DER"}

app.include_router(contratos_router)
app.include_router(medicoes_router)
