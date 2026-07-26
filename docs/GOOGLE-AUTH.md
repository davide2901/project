# Abilitare accesso con Google

L’errore `Unsupported provider: provider is not enabled` significa che su Supabase il provider **Google è spento** (mancano Client ID / Secret).

## 1. Google Cloud — OAuth Client

1. Apri [Google Auth Platform → Clients](https://console.cloud.google.com/auth/clients)
2. **Create client** → tipo **Web application**
3. **Authorized JavaScript origins**
   - `https://sumisura-eight.vercel.app`
   - `http://localhost:3000` (dev)
4. **Authorized redirect URIs** (obbligatorio — callback Supabase, non quello dell’app):
   - `https://kmhaertikrtcvfotufgt.supabase.co/auth/v1/callback`
5. Crea e copia **Client ID** e **Client Secret**

Configura anche la **OAuth consent screen** (External / Testing va bene in fase di prova; aggiungi la tua email come test user).

## 2. Supabase — attiva Google

Dashboard → **Authentication** → **Providers** → **Google**:

- Enable = ON  
- Incolla Client ID e Client Secret  
- Salva

Oppure via API (con access token Supabase):

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/kmhaertikrtcvfotufgt/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_google_enabled": true,
    "external_google_client_id": "….apps.googleusercontent.com",
    "external_google_secret": "GOCSPX-…"
  }'
```

## 3. Redirect già configurati

Site URL e allow list puntano a:

- `https://sumisura-eight.vercel.app`
- `http://localhost:3000`

L’app usa `redirectTo` → `/auth/callback`.

## 4. Test

1. Apri https://sumisura-eight.vercel.app/login  
2. **Continua con Google**  
3. Dopo il consenso dovresti arrivare su `/home`
