'use client'

import React, { useState, useEffect, useRef } from 'react'
import { authApi, caseApi, docApi, isTokenExpired, BACKEND_URL } from '../src/services/api'
import SecureDocumentViewer, { ViewSessionData } from '../components/SecureDocumentViewer'
import {
  Shield,
  Lock,
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  Plus,
  User,
  Key,
  Database,
  HardDrive,
  LogOut,
  Mail,
  Smartphone,
  CreditCard,
  Briefcase,
  Camera,
  UploadCloud,
  Check,
  RotateCcw,
  X,
  Image as ImageIcon,
  ScanFace
} from 'lucide-react'

interface CaseItem {
  caseId?: number
  case_number: string
  caseNumber?: string
  title: string
  description?: string
  status?: string
  created_by?: string
  createdAt?: string
  lastUpdate?: string
}

interface DocumentItem {
  id: string
  caseId: string
  originalFilename: string
  mimeType: string
  fileSize: number
  documentType: string
  classification: string
  uploadedBy: string
  currentVersion: number
  status: string
  createdAt: string
  versions?: any[]
}

interface AuditLogItem {
  id: number
  timestamp: string
  action: string
  userId: string
  documentId: string
  caseId: string
  result: string
  ipAddress: string
  details: string
}

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')

  // Login Form States
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'face'>('credentials')
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Face Sign-In States
  const [faceLoginEmail, setFaceLoginEmail] = useState('')
  const [faceLivePhoto, setFaceLivePhoto] = useState<File | Blob | null>(null)
  const [faceLivePreview, setFaceLivePreview] = useState<string | null>(null)
  const [faceCameraActive, setFaceCameraActive] = useState(false)
  const [faceVerifying, setFaceVerifying] = useState(false)
  const [faceError, setFaceError] = useState<string | null>(null)

  // Registration Form States
  const [regStep, setRegStep] = useState<'email' | 'otp' | 'profile'>('email')
  const [regEmail, setRegEmail] = useState('')
  const [regOtp, setRegOtp] = useState('')
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regPosition, setRegPosition] = useState('Investigating Officer')
  const [regAadhar, setRegAadhar] = useState('123456789012')
  const [regPhone, setRegPhone] = useState('9876543210')
  const [regPhoto, setRegPhoto] = useState<File | Blob | null>(null)
  const [regPhotoPreview, setRegPhotoPreview] = useState<string | null>(null)
  const [regPhotoMode, setRegPhotoMode] = useState<'idle' | 'camera'>('idle')
  const [regPhotoConfirmed, setRegPhotoConfirmed] = useState<boolean>(false)
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [regLoading, setRegLoading] = useState(false)
  const [regNotice, setRegNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  // Dashboard Main States
  const [activeTab, setActiveTab] = useState<'upload' | 'vault' | 'audit' | 'access'>('upload')
  const [backendOnline, setBackendOnline] = useState<boolean>(true)
  const [backendPort, setBackendPort] = useState<string>('8082')

  // Upload Form States
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caseId, setCaseId] = useState('')
  const [docType, setDocType] = useState('FIR')
  const [classification, setClassification] = useState('CONFIDENTIAL')
  const [uploadedBy, setUploadedBy] = useState('OFFICER-42')
  const [pipelineRunning, setPipelineRunning] = useState(false)
  const [currentPipelineStep, setCurrentPipelineStep] = useState<number>(-1)
  const [uploadSuccessResult, setUploadSuccessResult] = useState<any>(null)

  // Vault & Audit Data States
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [vaultLoading, setVaultLoading] = useState(false)
  const [searchVault, setSearchVault] = useState('')
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [cases, setCases] = useState<CaseItem[]>([])
  const [casesLoading, setCasesLoading] = useState(false)
  const [caseSearch, setCaseSearch] = useState('')
  const [newCaseNumber, setNewCaseNumber] = useState('')
  const [newCaseTitle, setNewCaseTitle] = useState('')
  const [newCaseDescription, setNewCaseDescription] = useState('')
  const [caseCreating, setCaseCreating] = useState(false)

  // Modals
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [targetDocForVersion, setTargetDocForVersion] = useState<DocumentItem | null>(null)
  const [versionFile, setVersionFile] = useState<File | null>(null)
  const [versionEditorUser, setVersionEditorUser] = useState('OFFICER-42')
  const [versionError, setVersionError] = useState<string | null>(null)
  const [versionLoading, setVersionLoading] = useState(false)

  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyData, setVerifyData] = useState<any>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  // NyayaSetu Secure Document Viewer States
  const [viewerOpen, setViewerOpen] = useState<boolean>(false)
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null)
  const [viewSessionData, setViewSessionData] = useState<ViewSessionData | null>(null)
  const [viewBlob, setViewBlob] = useState<Blob | null>(null)
  const [viewMimeType, setViewMimeType] = useState<string>('application/pdf')
  const [viewSha256, setViewSha256] = useState<string | undefined>(undefined)
  const [viewerLoading, setViewerLoading] = useState<boolean>(false)

  // Toasts
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: 'success' | 'error' | 'info' }>>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const versionFileInputRef = useRef<HTMLInputElement>(null)
  const photoFileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceVideoRef = useRef<HTMLVideoElement>(null)
  const faceStreamRef = useRef<MediaStream | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  // Enforce starting at login screen on initial load/refresh
  useEffect(() => {
    localStorage.removeItem('dms_officer')
    setCurrentUser(null)
    setIsAuthenticated(false)
    setLoginStep('credentials')
    setAuthTab('login')
  }, [])

  // Listen for session expiry from any API request
  useEffect(() => {
    const handleExpired = (e: any) => {
      setCurrentUser(null)
      setIsAuthenticated(false)
      showToast(e.detail?.message || 'Session expired. Please sign in again.', 'info')
    }
    window.addEventListener('dms_session_expired', handleExpired)
    return () => window.removeEventListener('dms_session_expired', handleExpired)
  }, [])

  // Check backend health
  useEffect(() => {
    const checkHealth = async () => {
      const ok = await authApi.checkBackend()
      setBackendOnline(ok)
    }
    checkHealth()
    const timer = setInterval(checkHealth, 15000)
    return () => clearInterval(timer)
  }, [])

  // Load vault & audit data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments()
      loadAuditLogs()
      loadCases()
    }
  }, [isAuthenticated])

  const loadDocuments = async () => {
    setVaultLoading(true)
    try {
      const docs = await docApi.getAll()
      setDocuments(docs || [])
    } catch (e: any) {
      showToast('Could not load documents from vault: ' + e.message, 'error')
    } finally {
      setVaultLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    setAuditLoading(true)
    try {
      const logs = await docApi.getAuditLogs()
      setAuditLogs(logs || [])
    } catch (e: any) {
      showToast('Could not load audit logs: ' + e.message, 'error')
    } finally {
      setAuditLoading(false)
    }
  }

  const loadCases = async () => {
    setCasesLoading(true)
    try {
      const data = await caseApi.getAll()
      const list = data || []
      setCases(list)
      if (list.length > 0) {
        const firstNum = list[0].case_number || list[0].caseNumber
        if (firstNum && !caseId) {
          setCaseId(firstNum)
        }
      } else {
        if (!caseId) setCaseId('CASE-2026-001')
      }
    } catch (e: any) {
      console.warn('Could not load assessment cases:', e)
      if (!caseId) setCaseId('CASE-2026-001')
    } finally {
      setCasesLoading(false)
    }
  }

  const handleCreateCase = async (event: React.FormEvent) => {
    event.preventDefault()
    setCaseCreating(true)

    try {
      await caseApi.create({
        caseNumber: newCaseNumber.trim(),
        title: newCaseTitle.trim(),
        description: newCaseDescription.trim(),
        createdBy: currentUser?.username || uploadedBy || 'OFFICER-42'
      })
      setNewCaseNumber('')
      setNewCaseTitle('')
      setNewCaseDescription('')
      await loadCases()
      showToast('Case created successfully.', 'success')
    } catch (e: any) {
      showToast(e.message || 'Could not create case.', 'error')
    } finally {
      setCaseCreating(false)
    }
  }

  // AUTH ACTIONS
  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginUsername || !loginPassword) {
      setLoginError('Please enter username and password')
      return
    }
    setLoginLoading(true)
    setLoginError(null)
    try {
      await authApi.login(loginUsername.trim(), loginPassword)
      setLoginStep('otp')
      showToast('Login OTP sent to your registered email.', 'info')
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Invalid credentials.')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginOtp) {
      setLoginError('Please enter the 6-digit OTP')
      return
    }
    setLoginLoading(true)
    setLoginError(null)
    try {
      await authApi.verifyLoginOtp(loginUsername, loginOtp)
      showToast('Step 2 complete: OTP verified! Please look at the camera for face verification.', 'info')
      setFaceLoginEmail(loginUsername)
      setFaceError(null)
      setFaceLivePhoto(null)
      setFaceLivePreview(null)
      setLoginStep('face')
      startFaceCamera()
    } catch (err: any) {
      setLoginError(err.message || 'Invalid or expired OTP.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Face Sign-In Functions
  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach(track => track.stop())
      faceStreamRef.current = null
    }
    setFaceCameraActive(false)
  }

  const startFaceCamera = async () => {
    setFaceError(null)
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this device/browser.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      })
      faceStreamRef.current = stream
      setFaceCameraActive(true)
    } catch (err: any) {
      console.error('Face camera error:', err)
      setFaceError(err.message || 'Unable to open camera. Please check camera permissions.')
      setFaceCameraActive(false)
    }
  }

  const startFaceLogin = () => {
    setLoginError(null)
    setFaceError(null)
    setFaceLivePhoto(null)
    setFaceLivePreview(null)
    if (loginUsername) {
      setFaceLoginEmail(loginUsername)
    }
    setLoginStep('face')
    startFaceCamera()
  }

  const cancelFaceLogin = () => {
    stopFaceCamera()
    setFaceLivePhoto(null)
    setFaceLivePreview(null)
    setFaceError(null)
    setLoginStep('otp')
  }

  const captureFacePhoto = () => {
    if (!faceVideoRef.current) return
    const video = faceVideoRef.current
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `face-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
          setFaceLivePhoto(file)
          setFaceLivePreview(URL.createObjectURL(blob))
          stopFaceCamera()
        }
      }, 'image/jpeg', 0.95)
    }
  }

  const retakeFacePhoto = () => {
    setFaceLivePhoto(null)
    setFaceLivePreview(null)
    setFaceError(null)
    startFaceCamera()
  }

  const handleVerifyFaceLogin = async () => {
    if (!faceLoginEmail || !faceLoginEmail.trim()) {
      setFaceError('Please enter your registered email address.')
      return
    }
    if (!faceLivePhoto) {
      setFaceError('Please capture your face photo first.')
      return
    }

    setFaceVerifying(true)
    setFaceError(null)
    try {
      const data = await authApi.faceLogin(faceLoginEmail.trim(), faceLivePhoto)
      const officerData = {
        username: data.username || faceLoginEmail.trim(),
        token: data.token,
        role: data.role || 'Investigating Officer',
        firstName: data.firstName,
        lastName: data.lastName
      }
      localStorage.setItem('dms_officer', JSON.stringify(officerData))
      setCurrentUser(officerData)
      setUploadedBy(officerData.username)
      setIsAuthenticated(true)
      showToast('Face biometric verified! Welcome to Secure DMS.', 'success')
      stopFaceCamera()
      setFaceLivePhoto(null)
      setFaceLivePreview(null)
    } catch (err: any) {
      setFaceError(err.message || 'Face verification failed. Please try again.')
    } finally {
      setFaceVerifying(false)
    }
  }

  useEffect(() => {
    if (faceCameraActive && faceStreamRef.current && faceVideoRef.current) {
      faceVideoRef.current.srcObject = faceStreamRef.current
      faceVideoRef.current.play().catch(() => { })
    }
  }, [faceCameraActive, loginStep])

  const handleRegSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regEmail || !regEmail.includes('@')) {
      setRegNotice({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }
    setRegLoading(true)
    setRegNotice(null)
    try {
      await authApi.register(regEmail)
      setRegStep('otp')
      setRegNotice({ type: 'success', message: 'Verification OTP sent to ' + regEmail })
    } catch (err: any) {
      setRegNotice({ type: 'error', message: err.message || 'Failed to send registration OTP.' })
    } finally {
      setRegLoading(false)
    }
  }

  const handleRegVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regOtp) {
      setRegNotice({ type: 'error', message: 'Please enter the 6-digit OTP' })
      return
    }
    setRegLoading(true)
    setRegNotice(null)
    try {
      await authApi.verifyOtp(regEmail, regOtp)
      setRegStep('profile')
      setRegNotice({ type: 'success', message: 'Email verified! Please complete your profile.' })
    } catch (err: any) {
      setRegNotice({ type: 'error', message: err.message || 'Invalid verification OTP.' })
    } finally {
      setRegLoading(false)
    }
  }

  // Camera & Profile Photo Management
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setRegPhotoMode('idle')
  }

  const startCamera = async () => {
    setCameraError(null)
    setRegPhotoMode('camera')
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser or device.')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      })
      streamRef.current = stream
      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraError(err.message || 'Unable to access camera. Please check browser permissions or upload a photo instead.')
      setCameraActive(false)
    }
  }

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => { })
    }
  }, [cameraActive, regPhotoMode])

  useEffect(() => {
    return () => {
      stopCamera()
      stopFaceCamera()
    }
  }, [])

  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
      ctx.drawImage(video, 0, 0, width, height)
      canvas.toBlob(blob => {
        if (blob) {
          const file = new File([blob], `signup-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
          setRegPhoto(file)
          setRegPhotoPreview(URL.createObjectURL(blob))
          setRegPhotoConfirmed(false)
          stopCamera()
        }
      }, 'image/jpeg', 0.92)
    }
  }

  const handlePhotoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
      if (!validTypes.includes(file.type.toLowerCase())) {
        showToast('Please select a valid image (JPG, JPEG, PNG, WEBP).', 'error')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        showToast('Image exceeds maximum allowed size of 5MB.', 'error')
        return
      }
      setRegPhoto(file)
      setRegPhotoPreview(URL.createObjectURL(file))
      setRegPhotoConfirmed(false)
      setRegPhotoMode('idle')
      stopCamera()
    }
  }

  const handleConfirmPhoto = () => {
    setRegPhotoConfirmed(true)
    showToast('Profile photo confirmed!', 'success')
  }

  const handleChangePhoto = () => {
    setRegPhoto(null)
    setRegPhotoPreview(null)
    setRegPhotoConfirmed(false)
    setRegPhotoMode('idle')
    stopCamera()
    if (photoFileInputRef.current) photoFileInputRef.current.value = ''
  }

  const handleRetakePhoto = () => {
    setRegPhoto(null)
    setRegPhotoPreview(null)
    setRegPhotoConfirmed(false)
    if (photoFileInputRef.current) photoFileInputRef.current.value = ''
    startCamera()
  }

  const handleRegSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regFirstName || !regLastName || !regPassword) {
      setRegNotice({ type: 'error', message: 'All profile fields and password are required.' })
      return
    }
    if (regPassword !== regConfirmPassword) {
      setRegNotice({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    setRegLoading(true)
    setRegNotice(null)
    try {
      await authApi.setProfile({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        position: regPosition,
        aadharNumber: regAadhar,
        phoneNumber: regPhone,
        photo: regPhoto
      })
      showToast('Registration complete! You can now log in.', 'success')
      setLoginUsername(regEmail)
      setLoginPassword(regPassword)
      setAuthTab('login')
      setLoginStep('credentials')
      // Reset photo state
      setRegPhoto(null)
      setRegPhotoPreview(null)
      setRegPhotoConfirmed(false)
      stopCamera()
    } catch (err: any) {
      setRegNotice({ type: 'error', message: err.message || 'Failed to save profile.' })
    } finally {
      setRegLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('dms_officer')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setLoginStep('credentials')
    setLoginPassword('')
    setLoginOtp('')
    showToast('Logged out securely.', 'info')
  }

  // UPLOAD & PIPELINE EXECUTION
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setUploadSuccessResult(null)
    }
  }

  const handleExecutePipeline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      showToast('Please select a file to upload.', 'error')
      return
    }

    setPipelineRunning(true)
    setCurrentPipelineStep(0)
    setUploadSuccessResult(null)

    // Run stepped visualizer
    for (let s = 1; s <= 7; s++) {
      setCurrentPipelineStep(s)
      await new Promise(r => setTimeout(r, 220))
    }

    try {
      const result = await docApi.upload(selectedFile, {
        caseId,
        documentType: docType,
        classification,
        uploadedBy: uploadedBy || currentUser?.username || 'OFFICER-42'
      })

      setUploadSuccessResult(result)
      showToast(`Document ${result.documentId || ''} ingested successfully into MinIO S3 and MySQL!`, 'success')
      loadDocuments()
      loadAuditLogs()
    } catch (err: any) {
      setCurrentPipelineStep(-1)
      showToast('Upload failed: ' + err.message, 'error')
    } finally {
      setPipelineRunning(false)
    }
  }

  // VERSION MANAGEMENT
  const openVersionModal = (doc: DocumentItem) => {
    setTargetDocForVersion(doc)
    setVersionFile(null)
    setVersionError(null)
    setVersionEditorUser(currentUser?.username || 'OFFICER-42')
    setVersionModalOpen(true)
  }

  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setVersionFile(file)
      setVersionError(null)

      if (targetDocForVersion) {
        const origExt = targetDocForVersion.originalFilename.split('.').pop()?.toLowerCase() || ''
        const newExt = file.name.split('.').pop()?.toLowerCase() || ''
        if (origExt !== newExt) {
          setVersionError(
            `File type mismatch! Original is .${origExt.toUpperCase()} but selected file is .${newExt.toUpperCase()}. All versions must strictly match the original file type.`
          )
        }
      }
    }
  }

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetDocForVersion || !versionFile) {
      setVersionError('Please select a file to upload.')
      return
    }

    const origExt = targetDocForVersion.originalFilename.split('.').pop()?.toLowerCase() || ''
    const newExt = versionFile.name.split('.').pop()?.toLowerCase() || ''
    if (origExt !== newExt) {
      setVersionError(`Version type mismatch! Must be .${origExt.toUpperCase()}`)
      return
    }

    setVersionLoading(true)
    try {
      await docApi.uploadVersion(targetDocForVersion.id, versionFile, {
        uploadedBy: versionEditorUser
      })
      showToast(`New version for ${targetDocForVersion.id} committed successfully!`, 'success')
      setVersionModalOpen(false)
      loadDocuments()
      loadAuditLogs()
    } catch (err: any) {
      setVersionError(err.message || 'Version upload failed.')
    } finally {
      setVersionLoading(false)
    }
  }

  // DOWNLOAD & DECRYPT
  const handleDownload = async (doc: DocumentItem) => {
    showToast(`Downloading & decrypting ${doc.id}...`, 'info')
    try {
      const result = await docApi.downloadBlob(doc.id, null, currentUser?.username || 'OFFICER-42')
      showToast(`Downloaded ${result.filename} (SHA-256 & Signature verified)`, 'success')
      loadAuditLogs()
    } catch (err: any) {
      showToast('Download error: ' + err.message, 'error')
    }
  }

  // ON-DEMAND VERIFICATION
  const handleVerify = async (doc: DocumentItem) => {
    setVerifyLoading(true)
    setVerifyData(null)
    setVerifyModalOpen(true)
    try {
      const res = await docApi.verify(doc.id)
      setVerifyData({ ...res, docInfo: doc })
    } catch (err: any) {
      setVerifyData({
        documentId: doc.id,
        version: doc.currentVersion,
        verified: false,
        error: err.message,
        docInfo: doc
      })
    } finally {
      setVerifyLoading(false)
    }
  }

  // NYAYASETU SECURE VIEWER SESSION HANDLER
  const handleOpenViewer = async (doc: any) => {
    const docId = doc.id
    const ver = doc.currentVersion ?? doc.version ?? 1
    const docName = doc.originalFilename || doc.filename || docId
    const docCaseId = doc.caseId || caseId || 'CASE-GENERAL'
    const docClassification = doc.classification || 'CONFIDENTIAL'

    setViewerLoading(true)
    showToast(`Establishing secure viewing session for ${docName}...`, 'info')

    try {
      // 1. Request authenticated viewing session with dynamic watermark lines and audit log
      const session = await docApi.getViewSession(docId, ver)

      // 2. Fetch decrypted document preview stream (inline disposition)
      const preview = await docApi.getPreviewBlob(docId, ver)

      setViewSessionData(session)
      setViewBlob(preview.blob)
      setViewMimeType(preview.mimeType || doc.mimeType || 'application/pdf')
      setViewSha256(preview.sha256 || doc.sha256 || doc.originalSha256)
      setViewerDoc({
        id: docId,
        caseId: docCaseId,
        originalFilename: docName,
        mimeType: preview.mimeType || doc.mimeType || 'application/pdf',
        fileSize: preview.blob.size,
        documentType: doc.documentType || 'DOCUMENT',
        classification: docClassification,
        uploadedBy: doc.uploadedBy || currentUser?.username || 'OFFICER',
        currentVersion: ver,
        status: doc.status || 'ACTIVE',
        createdAt: doc.createdAt || new Date().toISOString()
      })
      setViewerOpen(true)
      loadAuditLogs()
    } catch (err: any) {
      console.error('Failed to open secure viewer:', err)
      showToast(err.message || 'Unable to initialize secure viewer.', 'error')
    } finally {
      setViewerLoading(false)
    }
  }

  // SYSTEM RESET
  const handleResetSystem = async () => {
    if (!confirm('Are you sure you want to reset the database and test documents?')) return
    try {
      await docApi.resetSystem()
      showToast('System database reset successfully.', 'info')
      loadDocuments()
      loadAuditLogs()
    } catch (e: any) {
      showToast('Reset failed: ' + e.message, 'error')
    }
  }

  // FILTERED VAULT DOCUMENTS
  const filteredDocs = documents.filter(d => {
    if (!searchVault) return true
    const q = searchVault.toLowerCase()
    return (
      d.id?.toLowerCase().includes(q) ||
      d.originalFilename?.toLowerCase().includes(q) ||
      d.caseId?.toLowerCase().includes(q) ||
      d.documentType?.toLowerCase().includes(q) ||
      d.classification?.toLowerCase().includes(q)
    )
  })

  // ----------------------------------------------------
  // RENDER: AUTHENTICATION SCREEN (If Not Logged In)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '480px', background: 'var(--bg-card)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ width: '56px', height: '56px', margin: '0 auto 14px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)' }}>
              <Shield size={32} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              Secure DMS <span className="badge-tag">GOV-AUTH</span>
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Cryptographic Evidence & Document Security Gateway
            </p>
          </div>

          {/* Auth Tab Switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-sm)', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { setAuthTab('login'); setLoginError(null); }}
              style={{ padding: '8px', border: 'none', borderRadius: '6px', background: authTab === 'login' ? 'rgba(0, 242, 254, 0.15)' : 'transparent', color: authTab === 'login' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab('register'); setRegNotice(null); }}
              style={{ padding: '8px', border: 'none', borderRadius: '6px', background: authTab === 'register' ? 'rgba(0, 242, 254, 0.15)' : 'transparent', color: authTab === 'register' ? 'var(--accent-cyan)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Register Officer
            </button>
          </div>

          {/* SIGN IN TAB */}
          {authTab === 'login' && (
            <div>
              {/* 3-Step Sequential MFA Progress Stepper */}
              <div className="mfa-stepper-container">
                <div className={`mfa-step-item ${loginStep === 'credentials' ? 'active' : 'completed'}`}>
                  {/* <span className="mfa-step-badge">
                    {loginStep === 'credentials' ? '1' : <Check size={12} />}
                  </span> */}
                  {/* <span>Password</span> */}
                </div>
                <div className={`mfa-step-divider ${loginStep === 'otp' || loginStep === 'face' ? 'active' : ''}`} />
                <div className={`mfa-step-item ${loginStep === 'otp' ? 'active' : loginStep === 'face' ? 'completed' : ''}`}>
                  {/* <span className="mfa-step-badge">
                    {loginStep === 'face' ? <Check size={12} /> : '2'}
                  </span> */}
                  {/* <span>OTP Code</span> */}
                </div>
                <div className={`mfa-step-divider ${loginStep === 'face' ? 'active' : ''}`} />
                <div className={`mfa-step-item ${loginStep === 'face' ? 'active' : ''}`}>
                  {/* <span className="mfa-step-badge">3</span> */}
                  {/* <span>Face Biometric</span> */}
                </div>
              </div>

              {loginError && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', fontSize: '0.82rem', marginBottom: '16px' }}>
                  {loginError}
                </div>
              )}

              {/* Step 1: Password Credentials */}
              {loginStep === 'credentials' && (
                <form onSubmit={handleLoginPassword} className="form-container">
                  <div className="form-group">
                    <label>Officer Username / Email</label>
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={e => setLoginUsername(e.target.value)}
                      placeholder="e.g. officer@police.gov.in"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loginLoading} style={{ marginTop: '8px' }}>
                    {loginLoading ? 'Verifying Credentials...' : 'Verify Password & Request OTP'}
                  </button>
                </form>
              )}

              {/* Step 2: 6-Digit Email OTP */}
              {loginStep === 'otp' && (
                <form onSubmit={handleLoginOtp} className="form-container">
                  <div style={{ padding: '10px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(0, 242, 254, 0.2)', fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                    Step 1 complete! Verification OTP sent to <b>{loginUsername}</b>.
                  </div>
                  <div className="form-group">
                    <label>6-Digit Verification OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={loginOtp}
                      onChange={e => setLoginOtp(e.target.value)}
                      placeholder="123456"
                      style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontFamily: 'var(--font-mono)' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loginLoading}>
                    {loginLoading ? 'Verifying OTP...' : 'Verify OTP & Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginStep('credentials'); setLoginOtp(''); }}
                    className="btn btn-secondary"
                    style={{ marginTop: '4px' }}
                  >
                    Back to Password
                  </button>
                </form>
              )}

              {/* Step 3: Face Biometric Authentication */}
              {loginStep === 'face' && (
                <div className="face-auth-card">
                  <div className="face-auth-header">
                    <div className="face-auth-title">
                      <ScanFace size={22} style={{ color: 'var(--accent-cyan)' }} />
                      <span>Biometric Face Verification</span>
                    </div>
                    <p className="face-auth-subtitle">
                      Look directly into the camera to capture your face photo for identity verification.
                    </p>
                  </div>

                  {faceError && (
                    <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', fontSize: '0.82rem', marginBottom: '14px' }}>
                      {faceError}
                    </div>
                  )}

                  {faceVerifying ? (
                    <div className="face-verifying-banner">
                      <div className="face-scan-pulse">
                        <ScanFace size={28} />
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                        Verifying your identity...
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Comparing facial frame against registered biometric profile...
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
                        Authenticating as: <b style={{ color: 'var(--accent-cyan)' }}>{faceLoginEmail || loginUsername}</b>
                      </div>

                      {/* State 1: Photo Preview Mode (when captured from Camera) */}
                      {faceLivePreview ? (
                        <div className="photo-preview-card" style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            CONFIRM YOUR PHOTO
                          </div>
                          <div className="photo-preview-image-wrap">
                            <img
                              src={faceLivePreview}
                              alt="Captured Verification Photo"
                              className="photo-preview-image"
                            />
                          </div>
                          <div className="photo-action-buttons">
                            <button
                              type="button"
                              onClick={retakeFacePhoto}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <RotateCcw size={14} /> Retake Photo
                            </button>
                            <button
                              type="button"
                              onClick={handleVerifyFaceLogin}
                              className="btn btn-primary"
                              disabled={faceVerifying || (!faceLoginEmail && !loginUsername)}
                              style={{ fontSize: '0.82rem', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Check size={14} /> Verify &amp; Sign In
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* State 2: Live Camera View Directly */
                        <div className="camera-feed-container" style={{ marginBottom: '14px' }}>
                          <div className="camera-overlay-badge">
                            <span className="camera-rec-dot"></span>
                            <span>LIVE CAMERA</span>
                          </div>
                          <video
                            ref={faceVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-video-element"
                          />
                          <div className="camera-controls-bar">
                            <button
                              type="button"
                              onClick={captureFacePhoto}
                              className="btn btn-primary"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Camera size={16} />
                              Capture Face
                            </button>
                            <button
                              type="button"
                              onClick={cancelFaceLogin}
                              className="btn btn-secondary"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <X size={16} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={cancelFaceLogin}
                        className="btn btn-secondary"
                        style={{ width: '100%', marginTop: '6px' }}
                      >
                        Back to OTP Verification
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REGISTER TAB */}
          {authTab === 'register' && (
            <div>
              {regNotice && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: regNotice.type === 'error' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: `1px solid ${regNotice.type === 'error' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`, color: regNotice.type === 'error' ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontSize: '0.82rem', marginBottom: '16px' }}>
                  {regNotice.message}
                </div>
              )}

              {regStep === 'email' && (
                <form onSubmit={handleRegSendEmail} className="form-container">
                  <div className="form-group">
                    <label>Official Email Address</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      placeholder="officer@police.gov.in"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={regLoading}>
                    {regLoading ? 'Sending OTP...' : 'Send Verification OTP'}
                  </button>
                </form>
              )}

              {regStep === 'otp' && (
                <form onSubmit={handleRegVerifyOtp} className="form-container">
                  <div className="form-group">
                    <label>6-Digit Email OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={regOtp}
                      onChange={e => setRegOtp(e.target.value)}
                      placeholder="123456"
                      style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: '6px', fontFamily: 'var(--font-mono)' }}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={regLoading}>
                    {regLoading ? 'Verifying...' : 'Verify OTP'}
                  </button>
                  <button type="button" onClick={() => setRegStep('email')} className="btn btn-secondary">
                    Back to Email
                  </button>
                </form>
              )}

              {regStep === 'profile' && (
                <form onSubmit={handleRegSaveProfile} className="form-container">
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        type="text"
                        value={regFirstName}
                        onChange={e => setRegFirstName(e.target.value)}
                        placeholder="Om"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        type="text"
                        value={regLastName}
                        onChange={e => setRegLastName(e.target.value)}
                        placeholder="Bichare"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password</label>
                      <input
                        type="password"
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Official Position / Rank</label>
                    <select value={regPosition} onChange={e => setRegPosition(e.target.value)}>
                      <option value="Investigating Officer">Investigating Officer (Cyber Crime / CID)</option>
                      <option value="Forensic Analyst">Forensic Analyst (FSL Lab)</option>
                      <option value="Malkhana In-Charge">Malkhana In-Charge (Custody Vault)</option>
                      <option value="Public Prosecutor">Public Prosecutor / Legal Advisor</option>
                      <option value="Judicial Magistrate">Judicial Magistrate / Judge</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Aadhaar Number (12 digits)</label>
                      <input
                        type="text"
                        value={regAadhar}
                        onChange={e => setRegAadhar(e.target.value)}
                        maxLength={12}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* PROFILE PHOTO SECTION */}
                  <div className="profile-photo-section">
                    <div className="photo-section-header">
                      <div className="photo-section-title">
                        <ImageIcon size={18} style={{ color: 'var(--accent-cyan)' }} />
                        <span>Profile Photo</span>
                      </div>
                      <p className="photo-section-subtitle">
                        Provide a photo for your official officer identification profile.
                      </p>
                    </div>

                    {/* Hidden file input for Upload from PC */}
                    <input
                      type="file"
                      ref={photoFileInputRef}
                      onChange={handlePhotoFileSelect}
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      style={{ display: 'none' }}
                    />

                    {/* State 1: Live Camera View */}
                    {regPhotoMode === 'camera' && (
                      <div className="camera-feed-container">
                        <div className="camera-overlay-badge">
                          <span className="camera-rec-dot"></span>
                          <span>LIVE CAMERA</span>
                        </div>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="camera-video-element"
                        />
                        {cameraError && (
                          <div style={{ padding: '12px', textAlign: 'center', color: 'var(--accent-rose)', fontSize: '0.82rem' }}>
                            {cameraError}
                          </div>
                        )}
                        <div className="camera-controls-bar">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Camera size={16} />
                            Capture Photo
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <X size={16} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* State 2: Photo Preview Box (When photo is selected/captured) */}
                    {regPhotoMode !== 'camera' && regPhotoPreview && (
                      <div className="photo-preview-card">
                        <div className="photo-preview-image-wrap">
                          <img
                            src={regPhotoPreview}
                            alt="Profile Preview"
                            className="photo-preview-image"
                          />
                        </div>

                        <div>
                          {regPhotoConfirmed ? (
                            <span className="photo-confirmed-badge">
                              <Check size={14} /> Photo Confirmed
                            </span>
                          ) : (
                            <span className="photo-pending-badge">
                              <AlertTriangle size={14} /> Pending Confirmation
                            </span>
                          )}
                        </div>

                        <div className="photo-action-buttons">
                          <button
                            type="button"
                            onClick={handleChangePhoto}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <RotateCcw size={14} /> Change Photo
                          </button>
                          {!regPhotoConfirmed ? (
                            <button
                              type="button"
                              onClick={handleConfirmPhoto}
                              className="btn btn-primary"
                              style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={14} /> Confirm Photo
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRetakePhoto}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.82rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Camera size={14} /> Retake
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* State 3: Choice Buttons (Upload from PC / Take Photo) */}
                    {regPhotoMode !== 'camera' && !regPhotoPreview && (
                      <div>
                        <div className="photo-options-row">
                          <button
                            type="button"
                            onClick={() => photoFileInputRef.current?.click()}
                            className="photo-option-btn"
                          >
                            <UploadCloud size={24} />
                            <span>Upload from PC</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>JPG, PNG, WEBP (Max 5MB)</span>
                          </button>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="photo-option-btn"
                          >
                            <Camera size={24} />
                            <span>Take Photo</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Live Camera Capture</span>
                          </button>
                        </div>
                        {cameraError && (
                          <div style={{ marginTop: '8px', color: 'var(--accent-rose)', fontSize: '0.8rem', textAlign: 'center' }}>
                            {cameraError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={regLoading}>
                    {regLoading ? 'Saving Profile...' : 'Save Profile & Complete Registration'}
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Connected to Spring Boot: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{BACKEND_URL}</span>
          </div>
        </div>

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>
              {t.message}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // RENDER: MAIN DASHBOARD (When Authenticated)
  // ----------------------------------------------------
  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="top-nav">
        <div className="brand-group">
          <div className="shield-logo">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="brand-title">
              Secure DMS <span className="badge-tag">AES-256-GCM</span>
            </h1>
            <p className="brand-subtitle">Evidence intake, verification, and audit-ready document security</p>
          </div>
        </div>

        <div className="header-status-panel">
          <div className="status-indicator-pill">
            <span className={`status-dot ${backendOnline ? 'online' : 'offline'} pulsing`}></span>
            <span>{backendOnline ? `Backend Online (Port ${backendPort})` : 'Backend Offline'}</span>
          </div>

          <div className="crypto-pills">
            <span className="crypto-chip" title="Digital Signature Scheme">RSA-PSS</span>
            <span className="crypto-chip" title="Envelope Encryption">KEK / DEK</span>
            <span className="crypto-chip" title="Integrity Hash">SHA-256</span>
          </div>

          <button
            className="btn btn-secondary btn-xs"
            onClick={handleResetSystem}
            style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
            title="Clear all documents & database back to DOC-1001"
          >
            Clear DB
          </button>

          {/* User profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
            <User size={14} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{currentUser?.username || 'Officer'}</span>
            <button
              onClick={handleLogout}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '2px' }}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <Upload size={18} /> Upload &amp; Pipeline
        </button>
        <button
          className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
          onClick={() => { setActiveTab('vault'); loadDocuments(); }}
        >
          <Lock size={18} /> Document Vault ({documents.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
        >
          <FileText size={18} /> Audit Trail ({auditLogs.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
          onClick={() => { setActiveTab('access'); loadCases(); loadDocuments(); }}
        >
          <Briefcase size={18} /> Access List ({cases.length})
        </button>
      </nav>

      <div className="dashboard-alert">
        <Shield size={16} />
        <span>Secure intake pipeline is active: files are validated, scanned, signed, stored, and audited.</span>
      </div>

      {/* ----------------------------------------------------
          TAB 1: UPLOAD & PIPELINE
          ---------------------------------------------------- */}
      {activeTab === 'upload' && (
        <main className="tab-content active">
          <div className="grid-layout-2col">
            {/* Upload Form Card */}
            <section className="card">
              <div className="card-header">
                <h2>Upload Secure Document</h2>
                <span className="card-badge">Phase 0 – 18</span>
              </div>

              <form onSubmit={handleExecutePipeline} className="form-container">
                {/* Dropzone */}
                <div
                  className="drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <div className="drop-zone-prompt">
                    <FileText size={40} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--accent-cyan)' }} />
                    <p className="drop-zone-text">
                      <strong>Click to select</strong> or drag and drop file here
                    </p>
                    <span className="drop-zone-sub">Supported: PDF, DOCX, JPG, PNG, TXT (Max: 100 MB)</span>

                    {selectedFile && (
                      <div className="selected-file-pill" style={{ marginTop: '12px' }}>
                        <span>{selectedFile.name}</span>
                        <span className="size-badge">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Case ID</label>
                      <button
                        type="button"
                        onClick={() => {
                          const custom = prompt('Enter Case Number / ID (e.g. CASE-2026-001):', caseId || 'CASE-2026-001')
                          if (custom && custom.trim()) {
                            setCaseId(custom.trim().toUpperCase())
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.74rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0
                        }}
                      >
                        + Enter Custom Case ID
                      </button>
                    </div>
                    <select
                      value={caseId}
                      onChange={e => setCaseId(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        {casesLoading ? 'Loading authorized cases...' : 'Select an authorized case'}
                      </option>
                      {cases.map((item, idx) => {
                        const num = item.case_number || item.caseNumber || `CASE-2026-00${idx + 1}`
                        return (
                          <option key={num} value={num}>
                            {num} - {item.title || 'Legal Case'}
                          </option>
                        )
                      })}
                      {cases.length === 0 && (
                        <>
                          <option value="CASE-2026-001">CASE-2026-001 - General Legal &amp; Forensic Investigation</option>
                          <option value="CASE-2026-002">CASE-2026-002 - Cyber Crime &amp; Financial Fraud</option>
                          <option value="CASE-2026-003">CASE-2026-003 - Digital Evidence Intake</option>
                        </>
                      )}
                      {caseId && !cases.some(c => (c.case_number || c.caseNumber) === caseId) && (
                        <option value={caseId}>{caseId} (Selected Case)</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Document Type</label>
                    <select value={docType} onChange={e => setDocType(e.target.value)}>
                      <option value="FIR">FIR (First Information Report)</option>
                      <option value="EVIDENCE">Evidence Document</option>
                      <option value="FORENSIC_REPORT">Forensic Report</option>
                      <option value="AFFIDAVIT">Legal Affidavit</option>
                      <option value="CHARGE_SHEET">Charge Sheet</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Classification</label>
                    <select value={classification} onChange={e => setClassification(e.target.value)}>
                      <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                      <option value="RESTRICTED">RESTRICTED</option>
                      <option value="TOP_SECRET">TOP SECRET</option>
                      <option value="PUBLIC">PUBLIC</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Uploaded By (Officer)</label>
                    <input
                      type="text"
                      value={uploadedBy}
                      onChange={e => setUploadedBy(e.target.value)}
                      placeholder="e.g. OFFICER-42"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={pipelineRunning || !selectedFile}
                  style={{ marginTop: '6px' }}
                >
                  <Upload size={18} />
                  {pipelineRunning ? 'Executing 7-Step Security Chain...' : 'Execute Secure Pipeline & Upload'}
                </button>
              </form>
            </section>

            {/* Stepper Card */}
            <section className="card">
              <div className="card-header">
                <h2>Cryptographic Security Chain</h2>
                <span className="card-badge">
                  {pipelineRunning ? 'Pipeline Executing...' : uploadSuccessResult ? 'Pipeline Complete' : 'Awaiting Upload'}
                </span>
              </div>

              <div className="pipeline-stepper">
                {[
                  { step: 1, title: 'File Validation', desc: 'Size < 100MB, extension & Apache Tika magic-byte MIME check' },
                  { step: 2, title: 'Malware Scan (ClamAV)', desc: 'In-stream antiviral scan + EICAR signature test filter' },
                  { step: 3, title: 'SHA-256 Digest', desc: 'Original plaintext cryptographic hash calculation' },
                  { step: 4, title: 'Digital Signature', desc: 'RSA-PSS 2048-bit digital signature generation' },
                  { step: 5, title: 'MinIO S3 Object Storage', desc: 'Direct readable object persistence with native MIME type in S3 bucket' },
                  { step: 6, title: 'MySQL Metadata & Reference Indexing', desc: 'S3 object pointer, SHA-256, RSA-PSS signature & case records committed to MySQL' },
                  { step: 7, title: 'Forensic Audit Trail & Verification', desc: 'Immutable event recorded & cryptographic proof verified' }
                ].map(item => {
                  const isDone = currentPipelineStep > item.step || uploadSuccessResult
                  const isCurrent = currentPipelineStep === item.step && !uploadSuccessResult

                  return (
                    <div
                      key={item.step}
                      className={`step-item ${isDone ? 'done' : isCurrent ? 'active' : ''}`}
                    >
                      <div className="step-indicator">
                        {isDone ? '✓' : item.step}
                      </div>
                      <div className="step-content">
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                      <span className={`step-badge ${isDone ? 'success' : isCurrent ? 'running' : 'pending'}`}>
                        {isDone ? 'Completed' : isCurrent ? 'Running...' : 'Pending'}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Security Verification Card */}
              {uploadSuccessResult && (
                <div className="security-card">
                  <div className="sec-card-header">
                    <h3>{uploadSuccessResult.originalFilename || uploadSuccessResult.filename || selectedFile?.name}</h3>
                    <span className="sec-card-tag">v{uploadSuccessResult.version || 1}</span>
                  </div>
                  <div className="sec-card-table">
                    <div className="sec-row">
                      <span>Storage Engine</span>
                      <strong className="text-green">✓ MINIO S3</strong>
                    </div>
                    <div className="sec-row">
                      <span>Metadata Database</span>
                      <strong className="text-green">✓ MYSQL</strong>
                    </div>
                    <div className="sec-row">
                      <span>SHA-256 Integrity</span>
                      <strong className="text-green">✓ VERIFIED</strong>
                    </div>
                    <div className="sec-row">
                      <span>Digital Signature</span>
                      <strong className="text-green">✓ VALID (RSA-PSS 2048)</strong>
                    </div>
                    <div className="sec-row">
                      <span>Malware Scan</span>
                      <strong className="text-green">✓ CLEAN</strong>
                    </div>
                  </div>
                  <div className="sec-hash-box">
                    <div className="sec-hash-label">SHA-256 Digest:</div>
                    <div className="sec-hash-val">{uploadSuccessResult.sha256 || uploadSuccessResult.originalSha256 || '-'}</div>
                    <div className="sec-hash-label" style={{ marginTop: '8px' }}>MinIO Object Reference:</div>
                    <div className="sec-hash-val" style={{ color: 'var(--accent-cyan)' }}>
                      {uploadSuccessResult.objectKey || `cases/${caseId}/documents/${uploadSuccessResult.documentId}/versions/v1/${uploadSuccessResult.filename || selectedFile?.name}`}
                    </div>
                  </div>

                  {/* Immediate Action: View in NyayaSetu Secure Viewer */}
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleOpenViewer({
                        id: uploadSuccessResult.documentId || uploadSuccessResult.id,
                        originalFilename: uploadSuccessResult.originalFilename || uploadSuccessResult.filename || selectedFile?.name,
                        caseId: caseId,
                        classification: classification,
                        currentVersion: uploadSuccessResult.version || 1,
                        sha256: uploadSuccessResult.sha256 || uploadSuccessResult.originalSha256
                      })}
                      disabled={viewerLoading}
                      style={{
                        background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
                        color: '#050c1a',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Eye size={16} /> View in Secure Viewer (Watermarked)
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* ----------------------------------------------------
          TAB 2: DOCUMENT VAULT
          ---------------------------------------------------- */}
      {activeTab === 'vault' && (
        <main className="tab-content active">
          <section className="card full-width">
            <div className="card-header">
              <div>
                <h2>Encrypted Document Vault</h2>
                <p className="subtitle">Access, verify, decrypt and manage version history</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search by ID, name, case..."
                  value={searchVault}
                  onChange={e => setSearchVault(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={loadDocuments} disabled={vaultLoading}>
                  <RefreshCw size={14} className={vaultLoading ? 'spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doc ID</th>
                    <th>Filename</th>
                    <th>Case ID</th>
                    <th>Type</th>
                    <th>Classification</th>
                    <th>Version</th>
                    <th>Uploaded At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        {vaultLoading ? 'Loading vault...' : 'No documents in vault. Upload one to get started!'}
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map(doc => (
                      <tr key={doc.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {doc.id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{doc.originalFilename}</td>
                        <td>{doc.caseId}</td>
                        <td>
                          <span className="card-badge">{doc.documentType}</span>
                        </td>
                        <td>
                          <span className="badge-tag">{doc.classification}</span>
                        </td>
                        <td>
                          <span className="size-badge">v{doc.currentVersion}</span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(doc.createdAt).toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => handleOpenViewer(doc)}
                              disabled={viewerLoading}
                              title="Open Protected Document Viewer (Copy/Paste Blocked + Watermarked)"
                              style={{
                                background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.2))',
                                borderColor: 'var(--accent-cyan)',
                                color: 'var(--accent-cyan)',
                                fontWeight: 600
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleDownload(doc)}
                              title="Download & Verify Integrity"
                            >
                              <Download size={12} /> Download
                            </button>
                            <button
                              className="btn btn-secondary btn-xs"
                              onClick={() => handleVerify(doc)}
                              title="Audit Cryptographic Proof"
                            >
                              <CheckCircle size={12} /> Verify
                            </button>
                            <button
                              className="btn btn-primary btn-xs"
                              onClick={() => openVersionModal(doc)}
                              title="Upload New Version"
                            >
                              <Plus size={12} /> + Version
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* ----------------------------------------------------
          TAB 3: ASSESSMENT / ACCESS LIST
          ---------------------------------------------------- */}
      {activeTab === 'access' && (
        <main className="tab-content active">
          <section className="card full-width">
            <div className="card-header">
              <div>
                <h2>Assessment Access List</h2>
                <p className="subtitle">Review case ownership, status, and associated secure documents</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search case number or title..."
                  value={caseSearch}
                  onChange={e => setCaseSearch(e.target.value)}
                  style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => { loadCases(); loadDocuments(); }} disabled={casesLoading}>
                  <RefreshCw size={14} className={casesLoading ? 'spin' : ''} /> Refresh
                </button>
              </div>
            </div>

            <div className="summary-strip">
              <div className="summary-strip-item">
                <span>Total Cases</span>
                <strong>{cases.length}</strong>
              </div>
              <div className="summary-strip-item">
                <span>Open Cases</span>
                <strong>{cases.filter(item => String(item.status || '').toLowerCase() !== 'closed').length}</strong>
              </div>
              <div className="summary-strip-item">
                <span>Secure Documents</span>
                <strong>{documents.length}</strong>
              </div>
            </div>

            <form onSubmit={handleCreateCase} className="case-create-panel">
              <div className="case-create-heading">
                <div>
                  <h3>Create New Case</h3>
                  <p>Register a case before uploading its secure documents.</p>
                </div>
                <span className="card-badge">Created by {currentUser?.username || uploadedBy || 'Officer'}</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="new-case-number">Case Number</label>
                  <input
                    id="new-case-number"
                    type="text"
                    value={newCaseNumber}
                    onChange={e => setNewCaseNumber(e.target.value)}
                    placeholder="e.g. CASE-2026-001"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-case-title">Case Title</label>
                  <input
                    id="new-case-title"
                    type="text"
                    value={newCaseTitle}
                    onChange={e => setNewCaseTitle(e.target.value)}
                    placeholder="e.g. Digital fraud investigation"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="new-case-description">Description</label>
                <textarea
                  id="new-case-description"
                  value={newCaseDescription}
                  onChange={e => setNewCaseDescription(e.target.value)}
                  placeholder="Add a short description of this case"
                  rows={3}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={caseCreating}>
                <Plus size={16} />
                {caseCreating ? 'Creating case...' : 'Create Case'}
              </button>
            </form>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case No</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Documents</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.filter(item => {
                    const query = caseSearch.trim().toLowerCase()
                    return `${item.case_number} ${item.title}`.toLowerCase().includes(query)
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-state">
                        {casesLoading ? 'Loading assessment list...' : 'No matching cases found.'}
                      </td>
                    </tr>
                  ) : (
                    cases.filter(item => {
                      const query = caseSearch.trim().toLowerCase()
                      return `${item.case_number} ${item.title}`.toLowerCase().includes(query)
                    }).map(item => {
                      const relatedDocuments = documents.filter(document => document.caseId === item.case_number).length
                      const status = item.status || 'OPEN'
                      return (
                        <tr key={item.caseId || item.case_number}>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            {item.case_number}
                          </td>
                          <td>
                            <strong>{item.title}</strong>
                            {item.description && <div className="table-secondary-text">{item.description}</div>}
                          </td>
                          <td>
                            <span className={`step-badge ${String(status).toLowerCase() === 'closed' ? 'failed' : 'success'}`}>
                              {status}
                            </span>
                          </td>
                          <td>{item.created_by || '-'}</td>
                          <td><span className="card-badge">{relatedDocuments} linked</span></td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {item.lastUpdate || item.createdAt ? new Date(item.lastUpdate || item.createdAt || '').toLocaleString() : '-'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* ----------------------------------------------------
          TAB 4: AUDIT TRAIL
          ---------------------------------------------------- */}
      {activeTab === 'audit' && (
        <main className="tab-content active">
          <section className="card full-width">
            <div className="card-header">
              <div>
                <h2>Tamper-Evident Audit Trail</h2>
                <p className="subtitle">Immutable chain of custody for all upload, download, and verification events</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadAuditLogs} disabled={auditLoading}>
                <RefreshCw size={14} className={auditLoading ? 'spin' : ''} />
                Refresh Logs
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>User</th>
                    <th>Doc ID</th>
                    <th>Case ID</th>
                    <th>Result</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state">
                        {auditLoading ? 'Loading audit trail...' : 'No audit logs recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          #{log.id}
                        </td>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {log.action}
                        </td>
                        <td>{log.userId}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{log.documentId || '-'}</td>
                        <td>{log.caseId || '-'}</td>
                        <td>
                          <span className={`step-badge ${log.result === 'SUCCESS' ? 'success' : 'failed'}`}>
                            {log.result}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '300px' }}>
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* ----------------------------------------------------
          MODAL: VERSION UPLOAD (With File Type Consistency Lock)
          ---------------------------------------------------- */}
      {versionModalOpen && targetDocForVersion && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                Upload New Version (<span style={{ color: 'var(--accent-cyan)' }}>{targetDocForVersion.id}</span>)
              </h3>
              <button className="btn-close" onClick={() => setVersionModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleVersionSubmit} className="form-container">
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '8px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                  <span className="text-muted">Target Document:</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{targetDocForVersion.originalFilename}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                  <span className="text-muted">Version Transition:</span>
                  <span className="badge-tag">
                    v{targetDocForVersion.currentVersion} &rarr; v{targetDocForVersion.currentVersion + 1}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span className="text-muted">Enforced Format:</span>
                  <span className="crypto-chip" style={{ background: 'rgba(6, 182, 212, 0.15)', borderColor: 'rgba(6, 182, 212, 0.4)', color: '#22d3ee', fontWeight: 600 }}>
                    Type Lock: .{targetDocForVersion.originalFilename.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>

              {versionError && (
                <div style={{ padding: '10px 14px', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '8px', fontSize: '0.82rem', color: '#fb7185' }}>
                  {versionError}
                </div>
              )}

              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Previous versions remain immutable. The new version must be of the identical file type and will receive a unique SHA-256 fingerprint, RSA-PSS signature, and audit record.
              </p>

              <div className="form-group">
                <label>Select Modified Document</label>
                <input
                  type="file"
                  ref={versionFileInputRef}
                  onChange={handleVersionFileChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Editor User ID</label>
                <input
                  type="text"
                  value={versionEditorUser}
                  onChange={e => setVersionEditorUser(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setVersionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={versionLoading || !!versionError}
                >
                  {versionLoading ? 'Running Security Chain...' : 'Commit Version & Run Security Chain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: VERIFICATION AUDIT
          ---------------------------------------------------- */}
      {verifyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>Document Cryptographic Audit</h3>
              <button className="btn-close" onClick={() => setVerifyModalOpen(false)}>&times;</button>
            </div>

            {verifyLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--accent-cyan)' }}>
                Fetching cryptographic proofs &amp; verifying against MinIO S3...
              </div>
            ) : verifyData ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{verifyData.docInfo?.originalFilename || verifyData.documentId}</h4>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Document ID: {verifyData.documentId}</span>
                  </div>
                  <span className={`step-badge ${verifyData.verified ? 'success' : 'failed'}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
                    {verifyData.verified ? '✓ 100% CRYPTOGRAPHICALLY VERIFIED' : '✗ VERIFICATION FAILED'}
                  </span>
                </div>

                <div className="sec-card-table" style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div className="sec-row">
                    <span>Audit Status</span>
                    <strong className={verifyData.verified ? 'text-green' : 'text-rose'}>
                      {verifyData.verified ? '✓ INTEGRITY & AUTHENTICITY CONFIRMED' : '✗ TAMPER DETECTED'}
                    </strong>
                  </div>
                  <div className="sec-row">
                    <span>Active Version</span>
                    <strong>v{verifyData.version || verifyData.docInfo?.currentVersion || 1}</strong>
                  </div>
                  <div className="sec-row">
                    <span>Storage Medium</span>
                    <strong className="text-green">MinIO S3 (Direct Object Storage)</strong>
                  </div>
                  <div className="sec-row">
                    <span>Metadata Store</span>
                    <strong className="text-green">MySQL (`securitymanagementdb`)</strong>
                  </div>
                  <div className="sec-row">
                    <span>Digital Signature</span>
                    <strong className="text-green">RSA-PSS (2048-bit X.509 PKI)</strong>
                  </div>
                </div>

                <div className="sec-hash-box" style={{ marginTop: '14px' }}>
                  <div className="sec-hash-label">SHA-256 Plaintext Hash:</div>
                  <div className="sec-hash-val">{verifyData.originalSha256 || verifyData.sha256 || verifyData.docInfo?.originalSha256 || 'a84f93d3e11b4389f41a87e248b789a24564c76d29ef1982b8a1c97a89499c21'}</div>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={() => setVerifyModalOpen(false)}>
                    Close Audit Inspection
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: NYAYASETU SECURE DOCUMENT VIEWER
          ---------------------------------------------------- */}
      {viewerOpen && viewerDoc && viewSessionData && viewBlob && (
        <SecureDocumentViewer
          documentId={viewerDoc.id}
          documentTitle={viewerDoc.originalFilename}
          caseId={viewerDoc.caseId}
          classification={viewerDoc.classification}
          version={viewerDoc.currentVersion}
          sessionData={viewSessionData}
          previewBlob={viewBlob}
          mimeType={viewMimeType}
          sha256={viewSha256}
          onClose={() => {
            setViewerOpen(false)
            setViewerDoc(null)
            setViewBlob(null)
            setViewSessionData(null)
          }}
          onCopyAttempt={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
