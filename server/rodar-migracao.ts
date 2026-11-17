import { criarBanco } from "./banco";
import { migrar } from "./migrar";

const banco = await criarBanco();
if (banco.tipo === "pglite") {
  console.error("Defina DATABASE_URL (connection string do Neon) para aplicar as migrações.");
  process.exit(1);
}
try {
  const { aplicadas } = await migrar(banco);
  console.log(aplicadas.length ? `Migrações aplicadas: ${aplicadas.join(", ")}` : "Banco já está atualizado.");
} finally {
  await banco.fechar();
}
