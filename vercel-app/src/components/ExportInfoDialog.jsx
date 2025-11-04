import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

export default function ExportInfoDialog({ onClose, onContinue }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="export-info-dialog">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <span>🔐</span>
            <span>Come Funziona l'Export delle Password</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] sm:max-h-[65vh] pr-2 sm:pr-4">
          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
            {/* Intro */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Importante:</strong> Le tue password vengono esportate in formato <strong>criptato</strong> per garantire la massima sicurezza.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-900">📋 Processo di Export:</h3>
              
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Selezione Formato</p>
                    <p className="text-sm text-gray-600">Scegli il formato di export (CSV, XLSX, XLSM o XML)</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Crittografia Automatica</p>
                    <p className="text-sm text-gray-600">Tutte le password vengono automaticamente criptate usando AES-256-GCM con la tua master password</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Download File</p>
                    <p className="text-sm text-gray-600">Il file viene scaricato sul tuo dispositivo in modo sicuro</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decryption Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-gray-900">🔓 Come Decrittare le Password:</h3>
              
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-800 mb-3">
                  Per decrittare le password esportate, hai <strong>due opzioni</strong>:
                </p>
                
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border border-purple-100">
                    <p className="font-semibold text-purple-900 mb-1">✅ Opzione 1: Tool Offline (Consigliato)</p>
                    <p className="text-sm text-gray-700 mb-2">
                      Usa il nostro tool di decrittazione che funziona completamente offline nel browser. 
                      <strong> Massima sicurezza e privacy!</strong>
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• 100% offline - nessun dato inviato a server</li>
                      <li>• Funziona direttamente nel browser</li>
                      <li>• Codice open source verificabile</li>
                    </ul>
                  </div>

                  <div className="bg-white p-3 rounded border border-purple-100">
                    <p className="font-semibold text-purple-900 mb-1">🔄 Opzione 2: Re-Import</p>
                    <p className="text-sm text-gray-700">
                      Puoi sempre re-importare il file nel tuo account SafePass per accedere alle password.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Note */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
              <p className="text-sm text-amber-900">
                <strong>⚠️ Nota di Sicurezza:</strong> Conserva il file esportato in un luogo sicuro. 
                Anche se le password sono criptate, il file contiene dati sensibili. 
                Avrai bisogno della tua <strong>master password</strong> per decrittarle.
              </p>
            </div>

            {/* Algorithm Info */}
            <details className="bg-gray-50 p-4 rounded border border-gray-200">
              <summary className="cursor-pointer font-semibold text-gray-900 text-sm">
                🔬 Dettagli Tecnici (per esperti)
              </summary>
              <div className="mt-3 text-sm text-gray-700 space-y-2">
                <p><strong>Algoritmo:</strong> AES-256-GCM (Advanced Encryption Standard)</p>
                <p><strong>Key Derivation:</strong> PBKDF2 con 100,000 iterazioni</p>
                <p><strong>Hash:</strong> SHA-256</p>
                <p><strong>IV:</strong> 12 bytes random per ogni password</p>
                <p><strong>Formato:</strong> iv:encrypted (entrambi in hex)</p>
              </div>
            </details>
          </div>
        </ScrollArea>

        {/* Footer con azioni */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t sticky bottom-0 bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 text-sm sm:text-base"
            data-testid="cancel-export-button"
          >
            ❌ Annulla
          </Button>
          
          <Button
            onClick={() => window.open('/decrypt.html', '_blank')}
            variant="outline"
            className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50 text-sm sm:text-base"
            data-testid="open-decrypt-tool-button"
          >
            🔓 Tool Decrittazione
          </Button>
          
          <Button
            onClick={onContinue}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-sm sm:text-base"
            data-testid="continue-export-button"
          >
            ✅ Continua
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
