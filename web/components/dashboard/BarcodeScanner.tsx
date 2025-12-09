import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { BrowserMultiFormatReader, Result } from '@zxing/library'
import { BarcodeScannerProps } from '@/types/components'

export default function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)

  const stopScanning = useCallback(() => {
    if (codeReaderRef.current) {
      try {
        // Tentar parar o ZXing se tiver método para isso
        if ('reset' in codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
          codeReaderRef.current.reset()
        }
      } catch (err) {
        console.warn('Erro ao parar ZXing:', err)
      }
      codeReaderRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
    setIsInitialized(false)
  }, [])

  const startScanning = useCallback(async () => {
    try {
      // Verificar se estamos no cliente
      if (typeof window === 'undefined' || !navigator.mediaDevices) {
        setError('Câmera não disponível neste ambiente')
        setIsScanning(false)
        return
      }

      setError(null)
      setIsScanning(true)
      setIsInitialized(false)
  
      // Parar stream anterior se existir
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
        streamRef.current = null
      }

      // Parar ZXing anterior se existir
      if (codeReaderRef.current) {
        try {
          if ('reset' in codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
            codeReaderRef.current.reset()
          }
        } catch (err) {
          console.warn('Erro ao resetar ZXing:', err)
        }
        codeReaderRef.current = null
      }
  
      // Configuração otimizada para códigos pequenos
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 }
        }
      })
  
      streamRef.current = stream
  
      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        
        // Configurações completas do vídeo
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        
        // Forçar configurações adicionais
        video.setAttribute('autoplay', 'true')
        video.setAttribute('playsinline', 'true')
        video.setAttribute('muted', 'true')
        
        // Configurar zoom se disponível
        if ('zoom' in video) {
          (video as HTMLVideoElement & { zoom?: number }).zoom = 2.0
        }
        
        // Aguardar o vídeo carregar
        video.onloadedmetadata = () => {
          video.play().catch(err => {
            console.warn('Erro ao reproduzir vídeo:', err)
            setError('Erro ao reproduzir vídeo')
          })
        }
        
        // Verificar se o vídeo está funcionando
        video.onplaying = () => {
          setIsInitialized(true)
          
          // Inicializar ZXing imediatamente
          if (!videoRef.current || codeReaderRef.current) return

          try {
            const codeReader = new BrowserMultiFormatReader()
            codeReaderRef.current = codeReader
            
            // Usar o stream existente em vez de solicitar novo acesso à câmera
            codeReader.decodeFromVideoDevice(null, videoRef.current, (result: Result | null, err: Error | null) => {
              if (result) {
                const code = result.getText()
                
                // Parar o ZXing imediatamente
                try {
                  if ('reset' in codeReader && typeof codeReader.reset === 'function') {
                    codeReader.reset()
                  }
                } catch (err) {
                  console.warn('Erro ao parar ZXing:', err)
                }
                
                onScan(code)
                stopScanning()
              }
              if (err && !(err instanceof Error && err.name === 'NotFoundException')) {
                console.warn('Erro na detecção:', err)
              }
            })

          } catch (err) {
            console.error('Erro ao inicializar ZXing:', err)
          }
        }
        
        video.onerror = () => {
          setError('Erro no vídeo')
        }
      }
  
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      setError('Erro ao acessar a câmera. Verifique as permissões.')
      setIsScanning(false)
    }
  }, [onScan, stopScanning])

  // Função para detectar códigos manualmente
  const detectCode = useCallback(() => {
    const code = prompt('Digite o código de barras/IMEI:')
    if (code && code.trim()) {
      onScan(code.trim())
      stopScanning()
    }
  }, [onScan, stopScanning])

  useEffect(() => {
    // Só executar no cliente
    if (typeof window === 'undefined') return

    if (isOpen) {
      // Iniciar scanner imediatamente sem manipular o body
      startScanning()

      return () => {
        stopScanning()
      }
    } else {
      stopScanning()
    }
  }, [isOpen]) // Removido startScanning e stopScanning das dependências

  if (!isOpen) return null

  // Renderizar em um portal para evitar conflitos com o layout
  const scannerContent = (
    <div 
      className="fixed inset-0 bg-black flex flex-col"
      style={{ 
        zIndex: 9999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Header */}
      <div className="bg-white p-4 flex justify-between items-center shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">
          📷 Scanner de Código
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Scanner Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Video Container */}
          <div className="relative w-full h-80 bg-gray-100 rounded-lg overflow-hidden mb-4">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                backgroundColor: '#f3f4f6',
                zIndex: 1,
                position: 'relative',
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                transform: 'scale(2.0)',
                transformOrigin: 'center center'
              }}
            />
            
            {/* Overlay com guias de escaneamento melhoradas */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Fundo escurecido */}
              <div className="absolute inset-0 bg-black bg-opacity-40"></div>
              
              {/* Área de escaneamento central - ultra pequena para códigos pequenos */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {/* Retângulo principal - ultra pequeno para códigos de barras pequenos */}
                <div className="w-20 h-12 border-2 border-white rounded-lg relative">
                  {/* Cantos destacados - menores */}
                  <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-2 border-l-2 border-green-400 rounded-tl-sm"></div>
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-2 border-r-2 border-green-400 rounded-tr-sm"></div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-2 border-l-2 border-green-400 rounded-bl-sm"></div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-2 border-r-2 border-green-400 rounded-br-sm"></div>
                  
                  {/* Linha central horizontal - mais fina */}
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-green-400 opacity-60"></div>
                  
                  {/* Linha central vertical - mais fina */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-400 opacity-60"></div>
                </div>
                
                {/* Texto de instrução */}
                <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
                  <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded-lg text-xs font-medium">
                    📱 Aproxime o código aqui
                  </div>
                </div>
              </div>
              
              {/* Indicadores de movimento - menores e mais discretos */}
              <div className="absolute top-1/2 left-2 transform -translate-y-1/2">
                <div className="flex flex-col space-y-1">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '0.5s'}}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
              
              <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
                <div className="flex flex-col space-y-1">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '1.5s'}}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
                </div>
              </div>
            </div>
          </div>


          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Instructions */}
          <div className="text-center mb-4">
            <p className="text-sm text-white mb-2">
              {!isInitialized 
                ? 'Inicializando câmera...'
                : isScanning 
                  ? 'Aproxime o código pequeno do retângulo branco'
                  : 'Clique em &quot;Iniciar Câmera&quot; para começar'
              }
            </p>
            <p className="text-xs text-gray-300">
              💡 Para códigos pequenos: aproxime bem a câmera ou use &quot;Digitar Manualmente&quot;
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            
            <button
              onClick={detectCode}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Digitar Manualmente
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Renderizar no portal
  return createPortal(scannerContent, document.body)
}