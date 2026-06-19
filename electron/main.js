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
