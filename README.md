# INUHZAO Platform

Stack: **Node.js + Express** (Railway) · **Vanilla JS + Vite** (Vercel) · **PostgreSQL** (Supabase)

---

## 📁 Estrutura

```
inuhzao/
├── backend/
│   ├── server.js          ← servidor principal
│   ├── .env               ← variáveis (NÃO commitar)
│   ├── railway.json       ← config deploy Railway
│   ├── db/
│   │   ├── schema.sql     ← executa no Supabase
│   │   └── supabase.js    ← cliente Supabase
│   ├── middleware/
│   │   └── auth.js        ← requireAuth / requireAdmin
│   └── routes/
│       ├── auth.js        ← Twitch OAuth
│       ├── points.js      ← StreamElements
│       ├── shop.js        ← loja + resgates
│       ├── coupons.js     ← cupões
│       ├── giveaway.js    ← giveaways
│       ├── game.js        ← timers, hidra, disfarces
│       └── admin.js       ← painel admin
└── frontend/
    ├── src/
    │   ├── api.js         ← cliente API centralizado
    │   └── main.js        ← app principal
    ├── public/
    ├── index.html
    ├── vite.config.js
    └── vercel.json
```

---

## 🚀 DEPLOY — Passo a Passo

### PASSO 1 — Supabase (base de dados)

1. Entra em [supabase.com](https://supabase.com) → abre o projecto **inuhzao**
2. No menu lateral: **SQL Editor** → **New Query**
3. Copia todo o conteúdo de `backend/db/schema.sql`
4. Cola no editor e clica em **Run**
5. Deves ver as tabelas criadas em **Table Editor**

---

### PASSO 2 — GitHub (necessário para Railway e Vercel)

1. Cria um repositório no [github.com](https://github.com) (pode ser privado)
2. Na pasta do projecto, corre:
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/SEU_USER/inuhzao.git
git push -u origin main
```
⚠️ O ficheiro `.env` está no `.gitignore` e **NÃO** vai para o GitHub. As variáveis entram no Railway manualmente.

---

### PASSO 3 — Railway (backend)

1. Entra em [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo** → selecciona o teu repo
3. Railway vai detectar a pasta `backend/` automaticamente
4. Vai a **Variables** e adiciona estas variáveis (uma a uma):

```
SUPABASE_URL            = https://mpjavxlsfibastpwtwfe.supabase.co
SUPABASE_ANON_KEY       = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wamF2eGxzZmliYXN0cHd0d2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMjQ5NTMsImV4cCI6MjA5NTgwMDk1M30.I_0xPG05wirPOjyFMbMdkYTR9pBrbAT4fEUUHaihHh0
SUPABASE_SERVICE_KEY    = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wamF2eGxzZmliYXN0cHd0d2ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDIyNDk1MywiZXhwIjoyMDk1ODAwOTUzfQ.BmEqn2BtQ5s23Y_S1vM6HiFRazESQwYGYO2YwIffPNo
DATABASE_URL            = postgresql://postgres.mpjavxlsfibastpwtwfe:inuhzaobasedados@123456789@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
TWITCH_CLIENT_ID        = iy2gmu8cac1nufb1x0h35xz0dfgjwn
TWITCH_CLIENT_SECRET    = 7m8ymr26157v246bnb14pf542gh2d7
TWITCH_REDIRECT_URI     = https://SEU-PROJETO.up.railway.app/auth/callback
SE_ACCOUNT_ID           = 5c9b58f0ed93e1622409202c
SE_JWT                  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJjaXRhZGVsIiwiZXhwIjoxNzkyNjE3NjA4LCJqdGkiOiJjZDQ4MzZiYS05OTJkLTQ4Y2EtOTM2ZC05MTI4NzdiMDRjNGIiLCJjaGFubmVsIjoiNWM5YjU4ZjBlZDkzZTE2MjI0MDkyMDJjIiwicm9sZSI6Im93bmVyIiwiYXV0aFRva2VuIjoidVVpcXp2N3U1NThkV3k2bU14clhyNko5VDYtQVhtZENLelhFcHdlb19fYTVITzlwIiwidXNlciI6IjVjOWI1OGYwZWQ5M2UxMWVjNDA5MjAyYiIsInVzZXJfaWQiOiJiNTM3NmE2Zi1iOTBlLTQyZjktYjljYS05YmMzYmFlMDA4YjEiLCJ1c2VyX3JvbGUiOiJjcmVhdG9yIiwicHJvdmlkZXIiOiJ0d2l0Y2giLCJwcm92aWRlcl9pZCI6IjI2MzYwMTY0OSIsImNoYW5uZWxfaWQiOiJmMmJhMjYzMC1hYmVlLTRjNzAtYWU4My0wMjJjNDVkYmRhZWUiLCJjcmVhdG9yX2lkIjoiZGU5NjNjNjItY2IwYy00ZWMyLWIwMTktMjVkNWUyZDM3NDQ0In0.WLsxFi65LFebkXDxopzcc1OCPnHFxJKRV2fNdB0GSpw
SESSION_SECRET          = inuhzao_super_secret_session_key_2025_muda_isto
ADMIN_USERS             = inuhzao
PORT                    = 3000
NODE_ENV                = production
FRONTEND_URL            = https://SEU-PROJETO.vercel.app
```

5. Railway faz deploy automático — copia o URL gerado (ex: `https://inuhzao-production.up.railway.app`)

---

### PASSO 4 — Twitch (actualizar redirect URL)

1. Vai a [dev.twitch.tv/console](https://dev.twitch.tv/console) → a tua app **inuhzao**
2. Em **OAuth Redirect URLs** adiciona:
   ```
   https://SEU-PROJETO.up.railway.app/auth/callback
   ```
3. Guarda

---

### PASSO 5 — Vercel (frontend)

1. Entra em [vercel.com](https://vercel.com)
2. **New Project** → importa o mesmo repo GitHub
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. Adiciona estas **Environment Variables**:
   ```
   VITE_API_URL = https://SEU-PROJETO.up.railway.app
   ```
7. Deploy → copia o URL (ex: `https://inuhzao.vercel.app`)

---

### PASSO 6 — Ligar tudo

1. No Railway, actualiza `FRONTEND_URL` com o URL do Vercel
2. No Railway, actualiza `TWITCH_REDIRECT_URI` com o URL correcto do Railway
3. Faz redeploy no Railway

---

### PASSO 7 — Testar

1. Abre `https://SEU-PROJETO.vercel.app`
2. Clica em "Entrar com Twitch"
3. Autoriza → deves ser redirecionado de volta ao site com sessão activa
4. O teu utilizador `inuhzao` terá acesso ao painel Admin automaticamente

---

## 🔧 Desenvolvimento Local

```bash
# Backend
cd backend
npm install
cp .env.example .env  # preenche as variáveis
npm run dev

# Frontend (noutra janela)
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173`

---

## ⚠️ Notas Importantes

- O ficheiro `.env` **NUNCA** deve ir para o GitHub
- O `SESSION_SECRET` deve ser uma string longa e aleatória em produção
- O JWT do StreamElements expira — vai ao SE e gera um novo se necessário
- Para adicionar mais admins, altera `ADMIN_USERS` no Railway (separados por vírgula)

---

## 📞 Suporte

Se algo não funcionar no deploy, verifica os logs no Railway em **Deployments → View Logs**.
