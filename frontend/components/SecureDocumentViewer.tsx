'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  Shield,
  Lock,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckCircle,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react'

export interface ViewSessionData {
  sessionToken: string
  caseId: string
  documentId: string
  documentTitle?: string
  classification?: string
  userIdentifier: string
  userName?: string
  timestamp: string
  watermarkLines?: string[]
}

interface SecureDocumentViewerProps {
  documentId: string
  documentTitle: string
  caseId: string
  classification?: string
  version?: number
  sessionData: ViewSessionData
  previewBlob: Blob
  mimeType: string
  sha256?: string
  onClose: () => void
  onCopyAttempt?: (message: string) => void
}

export default function SecureDocumentViewer({
  documentId,
  documentTitle,
  caseId,
  classification = 'CONFIDENTIAL',
  version = 1,
  sessionData,
  previewBlob,
  mimeType,
  sha256,
  onClose,
  onCopyAttempt
}: SecureDocumentViewerProps) {
  const [zoom, setZoom] = useState<number>(100)
  const [watermarkContrast, setWatermarkContrast] = useState<'subtle' | 'balanced' | 'high'>('balanced')
  const [textContent, setTextContent] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [pdfRendering, setPdfRendering] = useState<boolean>(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [pdfPageCount, setPdfPageCount] = useState<number>(0)
  const [securityAlert, setSecurityAlert] = useState<string | null>(null)

  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const viewerContainerRef = useRef<HTMLDivElement>(null)

  const isPdf = mimeType.includes('pdf') || documentTitle.toLowerCase().endsWith('.pdf')
  const isImage = mimeType.startsWith('image/')
  const isText = mimeType.startsWith('text/') || documentTitle.toLowerCase().endsWith('.txt')

  // Watermark text lines (comes dynamically from the server session)
  const watermarkTextLines = useMemo(() => {
    if (sessionData.watermarkLines && sessionData.watermarkLines.length > 0) {
      return sessionData.watermarkLines
    }
    return [
      classification.toUpperCase(),
      `CASE: ${caseId || sessionData.caseId || 'UNKNOWN'}`,
      `DOCUMENT: ${documentId || sessionData.documentId || 'UNKNOWN'}`,
      `USER: ${sessionData.userIdentifier || 'OFFICER'}`,
      `SESSION: ${sessionData.sessionToken || 'UNKNOWN'}`,
      `TIMESTAMP: ${sessionData.timestamp || new Date().toLocaleString()}`
    ]
  }, [sessionData, classification, caseId, documentId])

  // Build grid items to tile across the viewing area
  const watermarkTiles = useMemo(() => {
    const tiles = []
    for (let i = 0; i < 20; i++) {
      tiles.push(i)
    }
    return tiles
  }, [])

  // Generate object URL for preview
  useEffect(() => {
    if (!previewBlob) return
    const url = URL.createObjectURL(previewBlob)
    setBlobUrl(url)

    if (isText) {
      previewBlob.text().then(t => setTextContent(t)).catch(() => setTextContent('[Binary text content]'))
    }

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [previewBlob, isText])

  // PDF.js raster canvas rendering (prevents DOM text extraction and embeds per-page dynamic watermark)
  useEffect(() => {
    if (!isPdf || !blobUrl) return

    let isMounted = true
    setPdfRendering(true)
    setPdfError(null)

    const loadAndRenderPdf = async () => {
      try {
        // Dynamically load PDF.js from CDN if not already on window
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load secure PDF rendering engine'))
            document.head.appendChild(script)
          })
        }

        const pdfjsLib = (window as any).pdfjsLib
        if (!pdfjsLib) throw new Error('PDF rendering library unavailable')
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

        const loadingTask = pdfjsLib.getDocument(blobUrl)
        const pdf = await loadingTask.promise
        if (!isMounted) return

        setPdfPageCount(pdf.numPages)

        if (pdfContainerRef.current) {
          pdfContainerRef.current.innerHTML = ''

          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum)
            if (!isMounted) return

            const viewport = page.getViewport({ scale: 1.5 })
            const pageWrapper = document.createElement('div')
            pageWrapper.className = 'secure-pdf-page-wrapper'
            pageWrapper.style.position = 'relative'
            pageWrapper.style.marginBottom = '24px'
            pageWrapper.style.boxShadow = '0 8px 30px rgba(0,0,0,0.6)'
            pageWrapper.style.background = '#ffffff'
            pageWrapper.style.borderRadius = '4px'
            pageWrapper.style.overflow = 'hidden'

            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.height = viewport.height
            canvas.width = viewport.width
            canvas.style.width = '100%'
            canvas.style.height = 'auto'
            canvas.style.display = 'block'
            canvas.style.pointerEvents = 'none'

            const renderContext = {
              canvasContext: context!,
              viewport: viewport
            }

            await page.render(renderContext).promise

            // =========================================================================
            // DYNAMIC WATERMARK: DEDICATED VECTOR WATERMARK OVERLAY ON EVERY PDF PAGE
            // Tuned for high visibility + 100% PDF text readability (multiply blend mode)
            // =========================================================================
            // 1. Base Layer: Decrypted PDF Page Canvas
            pageWrapper.appendChild(canvas)

            // 2. Top Margin Security Band (sits in the page's top margin, zero text overlap)
            const topMarginBand = document.createElement('div')
            topMarginBand.className = 'secure-page-margin-band top-band'
            topMarginBand.innerHTML = `
              <span>CONFIDENTIAL EVIDENCE &bull; CASE: ${caseId || sessionData.caseId || 'CASE-2026-001'} &bull; ${classification}</span>
              <span>OFFICER: ${sessionData.userIdentifier || 'IO'} &bull; ${sessionData.timestamp}</span>
            `
            pageWrapper.appendChild(topMarginBand)

            // 3. Bottom Margin Security Band (sits in the page's bottom margin)
            const bottomMarginBand = document.createElement('div')
            bottomMarginBand.className = 'secure-page-margin-band bottom-band'
            bottomMarginBand.innerHTML = `
              <span>NYAYASETU FORENSIC AUDIT &bull; SESSION TOKEN: ${sessionData.sessionToken || ''}</span>
              <span>PAGE ${pageNum} OF ${pdf.numPages} &bull; CRYPTOGRAPHICALLY ATTESTED</span>
            `
            pageWrapper.appendChild(bottomMarginBand)

            // 4. Security Watermark Overlay Layer
            const pageOverlay = document.createElement('div')
            pageOverlay.className = 'secure-page-watermark-overlay'
            pageOverlay.style.position = 'absolute'
            pageOverlay.style.inset = '0'
            pageOverlay.style.pointerEvents = 'none'
            pageOverlay.style.zIndex = '10'
            pageOverlay.style.overflow = 'hidden'
            pageOverlay.style.userSelect = 'none'
            pageOverlay.style.mixBlendMode = 'multiply'

            // A. Prominent Center Diagonal Security Watermark Ribbon
            const centerWatermark = document.createElement('div')
            centerWatermark.className = 'secure-page-center-watermark'
            centerWatermark.innerHTML = `
              <div class="center-wm-title">RESTRICTED EVIDENCE &bull; ${classification.toUpperCase()} &bull; CASE: ${caseId || sessionData.caseId || 'SECURE'}</div>
              <div class="center-wm-sub">OFFICER: ${sessionData.userIdentifier || 'OFFICER'} &bull; SES-${sessionData.sessionToken || 'ACT'} &bull; ${sessionData.timestamp} &bull; PAGE ${pageNum}/${pdf.numPages}</div>
            `
            pageOverlay.appendChild(centerWatermark)

            // B. Perimeter & Body Forensic Grid Overlay
            const gridContainer = document.createElement('div')
            gridContainer.className = 'watermark-grid'

            for (let t = 0; t < 6; t++) {
              const tile = document.createElement('div')
              tile.className = 'watermark-tile'

              const box = document.createElement('div')
              box.className = 'watermark-content page-tile'

              watermarkTextLines.forEach((line, lIdx) => {
                const lineDiv = document.createElement('div')
                lineDiv.className = `watermark-line ${lIdx === 0 ? 'watermark-lead' : ''}`
                lineDiv.textContent = line
                box.appendChild(lineDiv)
              })

              const pageDiv = document.createElement('div')
              pageDiv.className = 'watermark-line'
              pageDiv.style.marginTop = '2px'
              pageDiv.textContent = `PAGE ${pageNum} OF ${pdf.numPages}`
              box.appendChild(pageDiv)

              tile.appendChild(box)
              gridContainer.appendChild(tile)
            }

            pageOverlay.appendChild(gridContainer)
            pageWrapper.appendChild(pageOverlay)

            if (pdfContainerRef.current) {
              pdfContainerRef.current.appendChild(pageWrapper)
            }
          }
        }
      } catch (err: any) {
        console.warn('PDF.js canvas render error, using secure fallback frame:', err)
        if (isMounted) {
          setPdfError(err.message || 'Render fallback')
        }
      } finally {
        if (isMounted) {
          setPdfRendering(false)
        }
      }
    }

    loadAndRenderPdf()

    return () => {
      isMounted = false
    }
  }, [isPdf, blobUrl, watermarkTextLines])

  // SECURITY ENFORCEMENT: Anti-Copy, Anti-Cut, Anti-Paste & Keydown Blocking
  const triggerSecurityWarning = (reason: string) => {
    setSecurityAlert(reason)
    if (onCopyAttempt) {
      onCopyAttempt(reason)
    }
    setTimeout(() => {
      setSecurityAlert(null)
    }, 3500)
  }

  const handleCopyEvent = (e: React.ClipboardEvent | ClipboardEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerSecurityWarning('Copying text is prohibited for chain-of-custody protection.')
    return false
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    triggerSecurityWarning('Right-click context actions are disabled in the Secure Viewer.')
    return false
  }

  // Global window keyboard listener while viewer is mounted
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key closes modal
      if (e.key === 'Escape') {
        onClose()
        return
      }

      const isModifier = e.ctrlKey || e.metaKey
      if (isModifier) {
        const key = e.key.toLowerCase()
        if (['c', 'x', 'a', 'p', 's', 'u'].includes(key)) {
          e.preventDefault()
          e.stopPropagation()
          const actionMap: Record<string, string> = {
            c: 'Copy (Ctrl+C)',
            x: 'Cut (Ctrl+X)',
            a: 'Select All (Ctrl+A)',
            p: 'Print (Ctrl+P)',
            s: 'Save (Ctrl+S)',
            u: 'View Source'
          }
          triggerSecurityWarning(`${actionMap[key] || 'Shortcut'} is disabled for evidence integrity.`)
          return false
        }
      }
    }

    const preventClipboard = (e: ClipboardEvent) => {
      e.preventDefault()
      triggerSecurityWarning('Clipboard extraction is blocked.')
    }

    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('copy', preventClipboard, true)
    window.addEventListener('cut', preventClipboard, true)

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('copy', preventClipboard, true)
      window.removeEventListener('cut', preventClipboard, true)
    }
  }, [onClose])

  return (
    <div
      className="secure-viewer-backdrop"
      onContextMenu={handleContextMenu}
      onCopy={handleCopyEvent}
      onCut={e => { e.preventDefault(); e.stopPropagation(); }}
      onPaste={e => { e.preventDefault(); e.stopPropagation(); }}
      onDragStart={e => { e.preventDefault(); e.stopPropagation(); }}
    >
      <div className="secure-viewer-modal" data-contrast={watermarkContrast}>
        {/* Top Control Header */}
        <header className="secure-viewer-header">
          <div className="viewer-title-group">
            <div className="viewer-shield-icon">
              <Shield size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="viewer-doc-id">{documentId}</span>
                <span className="badge-tag">{classification}</span>
                <span className="size-badge">v{version}</span>
              </div>
              <h2 className="viewer-filename" title={documentTitle}>
                {documentTitle}
              </h2>
            </div>
          </div>

          {/* Session Traceability & Controls */}
          <div className="viewer-controls-group">
            {/* Dynamic Session Badge */}
            <div className="session-trace-badge" title="Dynamic forensic tracking session active">
              <span className="session-dot pulsing"></span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                SES-{sessionData.sessionToken}
              </span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {sessionData.userIdentifier}
              </span>
            </div>

            {/* Watermark Readability Selector */}
            <div className="viewer-watermark-control" title="Adjust watermark visibility and contrast profile">
              <span className="wm-control-label">
                <Eye size={12} style={{ marginRight: '4px', color: 'var(--accent-cyan)' }} />
                Watermark:
              </span>
              <div className="wm-segmented-pill">
                <button
                  type="button"
                  className={`wm-pill-btn ${watermarkContrast === 'subtle' ? 'active' : ''}`}
                  onClick={() => setWatermarkContrast('subtle')}
                  title="Subtle (15% opacity): Faint security watermark for dense small-print legal text"
                >
                  Subtle
                </button>
                <button
                  type="button"
                  className={`wm-pill-btn ${watermarkContrast === 'balanced' ? 'active' : ''}`}
                  onClick={() => setWatermarkContrast('balanced')}
                  title="Balanced (28% opacity - Recommended): Clear watermark visibility with 100% PDF text readability"
                >
                  Balanced
                </button>
                <button
                  type="button"
                  className={`wm-pill-btn ${watermarkContrast === 'high' ? 'active' : ''}`}
                  onClick={() => setWatermarkContrast('high')}
                  title="Prominent (42% opacity): High-contrast tamper-evident security watermark"
                >
                  Prominent
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="viewer-zoom-bar">
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setZoom(z => Math.max(50, z - 15))}
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span style={{ fontSize: '0.78rem', minWidth: '45px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                {zoom}%
              </span>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setZoom(z => Math.min(200, z + 15))}
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                className="btn btn-secondary btn-xs"
                onClick={() => setZoom(100)}
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            {/* Close Button */}
            <button
              className="btn btn-secondary btn-xs viewer-close-btn"
              onClick={onClose}
              title="Close Viewer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Security Warning Notice Ribbon */}
        <div className="secure-viewer-notice">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>
              <b>NyayaSetu Protected Viewer:</b> Text selection and clipboard extraction are disabled. All views are dynamically watermarked &amp; logged for forensic audit.
            </span>
          </div>
          {sha256 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              SHA-256: {sha256.substring(0, 16)}...
            </span>
          )}
        </div>

        {/* Active Security Toast Alert */}
        {securityAlert && (
          <div className="viewer-security-alert">
            <AlertTriangle size={16} />
            <span>{securityAlert}</span>
          </div>
        )}

        {/* Main Document Viewport Area */}
        <div className="secure-viewer-viewport" ref={viewerContainerRef}>
          {/* Fallback Viewport Watermark Overlay (active when not in multi-page PDF canvas mode) */}
          {(!isPdf || pdfError) && (
            <div className="secure-watermark-overlay" aria-hidden="true">
              <div className="secure-page-center-watermark">
                <div className="center-wm-title">RESTRICTED EVIDENCE &bull; {classification.toUpperCase()} &bull; CASE: {caseId || sessionData.caseId || 'SECURE'}</div>
                <div className="center-wm-sub">OFFICER: {sessionData.userIdentifier || 'OFFICER'} &bull; SES-{sessionData.sessionToken || 'ACT'} &bull; {sessionData.timestamp}</div>
              </div>
              <div className="watermark-grid">
                {watermarkTiles.map(idx => (
                  <div key={idx} className="watermark-tile">
                    <div className="watermark-content">
                      {watermarkTextLines.map((line, lIdx) => (
                        <div key={lIdx} className={`watermark-line ${lIdx === 0 ? 'watermark-lead' : ''}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENT CONTENT LAYER */}
          <div
            className="secure-document-content-layer"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* 1. PDF Document Rendering */}
            {isPdf && (
              <div className="pdf-view-wrapper">
                {pdfRendering && (
                  <div className="viewer-loading-state">
                    <RefreshCw size={28} className="spin" style={{ color: 'var(--accent-cyan)' }} />
                    <p style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Decrypted PDF is rendering into secure raster graphics...
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Applying dynamic session watermark and anti-extraction protections.
                    </p>
                  </div>
                )}

                {/* Rasterized Canvas Pages Container */}
                <div
                  ref={pdfContainerRef}
                  className="pdf-pages-container"
                  style={{ display: pdfRendering ? 'none' : 'block' }}
                />

                {/* Fallback if PDF.js is unavailable */}
                {pdfError && blobUrl && (
                  <div className="pdf-fallback-container">
                    <object
                      data={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                      type="application/pdf"
                      className="pdf-fallback-object"
                    >
                      <p style={{ padding: '20px', textAlign: 'center' }}>
                        PDF preview is displayed with security watermark.
                      </p>
                    </object>
                  </div>
                )}
              </div>
            )}

            {/* 2. Text / FIR Document Rendering */}
            {isText && (
              <div className="secure-text-sheet" style={{ position: 'relative', overflow: 'hidden' }}>
                <div className="secure-page-watermark-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
                  <div className="secure-page-center-watermark">
                    <div className="center-wm-title">RESTRICTED EVIDENCE &bull; {classification.toUpperCase()} &bull; CASE: {caseId || sessionData.caseId || 'SECURE'}</div>
                    <div className="center-wm-sub">OFFICER: {sessionData.userIdentifier || 'OFFICER'} &bull; SES-{sessionData.sessionToken || 'ACT'} &bull; {sessionData.timestamp}</div>
                  </div>
                  <div className="watermark-grid" style={{ padding: '40px', gap: '120px 60px' }}>
                    {watermarkTiles.slice(0, 6).map(idx => (
                      <div key={idx} className="watermark-tile">
                        <div className="watermark-content page-tile">
                          {watermarkTextLines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              className={`watermark-line ${lIdx === 0 ? 'watermark-lead' : ''}`}
                            >
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sheet-header" style={{ position: 'relative', zIndex: 6 }}>
                  <span className="badge-tag">{classification}</span>
                  <span>{documentTitle}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{caseId}</span>
                </div>
                <pre className="secure-text-content" style={{ position: 'relative', zIndex: 6 }}>
                  {textContent || 'Loading decrypted document text...'}
                </pre>
              </div>
            )}

            {/* 3. Image Evidence Rendering */}
            {isImage && blobUrl && (
              <div className="secure-image-wrapper" style={{ position: 'relative', overflow: 'hidden' }}>
                <div className="secure-page-watermark-overlay" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5, overflow: 'hidden' }}>
                  <div className="secure-page-center-watermark">
                    <div className="center-wm-title">RESTRICTED EVIDENCE &bull; {classification.toUpperCase()} &bull; CASE: {caseId || sessionData.caseId || 'SECURE'}</div>
                    <div className="center-wm-sub">OFFICER: {sessionData.userIdentifier || 'OFFICER'} &bull; SES-{sessionData.sessionToken || 'ACT'} &bull; {sessionData.timestamp}</div>
                  </div>
                  <div className="watermark-grid" style={{ padding: '40px', gap: '120px 60px' }}>
                    {watermarkTiles.slice(0, 6).map(idx => (
                      <div key={idx} className="watermark-tile">
                        <div className="watermark-content page-tile">
                          {watermarkTextLines.map((line, lIdx) => (
                            <div key={lIdx} className={`watermark-line ${lIdx === 0 ? 'watermark-lead' : ''}`}>
                              {line}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <img
                  src={blobUrl}
                  alt={documentTitle}
                  draggable={false}
                  className="secure-image-content"
                  style={{ position: 'relative', zIndex: 4 }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <footer className="secure-viewer-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Sparkles size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span>Dynamic Watermark Trace: Session <b>{sessionData.sessionToken}</b> &bull; User <b>{sessionData.userIdentifier}</b> &bull; {sessionData.timestamp}</span>
          </div>
          {pdfPageCount > 0 && isPdf && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Pages: {pdfPageCount}
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
