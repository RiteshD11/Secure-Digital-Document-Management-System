/**
 * SIH 2026 SECURE DIGITAL DMS (NYAYASETU / NYAYAVAULT)
 * Mock API & Backend Integration Layer
 * Compliant with BNSS (2023) and BSA (2023)
 */

export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082';

export const ROLES = {
  INVESTIGATING_OFFICER: {
    id: 'io',
    name: 'Aarav Mehta',
    title: 'Investigating Officer',
    rank: 'Inspector / Cyber Crime Cell',
    unit: 'Cyber Crime Cell, South East District',
    initials: 'AM',
    ip: '10.24.8.61',
    badge: 'DL-POL-0442',
    clearance: 'Tier 1 (Full Operational)',
    permissions: ['view', 'upload', 'verify', 'share_sec230', 'export_sec63', 'audit_full', 'intel_graph']
  },
  LEGAL_ADVISOR: {
    id: 'prosecutor',
    name: 'Priya Shah',
    title: 'Public Prosecutor',
    rank: 'Senior Directorate Counsel',
    unit: 'Directorate of Prosecution, Delhi High Court',
    initials: 'PS',
    ip: '10.24.12.104',
    badge: 'DL-JUD-1189',
    clearance: 'Tier 2 (Prosecutorial Review)',
    permissions: ['view', 'verify', 'share_sec230', 'export_sec63', 'audit_view', 'intel_graph']
  },
  FSL_ANALYST: {
    id: 'fsl',
    name: 'Dr. N. Bhatia',
    title: 'FSL Forensic Analyst',
    rank: 'Senior Scientific Officer (Digital Forensics)',
    unit: 'Forensic Science Laboratory, Rohini',
    initials: 'NB',
    ip: '10.24.19.42',
    badge: 'FSL-DEL-089',
    clearance: 'Tier 2 (Forensic Ingestion & Seals)',
    permissions: ['view', 'upload', 'verify', 'export_sec63', 'custody_update']
  },
  MALKHANA_INCHARGE: {
    id: 'malkhana',
    name: 'HC Vikram Singh',
    title: 'Malkhana In-Charge',
    rank: 'Head Constable / Custody Officer',
    unit: 'Central Evidence Vault, PS Saket',
    initials: 'VS',
    ip: '10.24.4.15',
    badge: 'DL-POL-8812',
    clearance: 'Tier 2 (Physical & Vault Seals)',
    permissions: ['view', 'custody_update', 'verify']
  },
  JUDGE: {
    id: 'judge',
    name: 'Hon. Justice S. Verma',
    title: 'Judicial Magistrate (First Class)',
    rank: 'Metropolitan Magistrate',
    unit: 'Saket District Court, Courtroom No. 4',
    initials: 'SV',
    ip: '10.24.1.09',
    badge: 'DEL-JUD-0034',
    clearance: 'Tier 1 (Judicial Adjudication)',
    permissions: ['view', 'verify', 'export_sec63', 'audit_full', 'intel_graph']
  }
};

export let currentUser = ROLES.INVESTIGATING_OFFICER;

export function setCurrentUserRole(roleKey) {
  if (ROLES[roleKey]) {
    currentUser = ROLES[roleKey];
    return currentUser;
  }
  return currentUser;
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return true;
    }
    return false;
  } catch (e) {
    return true;
  }
}

async function apiFetch(url, options = {}) {
  const rawOfficer = typeof window !== 'undefined'
    ? localStorage.getItem('dms_officer')
    : null;
  let token = null;
  if (rawOfficer) {
    try {
      token = JSON.parse(rawOfficer)?.token;
    } catch (e) {}
  }

  if (token && isTokenExpired(token)) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dms_officer');
      window.dispatchEvent(new CustomEvent('dms_session_expired', {
        detail: { message: 'Your login session has expired. Please authenticate to continue.' }
      }));
    }
    throw new Error('Your login session has expired. Please sign in again.');
  }

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dms_officer');
      window.dispatchEvent(new CustomEvent('dms_session_expired', {
        detail: { message: 'Session expired or authorization required. Please sign in again.' }
      }));
    }
  }
  return res;
}

/* ----------------------------------------------------
   AUTHENTICATION API (Connected to Spring Boot Backend)
   - Step 1 Login: POST /auth/login
   - Step 2 Login: POST /auth/verifyLogin-otp
   - Step 3 Login: Face recognition (Client-side camera / Biometrics)
   - Step 1 Reg:   POST /auth/register
   - Step 2 Reg:   POST /auth/verify-otp
   - Step 3 Reg:   POST /auth/set-profile
---------------------------------------------------- */
export const authApi = {
  // Step 1 Registration: send OTP to email
  async register(email) {
    const res = await fetch(`${BACKEND_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mail: email })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Failed to send registration OTP');
    }
    return await res.text();
  },

  // Step 2 Registration: verify OTP
  async verifyOtp(email, otp) {
    const res = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      throw new Error('Failed to verify OTP');
    }
    const data = await res.json();
    if (data.status === 'error') {
      throw new Error(data.message || 'Invalid OTP code');
    }
    return data;
  },

  // Step 3 Registration: set profile details
  async setProfile({ email, password, firstName, lastName, position, aadharNumber, phoneNumber, photo }) {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('position', position || 'Investigating Officer');
    formData.append('aadharNumber', aadharNumber || '123456789012');
    formData.append('phoneNumber', phoneNumber || '9876543210');
    if (photo) {
      formData.append('photo', photo, photo.name || 'profile.jpg');
    }

    const res = await fetch(`${BACKEND_URL}/auth/set-profile`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || 'Failed to save profile. Please verify your details.');
    }
    return await res.json().catch(() => ({ status: 'success' }));
  },

  // Step 1 Login: Password verification & trigger login OTP
  async login(username, password) {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || 'Login failed. Check your registered email/username and password.');
    }
    return await res.json().catch(() => ({ status: 'success' }));
  },

  // Step 2 Login: Verify Login OTP and get JWT token
  async verifyLoginOtp(email, otp) {
    const res = await fetch(`${BACKEND_URL}/auth/verifyLogin-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
      throw new Error('Failed to verify login OTP');
    }
    const data = await res.json();
    if (data.status === 'error') {
      throw new Error(data.message || 'Invalid OTP code');
    }
    return data; // { status: "success", token: "..." }
  },

  // Face Recognition Login Authentication
  async faceLogin(email, livePhoto) {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('livePhoto', livePhoto, livePhoto.name || 'live-capture.jpg');

    const res = await fetch(`${BACKEND_URL}/auth/face-login`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json().catch(() => ({ status: 'error', message: 'Face verification failed' }));
    if (!res.ok || data.status === 'error') {
      throw new Error(data.message || 'Face verification failed. Please try again.');
    }
    return data; // { status: "success", token: "...", username: "...", role: "...", ... }
  },

  // Check if backend is reachable
  async checkBackend() {
    try {
      const res = await fetch(`${BACKEND_URL}/public/home`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
};

/* ----------------------------------------------------
   DOCUMENT & SECURITY PIPELINE API (Spring Boot /api)
---------------------------------------------------- */
export const docApi = {
  // Upload document with metadata
  async upload(file, { caseId = 'CASE-2026-001', documentType = 'FIR', classification = 'CONFIDENTIAL', uploadedBy = 'OFFICER-A' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('documentType', documentType);
    formData.append('classification', classification);
    formData.append('uploadedBy', uploadedBy);

    const res = await apiFetch(`${BACKEND_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      let errMsg = 'Document upload & encryption failed';
      try {
        const err = await res.json();
        errMsg = err.message || err.error || errMsg;
      } catch {
        try {
          const txt = await res.text();
          if (txt && txt.length < 250) errMsg = txt;
        } catch (_) {}
      }
      throw new Error(errMsg);
    }
    return await res.json();
  },

  // Upload new document version
  async uploadVersion(documentId, file, { uploadedBy = 'OFFICER-A' } = {}) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', uploadedBy);

    const res = await apiFetch(`${BACKEND_URL}/api/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      let errMsg = 'Version upload failed';
      try {
        const err = await res.json();
        errMsg = err.message || err.error || errMsg;
      } catch {
        try {
          const txt = await res.text();
          if (txt && txt.length < 250) errMsg = txt;
        } catch (_) {}
      }
      throw new Error(errMsg);
    }
    return await res.json();
  },

  // Fetch all documents from backend
  async getAll() {
    const res = await apiFetch(`${BACKEND_URL}/api/documents`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch documents from vault');
    return await res.json();
  },

  // Get document details and version tree
  async getById(id) {
    const res = await apiFetch(`${BACKEND_URL}/api/documents/${id}`, { method: 'GET' });
    if (!res.ok) throw new Error(`Document ${id} not found`);
    return await res.json();
  },

  // Verify document security (KMS, SHA-256, RSA-PSS signature, ClamAV)
  async verify(id, version = null) {
    const url = version 
      ? `${BACKEND_URL}/api/documents/${id}/verify?version=${version}`
      : `${BACKEND_URL}/api/documents/${id}/verify`;
    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Document verification check failed');
    return await res.json();
  },

  // Download decrypted document
  async downloadBlob(id, version = null, userId = 'OFFICER-A') {
    const url = version 
      ? `${BACKEND_URL}/api/documents/${id}/versions/${version}/download?userId=${encodeURIComponent(userId)}`
      : `${BACKEND_URL}/api/documents/${id}/download?userId=${encodeURIComponent(userId)}`;
    
    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Decryption & download failed from vault');
    
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition');
    let filename = `Document-${id}.pdf`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const sha256 = res.headers.get('X-DMS-SHA256');
    const integrity = res.headers.get('X-DMS-Integrity-Verified');
    const sigValid = res.headers.get('X-DMS-Signature-Valid');

    // Trigger browser download
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);

    return { filename, sha256, integrity, sigValid };
  },

  // Get dynamic viewing session with watermark metadata & forensic audit record
  async getViewSession(id, version = null) {
    const url = version
      ? `${BACKEND_URL}/api/documents/${id}/view-session?version=${version}`
      : `${BACKEND_URL}/api/documents/${id}/view-session`;
    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message || 'Failed to initialize secure viewing session');
    }
    return await res.json();
  },

  // Get preview blob for in-browser rendering
  async getPreviewBlob(id, version = null) {
    const url = version
      ? `${BACKEND_URL}/api/documents/${id}/preview?version=${version}`
      : `${BACKEND_URL}/api/documents/${id}/preview`;
    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) {
      throw new Error('Failed to retrieve document preview from vault');
    }
    const blob = await res.blob();
    const mimeType = res.headers.get('content-type') || blob.type || 'application/pdf';
    const sha256 = res.headers.get('X-DMS-SHA256');
    const integrity = res.headers.get('X-DMS-Integrity-Verified');
    const sigValid = res.headers.get('X-DMS-Signature-Valid');
    return { blob, mimeType, sha256, integrity, sigValid };
  },

  // Get audit logs
  async getAuditLogs(documentId = null, caseId = null) {
    let url = `${BACKEND_URL}/api/audit-logs`;
    const params = new URLSearchParams();
    if (documentId) params.append('documentId', documentId);
    if (caseId) params.append('caseId', caseId);
    if (params.toString()) url += `?${params.toString()}`;

    const res = await apiFetch(url, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to retrieve audit trail');
    return await res.json();
  },

  // Reset database & storage
  async resetSystem() {
    const res = await apiFetch(`${BACKEND_URL}/api/test/reset`, { method: 'POST' });
    if (!res.ok) throw new Error('System reset failed');
    return await res.json();
  },

  // Request access to a document: POST /api/documents/{documentId}/access/request
  async requestAccess(documentId, optionsOrPermission = {}, reasonArg = '') {
    if (!documentId) throw new Error('documentId is required');
    let permission = 'VIEW';
    let reason = '';

    if (typeof optionsOrPermission === 'string') {
      const upper = optionsOrPermission.toUpperCase();
      if (['VIEW', 'DOWNLOAD', 'UPLOAD', 'EDIT', 'SHARE', 'DELETE'].includes(upper)) {
        permission = upper;
        if (typeof reasonArg === 'string') reason = reasonArg;
      } else {
        reason = optionsOrPermission;
      }
    } else if (optionsOrPermission && typeof optionsOrPermission === 'object') {
      if (optionsOrPermission.permission) permission = String(optionsOrPermission.permission).toUpperCase();
      if (optionsOrPermission.reason) reason = String(optionsOrPermission.reason);
    }

    const res = await apiFetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(documentId)}/access/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permission, reason })
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || 'Failed to request document access');
    }

    return await res.json();
  },

  // Get access requests for a document: GET /api/documents/{documentId}/access/requests
  async getAccessRequests(documentId) {
    if (!documentId) throw new Error('documentId is required');
    const res = await apiFetch(`${BACKEND_URL}/api/documents/${encodeURIComponent(documentId)}/access/requests`, {
      method: 'GET'
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || 'Failed to fetch document access requests');
    }

    return await res.json();
  },

  // Review a document access request: PUT /api/documents/access/requests/{requestId}?approved=true/false
  async reviewAccessRequest(requestId, approved) {
    if (requestId === undefined || requestId === null) throw new Error('requestId is required');
    const isApproved = Boolean(approved);
    const res = await apiFetch(`${BACKEND_URL}/api/documents/access/requests/${encodeURIComponent(requestId)}?approved=${isApproved}`, {
      method: 'PUT'
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || `Failed to ${isApproved ? 'approve' : 'reject'} document access request`);
    }

    return await res.json();
  }
};

/* ----------------------------------------------------
   CASE ACCESS / ASSESSMENT LIST API
---------------------------------------------------- */
export const caseApi = {
  async getAll() {
    const res = await apiFetch(`${BACKEND_URL}/api/cases`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to fetch assessment cases');
    return await res.json();
  },

  async create({ caseNumber, title, description, createdBy }) {
    const res = await apiFetch(`${BACKEND_URL}/api/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseNumber, title, description, createdBy })
    });

    if (!res.ok) {
      const error = await res.text().catch(() => '');
      throw new Error(error || 'Failed to create case');
    }

    return await res.json();
  },

  // Request access to a case: POST /api/cases/{caseNumber}/access/request
  async requestAccess(caseNumber, reasonOrBody = {}) {
    if (!caseNumber) throw new Error('caseNumber is required');
    const body = typeof reasonOrBody === 'string'
      ? { reason: reasonOrBody }
      : (reasonOrBody || {});

    const res = await apiFetch(`${BACKEND_URL}/api/cases/${encodeURIComponent(caseNumber)}/access/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: body.reason || '',
        requestedUserId: body.requestedUserId,
        requestedBy: body.requestedBy
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || 'Failed to request case access');
    }

    return await res.json();
  },

  // Get access requests for a case: GET /api/cases/{caseNumber}/access/requests
  async getAccessRequests(caseNumber) {
    if (!caseNumber) throw new Error('caseNumber is required');
    const res = await apiFetch(`${BACKEND_URL}/api/cases/${encodeURIComponent(caseNumber)}/access/requests`, {
      method: 'GET'
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || 'Failed to fetch case access requests');
    }

    return await res.json();
  },

  // Review a case access request: PUT /api/cases/access/requests/{requestId}?approved=true/false
  async reviewAccessRequest(requestId, approved) {
    if (requestId === undefined || requestId === null) throw new Error('requestId is required');
    const isApproved = Boolean(approved);
    const res = await apiFetch(`${BACKEND_URL}/api/cases/access/requests/${encodeURIComponent(requestId)}?approved=${isApproved}`, {
      method: 'PUT'
    });

    if (!res.ok) {
      const err = await res.json().catch(async () => {
        const text = await res.text().catch(() => '');
        return text ? { message: text } : null;
      });
      throw new Error(err?.message || err?.error || `Failed to ${isApproved ? 'approve' : 'reject'} case access request`);
    }

    return await res.json();
  }
};

/* ----------------------------------------------------
   ACCESS REQUESTS API (Unified Service for Cases & Documents)
---------------------------------------------------- */
export const accessApi = {
  // Case Access Requests
  requestCaseAccess: (caseNumber, body) => caseApi.requestAccess(caseNumber, body),
  getCaseAccessRequests: (caseNumber) => caseApi.getAccessRequests(caseNumber),
  reviewCaseAccessRequest: (requestId, approved) => caseApi.reviewAccessRequest(requestId, approved),

  // Document Access Requests
  requestDocumentAccess: (documentId, options, reason) => docApi.requestAccess(documentId, options, reason),
  getDocumentAccessRequests: (documentId) => docApi.getAccessRequests(documentId),
  reviewDocumentAccessRequest: (requestId, approved) => docApi.reviewAccessRequest(requestId, approved)
};

/* ----------------------------------------------------
   MOCK / STATUTORY REFERENCE DATASETS
   (For cases, timeline, custody, intelligence graph, BSA certs)
---------------------------------------------------- */
export const cases = [
  {
    id: 'CASE-2026-001',
    firNumber: 'FIR/SE/2026/0087',
    title: 'Vehicle Theft & Organized Interstate Crime',
    status: 'Active',
    priority: 'High',
    officer: 'Aarav Mehta',
    unit: 'Cyber Crime Cell',
    updated: '12 min ago',
    docs: 18,
    evidence: 42,
    location: 'New Delhi (Saket Jurisdiction)',
    sections: 'BNS 303(2), 317(2), BNSS 173, 230',
    dateOpened: '18 Aug 2026',
    classification: 'Confidential · High Priority',
    complainant: 'State (Suo Moto / PCR Call #9921)',
    accused: 'R. Kapoor (Prime), V. Singhania (Conspirator)',
    summary: 'Interstate vehicle theft syndicate utilizing high-tech CAN-bus key spoofers and forged registration certificates. Seized CCTV footage, electronic control modules, and fake transit permits.'
  },
  {
    id: 'CASE-2026-004',
    firNumber: 'FIR/MH/2026/0142',
    title: 'Financial Fraud & Multi-State Ponzi Network',
    status: 'Under review',
    priority: 'Medium',
    officer: 'Priya Shah',
    unit: 'Economic Offences Wing',
    updated: '2 hr ago',
    docs: 31,
    evidence: 16,
    location: 'Mumbai (BKC Cyber PS)',
    sections: 'BNS 318(4), 336(3), IT Act 66D',
    dateOpened: '24 Jul 2026',
    classification: 'Confidential · Financial',
    complainant: 'Reserve Bank Cyber Cell',
    accused: 'FinTrust Holdings Ltd.',
    summary: 'Unauthorized digital lending application laundering proceeds via dummy shell companies and offshore cryptocurrency bridges.'
  },
  {
    id: 'CASE-2026-009',
    firNumber: 'FIR/KA/2026/0091',
    title: 'Digital Extortion & Deepfake Ransom Syndicate',
    status: 'Active',
    priority: 'Critical',
    officer: 'Rohan Iyer',
    unit: 'CID Cyber Crime Bengaluru',
    updated: 'Yesterday',
    docs: 12,
    evidence: 27,
    location: 'Bengaluru (Cyber Cell HQ)',
    sections: 'BNS 308(2), IT Act 66E, 67A',
    dateOpened: '01 Sep 2026',
    classification: 'Restricted · Special Investigation',
    complainant: 'Confidential Victim #04',
    accused: 'Unknown Handle @DarkVector_01',
    summary: 'Targeted spear-phishing and AI-generated video extortion network targeting senior public servants.'
  },
  {
    id: 'CASE-2026-015',
    firNumber: 'FIR/BR/2026/0055',
    title: 'Counterfeit Judicial Stamp & Document Forgery',
    status: 'Under review',
    priority: 'Low',
    officer: 'Sunil Verma',
    unit: 'Patna Special Task Force',
    updated: '3 days ago',
    docs: 9,
    evidence: 14,
    location: 'Patna (District Court PS)',
    sections: 'BNS 338, 340, 342',
    dateOpened: '12 Jun 2026',
    classification: 'Statutory Record',
    complainant: 'District Registrar',
    accused: 'M. K. Associates',
    summary: 'Fabrication of physical non-judicial e-stamp certificates using spoofed treasury verification server URLs.'
  }
];

export const documents = [
  {
    id: 'DOC-001',
    name: 'FIR_2026_001_Saket.pdf',
    type: 'First Information Report (BNSS Form 1)',
    size: '2.4 MB',
    uploaded: '03 Sep 2026, 09:42 IST',
    by: 'Aarav Mehta (IO)',
    hash: 'a84f93d3e11b4389f41a87e248b789a24564c76d29ef1982b8a1c97a89499c21',
    verified: true,
    version: 'v3',
    minioPath: 's3://nyayasetu-vault/CASE-2026-001/DOC-001/v3/original.enc',
    cipher: 'AES-256-GCM (KMS Envelope)',
    pkiSigner: 'CN=Aarav Mehta (IO-CC-0442), O=Delhi Police, C=IN',
    redactionReady: true,
    sec63Ready: true,
    pageCount: 6,
    malkhanaRef: 'MKH-2026-SKT-00892',
    versions: [
      { v: 'v3', date: '03 Sep 2026, 09:42 IST', by: 'Aarav Mehta (IO)', hash: 'a84f93d3...9c21', note: 'Witness supplement annexure attached and digitally signed.', certValid: true },
      { v: 'v2', date: '02 Sep 2026, 16:03 IST', by: 'Aarav Mehta (IO)', hash: 'c62a8819...1104', note: 'Added vehicle engine number verification memo.', certValid: true },
      { v: 'v1', date: '18 Aug 2026, 11:15 IST', by: 'Duty Officer PS Saket', hash: '4f11e990...8a90', note: 'Initial computerized FIR entry under BNSS Section 173.', certValid: true }
    ]
  },
  {
    id: 'DOC-002',
    name: 'CCTV_Footage_Gate_A_Toll.mp4',
    type: 'Video Evidence (Digital Artifact)',
    size: '84.7 MB',
    uploaded: '02 Sep 2026, 18:20 IST',
    by: 'Rohan Iyer (Tech Sub-Inspector)',
    hash: '7d19e0bca41852c9918732049e6f241a319f09184511abce470129bc88e01492',
    verified: true,
    version: 'v1',
    minioPath: 's3://nyayasetu-vault/CASE-2026-001/DOC-002/v1/original.enc',
    cipher: 'ChaCha20-Poly1305 (GovHSM Key #09)',
    pkiSigner: 'CN=Rohan Iyer (SI-CC-1190), O=Delhi Police, C=IN',
    redactionReady: false,
    sec63Ready: true,
    pageCount: 1,
    malkhanaRef: 'MKH-2026-SKT-00893',
    versions: [
      { v: 'v1', date: '02 Sep 2026, 18:20 IST', by: 'Rohan Iyer (Tech SI)', hash: '7d19e0bc...1492', note: 'Bit-stream image clone extracted directly from Hikvision DVR.', certValid: true }
    ]
  },
  {
    id: 'DOC-003',
    name: 'Seizure_Memo_17_Vehicle_ECM.pdf',
    type: 'Seizure Memo (BNSS Section 105)',
    size: '1.1 MB',
    uploaded: '02 Sep 2026, 16:03 IST',
    by: 'Aarav Mehta (IO)',
    hash: 'c62a9810411a774910398bcda45e22981bfa009485712ef90184c62a11049281',
    verified: true,
    version: 'v2',
    minioPath: 's3://nyayasetu-vault/CASE-2026-001/DOC-003/v2/original.enc',
    cipher: 'AES-256-GCM (KMS Envelope)',
    pkiSigner: 'CN=Aarav Mehta (IO-CC-0442), O=Delhi Police, C=IN',
    redactionReady: true,
    sec63Ready: true,
    pageCount: 3,
    malkhanaRef: 'MKH-2026-SKT-00894',
    versions: [
      { v: 'v2', date: '02 Sep 2026, 16:03 IST', by: 'Aarav Mehta (IO)', hash: 'c62a9810...9281', note: 'Independent panchas signatures cryptographically validated.', certValid: true },
      { v: 'v1', date: '20 Aug 2026, 14:30 IST', by: 'HC Vikram Singh', hash: '88219af0...3341', note: 'Field memo scan.', certValid: true }
    ]
  },
  {
    id: 'DOC-004',
    name: 'FSL_Forensic_Report_889_CANBus.pdf',
    type: 'FSL Forensic Report (BSA Section 39)',
    size: '6.8 MB',
    uploaded: '01 Sep 2026, 13:12 IST',
    by: 'Dr. N. Bhatia (FSL North)',
    hash: '19ab481029df4821a8849bca5940173b22019485712ef8919ab2f7a948219014',
    verified: true,
    version: 'v1',
    minioPath: 's3://nyayasetu-vault/CASE-2026-001/DOC-004/v1/original.enc',
    cipher: 'AES-256-GCM (GovCloud KMS)',
    pkiSigner: 'CN=Dr. N. Bhatia (SSO-FSL-DEL), O=Forensic Science Lab Rohini, C=IN',
    redactionReady: true,
    sec63Ready: true,
    pageCount: 14,
    malkhanaRef: 'MKH-2026-SKT-00895',
    versions: [
      { v: 'v1', date: '01 Sep 2026, 13:12 IST', by: 'Dr. N. Bhatia (FSL North)', hash: '19ab4810...9014', note: 'Final digital forensic extraction & microcontroller firmware dump.', certValid: true }
    ]
  },
  {
    id: 'DOC-005',
    name: 'Call_Detail_Record_Suspect_Kapoor.csv',
    type: 'Telecom CDR Analysis',
    size: '3.9 MB',
    uploaded: '31 Aug 2026, 11:45 IST',
    by: 'Cyber Cell Analysis Desk',
    hash: '55bc981249fa118239487192834bbaaeec019485712ef9019918bcde44120912',
    verified: true,
    version: 'v1',
    minioPath: 's3://nyayasetu-vault/CASE-2026-001/DOC-005/v1/original.enc',
    cipher: 'AES-256-GCM (GovCloud KMS)',
    pkiSigner: 'CN=Cyber Cell Analysis Gateway, O=Delhi Police, C=IN',
    redactionReady: true,
    sec63Ready: true,
    pageCount: 1,
    malkhanaRef: 'MKH-2026-SKT-00896',
    versions: [
      { v: 'v1', date: '31 Aug 2026, 11:45 IST', by: 'Cyber Cell Gateway', hash: '55bc9812...0912', note: 'Statutory CDR intake from Nodal Agency under Sec 94 BNSS.', certValid: true }
    ]
  }
];

export const caseEvidence = [
  { id: 'EV-8841', name: 'Seized Mahindra Scorpio ECM Module', type: 'Physical Electronic', status: 'Sealed in Malkhana', hash: '992a88bf102488a0bc9918bcde44120912a8849bca5940173b22019485712ef8', barcode: 'BC-2026-8841', date: '20 Aug 2026', fslRef: 'FSL-2026-PHY-091', custodian: 'HC Vikram Singh' },
  { id: 'EV-8842', name: 'Samsung Galaxy S24 (Suspect Kapoor)', type: 'Digital Storage', status: 'In FSL Examination', hash: '11fe901455bc981249fa118239487192834bbaaeec019485712ef9019918bcde', barcode: 'BC-2026-8842', date: '20 Aug 2026', fslRef: 'FSL-2026-DIG-114', custodian: 'Dr. N. Bhatia' },
  { id: 'EV-8843', name: 'Hikvision 4TB Surveillance DVR', type: 'Digital Video Storage', status: 'Verified & Imaged', hash: '7d19e0bca41852c9918732049e6f241a319f09184511abce470129bc88e01492', barcode: 'BC-2026-8843', date: '21 Aug 2026', fslRef: 'FSL-2026-DIG-115', custodian: 'Rohan Iyer (Tech SI)' },
  { id: 'EV-8844', name: 'CAN-bus Key Programmer Hardware Device', type: 'Cyber Intrusion Tool', status: 'Forensically Analyzed', hash: '33cc91824f11e9908849bca5940173b22019485712ef9019918bcde44120912a', barcode: 'BC-2026-8844', date: '22 Aug 2026', fslRef: 'FSL-2026-CYB-008', custodian: 'Dr. N. Bhatia' }
];

export const caseTimeline = [
  { date: '18 Aug 2026 · 09:30 IST', title: 'FIR Registered', desc: 'Electronic FIR registered under Sections 303(2) & 317(2) BNS at PS Saket.', by: 'Inspector Aarav Mehta', stage: 'Registration' },
  { date: '20 Aug 2026 · 14:15 IST', title: 'Vehicle Interception & Seizure', desc: 'Suspect vehicle intercepted at Saket Ring Road. ECM and fake plates seized under BNSS Sec 105.', by: 'Team Cyber Cell', stage: 'Investigation' },
  { date: '22 Aug 2026 · 10:00 IST', title: 'Evidence Transfer to FSL Rohini', desc: 'Digital drives & ECM handed over under formal chain-of-custody seal #MKH-884.', by: 'HC Vikram Singh', stage: 'Forensic Lab' },
  { date: '01 Sep 2026 · 13:12 IST', title: 'FSL Digital Report Received', desc: 'CAN-bus key spoofing firmware dumped. SHA-256 integrity verified.', by: 'Dr. N. Bhatia', stage: 'Forensic Lab' },
  { date: '03 Sep 2026 · 09:42 IST', title: 'Section 63 BSA Admissibility Check', desc: 'All digital records validated against hardware MAC & PKI certs. Ready for charge sheet.', by: 'Aarav Mehta', stage: 'Judicial Prep' }
];

export const caseMembers = [
  { name: 'Aarav Mehta', role: 'Investigating Officer', unit: 'Cyber Crime Cell', clearance: 'Lead Officer (Tier 1)', phone: '+91-11-2345-0442', email: 'aarav.mehta@delhipolice.gov.in' },
  { name: 'Rohan Iyer', role: 'Technical Sub-Inspector', unit: 'Digital Forensics Unit', clearance: 'Technical Operator (Tier 2)', phone: '+91-11-2345-1190', email: 'rohan.iyer@delhipolice.gov.in' },
  { name: 'Dr. N. Bhatia', role: 'Forensic Examiner', unit: 'FSL Rohini', clearance: 'Scientific Officer (Tier 2)', phone: '+91-11-2755-0891', email: 'n.bhatia@fsl.delhi.gov.in' },
  { name: 'Priya Shah', role: 'Chief Prosecutor', unit: 'Directorate of Prosecution', clearance: 'Judicial Counsel (Tier 1)', phone: '+91-11-2338-1189', email: 'priya.shah@prosecution.gov.in' },
  { name: 'HC Vikram Singh', role: 'Malkhana Custodian', unit: 'PS Saket Vault', clearance: 'Evidence Officer (Tier 2)', phone: '+91-11-2656-8812', email: 'malkhana.saket@delhipolice.gov.in' }
];

export const auditEvents = [
  { id: 'AUD-9912', action: 'Section 63 BSA Certificate exported', subject: 'FIR_2026_001_Saket.pdf', actor: 'Aarav Mehta (IO)', time: 'Just now', icon: 'badge-check', ip: '10.24.8.61', hash: 'e49a88219af03341', category: 'Compliance' },
  { id: 'AUD-9911', action: 'Document viewed (Watermark Active)', subject: 'FIR_2026_001_Saket.pdf', actor: 'Aarav Mehta (IO)', time: '3 min ago', icon: 'eye', ip: '10.24.8.61', hash: '88b199c411fe9014', category: 'Access' },
  { id: 'AUD-9910', action: 'SHA-256 hash verified against MinIO S3', subject: 'Seizure_Memo_17_Vehicle_ECM.pdf', actor: 'System Verification Engine', time: '8 min ago', icon: 'check', ip: '10.24.0.1', hash: 'c62a9810411a7749', category: 'Security' },
  { id: 'AUD-9909', action: 'Envelope encrypted & uploaded to S3', subject: 'FIR_2026_001_Saket.pdf (v3)', actor: 'Aarav Mehta (IO)', time: '14 min ago', icon: 'upload', ip: '10.24.8.61', hash: 'a84f93d3e11b4389', category: 'Ingestion' },
  { id: 'AUD-9908', action: 'MFA login successful (Biometric + OTP)', subject: 'Investigating Officer Portal', actor: 'Aarav Mehta (IO)', time: '26 min ago', icon: 'lock', ip: '10.24.8.61', hash: '12a977b255bc9812', category: 'Auth' },
  { id: 'AUD-9907', action: 'Section 230 BNSS Redacted link generated', subject: 'FIR_2026_001_Saket.pdf', actor: 'Priya Shah (Prosecutor)', time: 'Yesterday 17:40', icon: 'share', ip: '10.24.12.104', hash: '7f9111aa992a88bf', category: 'Disclosure' },
  { id: 'AUD-9906', action: 'Evidence Seal Handover: Malkhana -> FSL', subject: 'EV-8841 (Scorpio ECM Module)', actor: 'HC Vikram Singh', time: '29 Aug 2026', icon: 'shield', ip: '10.24.4.15', hash: '992a88bf102488a0', category: 'Custody' }
];

export const custody = [
  { place: 'Malkhana Vault, PS Saket', action: 'Physical evidence sealed & barcode generated under BNSS Sec 105', by: 'HC Vikram Singh (Malkhana In-Charge)', badge: 'DL-POL-8812', time: '20 Aug 2026 · 15:40 IST', status: 'Complete', sealHash: 'SHA256: 992a88...441f', cert: 'SEAL-MKH-00892' },
  { place: 'Special Transit Vehicle #DL1C-9901', action: 'Dispatched in GPS-monitored tamper bag #TB-449', by: 'Constable Manoj Kumar', badge: 'DL-POL-3329', time: '22 Aug 2026 · 09:15 IST', status: 'Complete', sealHash: 'SHA256: 771e44...8821', cert: 'TRANSIT-GPS-9901' },
  { place: 'Forensic Science Laboratory (FSL), Rohini', action: 'Digital bit-stream extraction & firmware dump completed', by: 'Dr. N. Bhatia (Senior Scientific Officer)', badge: 'FSL-DEL-089', time: '29 Aug 2026 · 11:30 IST', status: 'Complete', sealHash: 'SHA256: 19ab48...9014', cert: 'FSL-DIG-2026-889' },
  { place: 'Investigating Officer Custody Desk', action: 'FSL certified digital copy verified & signed into case dossier', by: 'Inspector Aarav Mehta (IO)', badge: 'DL-POL-0442', time: '02 Sep 2026 · 18:20 IST', status: 'Complete', sealHash: 'SHA256: a84f93...9c21', cert: 'IO-VERIF-0442' },
  { place: 'Saket District Court (Courtroom 4)', action: 'Submitting statutory electronic record u/s 63 BSA for framing of charges', by: 'Priya Shah (Public Prosecutor)', badge: 'DL-JUD-1189', time: 'Pending Court Hearing (08 Sep 2026)', status: 'Pending', sealHash: 'Awaiting Registrar Seal', cert: 'COURT-FILING-PENDING' }
];

export const intelligenceEntities = [
  { id: 'case', label: 'CASE-2026-001', type: 'case', sub: 'Primary Investigation', score: '100%', details: 'Interstate vehicle theft & key spoofing network.', ip: 'Central Node', icon: 'shield' },
  { id: 'suspect_1', label: 'R. Kapoor', type: 'suspect', sub: 'Prime Accused · 94% match', score: '94%', details: 'Arrested on 20 Aug 2026 at Saket Ring Road. Prior history of electronic immobilizer hacking.', icon: 'user' },
  { id: 'suspect_2', label: 'V. Singhania', type: 'suspect', sub: 'Forged Document Broker · 78%', score: '78%', details: 'Procured fake NoC stamps and duplicate chassis number plates.', icon: 'user' },
  { id: 'vehicle_1', label: 'White Scorpio (DL3CAX4891)', type: 'vehicle', sub: 'Seized Vehicle · 88% Match', score: '88%', details: 'Altered chassis number CH-99018. Fake registration recovered.', icon: 'truck' },
  { id: 'location_1', label: 'Toll Gate A (Saket Expy)', type: 'location', sub: 'CCTV Captured · 82% Geo-link', score: '82%', details: 'High-speed transit captured at 03:14 AM on 18 Aug 2026.', icon: 'map-pin' },
  { id: 'location_2', label: 'Rohini Sector 18 Safehouse', type: 'location', sub: 'Raid Location · 76% Link', score: '76%', details: 'Key programmer hardware & 14 blank smart keys recovered here.', icon: 'map-pin' },
  { id: 'device_1', label: 'CAN-bus Key Programmer', type: 'device', sub: 'Hardware Tool · 99%', score: '99%', details: 'OBD-II port bypass module configured for Mahindra/Tata vehicles.', icon: 'cpu' },
  { id: 'phone_1', label: '+91-98765-43210 (Kapoor)', type: 'phone', sub: 'CDR Geolocation Match · 91%', score: '91%', details: 'Tower ping within 200m of Toll Gate A at incident timestamp.', icon: 'phone' },
  { id: 'doc_1', label: 'FIR_2026_001_Saket.pdf', type: 'document', sub: 'Statutory FIR · Verified', score: '100%', details: 'Initial report and search seizure records.', icon: 'file' },
  { id: 'doc_2', label: 'FSL_Report_889.pdf', type: 'document', sub: 'Forensic Proof · 98%', score: '98%', details: 'Firmware dump confirming cryptographic immobilizer key spoof.', icon: 'file' }
];

export const pipeline = [
  { name: 'Select File', desc: 'Secure local stream buffer' },
  { name: 'Malware Scan', desc: 'ClamAV & Threat Engine (Zero Trust)' },
  { name: 'SHA-256 Hash', desc: 'Cryptographic digest computation' },
  { name: 'Digital Sign', desc: 'X.509 PKI Signature (e-Sign RSA-PSS)' },
  { name: 'Envelope Encrypt', desc: 'AES-256-GCM + RSA KEK/DEK wrapping' },
  { name: 'Object Storage', desc: 'MinIO / S3 distributed encrypted bucket' },
  { name: 'DB Metadata', desc: 'Immutable MySQL audit ledger commit' }
];

export function createMockJwt(user = currentUser) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.badge || user.username || 'DL-POL-0442',
    name: user.name || (user.firstName ? `${user.firstName} ${user.lastName}` : 'Officer'),
    role: user.title || user.position || 'Investigating Officer',
    unit: user.unit || 'Cyber Crime Cell',
    clearance: user.clearance || 'Tier 1 (Full Operational)',
    permissions: user.permissions || ['view', 'upload', 'verify', 'share_sec230', 'export_sec63', 'audit_full'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
    iss: 'https://auth.nyayasetu.gov.in'
  }));
  return `${header}.${payload}.c8f190e39281a94821a8849bca5940173b`;
}

export function searchDocuments(query) {
  if (!query || query.trim() === '') return [];
  const q = query.toLowerCase();
  return documents
    .map((doc, i) => {
      let scoreNum = 95 - i * 6;
      let reason = 'Direct term match in document metadata and encrypted OCR index.';
      if (q.includes('vehicle') || q.includes('theft') || q.includes('scorpio')) {
        if (doc.id === 'DOC-001' || doc.id === 'DOC-003') scoreNum = 98 - i * 2;
        reason = 'Matched vehicle registration, chassis verification, and seizure clauses.';
      } else if (q.includes('cctv') || q.includes('gate') || q.includes('video') || q.includes('toll')) {
        if (doc.id === 'DOC-002') scoreNum = 99;
        reason = 'Matched video timestamp, ANPR plate recognition at Saket Expressway Gate A.';
      } else if (q.includes('fsl') || q.includes('forensic') || q.includes('can') || q.includes('key')) {
        if (doc.id === 'DOC-004') scoreNum = 97;
        reason = 'Matched microcontroller binary dump, OBD-II key spoof analysis.';
      } else if (q.includes('cdr') || q.includes('phone') || q.includes('call') || q.includes('kapoor')) {
        if (doc.id === 'DOC-005') scoreNum = 96;
        reason = 'Matched tower triangulation data and call logs u/s 94 BNSS.';
      }

      return {
        ...doc,
        score: `${scoreNum}%`,
        snippet: `[BNSS/BSA Verified Evidence] Extracted paragraph from ${doc.name} — ${reason} Authenticated with SHA-256 (${doc.hash.substring(0, 16)}...) and stored under envelope cipher.`,
        statuteCitation: 'Compliant with Bharatiya Sakshya Adhiniyam (BSA, 2023) § 63 & BNSS § 173'
      };
    })
    .sort((a, b) => parseInt(b.score) - parseInt(a.score));
}

export function generateSection63Certificate(docId = 'DOC-001') {
  const doc = documents.find(d => d.id === docId) || documents[0];
  const now = new Date();
  return {
    certificateId: `BSA-SEC63-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
    caseId: 'CASE-2026-001',
    firNumber: 'FIR/SE/2026/0087',
    documentName: doc.name,
    documentType: doc.type,
    sha256Hash: doc.hash,
    generatedAt: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    signerName: currentUser.name,
    signerRole: currentUser.title,
    signerUnit: currentUser.unit,
    signerBadge: currentUser.badge,
    pkiCertificateSerial: 'IN-GOV-CCA-8849-2026-9901',
    sourceDeviceUUID: 'CC-SD-0442-LINUX-SEC',
    sourceMAC: '00:1A:2B:8C:4D:5E',
    sourceIp: currentUser.ip,
    storageBucket: doc.minioPath,
    malkhanaRef: doc.malkhanaRef,
    statutoryDeclaration: 'I, ' + currentUser.name + ', ' + currentUser.title + ', hereby certify in terms of Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023 that the electronic record identified herein was produced by computer/storage systems during regular lawful duty, that the integrity of the data has been preserved without unauthorized alteration, and that the cryptographic SHA-256 digest precisely matches the authentic digital master.'
  };
}

export function generateSection230DisclosureLink(docId = 'DOC-001', options = {}) {
  const token = 'sec230_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const expires = new Date(Date.now() + (options.hours || 48) * 3600 * 1000);
  return {
    disclosureToken: token,
    url: `https://secure.nyayasetu.gov.in/disclose/sec230/${token}`,
    expiresAt: expires.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
    expiresInHours: options.hours || 48,
    redactedFields: [
      'Witness A: Personal Contact & Address (Blacked Out)',
      'Undercover Operative ID (Redacted)',
      'Informant Vehicle Registration (Scrambled)',
      'Victim Bank Account Numbers (Masked XXXX-1942)'
    ],
    watermarkApplied: 'DEFENSE DISCLOSURE COPY — U/S 230 BNSS — VIEW ONLY — EXPIRING',
    caseId: 'CASE-2026-001',
    docId
  };
}

export const mockApi = {
  getCases: () => cases,
  getCaseById: (id) => cases.find(c => c.id === id) || cases[0],
  getDocuments: () => documents,
  getDocumentById: (id) => documents.find(d => d.id === id) || documents[0],
  getEvidence: () => caseEvidence,
  getTimeline: () => caseTimeline,
  getMembers: () => caseMembers,
  getAudit: () => auditEvents,
  getCustody: () => custody,
  getIntelligence: () => intelligenceEntities,
  searchDocuments,
  generateSection63Certificate,
  generateSection230DisclosureLink
};

export default mockApi;
