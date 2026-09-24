import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import os from "os";
import { apiRouter } from "./routes/api";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", apiRouter);

// Qualquer rota não encontrada na API cai aqui; páginas estáticas já são
// resolvidas por express.static acima (index.html e as pastas dos formulários).
app.use("/api", (_req, res) => {
  res.status(404).json({ erro: "Rota de API não encontrada." });
});

function getLocalIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
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
    
  } else {
    console.log("\nNenhum IP de rede local detectado. Verifique a conexão de rede.");
  }
  console.log("========================\n");
});