// ============================================================
// CONFIG (localStorage faz o papel do chrome.storage.local da extensão)
// ============================================================

const CONFIG_KEY = "papConfig";

function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch (_) {
    return {};
  }
}

function setConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function configCompleto(config) {
  return !!(config.login && config.senha && config.codUser && config.apiUrl);
}

// ============================================================
// CHAMADA À API DO BOT
// ============================================================

async function chamarApi(acao, extra) {
  const config = getConfig();

  const body = {
    login: config.login,
    senha: config.senha,
    cod_user: config.codUser,
    solicitante: config.nome || config.login,
    acao,
    ...extra
  };

  const resposta = await fetch(config.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resposta.ok) {
    throw new Error(`Erro HTTP ${resposta.status} ao falar com a API.`);
  }

  return await resposta.json();
}

// ============================================================
// VIEWS: CONFIG x APP
// ============================================================

const viewConfig = document.getElementById("view-config");
const viewApp = document.getElementById("view-app");

function mostrarConfig() {
  const config = getConfig();
  document.getElementById("cfg-login").value = config.login || "";
  document.getElementById("cfg-senha").value = config.senha || "";
  document.getElementById("cfg-cod-user").value = config.codUser || "";
  document.getElementById("cfg-nome").value = config.nome || "";
  document.getElementById("cfg-api").value = config.apiUrl || "";

  viewConfig.style.display = "block";
  viewApp.style.display = "none";
}

function mostrarApp() {
  viewConfig.style.display = "none";
  viewApp.style.display = "block";
}

document.getElementById("btn-config-toggle").addEventListener("click", () => {
  if (viewConfig.style.display === "none") {
    mostrarConfig();
  } else if (configCompleto(getConfig())) {
    mostrarApp();
  }
});

document.getElementById("link-config").addEventListener("click", mostrarConfig);

document.getElementById("btn-cfg-salvar").addEventListener("click", () => {
  const statusEl = document.getElementById("status-config");

  const config = {
    login: document.getElementById("cfg-login").value.trim(),
    senha: document.getElementById("cfg-senha").value,
    codUser: document.getElementById("cfg-cod-user").value.trim(),
    nome: document.getElementById("cfg-nome").value.trim(),
    apiUrl: document.getElementById("cfg-api").value.trim()
  };

  if (!configCompleto(config)) {
    statusEl.textContent = "Preencha login, senha, código do usuário e o endereço da API.";
    statusEl.className = "status erro";
    return;
  }

  setConfig(config);
  statusEl.textContent = "Dados salvos.";
  statusEl.className = "status sucesso";

  mostrarApp();
});

// Tela inicial: se já tem config salva, vai direto pro app.
if (configCompleto(getConfig())) {
  mostrarApp();
} else {
  mostrarConfig();
}

// ============================================================
// TABS
// ============================================================

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

function ativarTab(nome) {
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === nome));
  tabContents.forEach((c) => c.classList.toggle("active", c.id === "tab-" + nome));
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => ativarTab(btn.dataset.tab));
});

// ============================================================
// MÁSCARA DE HORA (00:00)
// ============================================================

function aplicarMascaraHora(input) {
  if (!input) return;
  input.addEventListener("input", () => {
    const digitos = input.value.replace(/\D/g, "").slice(0, 4);
    input.value = digitos.length > 2
      ? digitos.slice(0, 2) + ":" + digitos.slice(2)
      : digitos;
  });
}

aplicarMascaraHora(document.getElementById("oc-chegada"));

// ============================================================
// NOVA OCORRÊNCIA
// ============================================================

const formOcorrencia = document.getElementById("form-ocorrencia");
const statusOcorrencia = document.getElementById("status-ocorrencia");

formOcorrencia.addEventListener("submit", async (event) => {
  event.preventDefault();

  const cliente = document.getElementById("oc-cliente").value.trim();
  const solicitante = document.getElementById("oc-solicitante").value.trim();
  const motivo = document.getElementById("oc-motivo").value.trim();
  const horarioEntrada = document.getElementById("oc-chegada").value.trim();

  statusOcorrencia.textContent = "Criando ocorrência...";
  statusOcorrencia.className = "status";

  try {
    const resposta = await chamarApi("criar_ocorrencia", {
      nome: cliente,
      solicitante,
      motivo,
      horario_entrada: horarioEntrada
    });

    statusOcorrencia.textContent = resposta.mensagem || "Concluído.";
    statusOcorrencia.className = "status " + (resposta.sucesso ? "sucesso" : "erro");

    if (resposta.sucesso) {
      formOcorrencia.reset();
    }
  } catch (erro) {
    statusOcorrencia.textContent = "Erro: " + erro.message;
    statusOcorrencia.className = "status erro";
  }
});

// ============================================================
// REALIZADO (listar + finalizar) e BUSCAR — compartilham a
// mesma tela de detalhe/finalizar.
// ============================================================

const listaAgendaView = document.getElementById("realizado-lista-view");
const detalheView = document.getElementById("realizado-detalhe-view");
const listaAgendaDiv = document.getElementById("lista-agenda");
const listaBuscarDiv = document.getElementById("lista-buscar");
const contextoOcorrencia = document.getElementById("contexto-ocorrencia");
const servicoRealizadoField = document.getElementById("servico-realizado");
const statusDetalhe = document.getElementById("status-detalhe");

let ocorrenciaSelecionada = null;
let origemDetalhe = "realizado"; // "realizado" ou "buscar"

function renderizarCard(ocorrencia, origem) {
  const card = document.createElement("div");
  card.className = "agenda-item";

  const cliente = ocorrencia.cliente || "Cliente não identificado";
  const marcada = ocorrencia.marcada || "-";
  const assunto = ocorrencia.assunto || "-";
  const motivo = ocorrencia.motivo || "-";

  card.innerHTML =
    `<span class="cliente">${escapeHtml(cliente)}</span>` +
    `<span class="linha"><b>AG:</b> ${escapeHtml(ocorrencia.ag || "-")} &nbsp; <b>Marcado:</b> ${escapeHtml(marcada)}</span>` +
    `<span class="linha"><b>Assunto:</b> ${escapeHtml(assunto)}</span>` +
    `<span class="linha"><b>Motivo:</b> ${escapeHtml(motivo)}</span>`;

  card.addEventListener("click", () => abrirDetalhe(ocorrencia, origem));

  return card;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function abrirDetalhe(ocorrencia, origem) {
  ocorrenciaSelecionada = ocorrencia;
  origemDetalhe = origem;

  servicoRealizadoField.value = "";
  statusDetalhe.textContent = "";
  statusDetalhe.className = "status";

  contextoOcorrencia.innerHTML =
    `<p><strong>Cliente:</strong> ${escapeHtml(ocorrencia.cliente || "-")}</p>` +
    `<p><strong>AG:</strong> ${escapeHtml(ocorrencia.ag || "-")}</p>` +
    `<p><strong>Marcado:</strong> ${escapeHtml(ocorrencia.marcada || "-")}</p>` +
    `<p><strong>Assunto:</strong> ${escapeHtml(ocorrencia.assunto || "-")}</p>` +
    `<p><strong>Motivo:</strong> ${escapeHtml(ocorrencia.motivo || "-")}</p>`;

  ativarTab("realizado");
  listaAgendaView.style.display = "none";
  detalheView.style.display = "block";
}

function voltarParaLista() {
  detalheView.style.display = "none";

  if (origemDetalhe === "buscar") {
    ativarTab("buscar");
  } else {
    ativarTab("realizado");
    listaAgendaView.style.display = "block";
  }

  ocorrenciaSelecionada = null;
}

document.querySelectorAll(".btn-voltar").forEach((btn) => {
  btn.addEventListener("click", voltarParaLista);
});

// --- Buscar agenda (abertas) ---

document.getElementById("btn-listar").addEventListener("click", async () => {
  const statusRealizado = document.getElementById("status-realizado");
  const btnListar = document.getElementById("btn-listar");

  statusRealizado.textContent = "Buscando ocorrências em aberto...";
  statusRealizado.className = "status";
  listaAgendaDiv.innerHTML = "";
  btnListar.disabled = true;

  try {
    const resposta = await chamarApi("listar", {});
    btnListar.disabled = false;

    if (!resposta.sucesso) {
      statusRealizado.textContent = "Erro: " + resposta.mensagem;
      statusRealizado.className = "status erro";
      return;
    }

    const lista = resposta.ocorrencias || [];

    if (!lista.length) {
      statusRealizado.textContent = "Nenhuma ocorrência em aberto encontrada.";
      statusRealizado.className = "status";
      return;
    }

    statusRealizado.textContent = "";

    lista.forEach((ocorrencia) => {
      listaAgendaDiv.appendChild(renderizarCard(ocorrencia, "realizado"));
    });

  } catch (erro) {
    btnListar.disabled = false;
    statusRealizado.textContent = "Erro: " + erro.message;
    statusRealizado.className = "status erro";
  }
});

// --- Finalizar ocorrência ---

document.getElementById("btn-finalizar").addEventListener("click", async () => {
  if (!ocorrenciaSelecionada) return;

  const servicoRealizado = servicoRealizadoField.value.trim();
  const btnFinalizar = document.getElementById("btn-finalizar");

  if (!servicoRealizado) {
    statusDetalhe.textContent = "Descreva o serviço realizado antes de finalizar.";
    statusDetalhe.className = "status erro";
    return;
  }

  btnFinalizar.disabled = true;
  statusDetalhe.textContent = "Finalizando ocorrência...";
  statusDetalhe.className = "status";

  try {
    const resposta = await chamarApi("finalizar", {
      ag: ocorrenciaSelecionada.ag,
      servico_realizado: servicoRealizado
    });

    btnFinalizar.disabled = false;

    statusDetalhe.textContent = resposta.mensagem || "Concluído.";
    statusDetalhe.className = "status " + (resposta.sucesso ? "sucesso" : "erro");

    if (resposta.sucesso) {
      setTimeout(voltarParaLista, 1200);
    }
  } catch (erro) {
    btnFinalizar.disabled = false;
    statusDetalhe.textContent = "Erro: " + erro.message;
    statusDetalhe.className = "status erro";
  }
});

// --- Buscar por CNPJ/código ---

const formBuscar = document.getElementById("form-buscar");

formBuscar.addEventListener("submit", async (event) => {
  event.preventDefault();

  const statusBuscar = document.getElementById("status-buscar");
  const query = document.getElementById("buscar-query").value.trim();

  listaBuscarDiv.innerHTML = "";
  statusBuscar.textContent = "Buscando...";
  statusBuscar.className = "status";

  try {
    const resposta = await chamarApi("buscar", { cnpj: query });

    if (!resposta.sucesso) {
      statusBuscar.textContent = "Erro: " + resposta.mensagem;
      statusBuscar.className = "status erro";
      return;
    }

    const lista = resposta.ocorrencias || [];

    if (!lista.length) {
      statusBuscar.textContent = "Nenhuma ocorrência encontrada.";
      statusBuscar.className = "status";
      return;
    }

    statusBuscar.textContent = "";

    lista.forEach((ocorrencia) => {
      listaBuscarDiv.appendChild(renderizarCard(ocorrencia, "buscar"));
    });

  } catch (erro) {
    statusBuscar.textContent = "Erro: " + erro.message;
    statusBuscar.className = "status erro";
  }
});

// ============================================================
// SERVICE WORKER (instalação como PWA)
// ============================================================

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
