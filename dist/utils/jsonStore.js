"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJson = readJson;
exports.appendToJsonArray = appendToJsonArray;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
/**
 * Utilitário simples de persistência em arquivo JSON.
 * Usa apenas módulos nativos do Node (fs/promises) — sem banco de dados.
 * Uma fila (mutex) por arquivo evita corrupção quando várias respostas
 * chegam quase ao mesmo tempo (ex.: vários alunos enviando juntos).
 */
const locks = new Map();
function withLock(filePath, task) {
    const previous = locks.get(filePath) ?? Promise.resolve();
    const run = previous.then(task, task);
    locks.set(filePath, run.catch(() => undefined));
    return run;
}
async function readJson(filePath, fallback) {
    try {
        const raw = await fs_1.promises.readFile(filePath, "utf-8");
        if (raw.trim() === "") {
            return fallback;
        }
        return JSON.parse(raw);
    }
    catch (err) {
        if (err?.code === "ENOENT") {
            return fallback;
        }
        throw err;
    }
}
async function appendToJsonArray(filePath, entry) {
    return withLock(filePath, async () => {
        const list = await readJson(filePath, []);
        list.push(entry);
        await fs_1.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
        await fs_1.promises.writeFile(filePath, JSON.stringify(list, null, 2), "utf-8");
        return entry;
    });
}
