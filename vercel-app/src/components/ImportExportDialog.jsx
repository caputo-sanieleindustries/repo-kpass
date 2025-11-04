import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import axios from 'axios';
import ExportInfoDialog from './ExportInfoDialog';

const API = '/api';

export default function ImportExportDialog({ mode, onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [exportFormat, setExportFormat] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showExportInfo, setShowExportInfo] = useState(false);
  const [warnings, setWarnings] = useState([]);

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

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post(`${API}/passwords/import`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Mostra warning se ci sono password in chiaro
      if (response.data.warnings && response.data.warnings.length > 0) {
        setWarnings(response.data.warnings);
      }

      let message = response.data.message;
      if (response.data.warning_message) {
        message += '\n\n' + response.data.warning_message;
      }

      onSuccess(message);
      
      // Non chiudere subito se ci sono warning
      if (!response.data.warnings || response.data.warnings.length === 0) {
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante l\'importazione');
    } finally {
      setLoading(false);
    }
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

            {warnings.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded mb-4">
                <p className="font-semibold text-amber-900 mb-2">⚠️ Password in Chiaro Rilevate!</p>
                <p className="text-sm text-amber-800 mb-2">
                  Sono state importate {warnings.length} password in formato non criptato. 
                  Si consiglia di modificarle e salvarle nuovamente per crittarle.
                </p>
                <details className="text-sm text-amber-700">
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
                    <li>• XML - Formato strutturato</li>
                    <li>• XLSX/XLSM - Excel</li>
                  </ul>
                  <p className="text-sm mt-3 text-blue-700">
                    <strong>✨ Mapping Intelligente:</strong> Il sistema riconosce automaticamente 27+ varianti di nomi colonne e normalizza i dati.
                  </p>
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