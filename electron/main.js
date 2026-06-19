const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('./database')

let mainWindow
let db

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: '正畸附件记录本',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  const userDataPath = app.getPath('userData')
  const photosDir = path.join(userDataPath, 'photos')
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true })
  }

  db = new Database(path.join(userDataPath, 'ortho.db'))
  db.init()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (db) db.close()
  if (process.platform !== 'darwin') app.quit()
})

// ------------------ IPC Handlers ------------------

// Patients
ipcMain.handle('patient:list', () => db.getAllPatients())
ipcMain.handle('patient:get', (_, id) => db.getPatient(id))
ipcMain.handle('patient:create', (_, data) => db.createPatient(data))
ipcMain.handle('patient:update', (_, id, data) => db.updatePatient(id, data))
ipcMain.handle('patient:delete', (_, id) => db.deletePatient(id))

// Records
ipcMain.handle('record:list', (_, patientId) => db.getRecordsByPatient(patientId))
ipcMain.handle('record:get', (_, id) => db.getRecord(id))
ipcMain.handle('record:create', (_, data) => {
  const recordId = db.createRecord(data)
  if (data.attachments && data.attachments.length) {
    for (const att of data.attachments) {
      db.createAttachment({ ...att, record_id: recordId })
    }
  }
  return recordId
})
ipcMain.handle('record:delete', (_, id) => db.deleteRecord(id))

// Attachments
ipcMain.handle('attachment:list', (_, recordId) => db.getAttachmentsByRecord(recordId))
ipcMain.handle('attachment:create', (_, data) => db.createAttachment(data))
ipcMain.handle('attachment:update', (_, id, data) => db.updateAttachment(id, data))
ipcMain.handle('attachment:delete', (_, id) => db.deleteAttachment(id))

// Photos
ipcMain.handle('photo:list', (_, recordId) => db.getPhotosByRecord(recordId))
ipcMain.handle('photo:create', (_, data) => db.createPhoto(data))
ipcMain.handle('photo:delete', (_, id) => {
  const photo = db.getPhoto(id)
  if (photo && photo.file_path) {
    try { fs.unlinkSync(photo.file_path) } catch (e) {}
  }
  db.deletePhoto(id)
})

// Save uploaded photo to disk
ipcMain.handle('photo:save', async (_, base64Data, fileName) => {
  const userDataPath = app.getPath('userData')
  const photosDir = path.join(userDataPath, 'photos')
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true })

  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const finalName = `${timestamp}_${safeName}`
  const filePath = path.join(photosDir, finalName)

  const data = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(data, 'base64')
  fs.writeFileSync(filePath, buffer)

  return filePath
})

// Get photo as base64
ipcMain.handle('photo:read', (_, filePath) => {
  try {
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1) || 'png'
    return `data:image/${ext};base64,${data.toString('base64')}`
  } catch (e) {
    return null
  }
})

// ------------------ Checkups ------------------
ipcMain.handle('checkup:list', (_, patientId) => db.getCheckupsByPatient(patientId))
ipcMain.handle('checkup:get', (_, id) => db.getCheckup(id))
ipcMain.handle('checkup:create', (_, data) => db.createCheckup(data))
ipcMain.handle('checkup:delete', (_, id) => db.deleteCheckup(id))
ipcMain.handle('checkup_item:list', (_, checkupId) => db.getCheckupItemsByCheckup(checkupId))

// ------------------ Export / Import ------------------
ipcMain.handle('export:patient', (_, patientId) => db.getPatientFullData(patientId))

ipcMain.handle('export:patientToFile', async (_, patientId) => {
  const data = db.getPatientFullData(patientId)
  if (!data) return null
  const photosDir = path.join(app.getPath('userData'), 'photos')
  const exportedPhotos = []
  if (data.photos) {
    for (const p of data.photos) {
      try {
        const imgData = fs.readFileSync(p.file_path)
        const ext = path.extname(p.file_path) || '.png'
        exportedPhotos.push({ ...p, _base64: imgData.toString('base64'), _ext: ext })
      } catch (e) {
        exportedPhotos.push({ ...p, _base64: null, _ext: '.png' })
      }
    }
  }
  data.photos = exportedPhotos
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出患者数据',
    defaultPath: `${data.patient.name}_正畸记录_${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return null
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8')
  return result.filePath
})

ipcMain.handle('import:patientFromFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入患者数据',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8')
    const data = JSON.parse(raw)
    if (!data.patient) throw new Error('Invalid format')
    const photosDir = path.join(app.getPath('userData'), 'photos')
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true })
    if (data.photos) {
      for (const p of data.photos) {
        if (p._base64) {
          const timestamp = Date.now() + Math.random()
          const safeName = `imported_${timestamp}${p._ext || '.png'}`
          const filePath = path.join(photosDir, safeName)
          fs.writeFileSync(filePath, Buffer.from(p._base64, 'base64'))
          p.file_path = filePath
        }
        delete p._base64
        delete p._ext
      }
    }
    const newId = db.importPatientFullData(data)
    return newId
  } catch (e) {
    console.error('Import failed:', e)
    return null
  }
})
