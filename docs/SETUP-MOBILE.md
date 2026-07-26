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
2. Apri su GitHub i file  
   `supabase/migrations/001_initial_schema.sql`  
   e poi `supabase/migrations/002_applications.sql`  
   → Copia tutto (uno per volta)  
3. Incolla nell’editor SQL → **Run**

## 4. Auth

1. **Authentication** → **Providers**  
2. Lascia **Email** attivo  
3. Per **Google**: guida completa in `docs/GOOGLE-AUTH.md` (serve OAuth Client su Google Cloud + enable in Supabase)

Redirect già usati in produzione:

`https://sumisura-eight.vercel.app/auth/callback`  
Locale: `http://localhost:3000/auth/callback`

## 5. Chiave Gemini (Google AI Studio)

1. Apri [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)  
2. **Create API key** → copia `AIza...`  
3. Incollala in chat (o salvala tu in Vercel → Environment Variables come `GEMINI_API_KEY`)

---

Quando hai **Project URL**, **anon key** e (se vuoi generare candidature) **GEMINI_API_KEY**, mandameli in chat: ti guido al passo successivo (deploy / env).
