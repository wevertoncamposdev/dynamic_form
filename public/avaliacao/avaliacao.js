(async function () {
  const FORM_KEY = "avaliacao";
  const container = document.getElementById("questoes-container");
  const form = document.getElementById("form-avaliacao");
  let questoes = [];

  try {
    const data = await fetchQuestions(FORM_KEY);
    document.getElementById("titulo-form").textContent = data.titulo;
    document.getElementById("descricao-form").textContent = data.descricao;
    questoes = data.questoes;
    renderQuestions(questoes);
  } catch (err) {
    showAlert("error", err.message);
    return;
  }

  function renderQuestions(questoes) {
    container.innerHTML = questoes
      .map((q, idx) => {
        if (q.tipo === "multipla_escolha") {
          const opcoes = q.opcoes
            .map(
              (op, i) => `
              <label>
                <input type="radio" name="${q.id}" value="${i}" required />
                ${op}
              </label>`
            )
            .join("");
          return `
            <div class="question-card">
              <p class="pergunta">${idx + 1}. ${q.pergunta}</p>
              <div class="options">${opcoes}</div>
            </div>`;
        }
        // aberta
        return `
          <div class="question-card">
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
      if (q.tipo === "multipla_escolha") {
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
      showAlert("success", "Avaliação enviada com sucesso! Obrigado por participar. 🎉");
    } catch (err) {
      showAlert("error", err.message);
      btn.disabled = false;
      btn.textContent = "Enviar avaliação";
    }
  });
})();