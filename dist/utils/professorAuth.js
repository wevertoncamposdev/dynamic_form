"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.professorPasswordIsConfigured = professorPasswordIsConfigured;
exports.isProfessorPasswordValid = isProfessorPasswordValid;
exports.createProfessorSession = createProfessorSession;
exports.clearProfessorSession = clearProfessorSession;
exports.requireProfessor = requireProfessor;
require("dotenv/config");
const crypto_1 = require("crypto");
const COOKIE_NAME = "tech_professor_session";
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
function passwordsMatch(received, expected) {
    const receivedBuffer = Buffer.from(received);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length &&
        (0, crypto_1.timingSafeEqual)(receivedBuffer, expectedBuffer);
}
function professorPasswordIsConfigured() {
    return Boolean(process.env.PROFESSOR_PASSWORD?.trim());
}
function isProfessorPasswordValid(password) {
    const expected = process.env.PROFESSOR_PASSWORD;
    if (typeof password !== "string" || !expected)
        return false;
    return passwordsMatch(password, expected);
}
function createProfessorSession(res) {
    const token = (0, crypto_1.randomBytes)(32).toString("hex");
    sessions.set(token, Date.now() + SESSION_DURATION_MS);
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_DURATION_MS,
    });
}
function clearProfessorSession(req, res) {
    const token = req.cookies?.[COOKIE_NAME];
    if (token)
        sessions.delete(token);
    res.clearCookie(COOKIE_NAME);
}
function requireProfessor(req, res, next) {
    const token = req.cookies?.[COOKIE_NAME];
    const expiresAt = token ? sessions.get(token) : undefined;
    if (!expiresAt || expiresAt < Date.now()) {
        if (token)
            sessions.delete(token);
        res.status(401).json({ erro: "Acesso restrito ao professor." });
        return;
    }
    next();
}
