(async function () {
  const FORM_KEY = "pesquisa";
  const container = document.getElementById("questoes-container");
  const form = document.getElementById("form-pesquisa");
  let questoes = [];
  let rotulos = {};

  try {
    const data = await fetchQuestions(FORM_KEY);
    document.getElementById("titulo-form").textContent = data.titulo;
    document.getElementById("descricao-form").textContent = data.descricao;
    questoes = data.questoes;
    rotulos = (data.escala && data.escala.rotulos) || {};
    renderQuestions(questoes);
  } catch (err) {
    showAlert("error", err.message);
    return;
  }

  function renderQuestions(questoes) {
    container.innerHTML = questoes
      .map((q, idx) => {
        const dimensaoTag = q.dimensao ? `<div class="dimensao">${q.dimensao}</div>` : "";
        if (q.tipo === "likert") {
          const opcoes = [1, 2, 3, 4, 5]
            .map(
              (n) => `
              <label>
                <input type="radio" name="${q.id}" value="${n}" required />
                ${n} — ${rotulos[n] || ""}
              </label>`
            )
            .join("");
          return `
            <div class="question-card">
              ${dimensaoTag}
              <p class="pergunta">${idx + 1}. ${q.pergunta}</p>
              <div class="likert-scale">${opcoes}</div>
            </div>`;
        }
        // aberta
        return `
          <div class="question-card">
            ${dimensaoTag}
            <p class="pergunta">${idx + 1}. ${q.pergunta}</p>
            <textarea name="${q.id}" placeholder="Escreva sua resposta..."></textarea>
          </div>`;
      })
      .join("");

    container.addEventListener("input", () => {
      const answered = questoes.filter((q) => {
        const el = form.elements[q.id];
        if (!el) return false;
        if (el instanceof RadioNodeList) {
          return Array.from(el).some((r) => r.checked);
        }
        return el.value && el.value.trim() !== "";
      }).length;
      updateProgress(answered, questoes.length);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAlert();

    const identificacao = collectIdentification();
    if (!identificacao.nome) {
      showAlert("error", "Por favor, informe seu nome.");
      return;
    }

    const respostas = {};
    for (const q of questoes) {
      const el = form.elements[q.id];
      if (q.tipo === "likert") {
        const selected = el instanceof RadioNodeList ? Array.from(el).find((r) => r.checked) : null;
        if (!selected) {
          showAlert("error", `Responda a pergunta: "${q.pergunta}"`);
          return;
        }
        respostas[q.id] = Number(selected.value);
      } else {
        respostas[q.id] = el.value.trim();
      }
    }

    const btn = document.getElementById("btn-enviar");
    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
      await submitAnswers(FORM_KEY, { identificacao, respostas });
      form.style.display = "none";
      updateProgress(1, 1);
      showAlert("success", "Pesquisa enviada com sucesso! Obrigado por participar. 🎉");
    } catch (err) {
      showAlert("error", err.message);
      btn.disabled = false;
      btn.textContent = "Enviar pesquisa";
    }
  });
})();