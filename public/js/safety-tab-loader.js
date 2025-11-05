/**
 * Safety Office Tab Auto-Loader
 * Automatically loads data when tabs are activated
 */

// Map of tab IDs to their load functions
const TAB_LOADERS = {
  'usc-safe': loadUSCSafeTab,
  'fire-safety': loadFireSafetyTab,
  'electrical-safety': loadElectricalSafetyTab,
  'structural-safety': loadStructuralSafetyTab,
  'health-hazards': loadHealthHazardsTab,
  'gas-safety': loadGasSafetyTab,
  'boiler-safety': loadBoilerSafetyTab,
  'consultant': loadConsultantTab,
  'dsa': loadDSATab,
  'emergency-power': loadEmergencyPowerTab,
  'safety-training': loadSafetyTrainingTab,
  'ungp': loadUNGPTab,
  'incidents': loadIncidentsTab,
  'grievances': loadGrievancesTab
};

// Initialize tab loading on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Safety Tab Loader initialized');
  
  // Load data for the initially active tab
  loadActiveTab();
  
  // Add listeners for Bootstrap tab changes
  const tabElements = document.querySelectorAll('button[data-bs-toggle="tab"], a[data-bs-toggle="tab"]');
  tabElements.forEach(tabElement => {
    tabElement.addEventListener('shown.bs.tab', function(event) {
      const targetId = event.target.getAttribute('data-bs-target') || event.target.getAttribute('href');
      const tabId = targetId ? targetId.replace('#', '') : null;
      
      if (tabId && TAB_LOADERS[tabId]) {
        console.log('Loading data for tab:', tabId);
        TAB_LOADERS[tabId]();
      }
    });
  });
});

// Load data for the currently active tab
function loadActiveTab() {
  const activeTab = document.querySelector('.tab-pane.active');
  if (activeTab && activeTab.id && TAB_LOADERS[activeTab.id]) {
    console.log('Loading active tab:', activeTab.id);
    TAB_LOADERS[activeTab.id]();
  }
}

// ==================== USC-SAFE ====================
async function loadUSCSafeTab() {
  try {
    const data = await SafetyAPI.loadUSCSafe();
    if (data) {
      const form = document.getElementById('usc-safe-form') || 
                   document.querySelector('#usc-safe form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('USC-Safe data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load USC-Safe data:', error);
  }
}

async function saveUSCSafeTab() {
  try {
    const form = document.getElementById('usc-safe-form') || 
                 document.querySelector('#usc-safe form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveUSCSafe(formData);
    SafetyAPI.showSuccessMessage('USC-Safe data saved successfully!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save USC-Safe data: ' + error.message);
  }
}

// ==================== FIRE SAFETY ====================
async function loadFireSafetyTab() {
  try {
    const data = await SafetyAPI.loadFireSafety();
    // If object (checklist form), populate form; if array, render table
    if (data && !Array.isArray(data)) {
      const form = document.getElementById('fireFormData') ||
                   document.querySelector('#fire-form form') ||
                   document.getElementById('fire-safety-form') ||
                   document.querySelector('#fire-safety form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Fire Safety checklist loaded');
        return;
      }
    }
    const records = Array.isArray(data) ? data : [];
    displayFireSafetyRecords(records);
    console.log('Fire Safety data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Fire Safety data:', error);
  }
}

async function saveFireSafetyTab(e) {
  try {
    if (e && e.preventDefault) e.preventDefault();
    const form = document.getElementById('fireFormData') ||
                 document.querySelector('#fire-form form') ||
                 document.getElementById('fire-safety-form') ||
                 document.querySelector('#fire-safety form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveFireSafety(formData);
    SafetyAPI.showSuccessMessage('Fire Safety data saved!');
    loadFireSafetyTab(); // Reload the list
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayFireSafetyRecords(records) {
  const tbody = document.getElementById('fire-table-body') ||
                document.getElementById('fire-safety-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.InspectionDate || ''}</td>
      <td>${record.Location || ''}</td>
      <td>${record.InspectedBy || ''}</td>
      <td>${record.Status || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteFireSafetyRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteFireSafetyRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  try {
    await SafetyAPI.deleteFireSafety(id);
    SafetyAPI.showSuccessMessage('Record deleted!');
    loadFireSafetyTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// ==================== ELECTRICAL SAFETY ====================
async function loadElectricalSafetyTab() {
  try {
    const data = await SafetyAPI.loadElectricalSafety();
    if (data && !Array.isArray(data)) {
      const form = document.getElementById('electrical-safety-form') || 
                   document.querySelector('#electrical-safety form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Electrical Safety form loaded');
        return;
      }
    }
    const records = Array.isArray(data) ? data : [];
    displayElectricalSafetyRecords(records);
    console.log('Electrical Safety data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Electrical Safety data:', error);
  }
}

async function saveElectricalSafetyTab() {
  try {
    const form = document.getElementById('electrical-safety-form') || 
                 document.querySelector('#electrical-safety form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveElectricalSafety(formData);
    SafetyAPI.showSuccessMessage('Electrical Safety data saved!');
    loadElectricalSafetyTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayElectricalSafetyRecords(records) {
  const tbody = document.getElementById('electrical-safety-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.InspectionDate || ''}</td>
      <td>${record.Location || ''}</td>
      <td>${record.InspectedBy || ''}</td>
      <td>${record.Status || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteElectricalSafetyRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteElectricalSafetyRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  try {
    await SafetyAPI.deleteElectricalSafety(id);
    SafetyAPI.showSuccessMessage('Record deleted!');
    loadElectricalSafetyTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// ==================== STRUCTURAL SAFETY ====================
async function loadStructuralSafetyTab() {
  try {
    const data = await SafetyAPI.loadStructuralSafety();
    if (data && !Array.isArray(data)) {
      const form = document.getElementById('structural-safety-form') || 
                   document.querySelector('#structural-safety form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Structural Safety form loaded');
        return;
      }
    }
    const records = Array.isArray(data) ? data : [];
    displayStructuralSafetyRecords(records);
    console.log('Structural Safety data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Structural Safety data:', error);
  }
}

async function saveStructuralSafetyTab() {
  try {
    const form = document.getElementById('structural-safety-form') || 
                 document.querySelector('#structural-safety form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveStructuralSafety(formData);
    SafetyAPI.showSuccessMessage('Structural Safety data saved!');
    loadStructuralSafetyTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayStructuralSafetyRecords(records) {
  const tbody = document.getElementById('structural-safety-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.InspectionDate || ''}</td>
      <td>${record.Location || ''}</td>
      <td>${record.InspectedBy || ''}</td>
      <td>${record.Status || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteStructuralSafetyRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteStructuralSafetyRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  try {
    await SafetyAPI.deleteStructuralSafety(id);
    SafetyAPI.showSuccessMessage('Record deleted!');
    loadStructuralSafetyTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// ==================== HEALTH HAZARDS ====================
async function loadHealthHazardsTab() {
  try {
    const data = await SafetyAPI.loadHealthHazards();
    if (data && !Array.isArray(data)) {
      const form = document.getElementById('health-hazards-form') || 
                   document.querySelector('#health-hazards form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Health Hazards form loaded');
        return;
      }
    }
    const records = Array.isArray(data) ? data : [];
    displayHealthHazardsRecords(records);
    console.log('Health Hazards data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Health Hazards data:', error);
  }
}

async function saveHealthHazardsTab() {
  try {
    const form = document.getElementById('health-hazards-form') || 
                 document.querySelector('#health-hazards form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveHealthHazards(formData);
    SafetyAPI.showSuccessMessage('Health Hazards data saved!');
    loadHealthHazardsTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayHealthHazardsRecords(records) {
  const tbody = document.getElementById('health-hazards-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.AssessmentDate || ''}</td>
      <td>${record.Location || ''}</td>
      <td>${record.HazardType || ''}</td>
      <td>${record.RiskLevel || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteHealthHazardsRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteHealthHazardsRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return;
  
  try {
    await SafetyAPI.deleteHealthHazards(id);
    SafetyAPI.showSuccessMessage('Record deleted!');
    loadHealthHazardsTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// ==================== GAS SAFETY ====================
async function loadGasSafetyTab() {
  try {
    const data = await SafetyAPI.loadGasSafety();
    if (data) {
      const form = document.getElementById('gas-safety-form') || 
                   document.querySelector('#gas-safety form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Gas Safety data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load Gas Safety data:', error);
  }
}

async function saveGasSafetyTab() {
  try {
    const form = document.getElementById('gas-safety-form') || 
                 document.querySelector('#gas-safety form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveGasSafety(formData);
    SafetyAPI.showSuccessMessage('Gas Safety data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== BOILER SAFETY ====================
async function loadBoilerSafetyTab() {
  try {
    const data = await SafetyAPI.loadBoilerSafety();
    if (data) {
      const form = document.getElementById('boiler-safety-form') || 
                   document.querySelector('#boiler-safety form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Boiler Safety data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load Boiler Safety data:', error);
  }
}

async function saveBoilerSafetyTab() {
  try {
    const form = document.getElementById('boiler-safety-form') || 
                 document.querySelector('#boiler-safety form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveBoilerSafety(formData);
    SafetyAPI.showSuccessMessage('Boiler Safety data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== CONSULTANT ====================
async function loadConsultantTab() {
  try {
    const data = await SafetyAPI.loadConsultant();
    if (data) {
      const form = document.getElementById('consultant-form') || 
                   document.querySelector('#consultant form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Consultant data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load Consultant data:', error);
  }
}

async function saveConsultantTab() {
  try {
    const form = document.getElementById('consultant-form') || 
                 document.querySelector('#consultant form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveConsultant(formData);
    SafetyAPI.showSuccessMessage('Consultant data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== DSA ====================
async function loadDSATab() {
  try {
    const data = await SafetyAPI.loadDSA();
    if (data) {
      const form = document.getElementById('dsa-form') || 
                   document.querySelector('#dsa form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('DSA data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load DSA data:', error);
  }
}

async function saveDSATab() {
  try {
    const form = document.getElementById('dsa-form') || 
                 document.querySelector('#dsa form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveDSA(formData);
    SafetyAPI.showSuccessMessage('DSA data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== EMERGENCY POWER ====================
async function loadEmergencyPowerTab() {
  try {
    const data = await SafetyAPI.loadEmergencyPower();
    if (data) {
      const form = document.getElementById('emergency-power-form') || 
                   document.querySelector('#emergency-power form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Emergency Power data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load Emergency Power data:', error);
  }
}

async function saveEmergencyPowerTab() {
  try {
    const form = document.getElementById('emergency-power-form') || 
                 document.querySelector('#emergency-power form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveEmergencyPower(formData);
    SafetyAPI.showSuccessMessage('Emergency Power data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== SAFETY TRAINING ====================
async function loadSafetyTrainingTab() {
  try {
    const data = await SafetyAPI.loadSafetyTraining();
    if (data) {
      const form = document.getElementById('safety-training-form') || 
                   document.querySelector('#safety-training form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('Safety Training data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load Safety Training data:', error);
  }
}

async function saveSafetyTrainingTab() {
  try {
    const form = document.getElementById('safety-training-form') || 
                 document.querySelector('#safety-training form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveSafetyTraining(formData);
    SafetyAPI.showSuccessMessage('Safety Training data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== UNGP ====================
async function loadUNGPTab() {
  try {
    const data = await SafetyAPI.loadUNGP();
    if (data) {
      const form = document.getElementById('ungp-form') || 
                   document.querySelector('#ungp form');
      if (form) {
        SafetyAPI.populateForm(form, data);
        console.log('UNGP data loaded');
      }
    }
  } catch (error) {
    console.error('Failed to load UNGP data:', error);
  }
}

async function saveUNGPTab() {
  try {
    const form = document.getElementById('ungp-form') || 
                 document.querySelector('#ungp form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveUNGP(formData);
    SafetyAPI.showSuccessMessage('UNGP data saved!');
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

// ==================== INCIDENTS ====================
async function loadIncidentsTab() {
  try {
    const records = await SafetyAPI.loadIncidents();
    displayIncidentsRecords(records);
    console.log('Incidents data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Incidents data:', error);
  }
}

async function saveIncidentTab() {
  try {
    const form = document.getElementById('incidents-form') || 
                 document.querySelector('#incidents form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveIncident(formData);
    SafetyAPI.showSuccessMessage('Incident saved!');
    loadIncidentsTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayIncidentsRecords(records) {
  const tbody = document.getElementById('incidents-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.IncidentDate || ''}</td>
      <td>${record.IncidentType || ''}</td>
      <td>${record.Location || ''}</td>
      <td>${record.Severity || ''}</td>
      <td>${record.Status || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteIncidentRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteIncidentRecord(id) {
  if (!confirm('Are you sure you want to delete this incident?')) return;
  
  try {
    await SafetyAPI.deleteIncident(id);
    SafetyAPI.showSuccessMessage('Incident deleted!');
    loadIncidentsTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// ==================== GRIEVANCES ====================
async function loadGrievancesTab() {
  try {
    const records = await SafetyAPI.loadGrievances();
    displayGrievancesRecords(records);
    console.log('Grievances data loaded:', records.length, 'records');
  } catch (error) {
    console.error('Failed to load Grievances data:', error);
  }
}

async function saveGrievanceTab() {
  try {
    const form = document.getElementById('grievances-form') || 
                 document.querySelector('#grievances form');
    if (!form) {
      throw new Error('Form not found');
    }
    
    const formData = SafetyAPI.collectFormData(form);
    await SafetyAPI.saveGrievance(formData);
    SafetyAPI.showSuccessMessage('Grievance saved!');
    loadGrievancesTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to save: ' + error.message);
  }
}

function displayGrievancesRecords(records) {
  const tbody = document.getElementById('grievances-table-body');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  records.forEach(record => {
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${record.GrievanceDate || ''}</td>
      <td>${record.ComplainantName || ''}</td>
      <td>${record.GrievanceType || ''}</td>
      <td>${record.Priority || ''}</td>
      <td>${record.Status || ''}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteGrievanceRecord(${record.Id})">Delete</button>
      </td>
    `;
  });
}

async function deleteGrievanceRecord(id) {
  if (!confirm('Are you sure you want to delete this grievance?')) return;
  
  try {
    await SafetyAPI.deleteGrievance(id);
    SafetyAPI.showSuccessMessage('Grievance deleted!');
    loadGrievancesTab();
  } catch (error) {
    SafetyAPI.showErrorMessage('Failed to delete: ' + error.message);
  }
}

// Make functions globally accessible
if (typeof window !== 'undefined') {
  window.saveUSCSafeTab = saveUSCSafeTab;
  window.saveFireSafetyTab = saveFireSafetyTab;
  window.saveElectricalSafetyTab = saveElectricalSafetyTab;
  window.saveStructuralSafetyTab = saveStructuralSafetyTab;
  window.saveHealthHazardsTab = saveHealthHazardsTab;
  window.saveGasSafetyTab = saveGasSafetyTab;
  window.saveBoilerSafetyTab = saveBoilerSafetyTab;
  window.saveConsultantTab = saveConsultantTab;
  window.saveDSATab = saveDSATab;
  window.saveEmergencyPowerTab = saveEmergencyPowerTab;
  window.saveSafetyTrainingTab = saveSafetyTrainingTab;
  window.saveUNGPTab = saveUNGPTab;
  window.saveIncidentTab = saveIncidentTab;
  window.saveGrievanceTab = saveGrievanceTab;
  
  window.deleteFireSafetyRecord = deleteFireSafetyRecord;
  window.deleteElectricalSafetyRecord = deleteElectricalSafetyRecord;
  window.deleteStructuralSafetyRecord = deleteStructuralSafetyRecord;
  window.deleteHealthHazardsRecord = deleteHealthHazardsRecord;
  window.deleteIncidentRecord = deleteIncidentRecord;
  window.deleteGrievanceRecord = deleteGrievanceRecord;
}
