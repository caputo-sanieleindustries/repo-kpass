// Script di test per verificare il mapping delle colonne

const COLUMN_MAPPINGS = {
  title: ['title', 'name', 'site', 'website', 'service', 'account', 'app', 'application', 'site name', 'website name'],
  email: ['email', 'e-mail', 'mail', 'email address', 'e-mail address', 'user email'],
  username: ['username', 'user', 'user name', 'login', 'login name', 'account name', 'userid', 'user id'],
  password: ['password', 'pwd', 'pass', 'encrypted_password', 'encrypted password', 'encryptedpassword', 'secret', 'credential'],
  url: ['url', 'website', 'link', 'site url', 'web address', 'address', 'domain', 'site address'],
  notes: ['notes', 'note', 'extra', 'comments', 'comment', 'description', 'memo', 'details', 'info', 'additional info']
};

function normalizeColumnName(columnName) {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function mapColumn(columnName) {
  const normalized = normalizeColumnName(columnName);
  
  // Fase 1: Match esatto (massima priorità)
  for (const [property, variants] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variant of variants) {
      const normalizedVariant = normalizeColumnName(variant);
      if (normalized === normalizedVariant) {
        return property;
      }
    }
  }
  
  // Fase 2: Colonna contiene variante completa come parola
  const normalizedWords = normalized.split(' ');
  for (const [property, variants] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variant of variants) {
      const normalizedVariant = normalizeColumnName(variant);
      const variantWords = normalizedVariant.split(' ');
      
      // Se la variante è multi-word, deve matchare esattamente quella sequenza
      if (variantWords.length > 1) {
        if (normalized.includes(normalizedVariant)) {
          return property;
        }
      } else {
        // Per single-word variants, match come parola intera
        if (normalizedWords.includes(normalizedVariant)) {
          return property;
        }
      }
    }
  }
  
  return null;
}

// Test cases
const testCases = [
  'Site Name',
  'site_name',
  'site-name',
  'SITE NAME',
  'Login Name',
  'user',
  'username',
  'E-mail Address',
  'email',
  'Web Address',
  'url',
  'Password',
  'pwd',
  'encrypted_password',
  'Extra Info',
  'notes',
  'memo',
  'service',
  'account'
];

console.log('🧪 Test Mapping Colonne SafePass\n');
console.log('=' .repeat(60));

testCases.forEach(testCase => {
  const mapped = mapColumn(testCase);
  const status = mapped ? '✅' : '❌';
  console.log(`${status} "${testCase}" → ${mapped || 'NON MAPPATO'}`);
});

console.log('=' .repeat(60));

// Test normalizzazione
console.log('\n🔍 Test Normalizzazione\n');
console.log('=' .repeat(60));

const normalizationTests = [
  'Site_Name',
  'site-name',
  'SITE NAME',
  'site__name',
  '  site  name  '
];

normalizationTests.forEach(test => {
  console.log(`"${test}" → "${normalizeColumnName(test)}"`);
});

console.log('=' .repeat(60));
