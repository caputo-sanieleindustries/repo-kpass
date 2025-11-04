import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';
import ExportInfoDialog from './ExportInfoDialog';
import { encryptPassword } from '../utils/crypto';

const API = '/api';

// Verifica se una password è in chiaro (euristica)
const isPlainTextPassword = (password) => {
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
};

// Parsing CSV client-side
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"/, '').replace(/"$/, ''));
    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push(record);
  }
  
  return records;
};

export default function ImportExportDialog({ mode, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExportInfo, setShowExportInfo] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [processingStatus, setProcessingStatus] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (['csv', 'xml', 'xlsx', 'xlsm'].includes(extension)) {
        setSelectedFile(file);
        setError('');
      } else {
        setError('Formato file non supportato. Usa CSV, XML, XLSX o XLSM.');
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Seleziona un file da importare');
      return;
    }

    setLoading(true);
    setError('');
    setWarnings([]);
    setProcessingStatus('Lettura file...');

    try {
      const masterPassword = localStorage.getItem('masterPassword');
      if (!masterPassword) {
        setError('Master password non trovata. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      // Leggi il file
      const fileContent = await selectedFile.text();
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      
      let records = [];
      
      if (extension === 'csv') {
        setProcessingStatus('Parsing CSV...');
        records = parseCSV(fileContent);
      } else {
        // Per XML/Excel, usa il backend ma cripta prima
        setError('Per file XML/XLSX, usa la funzione di import standard (in sviluppo)');
        setLoading(false);
        return;
      }

      if (records.length === 0) {
        setError('Nessun record trovato nel file');
        setLoading(false);
        return;
      }

      setProcessingStatus(`Processamento ${records.length} password...`);
      
      // Processa ogni record e cripta password in chiaro
      const processedRecords = [];
      const plainTextWarnings = [];
      
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        setProcessingStatus(`Crittografia password ${i + 1}/${records.length}...`);
        
        // Trova la colonna password (può avere nomi diversi)
        let passwordValue = record.password || record.Password || record.pwd || 
                           record.encrypted_password || record['Encrypted Password'] || '';
        
        // Se la password è in chiaro, criptala
        if (passwordValue && isPlainTextPassword(passwordValue)) {
          plainTextWarnings.push(record.title || record.Title || record.name || record.Name || 'Untitled');
          try {
            passwordValue = await encryptPassword(passwordValue, masterPassword);
          } catch (err) {
            console.error('Errore crittografia:', err);
            setError(`Errore durante la crittografia della password ${i + 1}`);
            setLoading(false);
            return;
          }
        }
        
        // Aggiorna il record con la password criptata
        processedRecords.push({
          ...record,
          encrypted_password: passwordValue,
          password: undefined // Rimuovi campo originale
        });
      }

      if (plainTextWarnings.length > 0) {
        setWarnings(plainTextWarnings.map(name => `Password criptata per: ${name}`));
      }

      // Ora invia i record processati al backend
      setProcessingStatus('Caricamento sul server...');
      
      // Converti i record in CSV per inviarli al backend
      const processedCSV = convertToCSV(processedRecords);
      const blob = new Blob([processedCSV], { type: 'text/csv' });
      const processedFile = new File([blob], 'processed_import.csv', { type: 'text/csv' });
      
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', processedFile);

      const response = await axios.post(`${API}/passwords/import`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      let message = response.data.message;
      if (plainTextWarnings.length > 0) {
        message += `\n\n✅ ${plainTextWarnings.length} password in chiaro sono state automaticamente criptate!`;
      }

      onSuccess(message);
      
      // Non chiudere subito se ci sono warning
      if (plainTextWarnings.length === 0) {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Errore durante l\'importazione');
    } finally {
      setLoading(false);
      setProcessingStatus('');
    }
  };

  // Funzione helper per convertire records in CSV
  const convertToCSV = (records) => {
    if (records.length === 0) return '';
    
    // Usa solo le colonne necessarie, escludendo quelle extra
    const validHeaders = ['title', 'email', 'username', 'encrypted_password', 'url', 'notes'];
    const csvLines = [validHeaders.join(',')];
    
    records.forEach(record => {
      const values = validHeaders.map(header => {
        const value = record[header] || '';
        // Escape virgolette e racchiudi in virgolette se contiene virgole
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });
    
    return csvLines.join('\n');
  };

  const handleExportClick = () => {
    // Mostra il dialog informativo prima dell'export
    setShowExportInfo(true);
  };

  const handleExport = async () => {
    setLoading(true);
    setError('');
    setShowExportInfo(false);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/passwords/export?format=${exportFormat}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `safepass_export.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      onSuccess('Export completato con successo! Usa il tool di decrittazione per leggere le password.');
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'esportazione');
    } finally {
      setLoading(false);
    }
  };

  // Se mostriamo il dialog informativo per l'export
  if (showExportInfo) {
    return (
      <ExportInfoDialog
        onClose={() => setShowExportInfo(false)}
        onContinue={handleExport}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="import-export-dialog" aria-describedby="dialog-description">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title" className="text-lg sm:text-xl">
            {mode === 'import' ? '📥 Importa Password' : '📤 Esporta Password'}
          </DialogTitle>
          <DialogDescription id="dialog-description" className="text-sm">
            {mode === 'import' 
              ? 'Carica un file CSV, XML, XLSX o XLSM con le tue password. Supporta formati da 1Password, LastPass e altri.'
              : 'Esporta le tue password in formato criptato. Avrai bisogno della master password per decriptarle.'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh] sm:max-h-[60vh]">
          <div className="pr-2 sm:pr-4">
            {error && (
              <div className="error-message mb-4" data-testid="dialog-error">
                {error}
              </div>
            )}

            {processingStatus && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-900 font-semibold">{processingStatus}</p>
                </div>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
                <p className="font-semibold text-green-900 mb-2">✅ Password Criptate Automaticamente!</p>
                <p className="text-sm text-green-800 mb-2">
                  {warnings.length} password in chiaro sono state automaticamente criptate con la tua master password prima del salvataggio.
                </p>
                <details className="text-sm text-green-700">
                  <summary className="cursor-pointer font-semibold">Mostra dettagli</summary>
                  <ul className="mt-2 space-y-1 ml-4 max-h-32 overflow-y-auto">
                    {warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </details>
                <Button
                  onClick={onClose}
                  className="mt-3 w-full"
                  size="sm"
                >
                  OK, Ho Capito
                </Button>
              </div>
            )}

            {mode === 'import' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Seleziona File</Label>
                  <input
                    id="file"
                    data-testid="file-input"
                    type="file"
                    accept=".csv,.xml,.xlsx,.xlsm"
                    onChange={handleFileChange}
                    className="form-input"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600" data-testid="selected-file">
                      File selezionato: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="info-box">
                  <strong>Formati supportati:</strong>
                  <ul className="text-sm mt-2 space-y-1">
                    <li>• CSV - 1Password, LastPass, formato generico</li>
                    <li>• XML - Formato strutturato (in sviluppo)</li>
                    <li>• XLSX/XLSM - Excel (in sviluppo)</li>
                  </ul>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-blue-700">
                      <strong>✨ Mapping Intelligente:</strong> Il sistema riconosce automaticamente 27+ varianti di nomi colonne e normalizza i dati.
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>🔒 Crittografia Automatica:</strong> Le password in chiaro vengono automaticamente criptate con AES-256 prima del salvataggio!
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4 sticky bottom-0 bg-background">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    data-testid="cancel-button"
                    disabled={loading}
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={loading || !selectedFile}
                    data-testid="import-button"
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    {loading ? 'Importazione...' : 'Importa'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Formato Esportazione</Label>
                  <div className="format-options" data-testid="format-options">
                    {['csv', 'xml', 'xlsx', 'xlsm'].map(format => (
                      <label key={format} className="format-option">
                        <input
                          type="radio"
                          name="format"
                          value={format}
                          checked={exportFormat === format}
                          onChange={(e) => setExportFormat(e.target.value)}
                          data-testid={`format-${format}`}
                        />
                        <span>{format.toUpperCase()}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="warning-box">
                  <strong>⚠️ Nota:</strong> Le password esportate sono criptate con AES-256. Per decriptarle avrai bisogno della tua master password.
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-800 mb-2">
                    <strong>🔓 Come decrittare le password?</strong>
                  </p>
                  <p className="text-sm text-gray-700 mb-3">
                    Usa il nostro tool di decrittazione offline per leggere le password esportate in modo sicuro.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('/decrypt.html', '_blank')}
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    🔓 Apri Tool Decrittazione
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-3 sm:pt-4 sticky bottom-0 bg-background">
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    data-testid="cancel-button"
                    disabled={loading}
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={handleExportClick}
                    disabled={loading}
                    data-testid="export-button"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto text-sm sm:text-base"
                  >
                    {loading ? 'Esportazione...' : 'Esporta'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}