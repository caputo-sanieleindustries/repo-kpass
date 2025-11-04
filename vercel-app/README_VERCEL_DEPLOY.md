# 🚀 SafePass - Deploy su Vercel

## 📋 Configurazione

Questa applicazione è configurata per il deploy su **Vercel** con:
- ⚡ **Vite.js** - Build tool ultra-veloce
- ⚛️ **React.js** - Framework UI
- 📦 **npm** - Package manager

## 🛠️ Comandi

### Installazione Dipendenze
```bash
npm install
```

### Build Production
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

### Preview Build
```bash
npm run preview
```

## 📁 Struttura Progetto

```
vercel-app/
├── api/                    # Serverless Functions per Vercel
│   ├── auth/              # Autenticazione (login, register, recover)
│   └── passwords/         # Gestione password (CRUD, import, export)
├── src/                    # Codice sorgente React
│   ├── components/        # Componenti React
│   ├── pages/             # Pagine (Dashboard, Login, ecc.)
│   ├── utils/             # Utility (crypto.js per encryption)
│   └── main.jsx           # Entry point
├── public/                 # File statici
├── dist/                   # Build output (generato da Vite)
├── decrypt.html           # Tool di decrittazione offline
├── package.json           # Dipendenze npm
├── vite.config.js         # Configurazione Vite
├── vercel.json            # Configurazione Vercel
└── tailwind.config.js     # Configurazione Tailwind CSS
```

## 🔧 Configurazione Vercel

Il file `vercel.json` è già configurato con:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite"
}
```

### Variabili d'Ambiente

Se necessario, aggiungi le seguenti variabili nel dashboard Vercel:

```bash
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

## 📤 Deploy su Vercel

### Metodo 1: Vercel CLI (Consigliato)

1. **Installa Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login su Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Metodo 2: GitHub Integration

1. **Pusha il codice su GitHub:**
```bash
git init
git add .
git commit -m "Initial commit - SafePass with Vite + React"
git remote add origin https://github.com/your-username/safepass.git
git push -u origin main
```

2. **Collega a Vercel:**
   - Vai su [vercel.com](https://vercel.com)
   - Clicca "New Project"
   - Importa il repository GitHub
   - Vercel rileverà automaticamente Vite e userà la configurazione da `vercel.json`
   - Clicca "Deploy"

### Metodo 3: Deploy Manuale

1. **Build locale:**
```bash
npm run build
```

2. **Deploy cartella dist:**
```bash
vercel --prod --yes
```

## 🌐 URL Post-Deploy

Dopo il deploy, avrai:
- **App principale**: `https://your-app.vercel.app`
- **Tool decrittazione**: `https://your-app.vercel.app/decrypt.html`
- **API serverless**: `https://your-app.vercel.app/api/*`

## ⚙️ Configurazione Database

### MongoDB Atlas (Consigliato)

1. Crea un cluster gratuito su [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Ottieni la connection string
3. Aggiungi come variabile d'ambiente su Vercel:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/safepass
   ```

### File `api/_lib/db.js`

Il file gestisce automaticamente la connessione a MongoDB usando `process.env.MONGODB_URI`.

## 🔐 Sicurezza

### Headers di Sicurezza

Il file `vercel.json` include headers di sicurezza:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### HTTPS

Vercel fornisce automaticamente **HTTPS** con certificati SSL gratuiti.

### Environment Variables

⚠️ **MAI committare** secrets nel codice. Usa sempre variabili d'ambiente:
```bash
# Nel dashboard Vercel, aggiungi:
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=your-mongodb-connection-string
```

## 🧪 Test Pre-Deploy

Prima di deployare, testa localmente:

```bash
# 1. Installa dipendenze
npm install

# 2. Build
npm run build

# 3. Preview build
npm run preview
```

Apri `http://localhost:4173` e verifica che tutto funzioni.

## 📊 Performance

### Ottimizzazioni Vite

Vite include automaticamente:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ CSS inlining
- ✅ Asset optimization

### Build Size

```
dist/index.html                   0.47 kB │ gzip:   0.31 kB
dist/assets/index-*.css          57.11 kB │ gzip:  10.31 kB
dist/assets/index-*.js          319.50 kB │ gzip: 102.22 kB
```

### Lighthouse Score (Target)

- 🟢 Performance: 90+
- 🟢 Accessibility: 95+
- 🟢 Best Practices: 95+
- 🟢 SEO: 90+

## 🔄 CI/CD con GitHub Actions (Opzionale)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

## 🐛 Troubleshooting

### Errore: "Module not found"
```bash
# Rimuovi node_modules e reinstalla
rm -rf node_modules package-lock.json
npm install
```

### Errore: "Build failed"
```bash
# Verifica che tutti i file siano committati
git status

# Test build locale
npm run build
```

### Errore: "API non funziona"
```bash
# Verifica variabili d'ambiente su Vercel
# Dashboard → Settings → Environment Variables
```

### Errore: "Cannot find module '@/...' "
```bash
# Verifica vite.config.js abbia l'alias configurato
# resolve: { alias: { '@': path.resolve(__dirname, './src') } }
```

## 📱 Test Mobile

Dopo il deploy, testa su:
- 📱 iPhone SE (320px)
- 📱 iPhone 12 (390px)
- 📱 Android (360px)
- 💻 iPad (768px)
- 🖥️ Desktop (1920px)

## 🎯 Checklist Pre-Deploy

- [ ] `npm install` funziona senza errori
- [ ] `npm run build` completa con successo
- [ ] `npm run preview` mostra l'app funzionante
- [ ] Variabili d'ambiente configurate su Vercel
- [ ] Database MongoDB configurato e accessibile
- [ ] File `vercel.json` presente e corretto
- [ ] `.gitignore` include `node_modules`, `dist`, `.env`
- [ ] `package.json` ha `"type": "module"`
- [ ] Nessun `yarn.lock` o `craco.js` presente
- [ ] Tool `decrypt.html` accessibile

## 🔗 Link Utili

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Vercel CLI](https://vercel.com/docs/cli)

## 📞 Support

Per problemi di deploy:
1. Controlla i logs su Vercel Dashboard
2. Verifica che la build locale funzioni
3. Controlla le variabili d'ambiente
4. Consulta [Vercel Support](https://vercel.com/support)

---

**✨ Deploy completato!**  
L'app sarà accessibile su `https://your-app.vercel.app`

**🔓 Tool Decrittazione:**  
`https://your-app.vercel.app/decrypt.html`
