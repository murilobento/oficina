# PWA — design (aprovado em 18/11/2026)

**Por quê:** abrir rápido e parecer aplicativo (ícone na tela inicial, tela cheia). Não é para trabalhar offline: o sistema continua "só online".

**Objetivos:** instalável (Android, iPhone, computador); casca do app guardada no aparelho; aviso de sem conexão; aviso de nova versão com botão Atualizar; item "Instalar app" no menu do usuário (no iPhone, instruções).
**Não-objetivos:** dados offline, notificações, ícone que acompanha o logo da Empresa.
**Anti-objetivos:** guardar respostas da API ou da sessão no cache (vazaria dados entre funcionários); atualizar sozinho no meio de um formulário.

**Abordagens:** (1) `vite-plugin-pwa` — escolhida: já suporta o Vite 8, gera service worker e manifesto; (2) service worker à mão — mais risco no cache e nas atualizações; (3) só manifesto — instala, mas não abre mais rápido.

**Decisões:** nome e ícone genéricos ("Oficina", chave inglesa) até o usuário mandar o logo; atualização por aviso (`registerType: "prompt"`); `/api/*` fora do cache e fora do fallback de navegação; `sw.js` sem cache na Vercel.
**Restrição:** só instala em https (Vercel); pelo IP da rede local (http) o navegador não registra o service worker.
