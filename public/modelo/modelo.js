(async function () {
  const formKey = new URLSearchParams(window.location.search).get("form") || "modelo";
  const container = document.getElementById("questoes-container");
  const form = document.getElementById("form-modelo");
  const submitButton = document.getElementById("btn-enviar");
  let questoes = [];
  let escala = { min: 1, max: 5, rotulos: {} };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function questionElement(question, index) {
    const questionText = `${index + 1}. ${escapeHtml(question.pergunta)}`;
    const dimension = question.dimensao
      ? `<div class="dimensao">${escapeHtml(question.dimensao)}</div>`
      : "";

    if (question.tipo === "multipla_escolha") {
      const options = (question.opcoes || []).map((option, optionIndex) => `
        <label>
          <input type="radio" name="${escapeHtml(question.id)}" value="${optionIndex}" required />
          ${escapeHtml(option)}
        </label>`).join("");
      return `<div class="question-card">${dimension}<p class="pergunta">${questionText}</p><div class="options">${options}</div></div>`;
    }

    if (question.tipo === "likert") {
      const min = Number(escala.min);
      const max = Number(escala.max);
      const options = Array.from({ length: max - min + 1 }, (_, offset) => {
        const value = min + offset;
        const label = escala.rotulos?.[value] ? ` — ${escapeHtml(escala.rotulos[value])}` : "";
        return `<label><input type="radio" name="${escapeHtml(question.id)}" value="${value}" required />${value}${label}</label>`;
      }).join("");
      return `<div class="question-card">${dimension}<p class="pergunta">${questionText}</p><div class="likert-scale">${options}</div></div>`;
    }

    return `<div class="question-card">${dimension}<p class="pergunta">${questionText}</p><textarea name="${escapeHtml(question.id)}" placeholder="Escreva sua resposta..."></textarea></div>`;
  }

  function renderQuestions() {
    container.innerHTML = questoes.map(questionElement).join("");
  }

  function getAnswerElement(question) {
    return form.elements[question.id];
  }

  function isAnswered(question) {
    const element = getAnswerElement(question);
    if (!element) return false;
    if (element instanceof RadioNodeList) return Array.from(element).some((radio) => radio.checked);
    return element.value.trim() !== "";
  }

  function updateQuestionProgress() {
    updateProgress(questoes.filter(isAnswered).length, questoes.length);
  }

  try {
    const data = await fetchQuestions(formKey);
    document.title = `${data.titulo || "Formulário"} — TECH`;
    document.getElementById("titulo-form").textContent = data.titulo || "Formulário";
    document.getElementById("descricao-form").textContent = data.descricao || "";
    escala = data.escala || escala;
    questoes = Array.isArray(data.questoes) ? data.questoes : [];
    renderQuestions();
    container.addEventListener("input", updateQuestionProgress);
    updateQuestionProgress();
  } catch (err) {
    showAlert("error", err.message);
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert();

    const identificacao = collectIdentification();
    if (!identificacao.nome) {
      showAlert("error", "Por favor, informe seu nome.");
      return;
    }

    const respostas = {};
    for (const question of questoes) {
      const element = getAnswerElement(question);
      if (!isAnswered(question)) {
        showAlert("error", `Responda a pergunta: "${question.pergunta}"`);
        return;
      }
      if (question.tipo === "multipla_escolha" || question.tipo === "likert") {
        const selected = Array.from(element).find((radio) => radio.checked);
        respostas[question.id] = Number(selected.value);
      } else {
        respostas[question.id] = element.value.trim();
      }
    }

    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    try {
      await submitAnswers(formKey, { identificacao, respostas });
      form.style.display = "none";
      updateProgress(1, 1);
      showAlert("success", "Respostas enviadas com sucesso! Obrigado por participar.");
    } catch (err) {
      showAlert("error", err.message);
      submitButton.disabled = false;
      submitButton.textContent = "Enviar respostas";
    }
  });
})();