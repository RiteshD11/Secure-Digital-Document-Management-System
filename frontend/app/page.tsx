'use client'

import React, { useState, useEffect, useRef } from 'react'
import { authApi, caseApi, docApi, isTokenExpired, accessApi, BACKEND_URL, createMockJwt } from '../src/services/api'
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
  Search,
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

// Owner Review Request Interfaces (Section 3)
interface CaseOwnerRequestItem {
  id: number
  caseId: string
  caseTitle?: string
  requestedUserId: string
  requestedBy?: string
  reason?: string
  status: string
  createdAt?: string
}

interface DocOwnerRequestItem {
  id: number
  documentId: string
  docFilename?: string
  caseId?: string
  requestedUserId: string
  requestedBy?: string
  permission: string
  reason?: string
  status: string
  createdAt?: string
}

export default function App() {
  // Auth State
  const [authInitialized, setAuthInitialized] = useState<boolean>(false)
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
  const [activeTab, setActiveTab] = useState<'upload' | 'document-vault' | 'document-request' | 'audit' | 'view-cases' | 'create-case'>('upload')
  const [backendOnline, setBackendOnline] = useState<boolean>(true)
  const [backendPort, setBackendPort] = useState<string>('8082')

  // Upload Form States
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [caseId, setCaseId] = useState('')
  const [docType, setDocType] = useState('FIR')
  const [classification, setClassification] = useState('CONFIDENTIAL')
  const [uploadedBy, setUploadedBy] = useState<string>('')
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
  const [versionEditorUser, setVersionEditorUser] = useState<string>('')
  const [versionError, setVersionError] = useState<string | null>(null)
  const [versionLoading, setVersionLoading] = useState(false)

  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [verifyData, setVerifyData] = useState<any>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Case Access Request States (Section 2)
  const [caseRequestModalOpen, setCaseRequestModalOpen] = useState(false)
  const [targetCaseForRequest, setTargetCaseForRequest] = useState<string>('')
  const [selectedCaseNumber, setSelectedCaseNumber] = useState<string>('')
  const [caseRequestReason, setCaseRequestReason] = useState<string>('')
  const [caseRequestLoading, setCaseRequestLoading] = useState(false)
  const [caseRequestError, setCaseRequestError] = useState<string | null>(null)
  const [caseRequests, setCaseRequests] = useState<Record<string, { id?: number; status: string; reason?: string; createdAt?: string }>>({})

  // Document Access Request States (Section 2)
  const [docRequestModalOpen, setDocRequestModalOpen] = useState(false)
  const [targetDocForRequest, setTargetDocForRequest] = useState<DocumentItem | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string>('')
  const [docRequestPermission, setDocRequestPermission] = useState<'VIEW' | 'DOWNLOAD' | 'UPLOAD' | 'EDIT' | 'SHARE' | 'DELETE'>('VIEW')
  const [docRequestReason, setDocRequestReason] = useState<string>('')
  const [docRequestLoading, setDocRequestLoading] = useState(false)
  const [docRequestError, setDocRequestError] = useState<string | null>(null)
  const [docRequests, setDocRequests] = useState<Record<string, { id?: number; permission: string; status: string; reason?: string; createdAt?: string }>>({})

  // Owner Review States (Section 3)
  const [pendingCaseOwnerRequests, setPendingCaseOwnerRequests] = useState<CaseOwnerRequestItem[]>([])
  const [pendingDocOwnerRequests, setPendingDocOwnerRequests] = useState<DocOwnerRequestItem[]>([])
  const [myCaseRequests, setMyCaseRequests] = useState<CaseOwnerRequestItem[]>([])
  const [myDocRequests, setMyDocRequests] = useState<DocOwnerRequestItem[]>([])
  const [ownerReviewActionLoading, setOwnerReviewActionLoading] = useState<number | null>(null)
  const [caseReviewModalCase, setCaseReviewModalCase] = useState<string | null>(null)
  const [docReviewModalDoc, setDocReviewModalDoc] = useState<DocumentItem | null>(null)
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

  const DEFAULT_DEV_OFFICER = {
    username: 'officer_sharma',
    userId: '1',
    role: 'Investigating Officer',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    token: createMockJwt({
      badge: 'DL-POL-0442',
      name: 'Insp. Rajesh Sharma',
      title: 'Investigating Officer',
      unit: 'Cyber Crime Cell',
      username: 'officer_sharma',
    }),
  }

  const loginWithDefaultOfficer = () => {
    localStorage.setItem('dms_officer', JSON.stringify(DEFAULT_DEV_OFFICER))
    setCurrentUser(DEFAULT_DEV_OFFICER)
    setIsAuthenticated(true)
    setUploadedBy(DEFAULT_DEV_OFFICER.username)
    loadSavedRequests(DEFAULT_DEV_OFFICER.username, DEFAULT_DEV_OFFICER.userId)
  }

  // Check saved login - automatically bypass login with default officer if not logged in
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dms_officer')
      if (saved) {
        const u = JSON.parse(saved)
        if (u && u.token && u.username) {
          setCurrentUser(u)
          setIsAuthenticated(true)
          setUploadedBy(u.username)
          loadSavedRequests(u.username, u.userId)
        } else {
          loginWithDefaultOfficer()
        }
      } else {
        loginWithDefaultOfficer()
      }
    } catch {
      loginWithDefaultOfficer()
    } finally {
      setAuthInitialized(true)
    }
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
      await fetchDocAccessRequests(docs || [])
      await fetchDocOwnerRequests(docs || [], cases)
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
      const backendCases: CaseItem[] = data || []
      setCases(backendCases)

      if (backendCases.length > 0) {
        const firstNum = backendCases[0].case_number || backendCases[0].caseNumber
        if (firstNum && !caseId) {
          setCaseId(firstNum)
        }
      } else {
        if (!caseId) setCaseId('CASE-2026-001')
      }

      await fetchCaseAccessRequests(backendCases)
      await fetchCaseOwnerRequests(backendCases)
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
        createdBy: currentUser?.username || ''
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
      showToast('Face biometric verified! Welcome to NyayaSetu.', 'success')
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
    setUploadedBy('')
    setCases([])
    setDocuments([])
    setAuditLogs([])
    setCaseRequests({})
    setDocRequests({})
    setPendingCaseOwnerRequests([])
    setPendingDocOwnerRequests([])
    setMyCaseRequests([])
    setMyDocRequests([])
    setCaseReviewModalCase(null)
    setDocReviewModalDoc(null)
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
        uploadedBy: currentUser?.username || uploadedBy || ''
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
    setVersionEditorUser(currentUser?.username || '')
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
      const result = await docApi.downloadBlob(doc.id, null, currentUser?.username || '')
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

  // ACCESS REQUEST HELPERS & HANDLERS (Section 2 & 3)
  const isRequesterMatch = (r: any, username: string, userId?: string) => {
    if (!r) return false
    const u = username ? username.trim().toLowerCase() : ''
    const uid = userId ? String(userId).trim().toLowerCase() : ''
    const rUid = r.requestedUserId !== undefined && r.requestedUserId !== null ? String(r.requestedUserId).trim().toLowerCase() : ''
    const rBy = r.requestedBy !== undefined && r.requestedBy !== null ? String(r.requestedBy).trim().toLowerCase() : ''
    return (
      (u && (rUid === u || rBy === u)) ||
      (uid && (rUid === uid || rBy === uid))
    )
  }

  const getStoredCaseRequests = (): CaseOwnerRequestItem[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem('dms_case_requests')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const getStoredDocRequests = (): DocOwnerRequestItem[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem('dms_doc_requests')
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const saveCaseRequests = (requests: CaseOwnerRequestItem[]) => {
    if (typeof window === 'undefined') return
    try {
      const existing = getStoredCaseRequests()
      const mergedMap: Record<string, CaseOwnerRequestItem> = {}
      existing.forEach(r => {
        const key = `${r.caseId}_${r.requestedUserId || r.requestedBy || ''}`
        mergedMap[key] = r
      })
      requests.forEach(r => {
        const key = `${r.caseId}_${r.requestedUserId || r.requestedBy || ''}`
        mergedMap[key] = r
      })
      localStorage.setItem('dms_case_requests', JSON.stringify(Object.values(mergedMap)))
    } catch { }
  }

  const saveDocRequests = (requests: DocOwnerRequestItem[]) => {
    if (typeof window === 'undefined') return
    try {
      const existing = getStoredDocRequests()
      const mergedMap: Record<string, DocOwnerRequestItem> = {}
      existing.forEach(r => {
        const key = `${r.documentId}_${r.requestedUserId || r.requestedBy || ''}`
        mergedMap[key] = r
      })
      requests.forEach(r => {
        const key = `${r.documentId}_${r.requestedUserId || r.requestedBy || ''}`
        mergedMap[key] = r
      })
      localStorage.setItem('dms_doc_requests', JSON.stringify(Object.values(mergedMap)))
    } catch { }
  }

  const updateStoredCaseRequestStatus = (requestId: number, status: string, caseNum?: string) => {
    if (typeof window === 'undefined') return
    try {
      const list = getStoredCaseRequests()
      const updated = list.map(r => {
        if (Number(r.id) === Number(requestId) || (caseNum && r.caseId === caseNum)) {
          return { ...r, status }
        }
        return r
      })
      localStorage.setItem('dms_case_requests', JSON.stringify(updated))
    } catch { }
  }

  const updateStoredDocRequestStatus = (requestId: number, status: string, docId?: string) => {
    if (typeof window === 'undefined') return
    try {
      const list = getStoredDocRequests()
      const updated = list.map(r => {
        if (Number(r.id) === Number(requestId) || (docId && r.documentId === docId)) {
          return { ...r, status }
        }
        return r
      })
      localStorage.setItem('dms_doc_requests', JSON.stringify(updated))
    } catch { }
  }

  const loadSavedRequests = (username?: string, userId?: string | number) => {
    if (!username) return
    const u = username.trim().toLowerCase()
    const uid = userId !== undefined && userId !== null ? String(userId).trim().toLowerCase() : ''
    try {
      const caseList = getStoredCaseRequests()
      const myCases = caseList.filter(r => isRequesterMatch(r, u, uid))
      if (myCases.length > 0) {
        setMyCaseRequests(prev => {
          const map: Record<string, CaseOwnerRequestItem> = {}
          myCases.forEach(r => { map[r.caseId] = r })
          prev.forEach(r => { if (!map[r.caseId]) map[r.caseId] = r })
          return Object.values(map)
        })
        const reqMap: Record<string, { id?: number; status: string; reason?: string; createdAt?: string }> = {}
        myCases.forEach(r => {
          reqMap[r.caseId] = {
            id: r.id,
            status: r.status,
            reason: r.reason,
            createdAt: r.createdAt
          }
        })
        setCaseRequests(prev => ({ ...prev, ...reqMap }))
      }

      const docList = getStoredDocRequests()
      const myDocs = docList.filter(r => isRequesterMatch(r, u, uid))
      if (myDocs.length > 0) {
        setMyDocRequests(prev => {
          const map: Record<string, DocOwnerRequestItem> = {}
          myDocs.forEach(r => { map[r.documentId] = r })
          prev.forEach(r => { if (!map[r.documentId]) map[r.documentId] = r })
          return Object.values(map)
        })
        const reqMap: Record<string, { id?: number; permission: string; status: string; reason?: string; createdAt?: string }> = {}
        myDocs.forEach(r => {
          reqMap[r.documentId] = {
            id: r.id,
            permission: r.permission,
            status: r.status,
            reason: r.reason,
            createdAt: r.createdAt
          }
        })
        setDocRequests(prev => ({ ...prev, ...reqMap }))
      }
    } catch { }
  }

  // Fetch access requests for cases directly from backend GET /api/cases/{caseNumber}/access/requests
  const fetchCaseAccessRequests = async (casesList?: CaseItem[]) => {
    if (!currentUser?.username) return
    const currentUsername = currentUser.username.trim().toLowerCase()
    const currentUserId = currentUser?.userId !== undefined && currentUser?.userId !== null ? String(currentUser.userId).trim().toLowerCase() : ''
    const list = casesList || cases || []
    const updated: Record<string, { id?: number; status: string; reason?: string; createdAt?: string }> = {}
    const myReqs: CaseOwnerRequestItem[] = []

    const storedCaseRequests = getStoredCaseRequests()
    const userStoredCaseReqs = storedCaseRequests.filter(r => isRequesterMatch(r, currentUsername, currentUserId))

    const candidateCases = Array.from(
      new Set([
        ...list.map(c => c.case_number),
        ...Object.keys(caseRequests),
        ...myCaseRequests.map(r => r.caseId),
        ...userStoredCaseReqs.map(r => r.caseId)
      ])
    ).filter(Boolean)

    await Promise.allSettled(
      candidateCases.map(async (caseNum) => {
        const c = list.find(item => item.case_number === caseNum)
        // Skip cases owned by current user: the owner has automatic access and never needs an access request
        if (c?.created_by && c.created_by.trim().toLowerCase() === currentUsername) {
          return
        }
        let matchedReq: any = null
        try {
          const reqs = await caseApi.getAccessRequests(caseNum)
          if (Array.isArray(reqs)) {
            // Match the logged-in requester to their own request. Do NOT use reqs[0].
            const userReqs = reqs.filter((r: any) => isRequesterMatch(r, currentUsername, currentUserId))
            if (userReqs.length > 0) {
              userReqs.sort((a: any, b: any) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0)
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0)
                return timeB - timeA
              })
              matchedReq = userReqs[0]
            }
          }
        } catch {
          // Gracefully handle backend errors (e.g. 403 for non-owners)
        }

        const existing = myCaseRequests.find(r => r.caseId === caseNum) ||
          userStoredCaseReqs.find(r => r.caseId === caseNum)

        if (matchedReq) {
          const status = (matchedReq.status || 'PENDING').toUpperCase()
          updated[caseNum] = {
            id: matchedReq.id,
            status,
            reason: matchedReq.reason,
            createdAt: matchedReq.createdAt
          }
          myReqs.push({
            id: matchedReq.id || existing?.id || Date.now(),
            caseId: caseNum,
            caseTitle: c?.title || existing?.caseTitle || `Case ${caseNum}`,
            requestedUserId: matchedReq.requestedBy || matchedReq.requestedUserId || currentUsername,
            requestedBy: matchedReq.requestedBy || matchedReq.requestedUserId,
            reason: matchedReq.reason || existing?.reason || '',
            status,
            createdAt: matchedReq.createdAt || existing?.createdAt
          })
        } else if (existing) {
          let status = (existing.status || 'PENDING').toUpperCase()
          if (c && status === 'PENDING') {
            status = 'APPROVED'
          }
          updated[caseNum] = {
            id: existing.id,
            status,
            reason: existing.reason,
            createdAt: existing.createdAt
          }
          myReqs.push({
            ...existing,
            status,
            caseTitle: c?.title || existing.caseTitle || `Case ${caseNum}`
          })
        }
      })
    )

    if (Object.keys(updated).length > 0) {
      setCaseRequests(prev => ({ ...prev, ...updated }))
    }
    setMyCaseRequests(prev => {
      const merged: Record<string, CaseOwnerRequestItem> = {}
      prev.forEach(r => { merged[r.caseId] = r })
      myReqs.forEach(r => { merged[r.caseId] = r })
      const result = Object.values(merged)
      saveCaseRequests(result)
      return result
    })
  }

  // Fetch access requests for documents directly from backend GET /api/documents/{documentId}/access/requests
  const fetchDocAccessRequests = async (docsList?: DocumentItem[]) => {
    if (!currentUser?.username) return
    const currentUsername = currentUser.username.trim().toLowerCase()
    const currentUserId = currentUser?.userId !== undefined && currentUser?.userId !== null ? String(currentUser.userId).trim().toLowerCase() : ''
    const list = docsList || documents || []
    const updated: Record<string, { id?: number; permission: string; status: string; reason?: string; createdAt?: string }> = {}
    const myReqs: DocOwnerRequestItem[] = []

    const storedDocRequests = getStoredDocRequests()
    const userStoredDocReqs = storedDocRequests.filter(r => isRequesterMatch(r, currentUsername, currentUserId))

    const candidateDocIds = Array.from(
      new Set([
        ...list.map(d => d.id),
        ...Object.keys(docRequests),
        ...myDocRequests.map(r => r.documentId),
        ...userStoredDocReqs.map(r => r.documentId)
      ])
    ).filter(Boolean)

    await Promise.allSettled(
      candidateDocIds.map(async (docId) => {
        const doc = list.find(d => d.id === docId)
        // Skip documents owned by current user: custodian/owner has automatic access
        if (doc?.uploadedBy && doc.uploadedBy.trim().toLowerCase() === currentUsername) {
          return
        }
        let matchedReq: any = null
        try {
          const reqs = await docApi.getAccessRequests(docId)
          if (Array.isArray(reqs)) {
            // Match the logged-in requester to their own request. Do NOT use reqs[0].
            const userReqs = reqs.filter((r: any) => isRequesterMatch(r, currentUsername, currentUserId))
            if (userReqs.length > 0) {
              userReqs.sort((a: any, b: any) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : (Number(a.id) || 0)
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : (Number(b.id) || 0)
                return timeB - timeA
              })
              matchedReq = userReqs[0]
            }
          }
        } catch {
          // Gracefully handle backend errors (e.g. 403 for non-owners)
        }

        const existing = myDocRequests.find(r => r.documentId === docId) ||
          userStoredDocReqs.find(r => r.documentId === docId)

        if (matchedReq) {
          const status = (matchedReq.status || 'PENDING').toUpperCase()
          const permission = matchedReq.permission || existing?.permission || 'VIEW'
          updated[docId] = {
            id: matchedReq.id,
            permission,
            status,
            reason: matchedReq.reason,
            createdAt: matchedReq.createdAt
          }
          myReqs.push({
            id: matchedReq.id || existing?.id || Date.now(),
            documentId: docId,
            docFilename: doc?.originalFilename || existing?.docFilename || `Document ${docId}`,
            caseId: doc?.caseId || existing?.caseId || '-',
            requestedUserId: matchedReq.requestedBy || (matchedReq.requestedUserId ? String(matchedReq.requestedUserId) : currentUsername),
            requestedBy: matchedReq.requestedBy,
            permission,
            reason: matchedReq.reason || existing?.reason || '',
            status,
            createdAt: matchedReq.createdAt || existing?.createdAt
          })
        } else if (existing) {
          const status = (existing.status || 'PENDING').toUpperCase()
          updated[docId] = {
            id: existing.id,
            permission: existing.permission || 'VIEW',
            status,
            reason: existing.reason,
            createdAt: existing.createdAt
          }
          myReqs.push({
            ...existing,
            status,
            docFilename: doc?.originalFilename || existing.docFilename || `Document ${docId}`,
            caseId: doc?.caseId || existing.caseId || '-'
          })
        }
      })
    )

    if (Object.keys(updated).length > 0) {
      setDocRequests(prev => ({ ...prev, ...updated }))
    }
    setMyDocRequests(prev => {
      const merged: Record<string, DocOwnerRequestItem> = {}
      prev.forEach(r => { merged[r.documentId] = r })
      myReqs.forEach(r => { merged[r.documentId] = r })
      const result = Object.values(merged)
      saveDocRequests(result)
      return result
    })
  }

  // Refresh access requests from backend when currentUser changes
  useEffect(() => {
    if (currentUser?.username) {
      loadSavedRequests(currentUser.username, currentUser.userId)
      fetchCaseAccessRequests(cases)
      fetchCaseOwnerRequests(cases)
      fetchDocAccessRequests(documents)
      fetchDocOwnerRequests(documents, cases)
    }
  }, [currentUser])

  const openCaseRequestModal = (caseNum?: string) => {
    setTargetCaseForRequest(caseNum || '')
    setSelectedCaseNumber(caseNum || '')
    setCaseRequestReason('')
    setCaseRequestError(null)
    setCaseRequestModalOpen(true)
  }

  const openDocRequestModal = (doc?: DocumentItem | null) => {
    if (doc?.caseId && !hasCaseAccess(doc.caseId)) {
      showToast(`Cannot request document access: you do not have access to parent case ${doc.caseId}.`, 'error')
      return
    }
    setTargetDocForRequest(doc || null)
    setSelectedDocId(doc?.id || '')
    setDocRequestPermission('VIEW')
    setDocRequestReason('')
    setDocRequestError(null)
    setDocRequestModalOpen(true)
  }

  const isCaseAccessible = (item: CaseItem) => {
    if (!currentUser?.username) return false
    // 1. The case creator/owner ALWAYS has access to their own case
    if (isCaseOwner(item)) {
      return true
    }
    // 2. Access request status
    const req = caseRequests[item.case_number]
    if (req?.status === 'APPROVED') {
      return true
    }
    if (req?.status === 'PENDING' || req?.status === 'REJECTED') {
      return false
    }
    // 3. Any case returned from backend caseApi.getAll() has active access in case_access
    return true
  }

  // Section 4 — Access Rules: Check if current user has access to a document's parent case
  const hasCaseAccess = (caseNumber?: string): boolean => {
    if (!caseNumber || !currentUser?.username) return false
    const norm = caseNumber.trim()
    const lowerNorm = norm.toLowerCase()
    const targetCase = cases.find(c =>
      (c.case_number && c.case_number.trim().toLowerCase() === lowerNorm) ||
      (c.caseId !== undefined && String(c.caseId).trim().toLowerCase() === lowerNorm)
    )
    if (targetCase) {
      return isCaseAccessible(targetCase)
    }
    const matchedKey = Object.keys(caseRequests).find(k => k.trim().toLowerCase() === lowerNorm)
    if (matchedKey && caseRequests[matchedKey]?.status === 'APPROVED') {
      return true
    }
    return false
  }


  const handleCaseRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCaseRequestError(null)
    if (!currentUser?.username) {
      showToast('Unauthorized: Please login to request case access.', 'error')
      return
    }
    const caseNum = targetCaseForRequest || selectedCaseNumber.trim()
    if (!caseNum) {
      showToast('Case Number is required.', 'error')
      return
    }

    const targetCase = cases.find(c => c.case_number === caseNum)
    if (targetCase && isCaseOwner(targetCase)) {
      showToast(`You are already the owner of case ${caseNum}. Access requests are only for non-owners.`, 'info')
      return
    }

    if (!caseRequestReason.trim()) {
      showToast('Please provide a reason for the case access request.', 'error')
      return
    }

    if (caseRequests[caseNum]?.status === 'PENDING') {
      showToast(`Duplicate request: An access request for case ${caseNum} is already pending review.`, 'error')
      return
    }

    setCaseRequestLoading(true)
    try {
      const requester = currentUser.username
      const res = await caseApi.requestAccess(caseNum, {
        reason: caseRequestReason.trim(),
        requestedUserId: requester,
        requestedBy: requester
      })
      const status = res?.status || 'PENDING'
      setCaseRequests(prev => ({
        ...prev,
        [caseNum]: {
          id: res?.id,
          status,
          reason: res?.reason || caseRequestReason.trim(),
          createdAt: res?.createdAt
        }
      }))
      const newCaseReq: CaseOwnerRequestItem = {
        id: res?.id || Date.now(),
        caseId: caseNum,
        caseTitle: targetCase?.title,
        requestedUserId: requester,
        requestedBy: requester,
        reason: res?.reason || caseRequestReason.trim(),
        status,
        createdAt: res?.createdAt || new Date().toISOString()
      }
      setMyCaseRequests(prev => {
        const next = [newCaseReq, ...prev.filter(r => r.caseId !== caseNum)]
        saveCaseRequests(next)
        return next
      })
      showToast(`Access request for case ${caseNum} submitted successfully! Status: ${status}`, 'success')
      setCaseRequestModalOpen(false)
      setCaseRequestReason('')
    } catch (err: any) {
      const errMsg = err.message || ''
      const isUnauth = err.status === 401 || err.status === 403 || /401|403|unauthorized|forbidden/i.test(errMsg)
      if (isUnauth) {
        showToast(`Unauthorized: ${errMsg || 'You do not have permission to request access.'}`, 'error')
        setCaseRequestError(`Unauthorized: ${errMsg || 'You do not have permission to request access.'}`)
      } else if (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('pending')) {
        setCaseRequests(prev => ({
          ...prev,
          [caseNum]: {
            status: 'PENDING',
            reason: caseRequestReason.trim()
          }
        }))
        const fallbackCaseReq: CaseOwnerRequestItem = {
          id: Date.now(),
          caseId: caseNum,
          caseTitle: targetCase?.title,
          requestedUserId: currentUser.username,
          requestedBy: currentUser.username,
          reason: caseRequestReason.trim(),
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
        setMyCaseRequests(prev => {
          const next = [fallbackCaseReq, ...prev.filter(r => r.caseId !== caseNum)]
          saveCaseRequests(next)
          return next
        })
        showToast(`Duplicate request: An access request for case ${caseNum} is already pending review.`, 'error')
      } else {
        showToast(errMsg || 'Backend error: Failed to request case access', 'error')
        setCaseRequestError(errMsg || 'Backend error: Failed to request case access')
      }
    } finally {
      setCaseRequestLoading(false)
    }
  }

  const handleDocRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDocRequestError(null)
    if (!currentUser?.username) {
      showToast('Unauthorized: Please login to request document access.', 'error')
      return
    }
    const docId = targetDocForRequest?.id || selectedDocId.trim()
    if (!docId) {
      showToast('Document ID is required.', 'error')
      return
    }

    const targetDoc = documents.find(d => d.id === docId)
    if (targetDoc && isDocOwner(targetDoc)) {
      showToast(`You are already the custodian/owner of document ${docId}. Access requests are only for non-owners.`, 'info')
      return
    }

    if (targetDoc?.caseId && !hasCaseAccess(targetDoc.caseId)) {
      showToast(`Unauthorized: Cannot request document access without access to parent case ${targetDoc.caseId}.`, 'error')
      return
    }

    if (!docRequestReason.trim()) {
      showToast('Please provide a reason for the document access request.', 'error')
      return
    }

    if (docRequests[docId]?.status === 'PENDING') {
      showToast(`Duplicate request: An access request for document ${docId} is already pending review.`, 'error')
      return
    }

    setDocRequestLoading(true)
    try {
      const res = await docApi.requestAccess(docId, {
        permission: docRequestPermission,
        reason: docRequestReason.trim()
      })
      const status = res?.status || 'PENDING'
      setDocRequests(prev => ({
        ...prev,
        [docId]: {
          id: res?.id,
          permission: res?.permission || docRequestPermission,
          status,
          reason: res?.reason || docRequestReason.trim(),
          createdAt: res?.createdAt
        }
      }))
      const newDocReq: DocOwnerRequestItem = {
        id: res?.id || Date.now(),
        documentId: docId,
        docFilename: targetDoc?.originalFilename,
        caseId: targetDoc?.caseId,
        requestedUserId: currentUser.username,
        requestedBy: currentUser.username,
        permission: res?.permission || docRequestPermission,
        reason: res?.reason || docRequestReason.trim(),
        status,
        createdAt: res?.createdAt || new Date().toISOString()
      }
      setMyDocRequests(prev => {
        const next = [newDocReq, ...prev.filter(r => r.documentId !== docId)]
        saveDocRequests(next)
        return next
      })
      showToast(`Document access request for ${docId} (${docRequestPermission}) submitted successfully! Status: ${status}`, 'success')
      setDocRequestModalOpen(false)
      setDocRequestReason('')
    } catch (err: any) {
      const errMsg = err.message || ''
      const isUnauth = err.status === 401 || err.status === 403 || /401|403|unauthorized|forbidden/i.test(errMsg)
      if (isUnauth) {
        showToast(`Unauthorized: ${errMsg || 'You do not have permission to request access.'}`, 'error')
        setDocRequestError(`Unauthorized: ${errMsg || 'You do not have permission to request access.'}`)
      } else if (errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('pending')) {
        setDocRequests(prev => ({
          ...prev,
          [docId]: {
            permission: docRequestPermission,
            status: 'PENDING',
            reason: docRequestReason.trim()
          }
        }))
        const fallbackDocReq: DocOwnerRequestItem = {
          id: Date.now(),
          documentId: docId,
          docFilename: targetDoc?.originalFilename,
          caseId: targetDoc?.caseId,
          requestedUserId: currentUser.username,
          requestedBy: currentUser.username,
          permission: docRequestPermission,
          reason: docRequestReason.trim(),
          status: 'PENDING',
          createdAt: new Date().toISOString()
        }
        setMyDocRequests(prev => {
          const next = [fallbackDocReq, ...prev.filter(r => r.documentId !== docId)]
          saveDocRequests(next)
          return next
        })
        showToast(`Duplicate request: An access request for document ${docId} is already pending review.`, 'error')
      } else {
        showToast(errMsg || 'Backend error: Failed to submit document access request', 'error')
        setDocRequestError(errMsg || 'Backend error: Failed to submit document access request')
      }
    } finally {
      setDocRequestLoading(false)
    }
  }

  // OWNER REVIEW HELPERS & ACTIONS (Section 3)
  const isCaseOwner = (item: CaseItem): boolean => {
    if (!currentUser?.username || !item?.created_by) return false
    return item.created_by.trim().toLowerCase() === currentUser.username.trim().toLowerCase()
  }

  const isDocOwner = (doc: DocumentItem): boolean => {
    if (!currentUser?.username || !doc?.uploadedBy) return false
    return doc.uploadedBy.trim().toLowerCase() === currentUser.username.trim().toLowerCase()
  }

  // Fetch pending case access requests for cases owned by current user
  const fetchCaseOwnerRequests = async (casesList: CaseItem[]) => {
    if (!currentUser?.username || !casesList || casesList.length === 0) return
    const currentUsername = currentUser.username.trim().toLowerCase()

    const ownedCases = casesList.filter(c => c.created_by && c.created_by.trim().toLowerCase() === currentUsername)
    if (ownedCases.length === 0) {
      setPendingCaseOwnerRequests([])
      return
    }

    const allRequests: CaseOwnerRequestItem[] = []
    await Promise.allSettled(
      ownedCases.map(async (c) => {
        try {
          const reqs = await caseApi.getAccessRequests(c.case_number)
          if (Array.isArray(reqs)) {
            reqs.forEach((r: any) => {
              const requester = String(r.requestedBy || r.requestedUserId || '').trim().toLowerCase()
              // Owner Review must show requests from OTHER users only
              if (r.status === 'PENDING' && requester && requester !== currentUsername) {
                allRequests.push({
                  id: r.id,
                  caseId: c.case_number,
                  caseTitle: c.title,
                  requestedUserId: r.requestedBy || r.requestedUserId || 'Unknown User',
                  requestedBy: r.requestedBy || r.requestedUserId,
                  reason: r.reason || '',
                  status: r.status,
                  createdAt: r.createdAt
                })
              }
            })
          }
        } catch {
          // Graceful catch
        }
      })
    )

    setPendingCaseOwnerRequests(allRequests)
  }

  // Fetch pending document access requests for documents owned by current user
  const fetchDocOwnerRequests = async (docsList: DocumentItem[], casesList?: CaseItem[]) => {
    if (!currentUser?.username || !docsList || docsList.length === 0) return
    const currentUsername = currentUser.username.trim().toLowerCase()

    const ownedDocs = docsList.filter(doc => isDocOwner(doc))
    if (ownedDocs.length === 0) {
      setPendingDocOwnerRequests([])
      return
    }

    const allRequests: DocOwnerRequestItem[] = []
    await Promise.allSettled(
      ownedDocs.map(async (doc) => {
        try {
          const reqs = await docApi.getAccessRequests(doc.id)
          if (Array.isArray(reqs)) {
            reqs.forEach((r: any) => {
              const requester = String(r.requestedBy || (r.requestedUserId ? String(r.requestedUserId) : '')).trim().toLowerCase()
              // Owner Review must show requests from OTHER users only
              if (r.status === 'PENDING' && requester && requester !== currentUsername) {
                allRequests.push({
                  id: r.id,
                  documentId: doc.id,
                  docFilename: doc.originalFilename,
                  caseId: doc.caseId,
                  requestedUserId: r.requestedBy || (r.requestedUserId ? String(r.requestedUserId) : 'Unknown User'),
                  requestedBy: r.requestedBy,
                  permission: r.permission || 'VIEW',
                  reason: r.reason || '',
                  status: r.status,
                  createdAt: r.createdAt
                })
              }
            })
          }
        } catch {
          // Graceful catch
        }
      })
    )

    setPendingDocOwnerRequests(allRequests)
  }

  // Review a case access request: PUT /api/cases/access/requests/{requestId}?approved=true/false
  const handleReviewCaseRequest = async (requestId: number, approved: boolean, caseNumber?: string) => {
    if (caseNumber) {
      const targetCase = cases.find(c => c.case_number === caseNumber)
      if (targetCase && !isCaseOwner(targetCase)) {
        showToast('Unauthorized: Only the case owner can approve or reject access requests.', 'error')
        return
      }
    }
    setOwnerReviewActionLoading(requestId)
    try {
      await caseApi.reviewAccessRequest(requestId, approved)
      showToast(
        `Case access request for ${caseNumber || 'case'} ${approved ? 'approved' : 'rejected'} successfully.`,
        'success'
      )
      const status = approved ? 'APPROVED' : 'REJECTED'
      updateStoredCaseRequestStatus(requestId, status, caseNumber)
      setPendingCaseOwnerRequests(prev => prev.filter(r => r.id !== requestId))
      if (caseNumber) {
        setCaseRequests(prev => ({
          ...prev,
          [caseNumber]: {
            ...prev[caseNumber],
            id: requestId,
            status
          }
        }))
      }
      setMyCaseRequests(prev => prev.map(r => (Number(r.id) === Number(requestId) || (caseNumber && r.caseId === caseNumber)) ? { ...r, status } : r))
      const data = await caseApi.getAll()
      const backendCases: CaseItem[] = data || []
      setCases(backendCases)
      await fetchCaseOwnerRequests(backendCases)
      await fetchCaseAccessRequests(backendCases)
      await fetchDocOwnerRequests(documents, backendCases)
      await fetchDocAccessRequests(documents)
    } catch (err: any) {
      const errMsg = err.message || ''
      const isUnauth = err.status === 401 || err.status === 403 || /401|403|unauthorized|forbidden/i.test(errMsg)
      if (isUnauth) {
        showToast(`Unauthorized: ${errMsg || 'Only the case owner can review access requests.'}`, 'error')
      } else {
        showToast(errMsg || `Backend error: Failed to ${approved ? 'approve' : 'reject'} case request`, 'error')
      }
    } finally {
      setOwnerReviewActionLoading(null)
    }
  }

  // Review a document access request: PUT /api/documents/access/requests/{requestId}?approved=true/false
  const handleReviewDocRequest = async (requestId: number, approved: boolean, documentId?: string) => {
    if (documentId) {
      const targetDoc = documents.find(d => d.id === documentId)
      if (targetDoc && !isDocOwner(targetDoc)) {
        showToast('Unauthorized: Only the document custodian can approve or reject access requests.', 'error')
        return
      }
    }
    setOwnerReviewActionLoading(requestId)
    try {
      await docApi.reviewAccessRequest(requestId, approved)
      showToast(
        `Document access request for ${documentId || 'document'} ${approved ? 'approved' : 'rejected'} successfully.`,
        'success'
      )
      const status = approved ? 'APPROVED' : 'REJECTED'
      updateStoredDocRequestStatus(requestId, status, documentId)
      setPendingDocOwnerRequests(prev => prev.filter(r => r.id !== requestId))
      if (documentId) {
        setDocRequests(prev => ({
          ...prev,
          [documentId]: {
            ...prev[documentId],
            id: requestId,
            status
          }
        }))
      }
      setMyDocRequests(prev => prev.map(r => (Number(r.id) === Number(requestId) || (documentId && r.documentId === documentId)) ? { ...r, status } : r))
      const docs = await docApi.getAll()
      const backendDocs: DocumentItem[] = docs || []
      setDocuments(backendDocs)
      await fetchDocOwnerRequests(backendDocs, cases)
      await fetchDocAccessRequests(backendDocs)
      await fetchCaseOwnerRequests(cases)
      await fetchCaseAccessRequests(cases)
    } catch (err: any) {
      const errMsg = err.message || ''
      const isUnauth = err.status === 401 || err.status === 403 || /401|403|unauthorized|forbidden/i.test(errMsg)
      if (isUnauth) {
        showToast(`Unauthorized: ${errMsg || 'Only the document custodian can review access requests.'}`, 'error')
      } else {
        showToast(errMsg || `Backend error: Failed to ${approved ? 'approve' : 'reject'} document request`, 'error')
      }
    } finally {
      setOwnerReviewActionLoading(null)
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

  // If authentication state is not yet initialized on client, render initial matching loading shell
  if (!authInitialized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F9FC' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(6,59,130,0.15)', borderTopColor: '#063B82', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  // ----------------------------------------------------
  // RENDER: AUTHENTICATION SCREEN (If Not Logged In)
  // ----------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{ height: '100vh', display: 'flex', width: '100%', overflow: 'hidden' }}>
        {/* LEFT COLUMN - Image */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', position: 'relative', background: '#f8fafc' }} className="auth-left-col">
          <img
            src="/audit-bg.jpeg"
            alt="Authentication Background"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>

        {/* RIGHT COLUMN - Form */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px', background: '#fff', maxWidth: '640px', margin: '0 auto', width: '100%', overflowY: 'auto' }}>
          <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
            <div style={{ marginBottom: '16px' }}>
            </div>

            {/* SIGN IN TAB */}
            {authTab === 'login' && (
              <div>


                {loginError && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.3)', color: 'var(--accent-rose)', fontSize: '0.82rem', marginBottom: '16px' }}>
                    {loginError}
                  </div>
                )}

                {/* Step 1: Password Credentials */}
                {loginStep === 'credentials' && (
                  <form onSubmit={handleLoginPassword} className="form-container">
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <User size={18} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
                        <input
                          type="text"
                          value={loginUsername}
                          onChange={e => setLoginUsername(e.target.value)}
                          placeholder="Username / Email ID"
                          style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Lock size={18} style={{ position: 'absolute', left: '14px', color: '#64748b' }} />
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          placeholder="Password"
                          style={{ width: '100%', padding: '12px 42px 12px 42px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                          required
                        />
                        <Eye size={18} style={{ position: 'absolute', right: '14px', color: '#64748b', cursor: 'pointer' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '24px', fontSize: '0.85rem' }}>
                      <a href="#" style={{ color: '#063B82', fontWeight: 600, textDecoration: 'none' }}>Forgot Password?</a>
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loginLoading} style={{ width: '100%', padding: '12px', fontSize: '1rem', background: '#063B82', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      {loginLoading ? 'Signing In...' : 'Sign In'}
                      {!loginLoading && <span>&rarr;</span>}
                    </button>

                    <button type="button" style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #063B82', background: 'transparent', color: '#063B82', fontSize: '0.95rem', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '16px' }}>
                      <Database size={18} /> Login with SOS
                    </button>

                    <div style={{ marginTop: '32px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b' }}>
                      Don't have an account? <span onClick={() => { setAuthTab('register'); setLoginError(null); }} style={{ color: '#063B82', fontWeight: 600, cursor: 'pointer' }}>Register Here</span>
                    </div>
                  </form>
                )}

                {/* Step 2: 6-Digit Email OTP */}
                {loginStep === 'otp' && (
                  <form onSubmit={handleLoginOtp} className="form-container">
                    <div style={{ padding: '10px', background: 'var(--bg-section)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6,59,130,0.2)', fontSize: '0.82rem', color: 'var(--gov-navy)', marginBottom: '12px' }}>
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
                {/* Registration Toggle Footer */}
                <div style={{ marginTop: '32px', textAlign: 'left', fontSize: '0.85rem', color: '#64748b' }}>
                  Already have an account? <span onClick={() => { setAuthTab('login'); setRegNotice(null); }} style={{ color: '#063B82', fontWeight: 600, cursor: 'pointer' }}>Sign In Here</span>
                </div>
              </div>
            )}

            {/* Quick Skip Dev Button (Preserves full login/register UI above) */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <button
                type="button"
                onClick={loginWithDefaultOfficer}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span>⚡</span> Skip Login &amp; Enter Dashboard Directly
              </button>
            </div>
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
      <div style={{ padding: '24px 24px 0 24px', display: 'flex', alignItems: 'center' }}>
        <h1 style={{
          margin: 0,
          fontSize: '1.8rem',
          fontWeight: 800,
          background: 'linear-gradient(90deg, var(--gov-navy), #3b82f6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '0.5px',
          fontFamily: 'var(--font-heading)'
        }}>
          e-SanRaksha
        </h1>
      </div>
      <header className="new-top-nav-container">
        {/* Horizontal Navigation with Dropdowns */}
        <nav className="horizontal-glass-nav">
          <ul className="nav-menu">
            <li className="nav-item">
              <button
                className={`nav-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                Upload Document
              </button>
            </li>

            <li className="nav-item dropdown-wrapper">
              <button
                className={`nav-tab-btn ${['document-request', 'document-vault'].includes(activeTab) ? 'active' : ''}`}
              >
                {activeTab === 'document-request' ? 'Document Request ▾' :
                  activeTab === 'document-vault' ? 'Documents ▾' :
                    'Document Vault ▾'}
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button onClick={() => { setActiveTab('document-request'); }}>
                    Document Request
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('document-vault'); loadDocuments(); }}>
                    Documents
                  </button>
                </li>
              </ul>
            </li>

            <li className="nav-item dropdown-wrapper">
              <button
                className={`nav-tab-btn ${['create-case', 'view-cases'].includes(activeTab) ? 'active' : ''}`}
              >
                {activeTab === 'create-case' ? 'Create Case ▾' :
                  activeTab === 'view-cases' ? 'View Cases ▾' :
                    'Cases ▾'}
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button onClick={() => { setActiveTab('create-case'); loadCases(); }}>
                    Create Case
                  </button>
                </li>
                <li>
                  <button onClick={() => { setActiveTab('view-cases'); loadCases(); loadDocuments(); }}>
                    View Cases
                  </button>
                </li>
              </ul>
            </li>

            <li className="nav-item">
              <button
                className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => { setActiveTab('audit'); loadAuditLogs(); }}
              >
                Audit Trail
              </button>
            </li>
          </ul>

          <div className="nav-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Search Box */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Search..."
                style={{ padding: '6px 12px 6px 32px', borderRadius: '20px', border: '1px solid var(--border-color)', fontSize: '0.85rem', width: '200px', background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* User profile & Logout */}
            <div className="user-profile-pill">
              <User size={14} />
              <span>{currentUser?.username || ''}</span>
              <button onClick={handleLogout} title="Sign Out">
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </nav>
      </header>

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
                    <label>Case ID</label>
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
                          <option key={`${num}-${idx}`} value={num}>
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
                  style={{ marginTop: '12px' }}
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
      {['document-request', 'document-vault'].includes(activeTab) && (
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
                  style={{ padding: '8px 14px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '0.88rem', outline: 'none' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => openDocRequestModal(null)} title="Request Document Access">
                  <Shield size={14} /> Request Document Access
                </button>
                <button className="btn btn-secondary btn-sm" onClick={loadDocuments} disabled={vaultLoading}>
                  <RefreshCw size={14} className={vaultLoading ? 'spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {activeTab === 'document-vault' && (
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
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                              {isDocOwner(doc) ? (
                                <>
                                  <span className="step-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Shield size={11} /> Custodian
                                  </span>
                                  {pendingDocOwnerRequests.filter(r => r.documentId === doc.id).length > 0 && (
                                    <button
                                      className="btn btn-primary btn-xs"
                                      onClick={() => setDocReviewModalDoc(doc)}
                                      title="Review pending access requests for this document"
                                    >
                                      Review ({pendingDocOwnerRequests.filter(r => r.documentId === doc.id).length})
                                    </button>
                                  )}
                                </>
                              ) : hasCaseAccess(doc.caseId) ? (
                                <>
                                  {docRequests[doc.id] && (
                                    <span className={`step-badge ${docRequests[doc.id].status === 'APPROVED' ? 'success' :
                                      docRequests[doc.id].status === 'REJECTED' ? 'failed' : 'pending'
                                      }`} style={{ fontSize: '0.68rem' }}>
                                      {docRequests[doc.id].status}: {docRequests[doc.id].permission}
                                    </span>
                                  )}
                                  <button
                                    className={`btn ${docRequests[doc.id]?.status === 'PENDING' ? 'btn-secondary' : 'btn-secondary'} btn-xs`}
                                    onClick={() => openDocRequestModal(doc)}
                                    disabled={docRequests[doc.id]?.status === 'PENDING'}
                                    title={docRequests[doc.id]?.status === 'PENDING' ? 'Access request pending review' : 'Request Document Access'}
                                  >
                                    <Shield size={12} /> {docRequests[doc.id]?.status === 'PENDING' ? 'Req Pending' : 'Request Access'}
                                  </button>
                                </>
                              ) : (
                                docRequests[doc.id] ? (
                                  <span className={`step-badge ${docRequests[doc.id].status === 'APPROVED' ? 'success' :
                                    docRequests[doc.id].status === 'REJECTED' ? 'failed' : 'pending'
                                    }`} style={{ fontSize: '0.68rem' }}>
                                    {docRequests[doc.id].status}: {docRequests[doc.id].permission}
                                  </span>
                                ) : null
                              )}
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

            )}

            {/* Document Owner Review Section (Section 3) */}
            {activeTab === 'document-request' && (
              <>
                {documents.some(d => isDocOwner(d)) && (
                  <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                    <div className="case-create-heading" style={{ marginBottom: '16px' }}>
                      <div>
                        <h3>Document Access Requests (Owner Review)</h3>
                        <p>Review and authorize permission requests for documents in your custody.</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="card-badge" style={{ color: pendingDocOwnerRequests.length > 0 ? 'var(--accent-amber)' : 'inherit' }}>
                          {pendingDocOwnerRequests.length} Pending
                        </span>
                        <button
                          className="btn btn-secondary btn-xs"
                          onClick={() => fetchDocOwnerRequests(documents, cases)}
                          disabled={vaultLoading}
                          title="Refresh document access requests"
                        >
                          <RefreshCw size={12} className={vaultLoading ? 'spin' : ''} /> Refresh
                        </button>
                      </div>
                    </div>

                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Doc ID</th>
                            <th>Case ID</th>
                            <th>Requesting User</th>
                            <th>Requested Permission</th>
                            <th>Reason</th>
                            <th>Date Requested</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingDocOwnerRequests.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="empty-state">
                                No pending access requests for documents owned by you.
                              </td>
                            </tr>
                          ) : (
                            pendingDocOwnerRequests.map(req => (
                              <tr key={req.id}>
                                <td>
                                  <strong style={{ color: 'var(--accent-cyan)' }}>{req.documentId}</strong>
                                  {req.docFilename && <div className="table-secondary-text">{req.docFilename}</div>}
                                </td>
                                <td style={{ fontFamily: 'var(--font-mono)' }}>{req.caseId || '-'}</td>
                                <td>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                                    <User size={13} style={{ color: 'var(--accent-cyan)' }} />
                                    {req.requestedUserId}
                                  </span>
                                </td>
                                <td>
                                  <span className="badge-tag" style={{ fontWeight: 600 }}>
                                    {req.permission}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                                    {req.reason || 'No reason provided'}
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                    <button
                                      className="btn btn-primary btn-xs"
                                      disabled={ownerReviewActionLoading === req.id}
                                      onClick={() => handleReviewDocRequest(req.id, true, req.documentId)}
                                      title="Approve access"
                                    >
                                      {ownerReviewActionLoading === req.id ? (
                                        <>
                                          <RefreshCw size={12} className="spin" /> Approving...
                                        </>
                                      ) : (
                                        <>
                                          <Check size={12} /> Approve
                                        </>
                                      )}
                                    </button>
                                    <button
                                      className="btn btn-secondary btn-xs"
                                      disabled={ownerReviewActionLoading === req.id}
                                      onClick={() => handleReviewDocRequest(req.id, false, req.documentId)}
                                      title="Reject request"
                                      style={{ color: '#ef4444' }}
                                    >
                                      {ownerReviewActionLoading === req.id ? (
                                        <>
                                          <RefreshCw size={12} className="spin" /> Rejecting...
                                        </>
                                      ) : (
                                        <>
                                          <X size={12} /> Reject
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}


                {/* Requester's Document Access Requests Panel (Section 3 & 5) */}
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <div className="case-create-heading" style={{ marginBottom: '16px' }}>
                    <div>
                      <h3>My Document Access Requests</h3>
                      <p>Track the review status of your submitted document permission requests.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="card-badge">
                        {myDocRequests.length} Request{myDocRequests.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => fetchDocAccessRequests(documents)}
                        disabled={vaultLoading}
                        title="Refresh my document access requests"
                      >
                        <RefreshCw size={12} className={vaultLoading ? 'spin' : ''} /> Refresh
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Doc ID</th>
                          <th>Case ID</th>
                          <th>Requested Permission</th>
                          <th>Reason</th>
                          <th>Date Requested</th>
                          <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myDocRequests.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="empty-state">
                              No document access requests submitted yet.
                            </td>
                          </tr>
                        ) : (
                          myDocRequests.map(req => (
                            <tr key={req.id}>
                              <td>
                                <strong style={{ color: 'var(--accent-cyan)' }}>{req.documentId}</strong>
                                {req.docFilename && <div className="table-secondary-text">{req.docFilename}</div>}
                              </td>
                              <td style={{ fontFamily: 'var(--font-mono)' }}>{req.caseId || '-'}</td>
                              <td>
                                <span className="badge-tag" style={{ fontWeight: 600 }}>
                                  {req.permission}
                                </span>
                              </td>
                              <td>
                                <div style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                                  {req.reason || 'No reason provided'}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span className={`step-badge ${req.status === 'APPROVED' ? 'success' :
                                  req.status === 'REJECTED' ? 'failed' : 'pending'
                                  }`} style={{ fontWeight: 600 }}>
                                  {req.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        </main>
      )}

      {/* ----------------------------------------------------
          TAB 3: ASSESSMENT / ACCESS LIST
          ---------------------------------------------------- */}
      {['create-case', 'view-cases'].includes(activeTab) && (
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
                  style={{ padding: '8px 14px', borderRadius: '6px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '0.88rem', outline: 'none' }}
                />
                <button className="btn btn-secondary btn-sm" onClick={() => openCaseRequestModal('')} title="Request Access by Case Number">
                  <Key size={14} /> Request Case Access
                </button>
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
              <div className="summary-strip-item">
                <span>Access Requests</span>
                <strong style={{ color: 'var(--accent-amber)' }}>
                  {Object.keys(caseRequests).length}
                </strong>
              </div>
            </div>

            {activeTab === 'create-case' && (
              <form onSubmit={handleCreateCase} className="case-create-panel">
                <div className="case-create-heading">
                  <div>
                    <h3>Create New Case</h3>
                    <p>Register a case before uploading its secure documents.</p>
                  </div>
                  <span className="card-badge">Created by {currentUser?.username || ''}</span>
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
            )}

            {activeTab === 'view-cases' && (<>
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
                      <th style={{ textAlign: 'right' }}>Access / Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.filter(item => {
                      const query = caseSearch.trim().toLowerCase()
                      return `${item.case_number} ${item.title}`.toLowerCase().includes(query)
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="empty-state">
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
                        const req = caseRequests[item.case_number]
                        const accessible = isCaseAccessible(item)
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
                            <td style={{ textAlign: 'right' }}>
                              {isCaseOwner(item) ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  <span className="step-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Shield size={11} /> Owner
                                  </span>
                                  {pendingCaseOwnerRequests.filter(r => r.caseId === item.case_number).length > 0 && (
                                    <button
                                      className="btn btn-primary btn-xs"
                                      onClick={() => setCaseReviewModalCase(item.case_number)}
                                      title="Review pending access requests for this case"
                                    >
                                      Review ({pendingCaseOwnerRequests.filter(r => r.caseId === item.case_number).length})
                                    </button>
                                  )}
                                </div>
                              ) : accessible ? (
                                <span className="step-badge success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle size={11} /> Granted
                                </span>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                                  {req && (
                                    <span className={`step-badge ${req.status === 'APPROVED' ? 'success' :
                                      req.status === 'REJECTED' ? 'failed' : 'pending'
                                      }`} style={{ fontSize: '0.68rem' }}>
                                      {req.status}
                                    </span>
                                  )}
                                  <button
                                    className={`btn ${req?.status === 'PENDING' ? 'btn-secondary' : 'btn-primary'} btn-xs`}
                                    onClick={() => openCaseRequestModal(item.case_number)}
                                    disabled={req?.status === 'PENDING'}
                                    title={req?.status === 'PENDING' ? 'Access request pending review' : 'Request Case Access'}
                                  >
                                    <Key size={12} />
                                    {req?.status === 'PENDING' ? 'Pending' : 'Request Case Access'}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Case Owner Review Section (Section 3) */}
              {cases.some(c => isCaseOwner(c)) && (
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
                  <div className="case-create-heading" style={{ marginBottom: '16px' }}>
                    <div>
                      <h3>Case Access Requests (Owner Review)</h3>
                      <p>Authorize or reject officers requesting access to cases registered by you.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className="card-badge" style={{ color: pendingCaseOwnerRequests.length > 0 ? 'var(--accent-amber)' : 'inherit' }}>
                        {pendingCaseOwnerRequests.length} Pending
                      </span>
                      <button
                        className="btn btn-secondary btn-xs"
                        onClick={() => fetchCaseOwnerRequests(cases)}
                        disabled={casesLoading}
                        title="Refresh case access requests"
                      >
                        <RefreshCw size={12} className={casesLoading ? 'spin' : ''} /> Refresh
                      </button>
                    </div>
                  </div>

                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Case No</th>
                          <th>Requesting User</th>
                          <th>Reason</th>
                          <th>Date Requested</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingCaseOwnerRequests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="empty-state">
                              No pending access requests for cases owned by you.
                            </td>
                          </tr>
                        ) : (
                          pendingCaseOwnerRequests.map(req => (
                            <tr key={req.id}>
                              <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                                {req.caseId}
                                {req.caseTitle && <div className="table-secondary-text">{req.caseTitle}</div>}
                              </td>
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                                  <User size={13} style={{ color: 'var(--accent-cyan)' }} />
                                  {req.requestedUserId}
                                </span>
                              </td>
                              <td>
                                <div style={{ maxWidth: '320px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                                  {req.reason || 'No justification provided'}
                                </div>
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button
                                    className="btn btn-primary btn-xs"
                                    disabled={ownerReviewActionLoading === req.id}
                                    onClick={() => handleReviewCaseRequest(req.id, true, req.caseId)}
                                    title="Approve access"
                                  >
                                    {ownerReviewActionLoading === req.id ? (
                                      <>
                                        <RefreshCw size={12} className="spin" /> Approving...
                                      </>
                                    ) : (
                                      <>
                                        <Check size={12} /> Approve
                                      </>
                                    )}
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-xs"
                                    disabled={ownerReviewActionLoading === req.id}
                                    onClick={() => handleReviewCaseRequest(req.id, false, req.caseId)}
                                    title="Reject access request"
                                    style={{ color: '#ef4444' }}
                                  >
                                    {ownerReviewActionLoading === req.id ? (
                                      <>
                                        <RefreshCw size={12} className="spin" /> Rejecting...
                                      </>
                                    ) : (
                                      <>
                                        <X size={12} /> Reject
                                      </>
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


            </>)}
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
          MODAL: CASE ACCESS REQUEST (Section 2)
          ---------------------------------------------------- */}
      {caseRequestModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                Request Case Access (<span style={{ color: 'var(--accent-cyan)' }}>{targetCaseForRequest || 'Specify Case'}</span>)
              </h3>
              <button className="btn-close" onClick={() => setCaseRequestModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCaseRequestSubmit} className="form-container">
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                  <span className="text-muted">Target Case:</span>
                  <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{targetCaseForRequest || selectedCaseNumber || 'Custom Case'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span className="text-muted">Requested By:</span>
                  <span className="card-badge">{currentUser?.username || ''}</span>
                </div>
              </div>

              {!targetCaseForRequest && (
                <div className="form-group">
                  <label htmlFor="case-request-target-number">Case Number</label>
                  <input
                    id="case-request-target-number"
                    type="text"
                    value={selectedCaseNumber}
                    onChange={e => setSelectedCaseNumber(e.target.value)}
                    placeholder="e.g. CASE-2026-001"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="case-request-reason">Reason for Case Access</label>
                <textarea
                  id="case-request-reason"
                  value={caseRequestReason}
                  onChange={e => setCaseRequestReason(e.target.value)}
                  placeholder="Provide statutory justification or operational reason under BNSS..."
                  rows={3}
                  required
                />
              </div>

              {Boolean(
                (targetCaseForRequest && caseRequests[targetCaseForRequest]?.status === 'PENDING') ||
                (selectedCaseNumber.trim() && caseRequests[selectedCaseNumber.trim()]?.status === 'PENDING')
              ) && (
                  <div style={{ color: 'var(--accent-amber)', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', marginTop: '8px' }}>
                    An access request for this case is currently pending review. Duplicate requests are disabled.
                  </div>
                )}

              {caseRequestError && (
                <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)', marginTop: '8px' }}>
                  {caseRequestError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCaseRequestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={caseRequestLoading || Boolean(
                    (targetCaseForRequest && caseRequests[targetCaseForRequest]?.status === 'PENDING') ||
                    (selectedCaseNumber.trim() && caseRequests[selectedCaseNumber.trim()]?.status === 'PENDING')
                  )}
                >
                  <Key size={14} />
                  {caseRequestLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: DOCUMENT ACCESS REQUEST (Section 2)
          ---------------------------------------------------- */}
      {docRequestModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>
                Request Document Access (<span style={{ color: 'var(--accent-cyan)' }}>{targetDocForRequest ? targetDocForRequest.id : 'Specify Document'}</span>)
              </h3>
              <button className="btn-close" onClick={() => setDocRequestModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleDocRequestSubmit} className="form-container">
              {targetDocForRequest ? (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                    <span className="text-muted">Document:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{targetDocForRequest.originalFilename} ({targetDocForRequest.id})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <span className="text-muted">Associated Case:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{targetDocForRequest.caseId}</span>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label htmlFor="doc-request-target-id">Document ID</label>
                  <input
                    id="doc-request-target-id"
                    type="text"
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                    placeholder="e.g. DOC-001"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="doc-request-permission">Requested Permission</label>
                <select
                  id="doc-request-permission"
                  value={docRequestPermission}
                  onChange={e => setDocRequestPermission(e.target.value as any)}
                  className="form-control"
                  required
                >
                  <option value="VIEW">VIEW — Inspect and read document metadata & decrypted preview</option>
                  <option value="DOWNLOAD">DOWNLOAD — Decrypt and download verified statutory master</option>
                  <option value="UPLOAD">UPLOAD — Append supplementary annexures and files</option>
                  <option value="EDIT">EDIT — Commit and sign new cryptographic document versions</option>
                  <option value="SHARE">SHARE — Generate Section 230 BNSS disclosure links</option>
                  <option value="DELETE">DELETE — Authorized record expungement or archival</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="doc-request-reason">Reason for Document Access</label>
                <textarea
                  id="doc-request-reason"
                  value={docRequestReason}
                  onChange={e => setDocRequestReason(e.target.value)}
                  placeholder="Specify legal necessity, Section citation, or operational need..."
                  rows={3}
                  required
                />
              </div>

              {Boolean(
                (targetDocForRequest && docRequests[targetDocForRequest.id]?.status === 'PENDING') ||
                (selectedDocId.trim() && docRequests[selectedDocId.trim()]?.status === 'PENDING')
              ) && (
                  <div style={{ color: 'var(--accent-amber)', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.25)', marginTop: '8px' }}>
                    An access request for this document is currently pending review. Duplicate requests are disabled.
                  </div>
                )}

              {Boolean(
                (targetDocForRequest?.caseId && !hasCaseAccess(targetDocForRequest.caseId)) ||
                (!targetDocForRequest && selectedDocId.trim() && documents.find(d => d.id === selectedDocId.trim())?.caseId && !hasCaseAccess(documents.find(d => d.id === selectedDocId.trim())?.caseId))
              ) && (
                  <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)', marginTop: '8px' }}>
                    Access to parent case {targetDocForRequest?.caseId || documents.find(d => d.id === selectedDocId.trim())?.caseId} is required before requesting access to this document.
                  </div>
                )}

              {docRequestError && (
                <div style={{ color: 'var(--accent-red, #ef4444)', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.25)', marginTop: '8px' }}>
                  {docRequestError}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDocRequestModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={docRequestLoading || Boolean(
                    (targetDocForRequest && docRequests[targetDocForRequest.id]?.status === 'PENDING') ||
                    (selectedDocId.trim() && docRequests[selectedDocId.trim()]?.status === 'PENDING') ||
                    (targetDocForRequest?.caseId && !hasCaseAccess(targetDocForRequest.caseId)) ||
                    (!targetDocForRequest && selectedDocId.trim() && documents.find(d => d.id === selectedDocId.trim())?.caseId && !hasCaseAccess(documents.find(d => d.id === selectedDocId.trim())?.caseId))
                  )}
                >
                  <Shield size={14} />
                  {docRequestLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: CASE OWNER ACCESS REVIEW (Section 3)
          ---------------------------------------------------- */}
      {caseReviewModalCase && cases.some(c => c.case_number === caseReviewModalCase && isCaseOwner(c)) && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h3>
                Review Case Access Requests — <span style={{ color: 'var(--accent-cyan)' }}>{caseReviewModalCase}</span>
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchCaseOwnerRequests(cases)}
                  disabled={casesLoading}
                  title="Refresh access requests"
                >
                  <RefreshCw size={12} className={casesLoading ? 'spin' : ''} /> Refresh
                </button>
                <button className="btn-close" onClick={() => setCaseReviewModalCase(null)}>&times;</button>
              </div>
            </div>

            <div style={{ padding: '8px 0' }}>
              {pendingCaseOwnerRequests.filter(r => r.caseId === caseReviewModalCase).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  No pending access requests for this case.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Requesting User</th>
                        <th>Reason</th>
                        <th>Date Requested</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCaseOwnerRequests.filter(r => r.caseId === caseReviewModalCase).map(req => (
                        <tr key={req.id}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                              <User size={13} style={{ color: 'var(--accent-cyan)' }} />
                              {req.requestedUserId}
                            </span>
                          </td>
                          <td>
                            <div style={{ maxWidth: '280px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                              {req.reason || 'No reason provided'}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-primary btn-xs"
                                disabled={ownerReviewActionLoading === req.id}
                                onClick={() => handleReviewCaseRequest(req.id, true, req.caseId)}
                                title="Approve case access"
                              >
                                {ownerReviewActionLoading === req.id ? (
                                  <>
                                    <RefreshCw size={12} className="spin" /> Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} /> Approve
                                  </>
                                )}
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                disabled={ownerReviewActionLoading === req.id}
                                onClick={() => handleReviewCaseRequest(req.id, false, req.caseId)}
                                title="Reject case access"
                                style={{ color: '#ef4444' }}
                              >
                                {ownerReviewActionLoading === req.id ? (
                                  <>
                                    <RefreshCw size={12} className="spin" /> Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <X size={12} /> Reject
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCaseReviewModalCase(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: DOCUMENT OWNER ACCESS REVIEW (Section 3)
          ---------------------------------------------------- */}
      {docReviewModalDoc && isDocOwner(docReviewModalDoc) && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>
                Review Document Access Requests — <span style={{ color: 'var(--accent-cyan)' }}>{docReviewModalDoc.originalFilename || docReviewModalDoc.id}</span>
              </h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => fetchDocOwnerRequests(documents, cases)}
                  disabled={vaultLoading}
                  title="Refresh access requests"
                >
                  <RefreshCw size={12} className={vaultLoading ? 'spin' : ''} /> Refresh
                </button>
                <button className="btn-close" onClick={() => setDocReviewModalDoc(null)}>&times;</button>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(148, 163, 184, 0.15)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', display: 'flex', gap: '20px', fontSize: '0.82rem' }}>
              <div>
                <span className="text-muted">Document ID:</span> <strong style={{ color: 'var(--accent-cyan)' }}>{docReviewModalDoc.id}</strong>
              </div>
              <div>
                <span className="text-muted">Associated Case:</span> <span style={{ fontFamily: 'var(--font-mono)' }}>{docReviewModalDoc.caseId}</span>
              </div>
            </div>

            <div style={{ padding: '4px 0' }}>
              {pendingDocOwnerRequests.filter(r => r.documentId === docReviewModalDoc.id).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  No pending access requests for this document.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Requesting User</th>
                        <th>Requested Permission</th>
                        <th>Reason</th>
                        <th>Date Requested</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingDocOwnerRequests.filter(r => r.documentId === docReviewModalDoc.id).map(req => (
                        <tr key={req.id}>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 500 }}>
                              <User size={13} style={{ color: 'var(--accent-cyan)' }} />
                              {req.requestedUserId}
                            </span>
                          </td>
                          <td>
                            <span className="badge-tag" style={{ fontWeight: 600 }}>
                              {req.permission}
                            </span>
                          </td>
                          <td>
                            <div style={{ maxWidth: '240px', whiteSpace: 'normal', fontSize: '0.85rem' }}>
                              {req.reason || 'No reason provided'}
                            </div>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {req.createdAt ? new Date(req.createdAt).toLocaleString() : '-'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-primary btn-xs"
                                disabled={ownerReviewActionLoading === req.id}
                                onClick={() => handleReviewDocRequest(req.id, true, req.documentId)}
                                title="Approve document access"
                              >
                                {ownerReviewActionLoading === req.id ? (
                                  <>
                                    <RefreshCw size={12} className="spin" /> Approving...
                                  </>
                                ) : (
                                  <>
                                    <Check size={12} /> Approve
                                  </>
                                )}
                              </button>
                              <button
                                className="btn btn-secondary btn-xs"
                                disabled={ownerReviewActionLoading === req.id}
                                onClick={() => handleReviewDocRequest(req.id, false, req.documentId)}
                                title="Reject document access"
                                style={{ color: '#ef4444' }}
                              >
                                {ownerReviewActionLoading === req.id ? (
                                  <>
                                    <RefreshCw size={12} className="spin" /> Rejecting...
                                  </>
                                ) : (
                                  <>
                                    <X size={12} /> Reject
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDocReviewModalDoc(null)}
              >
                Close
              </button>
            </div>
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
