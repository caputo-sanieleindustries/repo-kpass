# 🔧 Fix Errore 405 su Vercel - Edit/Delete API

## ❌ Problema

**Errore:** `405 Method Not Allowed` per PUT e DELETE su `/api/passwords/{id}`

**Dettagli:**
```javascript
PUT /api/passwords/778bc3ea-... → 405
DELETE /api/passwords/2d0e84d2-... → 405

Response Headers:
content-type: "text/html; charset=utf-8"
content-disposition: "inline; filename=\"index.html\""
```

**Root Cause:** Vercel sta servendo `index.html` (SPA React) invece della API serverless function!

---

## 🔍 Analisi

### Problema 1: Rewrite Rules Errate

**File:** `vercel.json`

**Prima (Errato):**
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",           // ❌ Cattura TUTTO, incluso /api/*
      "destination": "/index.html"
    }
  ]
}
```

**Flusso Errato:**
```
1. Request: PUT /api/passwords/123
2. Match prima regola: /api/(.*)
3. Rewrite a: /api/passwords/123
4. Match seconda regola: /(.*)      // ❌ PROBLEMA!
5. Rewrite a: /index.html
6. Servi HTML invece di API → 405
```

---

### Problema 2: Dynamic Route Non Riconosciuta

**File:** `/api/passwords/[id].js`

Vercel potrebbe non riconoscere correttamente il file come dynamic route senza configurazione esplicita.

---

## ✅ Fix Implementati

### Fix 1: Corretta Rewrite Rules

**File:** `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/((?!api).*)",      // ✅ ESCLUDI /api/* dal rewrite
      "destination": "/index.html"
    }
  ]
}
```

**Regex Explanation:**
- `(?!api)` - Negative lookahead: NON matchare se inizia con "api"
- `.*` - Qualsiasi altro path

**Flusso Corretto:**
```
1. Request: PUT /api/passwords/123
2. Non matcha: /((?!api).*)        // ✅ Perché inizia con "api"
3. Vercel usa routing API nativo
4. Trova: /api/passwords/[id].js
5. Esegue serverless function
6. Ritorna JSON API response → 200
```

---

### Fix 2: API Configuration Export

**File:** `/api/passwords/[id].js`

```javascript
// ✅ Aggiunta configurazione esplicita Vercel
export const config = {
  api: {
    bodyParser: true,
  },
};

export default handleCors(authMiddleware(handler));
```

---

## 🧪 Test Verifica

### Test 1: Deploy su Vercel

```bash
cd /app/vercel-app
npm run build
vercel --prod
```

### Test 2: Test API Edit (PUT)

**Request:**
```bash
curl -X PUT https://kpass.vercel.app/api/passwords/778bc3ea-9b61-410b-b0c3-8c39693eefd3 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Edit",
    "email": "test@email.com",
    "username": "testuser",
    "url": "test.com"
  }'
```

**Response Attesa:**
```json
{
  "id": "778bc3ea-9b61-410b-b0c3-8c39693eefd3",
  "title": "Test Edit",
  "updated_at": "2025-01-04T16:30:00.000Z"
}
```

**Response Headers Attesi:**
```
content-type: application/json
status: 200 OK
```

---

### Test 3: Test API Delete (DELETE)

**Request:**
```bash
curl -X DELETE https://kpass.vercel.app/api/passwords/2d0e84d2-bf77-4e5a-9ca6-67d4c4c7615e \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response Attesa:**
```json
{
  "message": "Password deleted successfully"
}
```

**Response Headers Attesi:**
```
content-type: application/json
status: 200 OK
```

---

### Test 4: Verifica Routes Non-API

**Request:**
```bash
curl https://kpass.vercel.app/dashboard
```

**Response Attesa:**
```html
<!DOCTYPE html>
<html>
  <!-- React SPA -->
</html>
```

**Response Headers Attesi:**
```
content-type: text/html
status: 200 OK
```

---

## 🔍 Debug su Vercel

### Check 1: Vercel Dashboard Logs

1. Vai su https://vercel.com/dashboard
2. Seleziona progetto "kpass"
3. Tab "Deployments"
4. Click ultimo deployment
5. Tab "Functions"
6. Verifica: `/api/passwords/[id].js` presente

**Output Atteso:**
```
Functions:
✓ /api/auth/login.js
✓ /api/auth/register.js
✓ /api/passwords/index.js
✓ /api/passwords/import.js
✓ /api/passwords/export.js
✓ /api/passwords/[id].js        ← DEVE ESSERE PRESENTE
```

---

### Check 2: Vercel Function Logs

**Durante Edit:**
```
Function Invocation:
  Function: api/passwords/[id].js
  Method: PUT
  Query: { id: "778bc3ea-..." }
  Status: 200
  Duration: 150ms
```

**Durante Delete:**
```
Function Invocation:
  Function: api/passwords/[id].js
  Method: DELETE
  Query: { id: "2d0e84d2-..." }
  Status: 200
  Duration: 120ms
```

**Se vedi errori:**
```
Error: Cannot find module
→ Problema: Dipendenze mancanti

Error: Timeout
→ Problema: Database lento o non raggiungibile

Error: 405 Method Not Allowed
→ Problema: Route ancora non configurata correttamente
```

---

### Check 3: Vercel Environment Variables

Verifica che siano configurate:

1. Dashboard Vercel → Settings → Environment Variables
2. Verifica presenti:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`

**Se mancano:**
```bash
vercel env add MONGODB_URI
# Incolla connection string MongoDB

vercel env add JWT_SECRET
# Inserisci secret key

# Redeploy
vercel --prod
```

---

## 📊 Confronto Prima/Dopo

### Prima del Fix

| Request | Status | Content-Type | Response |
|---------|--------|--------------|----------|
| GET /api/passwords | 200 | application/json | ✅ OK |
| POST /api/passwords | 200 | application/json | ✅ OK |
| PUT /api/passwords/{id} | 405 | text/html | ❌ HTML |
| DELETE /api/passwords/{id} | 405 | text/html | ❌ HTML |

### Dopo il Fix

| Request | Status | Content-Type | Response |
|---------|--------|--------------|----------|
| GET /api/passwords | 200 | application/json | ✅ OK |
| POST /api/passwords | 200 | application/json | ✅ OK |
| PUT /api/passwords/{id} | 200 | application/json | ✅ OK |
| DELETE /api/passwords/{id} | 200 | application/json | ✅ OK |

---

## 🎯 Verifica Completa

### Dashboard Browser

1. Login su https://kpass.vercel.app
2. Import CSV con 1 record
3. Verifica record in dashboard

**Test Edit:**
1. Click ✏️ su record
2. Modifica title
3. Save
4. Verifica: NO errore 405
5. Verifica: Title aggiornato

**Test Delete:**
1. Click 🗑️ su record
2. Conferma
3. Verifica: NO errore 405
4. Verifica: Record sparito

**Console Check:**
```javascript
// DevTools → Network Tab

PUT /api/passwords/778bc3ea-...
Status: 200 OK                    // ✅ NON 405
Content-Type: application/json    // ✅ NON text/html

DELETE /api/passwords/2d0e84d2-...
Status: 200 OK                    // ✅ NON 405
Content-Type: application/json    // ✅ NON text/html
```

---

## 🔧 Troubleshooting

### Problema: Ancora 405 dopo fix

**Possibili cause:**

1. **Cache Vercel non invalidata**
   ```bash
   # Forza nuovo deployment
   vercel --prod --force
   ```

2. **Browser cache**
   ```
   Ctrl+Shift+R (hard refresh)
   O apri in incognito
   ```

3. **Configurazione non deployata**
   ```bash
   # Verifica vercel.json nel deployment
   git add vercel.json
   git commit -m "Fix 405 routes"
   git push
   vercel --prod
   ```

---

### Problema: Function non trovata

**Error:** `404 - This Serverless Function has crashed`

**Fix:**
```bash
# Verifica dependencies
cd /app/vercel-app
npm install

# Test build locale
npm run build

# Verifica nessun errore
# Poi deploy
vercel --prod
```

---

### Problema: MongoDB Connection Failed

**Error:** `MongoServerError: Authentication failed`

**Fix:**
1. Verifica `MONGODB_URI` su Vercel dashboard
2. Verifica IP whitelist su MongoDB Atlas
3. Aggiungi `0.0.0.0/0` (permetti tutti gli IP) per test

---

## ✅ Checklist Deploy

- [x] vercel.json aggiornato con rewrite corretto
- [x] [id].js ha export config
- [x] npm run build completa senza errori
- [ ] Deploy su Vercel **DA FARE**
- [ ] Test PUT /api/passwords/{id} **DA FARE**
- [ ] Test DELETE /api/passwords/{id} **DA FARE**
- [ ] Verifica edit in dashboard **DA FARE**
- [ ] Verifica delete in dashboard **DA FARE**

---

## 📝 Files Modificati

| File | Modifica | Scopo |
|------|----------|-------|
| `vercel.json` | Rewrite regex `/((?!api).*)` | Escludi API da SPA routing |
| `/api/passwords/[id].js` | Export config | Configurazione Vercel esplicita |

---

**Data:** 2025-01-04  
**Status:** Fix implementato - Deploy richiesto per test  
**Deployment URL:** https://kpass.vercel.app
