# 🔍 Debug Import Issues - Guida Completa

## ❌ Problemi Riportati

1. **Import non funziona** - CSV, XLSX, XLSM, XML
2. **Edit impossibile** su dati caricati
3. **Delete impossibile** su dati caricati

---

## 🔧 Fix Applicati

### Fix 1: Ripristino Import Backend-Only

**Problema:** Tentativo di crittografia client-side ha rotto l'import

**Soluzione:** Ripristinato import diretto al backend

**File:** `/src/components/ImportExportDialog.jsx`

```javascript
const handleImport = async () => {
  const formData = new FormData();
  formData.append('file', selectedFile);

  // ✅ Upload diretto al backend
  const response = await axios.post(`${API}/passwords/import`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  
  // Backend gestisce tutto:
  // - Parsing CSV/XML/Excel
  // - Mapping colonne
  // - Generazione UUID
  // - Salvataggio database
};
```

---

## 🧪 Test Procedure

### Test 1: Verifica Import CSV

**Setup:**
```csv
title,username,password,url,email,notes
Test Import,testuser,testpass123,test.com,test@email.com,Test notes
```

**Procedura:**
1. Login su SafePass
2. Dashboard → Click "Importa"
3. Seleziona file CSV
4. Click "Importa"
5. Attendi messaggio successo

**Console Check:**
```javascript
// DevTools → Console
POST /api/passwords/import
Response: {
  "message": "Successfully imported 1 passwords",
  "imported": 1
}
```

**Dashboard Check:**
```javascript
GET /api/passwords
Response: [
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ UUID presente
    "user_id": "user123",
    "title": "Test Import",
    "username": "testuser",
    "encrypted_password": "...",
    "url": "test.com",
    "email": "test@email.com",
    "notes": "Test notes"
  }
]
```

---

### Test 2: Verifica Edit

**Procedura:**
1. Dashboard con almeno 1 record
2. Click ✏️ (edit) su un record
3. Modifica title: "Edited Title"
4. Save

**Console Check:**
```javascript
// Click edit button
setEditingPassword({ id: "550e...", title: "Old Title", ... })

// Dialog apre con dati
<EditPasswordDialog password={{ id: "550e...", ... }} />

// Click save
PUT /api/passwords/550e8400-e29b-41d4-a716-446655440000
Body: { title: "Edited Title", ... }

// Verifica response
Response: 200 OK
{
  "id": "550e8400-...",
  "title": "Edited Title",
  "updated_at": "2025-01-04T..."
}
```

**Se Edit NON funziona:**

Verifica in console:
```javascript
// Check 1: Record ha ID?
console.log('Passwords:', passwords);
// Ogni pwd DEVE avere: { id: "uuid-string", ... }

// Check 2: editingPassword ha ID?
console.log('Editing:', editingPassword);
// DEVE avere: { id: "uuid-string", ... }

// Check 3: API call
// Se vedi: PUT /api/passwords/undefined
// → Problema: pwd.id è undefined

// Check 4: Network error?
// Se vedi: 404 Not Found
// → Problema: ID non trovato in database
```

---

### Test 3: Verifica Delete

**Procedura:**
1. Dashboard con almeno 1 record
2. Click 🗑️ (delete)
3. Conferma eliminazione

**Console Check:**
```javascript
// Click delete
setDeletingPassword({ id: "550e...", title: "Test", ... })

// Dialog conferma
<DeleteConfirmDialog passwordTitle="Test" />

// Click conferma
DELETE /api/passwords/550e8400-e29b-41d4-a716-446655440000

// Verifica response
Response: 200 OK
{
  "message": "Password deleted successfully"
}

// Fetch passwords again
GET /api/passwords
// Record eliminato non presente
```

---

## 🔍 Debugging Database

### Query MongoDB per Verificare ID

```javascript
// Connetti a MongoDB
use safepass_db

// Trova tutti i record di un utente
db.password_entries.find({ user_id: "your_user_id" }).pretty()

// Output atteso:
{
  "_id": ObjectId("..."),
  "id": "550e8400-e29b-41d4-a716-446655440000",  // ✅ DEVE esistere
  "user_id": "user123",
  "title": "Gmail",
  "encrypted_password": "abc:def...",
  "created_at": "2025-01-04T...",
  "updated_at": "2025-01-04T..."
}

// Se "id" è null o missing:
{
  "_id": ObjectId("..."),
  "id": null,  // ❌ PROBLEMA!
  "title": "Gmail"
}
```

---

### Fix Manuale Database (Se Necessario)

**Se record importati NON hanno campo `id`:**

```javascript
// Script MongoDB per aggiungere UUID a record senza ID
const { v4: uuidv4 } = require('uuid');

db.password_entries.find({ id: { $exists: false } }).forEach(doc => {
  db.password_entries.updateOne(
    { _id: doc._id },
    { $set: { id: uuidv4() } }
  );
  print(`Added UUID to record: ${doc.title}`);
});

// Oppure per record con id null:
db.password_entries.find({ id: null }).forEach(doc => {
  db.password_entries.updateOne(
    { _id: doc._id },
    { $set: { id: uuidv4() } }
  );
  print(`Fixed null UUID for: ${doc.title}`);
});
```

**Verifica dopo fix:**
```javascript
db.password_entries.find({ user_id: "your_user_id" }).count()
// Esempio: 10

db.password_entries.find({ 
  user_id: "your_user_id",
  id: { $exists: true, $ne: null } 
}).count()
// DEVE essere uguale al count totale
```

---

## 🧪 Test Import Formati Diversi

### Test CSV Standard
```csv
title,username,password,url
Gmail,john,mypass123,gmail.com
```

### Test CSV con Varianti Colonne
```csv
Site Name,Login,pwd,Web Address
Facebook,john_fb,fbpass456,facebook.com
```

### Test XML
```xml
<?xml version="1.0"?>
<passwords>
  <entry>
    <title>Twitter</title>
    <username>john_tw</username>
    <password>twpass789</password>
    <url>twitter.com</url>
  </entry>
</passwords>
```

### Test XLSX
- Crea file Excel con colonne: title, username, password, url
- Salva come .xlsx
- Import

**Tutti i formati dovrebbero:**
- ✅ Essere importati con successo
- ✅ Creare record con UUID valido
- ✅ Essere editabili
- ✅ Essere eliminabili

---

## 📊 Checklist Debug

### Import Check
- [ ] File selezionato correttamente
- [ ] POST /api/passwords/import ritorna 200
- [ ] Response ha "imported" count > 0
- [ ] GET /api/passwords mostra nuovi record
- [ ] Ogni record ha campo "id" con UUID valido

### Edit Check
- [ ] Click ✏️ apre dialog
- [ ] Dialog popolato con dati corretti
- [ ] editingPassword.id non è undefined
- [ ] PUT /api/passwords/{id} ritorna 200
- [ ] Dashboard aggiornata con nuovi dati

### Delete Check
- [ ] Click 🗑️ apre dialog conferma
- [ ] deletingPassword.id non è undefined
- [ ] DELETE /api/passwords/{id} ritorna 200
- [ ] Record sparisce dalla dashboard

### Database Check
- [ ] Tutti i record hanno campo "id"
- [ ] "id" è stringa UUID valida (non null)
- [ ] "id" è unico per ogni record
- [ ] Campo "_id" MongoDB presente (ma non usato nelle API)

---

## 🔧 Troubleshooting Specifico

### Problema: "undefined is not a valid UUID"

**Causa:** Record senza campo `id`

**Fix:**
1. Verifica database con query MongoDB
2. Esegui script fix manuale
3. Refresh dashboard

### Problema: Edit dialog non si apre

**Causa:** `setEditingPassword(pwd)` riceve oggetto senza `id`

**Debug:**
```javascript
// In Dashboard.jsx, aggiungi log temporaneo:
onClick={() => {
  console.log('Edit clicked, pwd:', pwd);
  console.log('pwd.id:', pwd.id);
  setEditingPassword(pwd);
}}
```

**Se pwd.id è undefined:**
- Problema nel GET /api/passwords
- Backend non ritorna campo "id"
- Verifica `/api/passwords/index.js`

### Problema: 404 durante edit/delete

**Causa:** API riceve `undefined` come ID

**Debug:**
```javascript
// Verifica URL nella Network tab
PUT /api/passwords/undefined  // ❌ ERRORE
DELETE /api/passwords/null     // ❌ ERRORE

// Dovrebbe essere:
PUT /api/passwords/550e8400-...  // ✅ CORRETTO
```

**Fix:**
1. Verifica che `pwd.id` esista prima di passare a dialog
2. Aggiungi guard clause:
```javascript
onClick={() => {
  if (!pwd.id) {
    console.error('Password without ID:', pwd);
    alert('Errore: record senza ID. Contatta supporto.');
    return;
  }
  setEditingPassword(pwd);
}}
```

---

## 📝 Log Console Attesi

### Import Successo
```
POST /api/passwords/import 200 OK
Response: {
  "message": "Successfully imported 3 passwords",
  "imported": 3
}
```

### Import con Warning
```
POST /api/passwords/import 200 OK
Response: {
  "message": "Successfully imported 3 passwords",
  "imported": 3,
  "warnings": ["Password in chiaro: Gmail", "Password in chiaro: Facebook"],
  "warning_message": "⚠️ ATTENZIONE: 2 password in chiaro rilevate!"
}
```

### Edit Successo
```
PUT /api/passwords/550e8400-... 200 OK
Response: {
  "id": "550e8400-...",
  "title": "Edited Title",
  "updated_at": "2025-01-04T12:00:00.000Z"
}
```

### Delete Successo
```
DELETE /api/passwords/550e8400-... 200 OK
Response: {
  "message": "Password deleted successfully"
}
```

---

## ✅ Verifica Finale

Dopo applicare i fix e test:

1. **Import:**
   - [ ] CSV funziona
   - [ ] XML funziona
   - [ ] XLSX funziona
   - [ ] Record hanno UUID

2. **Edit:**
   - [ ] Dialog si apre
   - [ ] Salvataggio funziona
   - [ ] Dashboard aggiornata

3. **Delete:**
   - [ ] Conferma appare
   - [ ] Record eliminato
   - [ ] Dashboard aggiornata

4. **Database:**
   - [ ] Tutti i record hanno "id"
   - [ ] "id" sono UUID validi
   - [ ] Nessun "id" null o undefined

---

**Data:** 2025-01-04  
**Status:** Import ripristinato, test necessari per confermare fix
