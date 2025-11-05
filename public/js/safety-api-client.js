/**
 * Safety Office API Client
 * Frontend utility for interacting with safety backend APIs
 */

const API_BASE_URL = '/api/safety';

// ==================== GENERIC API HELPERS ====================

async function apiRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data && method !== 'GET') {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'API request failed');
    }
    
    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ==================== USC-SAFE ====================

async function saveUSCSafe(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/usc-safe/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/usc-safe', 'POST', payload);
  }
}

async function loadUSCSafe() {
  const result = await apiRequest('/usc-safe', 'GET');
  // Prefer the most recent record (or the single upserted record)
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteUSCSafe(recordId) {
  return await apiRequest(`/usc-safe/${recordId}`, 'DELETE');
}

// ==================== FIRE SAFETY ====================

async function saveFireSafety(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/fire/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/fire', 'POST', payload);
  }
}

async function loadFireSafety() {
  const result = await apiRequest('/fire', 'GET');
  const data = result.data || [];
  // If API returned SafetyFireSafety entries (FormData), parse latest and return single form object
  if (Array.isArray(data) && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'FormData')) {
    try { return JSON.parse(data[0].FormData); } catch { return data[0].FormData; }
  }
  // Else return structured rows array
  return data;
}

async function deleteFireSafety(recordId) {
  return await apiRequest(`/fire/${recordId}`, 'DELETE');
}

// ==================== ELECTRICAL SAFETY ====================

async function saveElectricalSafety(formData, recordId = null) {
  const payload = {
    formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };
  if (recordId) {
    return await apiRequest(`/electrical/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/electrical', 'POST', payload);
  }
}

async function loadElectricalSafety() {
  const result = await apiRequest('/electrical', 'GET');
  const data = result.data || [];
  if (Array.isArray(data) && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'FormData')) {
    try { return JSON.parse(data[0].FormData); } catch { return data[0].FormData; }
  }
  return data;
}

async function deleteElectricalSafety(recordId) {
  return await apiRequest(`/electrical/${recordId}`, 'DELETE');
}

// ==================== STRUCTURAL SAFETY ====================

async function saveStructuralSafety(formData, recordId = null) {
  const payload = {
    formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };
  if (recordId) {
    return await apiRequest(`/structural/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/structural', 'POST', payload);
  }
}

async function loadStructuralSafety() {
  const result = await apiRequest('/structural', 'GET');
  const data = result.data || [];
  if (Array.isArray(data) && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'FormData')) {
    try { return JSON.parse(data[0].FormData); } catch { return data[0].FormData; }
  }
  return data;
}

async function deleteStructuralSafety(recordId) {
  return await apiRequest(`/structural/${recordId}`, 'DELETE');
}

// ==================== HEALTH HAZARDS ====================

async function saveHealthHazards(formData, recordId = null) {
  const payload = {
    formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };
  if (recordId) {
    return await apiRequest(`/health/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/health', 'POST', payload);
  }
}

async function loadHealthHazards() {
  const result = await apiRequest('/health', 'GET');
  const data = result.data || [];
  if (Array.isArray(data) && data.length > 0 && Object.prototype.hasOwnProperty.call(data[0], 'FormData')) {
    try { return JSON.parse(data[0].FormData); } catch { return data[0].FormData; }
  }
  return data;
}

async function deleteHealthHazards(recordId) {
  return await apiRequest(`/health/${recordId}`, 'DELETE');
}

// ==================== GAS SAFETY ====================

async function saveGasSafety(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/gas/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/gas', 'POST', payload);
  }
}

async function loadGasSafety() {
  const result = await apiRequest('/gas', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteGasSafety(recordId) {
  return await apiRequest(`/gas/${recordId}`, 'DELETE');
}

// ==================== BOILER SAFETY ====================

async function saveBoilerSafety(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/boiler/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/boiler', 'POST', payload);
  }
}

async function loadBoilerSafety() {
  const result = await apiRequest('/boiler', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteBoilerSafety(recordId) {
  return await apiRequest(`/boiler/${recordId}`, 'DELETE');
}

// ==================== CONSULTANT ====================

async function saveConsultant(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/consultant/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/consultant', 'POST', payload);
  }
}

async function loadConsultant() {
  const result = await apiRequest('/consultant', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteConsultant(recordId) {
  return await apiRequest(`/consultant/${recordId}`, 'DELETE');
}

// ==================== DSA ====================

async function saveDSA(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/dsa/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/dsa', 'POST', payload);
  }
}

async function loadDSA() {
  const result = await apiRequest('/dsa', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteDSA(recordId) {
  return await apiRequest(`/dsa/${recordId}`, 'DELETE');
}

// ==================== EMERGENCY POWER ====================

async function saveEmergencyPower(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/emergency-power/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/emergency-power', 'POST', payload);
  }
}

async function loadEmergencyPower() {
  const result = await apiRequest('/emergency-power', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteEmergencyPower(recordId) {
  return await apiRequest(`/emergency-power/${recordId}`, 'DELETE');
}

// ==================== SAFETY TRAINING ====================

async function saveSafetyTraining(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/training/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/training', 'POST', payload);
  }
}

async function loadSafetyTraining() {
  const result = await apiRequest('/training', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteSafetyTraining(recordId) {
  return await apiRequest(`/training/${recordId}`, 'DELETE');
}

// ==================== UNGP ====================

async function saveUNGP(formData, recordId = null) {
  const payload = {
    formData: formData,
    createdBy: getCurrentUser(),
    tenantId: getTenantId()
  };

  if (recordId) {
    return await apiRequest(`/ungp/${recordId}`, 'PUT', payload);
  } else {
    return await apiRequest('/ungp', 'POST', payload);
  }
}

async function loadUNGP() {
  const result = await apiRequest('/ungp', 'GET');
  if (result.data && result.data.length > 0) {
    const rec = result.data[0];
    try { return JSON.parse(rec.FormData); } catch { return rec.FormData; }
  }
  return null;
}

async function deleteUNGP(recordId) {
  return await apiRequest(`/ungp/${recordId}`, 'DELETE');
}

// ==================== INCIDENTS ====================

async function saveIncident(incidentData, recordId = null) {
  if (recordId) {
    return await apiRequest(`/incidents/${recordId}`, 'PUT', incidentData);
  } else {
    return await apiRequest('/incidents', 'POST', incidentData);
  }
}

async function loadIncidents() {
  const result = await apiRequest('/incidents', 'GET');
  return result.data || [];
}

async function deleteIncident(recordId) {
  return await apiRequest(`/incidents/${recordId}`, 'DELETE');
}

// ==================== GRIEVANCES ====================

async function saveGrievance(grievanceData, recordId = null) {
  if (recordId) {
    return await apiRequest(`/grievances/${recordId}`, 'PUT', grievanceData);
  } else {
    return await apiRequest('/grievances', 'POST', grievanceData);
  }
}

async function loadGrievances() {
  const result = await apiRequest('/grievances', 'GET');
  return result.data || [];
}

async function deleteGrievance(recordId) {
  return await apiRequest(`/grievances/${recordId}`, 'DELETE');
}

// ==================== SAFETY AUDITS ====================

async function createAuditPlan(plan) {
  return await apiRequest('/audits', 'POST', plan);
}

async function searchAudits(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const endpoint = qs ? `/audits?${qs}` : '/audits';
  return await apiRequest(endpoint, 'GET');
}

async function getAuditDetails(auditId) {
  return await apiRequest(`/audits/${auditId}`, 'GET');
}

async function saveAuditItems(auditId, items) {
  return await apiRequest(`/audits/${auditId}/items`, 'POST', { items });
}

async function submitCorrectiveAction(auditId, itemId, data) {
  return await apiRequest(`/audits/${auditId}/items/${itemId}/corrective-actions`, 'POST', data);
}

async function updateAuditStatus(auditId, payload) {
  return await apiRequest(`/audits/${auditId}/status`, 'PUT', payload);
}

// ==================== RFQ / QUOTES / INVOICE ====================

async function listUnits(tenantId = getTenantId()) {
  const res = await apiRequest(`/units?tenantId=${tenantId}`, 'GET');
  return res.data || [];
}

async function addUnit(name, tenantId = getTenantId()) {
  const res = await apiRequest('/units', 'POST', { tenantId, name });
  return res.id;
}

async function createRFQ(data) {
  return await apiRequest('/rfq', 'POST', data);
}

async function updateRFQ(id, data) {
  return await apiRequest(`/rfq/${id}`, 'PUT', data);
}

async function deleteRFQ(id) {
  return await apiRequest(`/rfq/${id}`, 'DELETE');
}

async function listRFQ(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/rfq${qs ? `?${qs}` : ''}`, 'GET');
}

async function listRFQByItem(auditItemId) {
  return await apiRequest(`/rfq/by-item/${auditItemId}`, 'GET');
}

async function submitQuote(rfqId, data) {
  return await apiRequest(`/rfq/${rfqId}/quotes`, 'POST', data);
}

async function listQuotes(rfqId) {
  return await apiRequest(`/rfq/${rfqId}/quotes`, 'GET');
}

async function approveQuote(quoteId, poNumber) {
  return await apiRequest(`/quotes/${quoteId}/approve`, 'PUT', { poNumber });
}

async function updateQuoteStatus(quoteId, status) {
  return await apiRequest(`/quotes/${quoteId}/status`, 'PUT', { status });
}

async function createInvoice(quoteId, payload) {
  return await apiRequest(`/quotes/${quoteId}/invoice`, 'POST', payload);
}

async function getInvoice(quoteId) {
  return await apiRequest(`/quotes/${quoteId}/invoice`, 'GET');
}

async function getQuoteStats(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/rfq/quote-stats${qs ? `?${qs}` : ''}`, 'GET');
}

// ==================== TRAINING SESSIONS ====================

async function listTrainingSessions(params={}){
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/training-sessions${qs?`?${qs}`:''}`, 'GET');
}
async function createTrainingSession(payload){
  return await apiRequest('/training-sessions','POST',payload);
}
async function getTrainingSession(id){
  return await apiRequest(`/training-sessions/${id}`,'GET');
}
async function updateTrainingSession(id,payload){
  return await apiRequest(`/training-sessions/${id}`,'PUT',payload);
}
async function deleteTrainingSession(id){
  return await apiRequest(`/training-sessions/${id}`,'DELETE');
}
async function saveTrainingAttendees(id, attendees){
  return await apiRequest(`/training-sessions/${id}/attendees`,'POST',{attendees});
}

// ==================== AI PROMPTS ====================

async function listPrompts(params={}){
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/ai/prompts${qs?`?${qs}`:''}`,'GET');
}
async function createPrompt(payload){
  return await apiRequest('/ai/prompts','POST',payload);
}
async function getPrompt(id){
  return await apiRequest(`/ai/prompts/${id}`,'GET');
}
async function updatePrompt(id,payload){
  return await apiRequest(`/ai/prompts/${id}`,'PUT',payload);
}
async function deletePrompt(id){
  return await apiRequest(`/ai/prompts/${id}`,'DELETE');
}

// ==================== ATTENDANCE ====================

async function listAttendanceBarcodes(params={}){
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/attendance/barcodes${qs?`?${qs}`:''}`,'GET');
}
async function saveAttendanceBarcode(payload){
  return await apiRequest('/attendance/barcodes','POST',payload);
}
async function deleteAttendanceBarcode(id){
  return await apiRequest(`/attendance/barcodes/${id}`,'DELETE');
}
async function postAttendanceLog(payload){
  return await apiRequest('/attendance/logs','POST',payload);
}
async function listAttendanceLogs(params={}){
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/attendance/logs${qs?`?${qs}`:''}`,'GET');
}
async function getAttendanceStatus(params={}){
  const qs = new URLSearchParams(params).toString();
  return await apiRequest(`/attendance/status${qs?`?${qs}`:''}`,'GET');
}

// ==================== UTILITY FUNCTIONS ====================

function getCurrentUser() {
  // Try to get user from session storage, local storage, or return default
  return sessionStorage.getItem('currentUser') || 
         localStorage.getItem('currentUser') || 
         'System User';
}

function getTenantId() {
  // Try to get tenant ID from session storage, local storage, or return default
  const tenantId = sessionStorage.getItem('tenantId') || 
                   localStorage.getItem('tenantId') || 
                   '1';
  return parseInt(tenantId);
}

function showSuccessMessage(message) {
  // Display success message to user (customize based on your UI framework)
  console.log('✅ Success:', message);
  // You can replace this with your toast/notification system
  if (window.showToast) {
    window.showToast(message, 'success');
  } else {
    alert(message);
  }
}

function showErrorMessage(message) {
  // Display error message to user (customize based on your UI framework)
  console.error('❌ Error:', message);
  // You can replace this with your toast/notification system
  if (window.showToast) {
    window.showToast(message, 'error');
  } else {
    alert('Error: ' + message);
  }
}

// ==================== FORM COLLECTION HELPERS ====================

/**
 * Collect all form data from a form element
 * @param {HTMLFormElement} formElement - The form element to collect data from
 * @returns {Object} Form data as key-value pairs
 */
function collectFormData(formElement) {
  const formData = {};
  const inputs = formElement.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    const name = input.name || input.id;
    if (!name) return;

    if (input.type === 'checkbox') {
      formData[name] = input.checked;
    } else if (input.type === 'radio') {
      if (input.checked) {
        formData[name] = input.value;
      }
    } else {
      formData[name] = input.value;
    }
  });

  return formData;
}

/**
 * Populate form fields with data
 * @param {HTMLFormElement} formElement - The form element to populate
 * @param {Object} data - Data to populate the form with
 */
function populateForm(formElement, data) {
  if (!data) return;

  Object.keys(data).forEach(key => {
    const input = formElement.querySelector(`[name="${key}"], #${key}`);
    if (!input) return;

    if (input.type === 'checkbox') {
      input.checked = data[key];
    } else if (input.type === 'radio') {
      const radio = formElement.querySelector(`[name="${key}"][value="${data[key]}"]`);
      if (radio) radio.checked = true;
    } else {
      input.value = data[key];
    }
  });
}

// ==================== EXPORTS ====================

// Make all functions available globally (for use in HTML onclick handlers)
if (typeof window !== 'undefined') {
  window.SafetyAPI = {
    // Generic helpers
    apiRequest,
    collectFormData,
    populateForm,
    showSuccessMessage,
    showErrorMessage,
    
    // USC-Safe
    saveUSCSafe,
    loadUSCSafe,
    deleteUSCSafe,
    
    // Fire Safety
    saveFireSafety,
    loadFireSafety,
    deleteFireSafety,
    
    // Electrical Safety
    saveElectricalSafety,
    loadElectricalSafety,
    deleteElectricalSafety,
    
    // Structural Safety
    saveStructuralSafety,
    loadStructuralSafety,
    deleteStructuralSafety,
    
    // Health Hazards
    saveHealthHazards,
    loadHealthHazards,
    deleteHealthHazards,
    
    // Gas Safety
    saveGasSafety,
    loadGasSafety,
    deleteGasSafety,
    
    // Boiler Safety
    saveBoilerSafety,
    loadBoilerSafety,
    deleteBoilerSafety,
    
    // Consultant
    saveConsultant,
    loadConsultant,
    deleteConsultant,
    
    // DSA
    saveDSA,
    loadDSA,
    deleteDSA,
    
    // Emergency Power
    saveEmergencyPower,
    loadEmergencyPower,
    deleteEmergencyPower,
    
    // Safety Training
    saveSafetyTraining,
    loadSafetyTraining,
    deleteSafetyTraining,
    
    // UNGP
    saveUNGP,
    loadUNGP,
    deleteUNGP,
    
    // Incidents
    saveIncident,
    loadIncidents,
    deleteIncident,
    
    // Grievances
    saveGrievance,
    loadGrievances,
    deleteGrievance,

    // Safety Audits
    createAuditPlan,
    searchAudits,
    getAuditDetails,
    saveAuditItems,
    submitCorrectiveAction,
    updateAuditStatus,

    // RFQ/Quotes/Invoice
    listUnits,
    addUnit,
    createRFQ,
    updateRFQ,
    deleteRFQ,
    listRFQ,
    listRFQByItem,
    submitQuote,
    listQuotes,
    approveQuote,
    updateQuoteStatus,
    createInvoice,
    getInvoice,
    getQuoteStats,

    // Training Sessions
    listTrainingSessions,
    createTrainingSession,
    getTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    saveTrainingAttendees,

    // AI Prompts
    listPrompts,
    createPrompt,
    getPrompt,
    updatePrompt,
    deletePrompt
  };
}

// For Node.js/module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveUSCSafe,
    loadUSCSafe,
    deleteUSCSafe,
    saveFireSafety,
    loadFireSafety,
    deleteFireSafety,
    saveElectricalSafety,
    loadElectricalSafety,
    deleteElectricalSafety,
    saveStructuralSafety,
    loadStructuralSafety,
    deleteStructuralSafety,
    saveHealthHazards,
    loadHealthHazards,
    deleteHealthHazards,
    saveGasSafety,
    loadGasSafety,
    deleteGasSafety,
    saveBoilerSafety,
    loadBoilerSafety,
    deleteBoilerSafety,
    saveConsultant,
    loadConsultant,
    deleteConsultant,
    saveDSA,
    loadDSA,
    deleteDSA,
    saveEmergencyPower,
    loadEmergencyPower,
    deleteEmergencyPower,
    saveSafetyTraining,
    loadSafetyTraining,
    deleteSafetyTraining,
    saveUNGP,
    loadUNGP,
    deleteUNGP,
    saveIncident,
    loadIncidents,
    deleteIncident,
    saveGrievance,
    loadGrievances,
    deleteGrievance,
    createAuditPlan,
    searchAudits,
    getAuditDetails,
    saveAuditItems,
    submitCorrectiveAction,
    updateAuditStatus,
    // RFQ
    listUnits,
    addUnit,
    createRFQ,
    updateRFQ,
    deleteRFQ,
    listRFQ,
    listRFQByItem,
    submitQuote,
    listQuotes,
    approveQuote,
    updateQuoteStatus,
    createInvoice,
    getInvoice,
    getQuoteStats,
    // Training
    listTrainingSessions,
    createTrainingSession,
    getTrainingSession,
    updateTrainingSession,
    deleteTrainingSession,
    saveTrainingAttendees,
    listPrompts,
    createPrompt,
    getPrompt,
    updatePrompt,
    deletePrompt,

    // Attendance
    listAttendanceBarcodes,
    saveAttendanceBarcode,
    deleteAttendanceBarcode,
    postAttendanceLog,
    listAttendanceLogs,
    getAttendanceStatus,
    collectFormData,
    populateForm,
    showSuccessMessage,
    showErrorMessage
  };
}
