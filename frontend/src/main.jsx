import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  FileUp,
  Filter,
  FolderKanban,
  History,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  createContrato,
  downloadUrl,
  gerarMedicao,
  getContratos,
  getMedicoes,
} from "./services/api";
import "./style.css";

const menu = [
  { key: "dashboard", label: "Painel DER", icon: LayoutDashboard },
  { key: "contratos", label: "Contratos", icon: Building2 },
  { key: "nova", label: "Nova medição", icon: FileUp },
  { key: "historico", label: "Histórico", icon: History },
  { key: "padrao", label: "Planilha Padrão DER", icon: FileCheck2 },
  { key: "fluxo", label: "Fluxo proposto", icon: Users },
  { key: "config", label: "Regras", icon: Settings },
];

function formatPercent(value) {
  return `${((value || 0) * 100).toFixed(2)}%`;
}

function statusContrato(percentual, naoEncontrados, temMedicao) {
  if (!temMedicao) return { label: "Sem medição", className: "neutral", icon: Clock3 };
  if (naoEncontrados > 0) return { label: "Atenção", className: "warning", icon: AlertTriangle };
  if (percentual < 0.3) return { label: "Crítico", className: "danger", icon: XCircle };
  if (percentual < 0.7) return { label: "Em evolução", className: "info", icon: TrendingUp };
  return { label: "Regular", className: "success", icon: CheckCircle2 };
}

function getUltimaMedicaoDoContrato(contrato, medicoes) {
  const lista = medicoes
    .filter((m) => Number(m.contrato_id) === Number(contrato.id))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  return lista[0] || null;
}

function montarCarteira(contratos, medicoes) {
  return contratos.map((contrato) => {
    const ultima = getUltimaMedicaoDoContrato(contrato, medicoes);
    const percentual = ultima?.indicadores?.percentual_medido || 0;
    const naoEncontrados = ultima?.indicadores?.nao_encontrados || 0;
    const totalDocs = ultima?.indicadores?.total_documentos || 0;
    const status = statusContrato(percentual, naoEncontrados, !!ultima);

    return {
      ...contrato,
      ultima,
      percentual,
      naoEncontrados,
      totalDocs,
      status,
      competencia: ultima?.competencia || "-",
    };
  });
}

function Sidebar({ page, setPage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">S</div>
        <div>
          <b>SIGMED-DER</b>
          <span>Gestão e medição documental</span>
        </div>
      </div>

      <nav>
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              className={page === item.key ? "active" : ""}
              onClick={() => setPage(item.key)}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <ShieldCheck size={18} />
        <span>Protótipo executivo para padronização DER</span>
      </div>
    </aside>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = "" }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="kpi-icon">{Icon && <Icon size={22} />}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  );
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, (value || 0) * 100));
  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const Icon = status.icon;
  return (
    <span className={`badge ${status.className}`}>
      <Icon size={14} />
      {status.label}
    </span>
  );
}

function Dashboard({ contratos, medicoes, setPage }) {
  const carteira = useMemo(() => montarCarteira(contratos, medicoes), [contratos, medicoes]);

  const totalContratos = contratos.length;
  const contratosComMedicao = carteira.filter((c) => c.ultima).length;
  const semMedicao = carteira.filter((c) => !c.ultima).length;
  const comAlerta = carteira.filter((c) => c.naoEncontrados > 0 || c.status.className === "danger").length;
  const totalDocs = medicoes.reduce((acc, m) => acc + (m.indicadores?.total_documentos || 0), 0);
  const mediaGeral = carteira.length
    ? carteira.reduce((acc, c) => acc + c.percentual, 0) / carteira.length
    : 0;

  const ranking = [...carteira].sort((a, b) => b.percentual - a.percentual).slice(0, 8);
  const alertas = carteira
    .filter((c) => !c.ultima || c.naoEncontrados > 0 || c.status.className === "danger")
    .slice(0, 6);

  return (
    <section>
      <div className="hero executive">
        <div>
          <p>Carteira de contratos DER</p>
          <h1>Painel executivo de medição documental</h1>
          <span>
            Acompanhamento mensal de múltiplos contratos, validação automática de documentos e histórico centralizado das medições.
          </span>
        </div>

        <div className="hero-actions">
          <button onClick={() => setPage("nova")}>
            <FileUp size={18} />
            Nova medição
          </button>
          <button className="secondary" onClick={() => setPage("contratos")}>
            <Plus size={18} />
            Novo contrato
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <KpiCard label="Contratos cadastrados" value={totalContratos} hint="carteira monitorada" icon={Building2} />
        <KpiCard label="Com medição" value={contratosComMedicao} hint="já processados" icon={FileCheck2} tone="success" />
        <KpiCard label="Sem medição" value={semMedicao} hint="pendentes no sistema" icon={Clock3} tone="warning" />
        <KpiCard label="Contratos em alerta" value={comAlerta} hint="exigem atenção" icon={AlertTriangle} tone="danger" />
        <KpiCard label="% médio da carteira" value={formatPercent(mediaGeral)} hint="média por contrato" icon={BarChart3} />
        <KpiCard label="Documentos lidos" value={totalDocs} hint="histórico consolidado" icon={FolderKanban} />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Ranking da carteira</h2>
              <p>Contratos ordenados pelo percentual medido mais recente.</p>
            </div>
          </div>

          <div className="ranking">
            {ranking.length === 0 && <div className="empty">Cadastre contratos e gere medições para visualizar o ranking.</div>}

            {ranking.map((c, index) => (
              <div className="rank-row" key={c.id}>
                <div className="rank-pos">{index + 1}</div>
                <div className="rank-main">
                  <b>{c.codigo}</b>
                  <span>{c.nome}</span>
                  <ProgressBar value={c.percentual} />
                </div>
                <strong>{formatPercent(c.percentual)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Alertas executivos</h2>
              <p>Contratos sem medição ou com inconsistências.</p>
            </div>
          </div>

          <div className="alerts">
            {alertas.length === 0 && <div className="empty success-empty">Nenhum alerta crítico na carteira.</div>}

            {alertas.map((c) => (
              <div className="alert-item" key={c.id}>
                <div>
                  <b>{c.codigo}</b>
                  <span>
                    {!c.ultima
                      ? "Contrato ainda não possui medição processada."
                      : `${c.naoEncontrados} documento(s) não encontrado(s).`}
                  </span>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <CarteiraContratos contratos={carteira} compacto />
    </section>
  );
}

function CarteiraContratos({ contratos, compacto = false }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");

  const filtrados = contratos.filter((c) => {
    const texto = `${c.codigo} ${c.nome} ${c.empresa || ""}`.toLowerCase();
    const bateBusca = texto.includes(busca.toLowerCase());
    const bateStatus = status === "todos" || c.status.className === status;
    return bateBusca && bateStatus;
  });

  return (
    <div className="panel portfolio-panel">
      <div className="panel-head">
        <div>
          <h2>{compacto ? "Carteira de contratos" : "Contratos cadastrados"}</h2>
          <p>Visão pensada para acompanhamento de muitos contratos ao mesmo tempo.</p>
        </div>
      </div>

      <div className="filters">
        <label className="searchbox">
          <Search size={17} />
          <input
            placeholder="Buscar por contrato, nome ou empresa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </label>

        <label className="select-filter">
          <Filter size={17} />
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="success">Regular</option>
            <option value="info">Em evolução</option>
            <option value="warning">Atenção</option>
            <option value="danger">Crítico</option>
            <option value="neutral">Sem medição</option>
          </select>
        </label>
      </div>

      <div className="table portfolio-table">
        <table>
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Empresa</th>
              <th>Última competência</th>
              <th>% medido</th>
              <th>Documentos</th>
              <th>Não encontrados</th>
              <th>Status</th>
              <th>Download</th>
            </tr>
          </thead>

          <tbody>
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td>
                  <b>{c.codigo}</b>
                  <small>{c.nome}</small>
                </td>
                <td>{c.empresa || "-"}</td>
                <td>{c.competencia}</td>
                <td>
                  <div className="percent-cell">
                    <strong>{formatPercent(c.percentual)}</strong>
                    <ProgressBar value={c.percentual} />
                  </div>
                </td>
                <td>{c.totalDocs}</td>
                <td className={c.naoEncontrados > 0 ? "danger-text" : ""}>{c.naoEncontrados}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  {c.ultima ? (
                    <a className="mini-link" href={downloadUrl(c.ultima.id)}>
                      <Download size={15} />
                      Baixar
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && <div className="empty">Nenhum contrato encontrado com os filtros aplicados.</div>}
      </div>
    </div>
  );
}

function Contratos({ contratos, medicoes, refresh }) {
  const [form, setForm] = useState({ codigo: "", nome: "", empresa: "", objeto: "" });
  const [loading, setLoading] = useState(false);

  const carteira = useMemo(() => montarCarteira(contratos, medicoes), [contratos, medicoes]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      await createContrato(form);
      setForm({ codigo: "", nome: "", empresa: "", objeto: "" });
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="title">
        <p>Gestão da carteira</p>
        <h1>Contratos</h1>
        <span>Cadastre contratos, empresas projetistas e acompanhe o status consolidado.</span>
      </div>

      <form className="panel formgrid" onSubmit={submit}>
        <input
          placeholder="Código ex.: C0849"
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          required
        />
        <input
          placeholder="Nome do contrato"
          value={form.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          required
        />
        <input
          placeholder="Empresa projetista"
          value={form.empresa}
          onChange={(e) => setForm({ ...form, empresa: e.target.value })}
        />
        <input
          placeholder="Objeto/resumo"
          value={form.objeto}
          onChange={(e) => setForm({ ...form, objeto: e.target.value })}
        />
        <button>
          <Plus size={16} />
          {loading ? "Salvando..." : "Cadastrar contrato"}
        </button>
      </form>

      <CarteiraContratos contratos={carteira} />
    </section>
  );
}

function NovaMedicao({ contratos, onDone }) {
  const [contratoId, setContratoId] = useState("");
  const [competencia, setCompetencia] = useState("");
  const [eclic, setEclic] = useState(null);
  const [controle, setControle] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const contratoSelecionado = contratos.find((c) => Number(c.id) === Number(contratoId));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const data = await gerarMedicao({
        contratoId,
        competencia,
        arquivoEclic: eclic,
        arquivoControle: controle,
      });

      setResult(data);
      await onDone();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="title">
        <p>Processamento mensal</p>
        <h1>Nova medição</h1>
        <span>Envie a planilha de controle padrão e a exportação bruta do E-CLIC.</span>
      </div>

      <div className="steps">
        <div className={contratoId ? "done" : ""}>1. Contrato</div>
        <div className={competencia ? "done" : ""}>2. Competência</div>
        <div className={controle ? "done" : ""}>3. Controle</div>
        <div className={eclic ? "done" : ""}>4. E-CLIC</div>
        <div className={result ? "done" : ""}>5. Medição</div>
      </div>

      <form className="panel upload" onSubmit={submit}>
        <label>
          Contrato
          <select value={contratoId} onChange={(e) => setContratoId(e.target.value)} required>
            <option value="">Selecione...</option>
            {contratos.map((c) => (
              <option value={c.id} key={c.id}>
                {c.codigo} — {c.nome}
              </option>
            ))}
          </select>
        </label>

        <label>
          Competência
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            required
          />
        </label>

        <label>
          Planilha de controle da projetista
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setControle(e.target.files[0])} required />
        </label>

        <label>
          Exportação bruta do E-CLIC
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setEclic(e.target.files[0])} required />
        </label>

        <div className="upload-summary">
          <b>Resumo do processamento</b>
          <span>Contrato: {contratoSelecionado ? `${contratoSelecionado.codigo} — ${contratoSelecionado.nome}` : "não selecionado"}</span>
          <span>Competência: {competencia || "não informada"}</span>
          <span>Controle: {controle?.name || "não enviado"}</span>
          <span>E-CLIC: {eclic?.name || "não enviado"}</span>
        </div>

        <button disabled={loading}>
          {loading ? "Processando medição..." : "Gerar medição"}
        </button>
      </form>

      {result && (
        <div className="result">
          <div className="panel-head">
            <div>
              <h2>Medição gerada com sucesso</h2>
              <p>Arquivo final disponível para download e histórico atualizado.</p>
            </div>
          </div>

          <div className="kpi-grid small">
            <KpiCard label="Documentos" value={result.indicadores.total_documentos} hint="processados" icon={FolderKanban} />
            <KpiCard label="% medido" value={formatPercent(result.indicadores.percentual_medido)} hint="resultado geral" icon={BarChart3} />
            <KpiCard label="Não encontrados" value={result.indicadores.nao_encontrados} hint="validar" icon={AlertTriangle} tone="warning" />
          </div>

          <a className="download" href={`http://localhost:8000${result.download_url}`}>
            <Download size={18} />
            Baixar planilha final
          </a>
        </div>
      )}
    </section>
  );
}

function TabelaMedicoes({ medicoes }) {
  if (!medicoes.length) return <div className="empty">Nenhuma medição processada ainda.</div>;

  return (
    <div className="table">
      <table>
        <thead>
          <tr>
            <th>Contrato</th>
            <th>Competência</th>
            <th>Documentos</th>
            <th>% medido</th>
            <th>Não encontrados</th>
            <th>Data</th>
            <th>Arquivo</th>
          </tr>
        </thead>

        <tbody>
          {medicoes.map((m) => (
            <tr key={m.id}>
              <td><b>{m.contrato_codigo}</b></td>
              <td>{m.competencia}</td>
              <td>{m.indicadores?.total_documentos || 0}</td>
              <td>{formatPercent(m.indicadores?.percentual_medido || 0)}</td>
              <td className={(m.indicadores?.nao_encontrados || 0) > 0 ? "danger-text" : ""}>
                {m.indicadores?.nao_encontrados || 0}
              </td>
              <td>{m.created_at || "-"}</td>
              <td>
                <a className="mini-link" href={downloadUrl(m.id)}>
                  <Download size={15} />
                  Download
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Historico({ medicoes }) {
  return (
    <section>
      <div className="title">
        <p>Rastreabilidade</p>
        <h1>Histórico de medições</h1>
        <span>Todas as medições processadas ficam registradas por contrato e competência.</span>
      </div>

      <TabelaMedicoes medicoes={medicoes} />
    </section>
  );
}

function PlanilhaPadrao() {
  const campos = [
    ["A", "Status do Documento", "Sim", "Controle interno da situação do documento"],
    ["B", "A4", "Sim", "Quantitativo / formato"],
    ["C", "A1", "Sim", "Quantitativo / formato"],
    ["D", "Descrição", "Sim", "Identificação do documento"],
    ["E", "Código do Projeto", "Obrigatório", "Chave de cruzamento com o E-CLIC"],
    ["F", "Data do Envio ao DER", "Recomendado", "Histórico de protocolo"],
    ["G", "Última Revisão", "Recomendado", "Controle da revisão atual"],
    ["H", "Número GRD", "Recomendado", "Rastreabilidade da entrega"],
    ["I até K", "Devolução", "Recomendado", "Histórico de retorno/análise"],
  ];

  return (
    <section>
      <div className="title">
        <p>Padrão documental DER</p>
        <h1>Planilha Padrão de Controle</h1>
        <span>
          A automação da medição depende da padronização da planilha enviada pelas projetistas.
        </span>
      </div>

      <div className="standard-hero">
        <div>
          <h2>A planilha de controle é a base do sistema</h2>
          <p>
            A exportação do E-CLIC informa o status atual dos documentos. A planilha padrão informa
            quais documentos pertencem ao contrato. O SIGMED-DER cruza as duas bases e gera
            automaticamente a medição documental.
          </p>
        </div>

        <div className="standard-key">
          <b>Coluna essencial</b>
          <strong>E</strong>
          <span>Código do Projeto</span>
        </div>
      </div>

      <div className="warning-box">
        <AlertTriangle size={24} />
        <div>
          <b>Campo obrigatório para funcionamento da medição automática</b>
          <span>
            O campo “Código do Projeto” deve permanecer na coluna E, pois ele é usado como chave
            para localizar os documentos na exportação bruta do E-CLIC.
          </span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Estrutura mínima obrigatória</h2>
            <p>Campos recomendados para padronização entre todas as projetistas.</p>
          </div>
        </div>

        <div className="table">
          <table>
            <thead>
              <tr>
                <th>Coluna</th>
                <th>Campo</th>
                <th>Obrigatório</th>
                <th>Utilização no sistema</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((item) => (
                <tr key={item[0]} className={item[0] === "E" ? "linha-chave" : ""}>
                  <td><b>{item[0]}</b></td>
                  <td>{item[1]}</td>
                  <td>{item[2]}</td>
                  <td>{item[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="standard-grid">
        <div className="standard-card">
          <CheckCircle2 size={26} />
          <b>Padronização</b>
          <span>Todas as projetistas utilizam a mesma estrutura de controle documental.</span>
        </div>

        <div className="standard-card">
          <BarChart3 size={26} />
          <b>Medição automática</b>
          <span>O sistema cruza a planilha padrão com o E-CLIC e calcula o avanço.</span>
        </div>

        <div className="standard-card">
          <ShieldCheck size={26} />
          <b>Governança</b>
          <span>O DER passa a comparar contratos usando a mesma régua de medição.</span>
        </div>
      </div>
    </section>
  );
}

function FluxoProposto() {
  return (
    <section>
      <div className="title">
        <p>Visão de evolução</p>
        <h1>Fluxo proposto para operação DER</h1>
        <span>Modelo futuro com participação das projetistas, validação do DER e histórico auditável.</span>
      </div>

      <div className="flow-grid">
        <div className="flow-card">
          <Users size={28} />
          <b>1. Projetista</b>
          <span>Envia mensalmente a planilha de controle no padrão oficial DER.</span>
        </div>

        <div className="flow-card">
          <Building2 size={28} />
          <b>2. DER</b>
          <span>Seleciona o contrato e sobe a exportação bruta do E-CLIC.</span>
        </div>

        <div className="flow-card">
          <BarChart3 size={28} />
          <b>3. Sistema</b>
          <span>Cruza os arquivos, valida inconsistências e calcula o avanço documental.</span>
        </div>

        <div className="flow-card">
          <ShieldCheck size={28} />
          <b>4. Fiscalização</b>
          <span>Analisa alertas, baixa a medição final e mantém registro histórico.</span>
        </div>
      </div>

      <div className="panel roadmap">
        <h2>Módulos futuros</h2>
        <div className="roadmap-grid">
          <span>Login por projetista</span>
          <span>Aprovação pelo DER</span>
          <span>Dashboard estadual</span>
          <span>Comparativo mensal</span>
          <span>Auditoria de arquivos</span>
          <span>Permissões por contrato</span>
        </div>
      </div>
    </section>
  );
}

function Config() {
  return (
    <section>
      <div className="title">
        <p>Parâmetros</p>
        <h1>Regras de medição</h1>
        <span>Primeira versão do painel de regras. No futuro poderá ser editável por perfil autorizado.</span>
      </div>

      <div className="rules">
        <div><b>Entregue</b><span>30%</span></div>
        <div><b>Aprovado com ressalva</b><span>70%</span></div>
        <div><b>Aprovado</b><span>90%</span></div>
        <div><b>Finalizado</b><span>100%</span></div>
      </div>
    </section>
  );
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [contratos, setContratos] = useState([]);
  const [medicoes, setMedicoes] = useState([]);

  async function refresh() {
    const [contratosData, medicoesData] = await Promise.all([
      getContratos(),
      getMedicoes(),
    ]);

    setContratos(contratosData);
    setMedicoes(medicoesData);
  }

  useEffect(() => {
    refresh().catch(() => { });
  }, []);

  const content = useMemo(
    () =>
      ({
        dashboard: <Dashboard contratos={contratos} medicoes={medicoes} setPage={setPage} />,
        contratos: <Contratos contratos={contratos} medicoes={medicoes} refresh={refresh} />,
        nova: <NovaMedicao contratos={contratos} onDone={refresh} />,
        historico: <Historico medicoes={medicoes} />,
        padrao: <PlanilhaPadrao />,
        fluxo: <FluxoProposto />,
        config: <Config />,
      })[page],
    [page, contratos, medicoes]
  );

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      <main>{content}</main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);