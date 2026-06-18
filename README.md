# SIGMED-DER Real

Sistema web real para medição documental a partir da planilha de controle padrão e da exportação bruta do E-CLIC.

## Estrutura

```txt
sigmed_der_real/
├── backend/   FastAPI + motor de medição em Python
└── frontend/  React + Vite
```

## Como rodar o backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

O backend abre em:

```txt
http://localhost:8000
```

Documentação da API:

```txt
http://localhost:8000/docs
```

## Como rodar o frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

O site abre em:

```txt
http://localhost:5173
```

## Fluxo atual

1. Cadastre um contrato.
2. Vá em Nova medição.
3. Selecione o contrato e a competência.
4. Envie o bruto do E-CLIC.
5. Envie a planilha de controle padrão.
6. Gere a medição.
7. Baixe a planilha final.
8. Consulte o histórico.

## Próximas evoluções

- Login e perfis de acesso.
- Dashboard por contrato.
- Validação prévia da planilha de controle.
- Tela detalhada de documentos não encontrados.
- Banco PostgreSQL.
- Storage em nuvem.
- Deploy em servidor.
