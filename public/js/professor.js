const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const reportContent = document.getElementById("report-content");
const reportAlert = document.getElementById("report-alerta");
let activeForm = "avaliacao";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function showLoginAlert(message, type = "error") {
  document.getElementById("login-alerta").innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

function showReportAlert(message, type = "error") {
  reportAlert.innerHTML = `<div class="alert alert-${type}">${escapeHtml(message)}</div>`;
}

async function requestReport(form) {
  const response = await fetch(`/api/professor/respostas/${form}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.erro || "Não foi possível carregar o relatório.");
  return data;
}

function answerLabel(question, answer) {
  if (question.tipo === "multipla_escolha" && Array.isArray(question.opcoes)) {
    const option = question.opcoes[answer];
    return option === undefined ? `Opção inválida (${answer})` : `${answer + 1}. ${option}`;
  }
  return answer === null || answer === undefined || answer === "" ? "Não respondida" : answer;
}

function renderResponse(response, questions, form) {
  const answers = response.respostas || {};
  const result = response.resultado || {};
  const resultText = form === "avaliacao" && result.corrigiveis ? `<span class="response-score">${result.acertos}/${result.corrigiveis} acertos</span>` : "";
  const answerRows = questions.map((question) => `<div class="answer-row"><span>${escapeHtml(question.pergunta)}</span><strong>${escapeHtml(answerLabel(question, answers[question.id]))}</strong></div>`).join("");
  return `<article class="response-card"><div class="response-heading"><div><h3>${escapeHtml(response.identificacao?.nome || "Sem nome")}</h3><p>${escapeHtml(response.identificacao?.serie || "")}${response.identificacao?.turma ? ` · ${escapeHtml(response.identificacao.turma)}` : ""}</p></div><div class="response-meta"><time>${escapeHtml(new Date(response.enviadoEm).toLocaleString("pt-BR"))}</time>${resultText}</div></div><div class="answer-list">${answerRows}</div></article>`;
}

function renderReport(report) {
  const questions = report.questoes || [];
  const validation = report.valido ? `<span class="validation-ok">JSON válido</span>` : `<span class="validation-error">${report.erros.length} problema(s) encontrado(s)</span>`;
  const errors = report.erros.length ? `<div class="validation-details"><strong>Problemas encontrados</strong><ul>${report.erros.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul></div>` : "";
  const summary = report.resumo?.length ? `<div class="summary-grid">${report.resumo.map((item) => `<div class="summary-item"><span>${escapeHtml(item.dimensao)}</span><strong>${item.media.toFixed(2)}</strong><small>${item.respostas} resposta(s)</small></div>`).join("")}</div>` : "";
  const responses = report.respostas?.length ? report.respostas.map((response) => renderResponse(response, questions, report.form)).join("") : `<div class="empty-state">Nenhuma resposta enviada ainda.</div>`;
  document.getElementById("dashboard-title").textContent = report.form === "avaliacao" ? "Avaliação da turma" : "Pesquisa da turma";
  reportContent.innerHTML = `<div class="report-stats"><div><span>Envios</span><strong>${report.totalRespostas}</strong></div><div><span>Questões</span><strong>${report.totalQuestoes}</strong></div><div><span>Integridade</span><strong>${validation}</strong></div></div>${errors}${summary}<div class="responses-heading"><h2>Respostas enviadas</h2><span>${report.totalRespostas} registro(s)</span></div>${responses}`;
}

async function loadReport(form) {
  activeForm = form;
  showReportAlert("Carregando dados...", "success");
  try { renderReport(await requestReport(form)); reportAlert.innerHTML = ""; } catch (error) { if (error.message.includes("Acesso restrito")) showDashboard(false); showReportAlert(error.message); }
}

function showDashboard(authenticated) { loginPanel.hidden = authenticated; dashboard.hidden = !authenticated; }

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const response = await fetch("/api/professor/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ senha: document.getElementById("senha").value }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return showLoginAlert(data.erro || "Não foi possível entrar.");
  loginForm.reset(); showLoginAlert("Acesso liberado.", "success"); showDashboard(true); loadReport(activeForm);
});

document.querySelectorAll(".teacher-tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".teacher-tab").forEach((item) => item.classList.remove("active")); tab.classList.add("active"); loadReport(tab.dataset.form); }));
document.getElementById("logout-button").addEventListener("click", async () => { await fetch("/api/professor/logout", { method: "POST" }); showDashboard(false); showLoginAlert("Sessão encerrada.", "success"); });
fetch("/api/professor/status").then((response) => { if (response.ok) { showDashboard(true); loadReport(activeForm); } });