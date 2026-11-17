import { criarAdministrador } from "./admin";
import { criarBanco } from "./banco";

// Cria (ou promove) o primeiro administrador. Uso:
//   ADMIN_EMAIL=voce@empresa.com ADMIN_NOME="Seu Nome" ADMIN_SENHA='uma-senha-forte' pnpm db:admin
const email = process.env.ADMIN_EMAIL?.trim();
const senha = process.env.ADMIN_SENHA;
if (!email || !senha || senha.length < 8) {
  console.error("Informe ADMIN_EMAIL e ADMIN_SENHA (mínimo de 8 caracteres).");
  process.exit(1);
}

const banco = await criarBanco();
try {
  const { criado } = await criarAdministrador(banco, { email, nome: process.env.ADMIN_NOME?.trim() || "Administrador", senha });
  console.log(criado ? `Administrador ${email} criado. Ele troca a senha no primeiro acesso.` : `${email} já existia: agora é administrador.`);
} finally {
  await banco.fechar();
}
