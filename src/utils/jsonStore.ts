import { promises as fs } from "fs";
import path from "path";

/**
 * Utilitário simples de persistência em arquivo JSON.
 * Usa apenas módulos nativos do Node (fs/promises) — sem banco de dados.
 * Uma fila (mutex) por arquivo evita corrupção quando várias respostas
 * chegam quase ao mesmo tempo (ex.: vários alunos enviando juntos).
 */

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(filePath) ?? Promise.resolve();
  const run = previous.then(task, task);
  locks.set(
    filePath,
    run.catch(() => undefined)
  );
  return run;
}

export async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    if (raw.trim() === "") {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return fallback;
    }
    throw err;
  }
}

export async function appendToJsonArray<T extends Record<string, unknown>>(
  filePath: string,
  entry: T
): Promise<T> {
  return withLock(filePath, async () => {
    const list = await readJson<T[]>(filePath, []);
    list.push(entry);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(list, null, 2), "utf-8");
    return entry;
  });
}