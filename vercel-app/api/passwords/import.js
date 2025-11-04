import { getDB } from '../_lib/db.js';
import { PasswordEntry } from '../_lib/models.js';
import { authMiddleware } from '../_lib/auth.js';
import { handleCors } from '../_lib/utils.js';
import { parse } from 'csv-parse/sync';
import XLSX from 'xlsx';
import xml2js from 'xml2js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Mapping robusto per 27+ varianti di nomi colonne
const COLUMN_MAPPINGS = {
  // Email variants
  email: ['email address', 'e-mail address', 'email', 'e-mail', 'mail'],
  
  // Username variants
  username: ['username', 'user name', 'login name', 'account name', 'user id', 'userid', 'login', 'user'],
  
  // Title/Name variants
  title: ['site name', 'website name', 'title', 'name', 'site', 'website', 'service', 'account', 'app', 'application'],
  
  // Password variants
  password: ['encrypted_password', 'encrypted password', 'encryptedpassword', 'password', 'pwd', 'pass', 'secret', 'credential'],
  
  // URL variants
  url: ['site url', 'web address', 'site address', 'url', 'website', 'link', 'address', 'domain'],
  
  // Notes variants
  notes: ['additional info', 'extra', 'comments', 'comment', 'description', 'details', 'notes', 'note', 'memo', 'info']
};

/**
 * Normalizza il nome della colonna rimuovendo spazi, caratteri speciali e convertendo in lowercase
 */
function normalizeColumnName(columnName) {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, ' ') // Sostituisce underscore, spazi multipli, trattini con singolo spazio
    .replace(/[^a-z0-9\s]/g, ''); // Rimuove caratteri speciali
}

/**
 * Mappa una colonna alla proprietà corretta usando il mapping
 */
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
  
  // Fase 2: Match parziale - colonna contiene variante (es: "user_login" contiene "login")
  for (const [property, variants] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variant of variants) {
      const normalizedVariant = normalizeColumnName(variant);
      if (normalized.includes(normalizedVariant)) {
        return property;
      }
    }
  }
  
  // Fase 3: Match parziale inverso - variante contiene colonna (es: "username" contiene "user")
  // Solo se la colonna è abbastanza specifica (min 3 caratteri dopo normalizzazione)
  if (normalized.length >= 3) {
    for (const [property, variants] of Object.entries(COLUMN_MAPPINGS)) {
      for (const variant of variants) {
        const normalizedVariant = normalizeColumnName(variant);
        if (normalizedVariant.includes(normalized) && normalizedVariant.length - normalized.length <= 4) {
          return property;
        }
      }
    }
  }
  
  return null;
}

/**
 * Normalizza un record mappando le colonne e pulendo i dati
 */
function normalizeRecord(record) {
  const normalized = {
    title: null,
    email: null,
    username: null,
    password: null,
    url: null,
    notes: null
  };
  
  // Mappa tutte le colonne
  for (const [key, value] of Object.entries(record)) {
    const mappedProperty = mapColumn(key);
    if (mappedProperty && value) {
      // Converti il valore in stringa e rimuovi spazi extra
      const cleanValue = String(value).trim();
      if (cleanValue && cleanValue !== 'null' && cleanValue !== 'undefined') {
        normalized[mappedProperty] = cleanValue;
      }
    }
  }
  
  return normalized;
}

/**
 * Controlla se una password è in chiaro (euristica)
 */
function isPlainTextPassword(password) {
  if (!password || password.length === 0) return false;
  
  // Se contiene ':' e caratteri hex, probabilmente è criptata (formato iv:encrypted)
  if (password.includes(':') && /^[0-9a-f]+:[0-9a-f]+$/i.test(password)) {
    return false;
  }
  
  // Se è molto lunga (>64 char) e solo hex, probabilmente è criptata
  if (password.length > 64 && /^[0-9a-f]+$/i.test(password)) {
    return false;
  }
  
  // Altrimenti, considera come testo in chiaro
  return true;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  const db = await getDB();
  const userId = req.user.user_id;

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ detail: 'No file uploaded' });
    }

    const buffer = fs.readFileSync(file.filepath);
    const filename = file.originalFilename;
    const extension = filename.split('.').pop().toLowerCase();

    let result = { importedCount: 0, warnings: [] };

    if (extension === 'csv') {
      const records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Permette righe con numero variabile di colonne
        skip_records_with_error: true // Salta righe con errori
      });
      result = await processImportRecords(records, userId, db);
    } else if (extension === 'xlsx' || extension === 'xlsm') {
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      result = await processImportRecords(records, userId, db);
    } else if (extension === 'xml') {
      const xmlString = buffer.toString();
      const parser = new xml2js.Parser();
      const xmlResult = await parser.parseStringPromise(xmlString);
      
      let entries = [];
      if (xmlResult.passwords?.entry) {
        entries = Array.isArray(xmlResult.passwords.entry)
          ? xmlResult.passwords.entry
          : [xmlResult.passwords.entry];
      }

      for (const entry of entries) {
        const record = {
          title: entry.title?.[0] || entry.name?.[0] || '',
          email: entry.email?.[0] || '',
          username: entry.username?.[0] || '',
          password: entry.encrypted_password?.[0] || entry.password?.[0] || '',
          url: entry.url?.[0] || '',
          notes: entry.notes?.[0] || entry.extra?.[0] || ''
        };
        
        // Salta entry vuote
        if (!record.title && !record.username && !record.url) continue;
        
        // Verifica password in chiaro
        if (record.password && isPlainTextPassword(record.password)) {
          result.warnings.push(`Password in chiaro rilevata per: ${record.title || 'Untitled'}`);
        }
        
        const passwordEntry = new PasswordEntry({
          user_id: userId,
          title: record.title || 'Untitled',
          email: record.email || null,
          username: record.username || null,
          encrypted_password: record.password || '',
          url: record.url || null,
          notes: record.notes || null
        });
        await db.collection('password_entries').insertOne(passwordEntry.toJSON());
        result.importedCount++;
      }
    } else {
      return res.status(400).json({ detail: 'Unsupported file format' });
    }

    fs.unlinkSync(file.filepath);
    
    const response = {
      message: `Successfully imported ${result.importedCount} passwords`,
      imported: result.importedCount
    };
    
    if (result.warnings.length > 0) {
      response.warnings = result.warnings;
      response.warning_message = `⚠️ ATTENZIONE: ${result.warnings.length} password in chiaro rilevate! Si consiglia di ricriptarle.`;
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Import error:', error);
    return res.status(400).json({ detail: `Error importing file: ${error.message}` });
  }
}

async function processImportRecords(records, userId, db) {
  let importedCount = 0;
  const warnings = [];
  
  for (const record of records) {
    // Normalizza il record con mapping intelligente
    const normalized = normalizeRecord(record);
    
    // Salta righe completamente vuote
    if (!normalized.title && !normalized.username && !normalized.url && !normalized.password) {
      continue;
    }
    
    // Verifica se la password è in chiaro
    if (normalized.password && isPlainTextPassword(normalized.password)) {
      warnings.push(`Password in chiaro rilevata per: ${normalized.title || normalized.username || 'Untitled'}`);
    }

    const passwordEntry = new PasswordEntry({
      user_id: userId,
      title: normalized.title || normalized.username || 'Untitled',
      email: normalized.email || null,
      username: normalized.username || null,
      encrypted_password: normalized.password || '',
      url: normalized.url || null,
      notes: normalized.notes || null
    });

    await db.collection('password_entries').insertOne(passwordEntry.toJSON());
    importedCount++;
  }

  return { importedCount, warnings };
}

export default handleCors(authMiddleware(handler));