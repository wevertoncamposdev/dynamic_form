// Funções utilitárias compartilhadas pelos formulários de avaliação e pesquisa.

async function fetchQuestions(formKey) {
  const res = await fetch(`/api/questions/${formKey}`);
  if (!res.ok) throw new Error("Não foi possível carregar as perguntas.");
  return res.json();
}

async function submitAnswers(formKey, payload) {
  const res = await fetch(`/api/respostas/${formKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erro || "Erro ao enviar respostas.");
  return data;
}

function showAlert(type, message) {
  const el = document.getElementById("alerta");
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearAlert() {
  document.getElementById("alerta").innerHTML = "";
}

function updateProgress(answeredCount, totalCount) {
  const pct = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);
  document.getElementById("progress").style.width = pct + "%";
}

function collectIdentification() {
  return {
    nome: document.getElementById("nome").value.trim(),
    idade: document.getElementById("idade").value
      ? Number(document.getElementById("idade").value)
      : null,
    serie: document.getElementById("serie").value.trim() || null,
    turma: document.getElementById("turma").value.trim() || null,
  };
}