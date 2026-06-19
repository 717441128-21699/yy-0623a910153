const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Patients
  listPatients: () => ipcRenderer.invoke('patient:list'),
  getPatient: (id) => ipcRenderer.invoke('patient:get', id),
  createPatient: (data) => ipcRenderer.invoke('patient:create', data),
  updatePatient: (id, data) => ipcRenderer.invoke('patient:update', id, data),
  deletePatient: (id) => ipcRenderer.invoke('patient:delete', id),

  // Records
  listRecords: (patientId) => ipcRenderer.invoke('record:list', patientId),
  getRecord: (id) => ipcRenderer.invoke('record:get', id),
  createRecord: (data) => ipcRenderer.invoke('record:create', data),
  deleteRecord: (id) => ipcRenderer.invoke('record:delete', id),

  // Attachments
  listAttachments: (recordId) => ipcRenderer.invoke('attachment:list', recordId),
  createAttachment: (data) => ipcRenderer.invoke('attachment:create', data),
  updateAttachment: (id, data) => ipcRenderer.invoke('attachment:update', id, data),
  deleteAttachment: (id) => ipcRenderer.invoke('attachment:delete', id),

  // Photos
  listPhotos: (recordId) => ipcRenderer.invoke('photo:list', recordId),
  createPhoto: (data) => ipcRenderer.invoke('photo:create', data),
  deletePhoto: (id) => ipcRenderer.invoke('photo:delete', id),
  savePhoto: (base64Data, fileName) => ipcRenderer.invoke('photo:save', base64Data, fileName),
  readPhoto: (filePath) => ipcRenderer.invoke('photo:read', filePath),

  // Checkups
  listCheckups: (patientId) => ipcRenderer.invoke('checkup:list', patientId),
  getCheckup: (id) => ipcRenderer.invoke('checkup:get', id),
  createCheckup: (data) => ipcRenderer.invoke('checkup:create', data),
  deleteCheckup: (id) => ipcRenderer.invoke('checkup:delete', id),
  listCheckupItems: (checkupId) => ipcRenderer.invoke('checkup_item:list', checkupId),

  // Export / Import
  exportPatient: (patientId) => ipcRenderer.invoke('export:patient', patientId),
  exportPatientToFile: (patientId) => ipcRenderer.invoke('export:patientToFile', patientId),
  importPatientFromFile: () => ipcRenderer.invoke('import:patientFromFile')
})
