import "dotenv/config";
import { randomBytes, timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "tech_professor_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();

function passwordsMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function professorPasswordIsConfigured(): boolean {
  return Boolean(process.env.PROFESSOR_PASSWORD?.trim());
}

export function isProfessorPasswordValid(password: unknown): boolean {
  const expected = process.env.PROFESSOR_PASSWORD;
  if (typeof password !== "string" || !expected) return false;
  return passwordsMatch(password, expected);
}

export function createProfessorSession(res: Response): void {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_DURATION_MS);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearProfessorSession(req: Request, res: Response): void {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) sessions.delete(token);
  res.clearCookie(COOKIE_NAME);
}

export function requireProfessor(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];
  const expiresAt = token ? sessions.get(token) : undefined;
  if (!expiresAt || expiresAt < Date.now()) {
    if (token) sessions.delete(token);
    res.status(401).json({ erro: "Acesso restrito ao professor." });
    return;
  }
  next();
}