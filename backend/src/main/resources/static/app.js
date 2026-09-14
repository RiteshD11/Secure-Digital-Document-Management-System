const casesTableBody = document.getElementById('casesTableBody');
const documentsTableBody = document.getElementById('documentsTableBody');
const caseSearchInput = document.getElementById('caseSearch');
const documentSearchInput = document.getElementById('documentSearch');
const totalCasesEl = document.getElementById('totalCases');
const totalDocumentsEl = document.getElementById('totalDocuments');
const openCasesEl = document.getElementById('openCases');
const summaryTextEl = document.getElementById('summaryText');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');

let allCases = [];
let allDocuments = [];

const formatDate = (value) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const statusClass = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (['open', 'active', 'in_progress', 'in-progress'].includes(normalized)) {
    return 'status-open';
  }

  if (['closed', 'resolved', 'completed'].includes(normalized)) {
    return 'status-closed';
  }

  if (['pending', 'review'].includes(normalized)) {
    return 'status-pending';
  }

  return 'status-open';
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.remove('hidden');

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2200);
};

const renderCases = () => {
  const query = (caseSearchInput.value || '').trim().toLowerCase();

  const filteredCases = allCases.filter((item) => {
    const searchable = `${item.case_number || ''} ${item.title || ''}`.toLowerCase();
    return searchable.includes(query);
  });

  if (!filteredCases.length) {
    casesTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">No cases found.</td>
      </tr>
    `;
    return;
  }

  casesTableBody.innerHTML = filteredCases
    .map((item) => {
      const status = item.status || 'Open';
      return `
        <tr>
          <td>${item.case_number || '—'}</td>
          <td>${item.title || '—'}</td>
          <td>
            <span class="status-badge ${statusClass(status)}">${status}</span>
          </td>
          <td>${item.created_by || '—'}</td>
          <td>${formatDate(item.createdAt || item.created_at)}</td>
        </tr>
      `;
    })
    .join('');
};

const renderDocuments = () => {
  const query = (documentSearchInput.value || '').trim().toLowerCase();

  const filteredDocuments = allDocuments.filter((item) => {
    const searchable = `${item.documentId || ''} ${item.caseId || ''} ${item.documentType || ''} ${item.classification || ''}`.toLowerCase();
    return searchable.includes(query);
  });

  if (!filteredDocuments.length) {
    documentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">No documents found.</td>
      </tr>
    `;
    return;
  }

  documentsTableBody.innerHTML = filteredDocuments
    .map((item) => `
      <tr>
        <td>${item.documentId || item.id || '—'}</td>
        <td>${item.caseId || '—'}</td>
        <td>${item.documentType || item.type || '—'}</td>
        <td>${item.classification || '—'}</td>
        <td>${item.uploadedBy || item.uploaded_by || '—'}</td>
        <td>${formatDate(item.createdAt || item.created_at || item.uploadedAt)}</td>
      </tr>
    `)
    .join('');
};

const updateSummary = () => {
  totalCasesEl.textContent = allCases.length;
  totalDocumentsEl.textContent = allDocuments.length;
  openCasesEl.textContent = allCases.filter((item) => String(item.status || '').toLowerCase() !== 'closed').length;
  summaryTextEl.textContent = `${allCases.length} cases • ${allDocuments.length} docs`;
};

const loadData = async () => {
  try {
    const [casesResponse, documentsResponse] = await Promise.all([
      fetch('/api/cases'),
      fetch('/api/documents')
    ]);

    if (!casesResponse.ok || !documentsResponse.ok) {
      throw new Error('Failed to load assessment data.');
    }

    allCases = await casesResponse.json();
    allDocuments = await documentsResponse.json();

    updateSummary();
    renderCases();
    renderDocuments();
    showToast('Assessment data loaded.');
  } catch (error) {
    console.error(error);
    casesTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Unable to load the assessment list. Please check the backend API.</td>
      </tr>
    `;
    documentsTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">Unable to load the document list. Please check the backend API.</td>
      </tr>
    `;
    showToast('Failed to load assessment data.');
  }
};

caseSearchInput.addEventListener('input', renderCases);
documentSearchInput.addEventListener('input', renderDocuments);
refreshBtn.addEventListener('click', loadData);

loadData();
