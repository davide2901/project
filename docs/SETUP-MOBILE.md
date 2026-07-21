# Setup da smartphone (4 tap)

Non serve il PC. Fai solo questo, poi torna in chat e incolla le due chiavi.

## 1. Supabase (gratis)

1. Apri [https://supabase.com](https://supabase.com) → **Start your project** / Login  
2. **New project** → nome qualunque → password DB (salvala) → Create  
3. Aspetta ~1–2 minuti che il progetto sia Ready  

## 2. Chiavi API

1. Menu → **Project Settings** (ingranaggio) → **API**  
2. Copia:
   - **Project URL**
   - **anon public** key  

Incollale qui in chat così le metto in `.env.example` / ti dico dove salvarle (su Vercel/Cursor non posso leggere segreti privati tuoi se non me li dai).

## 3. Schema database

1. Menu → **SQL** → **New query**  
2. Apri su GitHub il file  
   `supabase/migrations/001_initial_schema.sql`  
   (nella PR) → Copia tutto  
3. Incolla nell’editor SQL → **Run**

## 4. Auth

1. **Authentication** → **Providers**  
2. Lascia **Email** attivo  
3. (Opzionale) **Google** → abilita e segui le istruzioni Google Cloud  

Redirect URL da aggiungere (quando avrai un URL app, es. Vercel):

`https://TUO-DOMINIO/auth/callback`

Per test locale (da PC): `http://localhost:3000/auth/callback`

## 5. Chiave Claude (Anthropic)

1. Apri [https://console.anthropic.com](https://console.anthropic.com)  
2. **API keys** → Create → copia `sk-ant-...`  
3. Incollala in chat (o salvala tu in Vercel → Environment Variables come `ANTHROPIC_API_KEY`)

---

Quando hai **Project URL**, **anon key** e (se vuoi generare candidature) **ANTHROPIC_API_KEY**, mandameli in chat: ti guido al passo successivo (deploy / env).
