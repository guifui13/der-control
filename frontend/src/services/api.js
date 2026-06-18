const API_URL = "http://localhost:8000";

export async function getContratos() {
  const res = await fetch(`${API_URL}/contratos`);
  if (!res.ok) throw new Error("Erro ao buscar contratos");
  return res.json();
}

export async function createContrato(data) {
  const res = await fetch(`${API_URL}/contratos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Erro ao criar contrato");
  return res.json();
}

export async function getMedicoes(contratoId = "") {
  const url = contratoId ? `${API_URL}/medicoes?contrato_id=${contratoId}` : `${API_URL}/medicoes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erro ao buscar medições");
  return res.json();
}

export async function gerarMedicao({ contratoId, competencia, arquivoEclic, arquivoControle }) {
  const form = new FormData();
  form.append("contrato_id", contratoId);
  form.append("competencia", competencia);
  form.append("arquivo_eclic", arquivoEclic);
  form.append("arquivo_controle", arquivoControle);

  const res = await fetch(`${API_URL}/medicoes/gerar`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json()).detail || "Erro ao gerar medição");
  return res.json();
}

export function downloadUrl(id) {
  return `${API_URL}/medicoes/${id}/download`;
}
