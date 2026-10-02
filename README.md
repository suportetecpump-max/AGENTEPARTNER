# Portal Partner — PWA

App web (instalável no celular) que faz a mesma coisa que a extensão
Chrome: criar, listar, preencher e finalizar ocorrências no Portal do
Franqueado. Ele não acessa o portal diretamente — ele fala com o seu
bot (server.py + Selenium), do mesmo jeito que o fluxo do WhatsApp já
faz.

```
PWA (navegador do celular) → POST /executar → bot Flask → Selenium → Portal
```

## Arquivos

- `index.html`, `style.css`, `app.js` — o app em si (3 abas: Nova
  Ocorrência, Realizado, Buscar — igual à extensão).
- `manifest.json` — nome, ícone e cor do app quando instalado.
- `service-worker.js` — deixa o app abrir rápido / funcionar offline
  (só a tela, não as ações, que sempre precisam de internet).
- `icons/` — ícones gerados (192px e 512px).

## 1. Subir para o GitHub

```bash
cd pwa
git init
git add .
git commit -m "Portal Partner PWA"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/portal-partner-pwa.git
git push -u origin main
```

Depois, no GitHub: **Settings → Pages → Branch: main / (root) → Save**.
Em alguns minutos o app fica disponível em algo como:

```
https://SEU_USUARIO.github.io/portal-partner-pwa/
```

## 2. ⚠️ O passo mais importante: HTTPS no bot

O GitHub Pages só serve em **HTTPS**. O seu bot hoje só responde em
**HTTP** (ex: `http://100.76.234.2:5000` ou IP interno). Navegador
nenhum deixa uma página HTTPS chamar uma API em HTTP puro — isso se
chama *mixed content* e é bloqueado por padrão, silenciosamente (o
`fetch` do app.js vai falhar).

Então, antes do PWA funcionar de verdade fora da sua rede, o bot
precisa de uma URL HTTPS na frente dele. O caminho mais rápido, sem
mexer em porta de roteador nem comprar domínio, é o **Cloudflare
Tunnel**:

```bash
# instala (uma vez)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# roda um túnel apontando pro bot (porta 5000)
cloudflared tunnel --url http://localhost:5000
```

Isso imprime uma URL tipo `https://alguma-coisa.trycloudflare.com`.
Use `https://alguma-coisa.trycloudflare.com/executar` como "Endereço
da API do bot" na tela de configuração do PWA.

(Essa URL do `trycloudflare.com` muda a cada vez que você reinicia o
túnel — pra uma URL fixa, crie uma conta Cloudflare grátis e configure
um túnel nomeado, ou use um domínio próprio com Nginx + Certbot.)

## 3. Habilitar CORS no bot

O `server.py` que te mandei já vem com `flask-cors` habilitado
(`CORS(app)`), mas a biblioteca precisa estar instalada na imagem do
bot. Adicione ao `Dockerfile` do bot (ou `requirements.txt`):

```
flask-cors
```

e rode:

```bash
docker compose up -d --build bot
```

## 4. Configurar o app

Abra a URL do GitHub Pages, toque no ⚙️ e preencha:

- **Login / Senha** — as mesmas credenciais do Portal do Franqueado.
- **Código usuário** — o mesmo "Usuário Partner" usado no WhatsApp
  (ex: 1579).
- **Seu nome** — usado como solicitante nas ocorrências.
- **Endereço da API do bot** — a URL HTTPS do passo 2, terminando em
  `/executar`.

Esses dados ficam salvos só no navegador daquele celular
(`localStorage`) — nada vai para o GitHub.

## 5. Instalar no celular

- **Android (Chrome):** menu (⋮) → "Adicionar à tela inicial".
- **iPhone (Safari):** botão de compartilhar → "Adicionar à Tela de
  Início".

O app abre em tela cheia, com ícone próprio, como se fosse nativo.

## O que cada aba faz

- **Nova Ocorrência** — igual à extensão: cliente, solicitante,
  motivo e horário de chegada opcional.
- **Realizado** — lista as ocorrências em aberto do seu usuário
  (Marcado / Assunto / Motivo), e ao tocar em uma você escreve o
  serviço realizado e finaliza (equivalente a "saída" + serviço
  realizado no WhatsApp).
- **Buscar** — procura ocorrências por CPF/CNPJ ou código do cliente,
  com a mesma tela de detalhe/finalizar.
