"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const jsonStore_1 = require("../utils/jsonStore");
const professorAuth_1 = require("../utils/professorAuth");
const DATA_DIR = path_1.default.join(__dirname, "..", "..", "data");
const FORMS = {
    avaliacao: {
        questoes: path_1.default.join(DATA_DIR, "avaliacao", "questions-avaliacao.json"),
        respostas: path_1.default.join(DATA_DIR, "avaliacao", "responses-avaliacao.json"),
    },
    pesquisa: {
        questoes: path_1.default.join(DATA_DIR, "pesquisa", "questions-pesquisa.json"),
        respostas: path_1.default.join(DATA_DIR, "pesquisa", "responses-pesquisa.json"),
    },
    modelo: {
        questoes: path_1.default.join(DATA_DIR, "modelo", "questions-modelo.json"),
        respostas: path_1.default.join(DATA_DIR, "modelo", "responses-modelo.json"),
    },
};
function isFormKey(value) {
    return value === "avaliacao" || value === "pesquisa" || value === "modelo";
}
exports.apiRouter = (0, express_1.Router)();
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateFormData(questionsData, responsesData) {
    const errors = [];
    const questions = isObject(questionsData) && Array.isArray(questionsData.questoes)
        ? questionsData.questoes
        : [];
    const responses = Array.isArray(responsesData) ? responsesData : [];
    const questionIds = new Set();
    const questionMap = new Map();
    if (!isObject(questionsData))
        errors.push("questions: o arquivo deve conter um objeto.");
    if (!Array.isArray(responsesData))
        errors.push("responses: o arquivo deve conter um array.");
    if (questions.length === 0)
        errors.push("questions: a propriedade questoes está vazia ou ausente.");
    questions.forEach((question, index) => {
        if (!isObject(question)) {
            errors.push(`questions[${index}]: questão inválida.`);
            return;
        }
        const id = question.id;
        if (typeof id !== "string" || !id.trim()) {
            errors.push(`questions[${index}]: id ausente.`);
            return;
        }
        if (questionIds.has(id))
            errors.push(`questions: id duplicado '${id}'.`);
        questionIds.add(id);
        questionMap.set(id, question);
        if (typeof question.pergunta !== "string" || !question.pergunta.trim()) {
            errors.push(`questions[${index}]: pergunta ausente.`);
        }
        if (question.tipo === "multipla_escolha") {
            if (!Array.isArray(question.opcoes) || question.opcoes.length === 0) {
                errors.push(`questions[${index}]: opções ausentes.`);
            }
            if (typeof question.resposta_correta !== "number" ||
                !Number.isInteger(question.resposta_correta) ||
                question.resposta_correta < 0 ||
                question.resposta_correta >= (Array.isArray(question.opcoes) ? question.opcoes.length : 0)) {
                errors.push(`questions[${index}]: resposta_correta inválida.`);
            }
        }
        else if (question.tipo !== "likert" && question.tipo !== "aberta") {
            errors.push(`questions[${index}]: tipo '${String(question.tipo)}' desconhecido.`);
        }
    });
    const validResponses = [];
    responses.forEach((response, index) => {
        if (!isObject(response)) {
            errors.push(`responses[${index}]: envio inválido.`);
            return;
        }
        if (typeof response.id !== "string" || !response.id)
            errors.push(`responses[${index}]: id ausente.`);
        if (typeof response.enviadoEm !== "string" || Number.isNaN(Date.parse(response.enviadoEm))) {
            errors.push(`responses[${index}]: enviadoEm inválido.`);
        }
        if (!isObject(response.identificacao) || typeof response.identificacao.nome !== "string" ||
            !response.identificacao.nome.trim()) {
            errors.push(`responses[${index}]: identificação/nome inválidos.`);
        }
        if (!isObject(response.respostas)) {
            errors.push(`responses[${index}]: respostas devem ser um objeto.`);
            return;
        }
        let acertos = 0;
        let corrigiveis = 0;
        Object.entries(response.respostas).forEach(([questionId, answer]) => {
            const question = questionMap.get(questionId);
            if (!question) {
                errors.push(`responses[${index}]: questão desconhecida '${questionId}'.`);
                return;
            }
            if (question.tipo === "multipla_escolha") {
                corrigiveis += 1;
                if (typeof answer !== "number" || !Number.isInteger(answer) ||
                    answer < 0 || answer >= (Array.isArray(question.opcoes) ? question.opcoes.length : 0)) {
                    errors.push(`responses[${index}].${questionId}: opção inválida.`);
                }
                else if (answer === question.resposta_correta) {
                    acertos += 1;
                }
            }
            else if (question.tipo === "likert") {
                const scale = isObject(questionsData) && isObject(questionsData.escala)
                    ? questionsData.escala
                    : undefined;
                const min = typeof scale?.min === "number" ? scale.min : 1;
                const max = typeof scale?.max === "number" ? scale.max : 5;
                if (typeof answer !== "number" || !Number.isInteger(answer) || answer < min || answer > max) {
                    errors.push(`responses[${index}].${questionId}: valor Likert inválido.`);
                }
            }
            else if (typeof answer !== "string") {
                errors.push(`responses[${index}].${questionId}: resposta aberta inválida.`);
            }
        });
        validResponses.push({ ...response, resultado: { acertos, corrigiveis } });
    });
    const dimensions = new Map();
    validResponses.forEach((response) => {
        const answers = isObject(response.respostas) ? response.respostas : {};
        questions.forEach((question) => {
            if (!isObject(question) || question.tipo !== "likert" || typeof question.id !== "string")
                return;
            const answer = answers[question.id];
            if (typeof answer !== "number")
                return;
            const dimension = typeof question.dimensao === "string" ? question.dimensao : "Sem dimensão";
            const current = dimensions.get(dimension) ?? { total: 0, count: 0 };
            current.total += answer;
            current.count += 1;
            dimensions.set(dimension, current);
        });
    });
    return {
        valido: errors.length === 0,
        erros: errors,
        totalQuestoes: questions.length,
        totalRespostas: responses.length,
        questoes: questions,
        respostas: validResponses,
        resumo: Array.from(dimensions, ([dimensao, value]) => ({
            dimensao,
            media: Number((value.total / value.count).toFixed(2)),
            respostas: value.count,
        })),
    };
}
exports.apiRouter.post("/professor/login", (req, res) => {
    if (!(0, professorAuth_1.professorPasswordIsConfigured)()) {
        return res.status(503).json({ erro: "Configure PROFESSOR_PASSWORD no arquivo .env." });
    }
    if (!(0, professorAuth_1.isProfessorPasswordValid)(req.body?.senha)) {
        return res.status(401).json({ erro: "Senha inválida." });
    }
    (0, professorAuth_1.createProfessorSession)(res);
    res.json({ ok: true });
});
exports.apiRouter.get("/professor/login", (_req, res) => {
    res.status(405).json({ erro: "Use POST /api/professor/login enviando { senha }." });
});
exports.apiRouter.post("/professor/logout", (req, res) => {
    (0, professorAuth_1.clearProfessorSession)(req, res);
    res.json({ ok: true });
});
exports.apiRouter.get("/professor/status", professorAuth_1.requireProfessor, (_req, res) => {
    res.json({ autenticado: true });
});
exports.apiRouter.get("/professor/respostas/:form", professorAuth_1.requireProfessor, async (req, res) => {
    const { form } = req.params;
    if (typeof form !== "string" || !isFormKey(form)) {
        return res.status(404).json({ erro: "Formulário não encontrado." });
    }
    try {
        const [questions, responses] = await Promise.all([
            (0, jsonStore_1.readJson)(FORMS[form].questoes, null),
            (0, jsonStore_1.readJson)(FORMS[form].respostas, []),
        ]);
        res.json({ form, ...validateFormData(questions, responses) });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao validar os arquivos do formulário." });
    }
});
// GET /api/questions/:form  -> devolve o JSON de perguntas do formulário
exports.apiRouter.get("/questions/:form", async (req, res) => {
    const { form } = req.params;
    if (typeof form !== "string" || !isFormKey(form)) {
        return res.status(404).json({ erro: "Formulário não encontrado." });
    }
    try {
        const questoes = await (0, jsonStore_1.readJson)(FORMS[form].questoes, null);
        if (!questoes) {
            return res.status(404).json({ erro: "Perguntas não encontradas." });
        }
        if (isObject(questoes) && Array.isArray(questoes.questoes)) {
            res.json({
                ...questoes,
                questoes: questoes.questoes.map((questao) => {
                    if (!isObject(questao))
                        return questao;
                    const { resposta_correta: _respostaCorreta, ...questaoPublica } = questao;
                    return questaoPublica;
                }),
            });
            return;
        }
        res.json(questoes);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao carregar as perguntas." });
    }
});
// POST /api/respostas/:form -> grava uma resposta no arquivo JSON correspondente
exports.apiRouter.post("/respostas/:form", async (req, res) => {
    const { form } = req.params;
    if (typeof form !== "string" || !isFormKey(form)) {
        return res.status(404).json({ erro: "Formulário não encontrado." });
    }
    const { identificacao, respostas } = req.body ?? {};
    if (!identificacao || typeof identificacao !== "object") {
        return res.status(400).json({ erro: "Dados de identificação ausentes." });
    }
    if (!identificacao.nome || String(identificacao.nome).trim() === "") {
        return res.status(400).json({ erro: "Nome é obrigatório." });
    }
    if (!respostas || typeof respostas !== "object") {
        return res.status(400).json({ erro: "Respostas ausentes." });
    }
    const entrada = {
        id: (0, crypto_1.randomUUID)(),
        enviadoEm: new Date().toISOString(),
        identificacao: {
            nome: String(identificacao.nome).trim(),
            idade: identificacao.idade ?? null,
            serie: identificacao.serie ?? null,
            turma: identificacao.turma ?? null,
        },
        respostas,
    };
    try {
        await (0, jsonStore_1.appendToJsonArray)(FORMS[form].respostas, entrada);
        res.status(201).json({ ok: true, id: entrada.id });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro ao salvar a resposta." });
    }
});
