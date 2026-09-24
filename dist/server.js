"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const api_1 = require("./routes/api");
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.static(path_1.default.join(__dirname, "..", "public")));
app.use("/api", api_1.apiRouter);
// Qualquer rota não encontrada na API cai aqui; páginas estáticas já são
// resolvidas por express.static acima (index.html e as pastas dos formulários).
app.use("/api", (_req, res) => {
    res.status(404).json({ erro: "Rota de API não encontrada." });
});
function getLocalIps() {
    const interfaces = os_1.default.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] ?? []) {
            if (iface.family === "IPv4" && !iface.internal) {
                ips.push(iface.address);
            }
        }
    }
    return ips;
}
app.listen(PORT, "0.0.0.0", () => {
    console.log("\n=== TECH App rodando ===");
    console.log(`Local:   http://localhost:${PORT}`);
    const ips = getLocalIps();
    if (ips.length > 0) {
        ips.forEach((ip) => console.log(`Rede:    http://${ip}:${PORT}`));
    }
    else {
        console.log("\nNenhum IP de rede local detectado. Verifique a conexão de rede.");
    }
    console.log("========================\n");
});
