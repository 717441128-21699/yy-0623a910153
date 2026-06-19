const fs = require('fs')
const path = require('path')

class DB {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.data = {
      patients: [],
      records: [],
      attachments: [],
      photos: [],
      checkups: [],
      checkup_items: []
    }
    this.ids = {
      patients: 0,
      records: 0,
      attachments: 0,
      photos: 0,
      checkups: 0,
      checkup_items: 0
    }
  }

  init() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8')
        const saved = JSON.parse(raw)
        this.data = saved.data || this.data
        this.ids = saved.ids || this._computeIds()
      } catch (e) {
        console.error('Failed to load database, using empty:', e.message)
      }
    } else {
      this._save()
    }
  }

  _computeIds() {
    return {
      patients: this._maxId(this.data.patients),
      records: this._maxId(this.data.records),
      attachments: this._maxId(this.data.attachments),
      photos: this._maxId(this.data.photos),
      checkups: this._maxId(this.data.checkups),
      checkup_items: this._maxId(this.data.checkup_items)
    }
  }

  _maxId(arr) {
    if (!arr || arr.length === 0) return 0
    return Math.max(...arr.map(x => x.id))
  }

  _nextId(table) {
    this.ids[table] += 1
    return this.ids[table]
  }

  _now() {
    const d = new Date()
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }

  _save() {
    const dir = path.dirname(this.dbPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(this.dbPath, JSON.stringify({ data: this.data, ids: this.ids }, null, 2), 'utf-8')
  }

  close() {
    this._save()
  }

  // ---------- Patients ----------
  getAllPatients() {
    return [...this.data.patients].sort((a, b) => {
      return new Date(b.updated_at) - new Date(a.updated_at)
    })
  }

  getPatient(id) {
    return this.data.patients.find(p => p.id === id) || null
  }

  createPatient(data) {
    const id = this._nextId('patients')
    const now = this._now()
    const patient = {
      id,
      name: data.name,
      record_no: data.record_no || '',
      appliance_brand: data.appliance_brand || '',
      current_aligner: data.current_aligner || 0,
      created_at: now,
      updated_at: now
    }
    this.data.patients.push(patient)
    this._save()
    return id
  }

  updatePatient(id, data) {
    const idx = this.data.patients.findIndex(p => p.id === id)
    if (idx === -1) return { changes: 0 }
    this.data.patients[idx] = {
      ...this.data.patients[idx],
      name: data.name,
      record_no: data.record_no || '',
      appliance_brand: data.appliance_brand || '',
      current_aligner: data.current_aligner || 0,
      updated_at: this._now()
    }
    this._save()
    return { changes: 1 }
  }

  deletePatient(id) {
    const before = this.data.patients.length
    this.data.patients = this.data.patients.filter(p => p.id !== id)
    const recordIds = this.data.records.filter(r => r.patient_id === id).map(r => r.id)
    this.data.records = this.data.records.filter(r => r.patient_id !== id)
    this.data.attachments = this.data.attachments.filter(a => !recordIds.includes(a.record_id))
    this.data.photos = this.data.photos.filter(p => !recordIds.includes(p.record_id))
    const checkupIds = this.data.checkups.filter(c => c.patient_id === id).map(c => c.id)
    this.data.checkups = this.data.checkups.filter(c => c.patient_id !== id)
    this.data.checkup_items = this.data.checkup_items.filter(ci => !checkupIds.includes(ci.checkup_id))
    this._save()
    return { changes: before - this.data.patients.length }
  }

  // ---------- Records ----------
  getRecordsByPatient(patientId) {
    return this.data.records
      .filter(r => r.patient_id === patientId)
      .sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
  }

  getRecord(id) {
    return this.data.records.find(r => r.id === id) || null
  }

  createRecord(data) {
    const id = this._nextId('records')
    const record = {
      id,
      patient_id: data.patient_id,
      record_date: data.record_date || this._now(),
      notes: data.notes || ''
    }
    this.data.records.push(record)
    this._save()
    return id
  }

  deleteRecord(id) {
    const before = this.data.records.length
    this.data.records = this.data.records.filter(r => r.id !== id)
    this.data.attachments = this.data.attachments.filter(a => a.record_id !== id)
    this.data.photos = this.data.photos.filter(p => p.record_id !== id)
    this._save()
    return { changes: before - this.data.records.length }
  }

  // ---------- Attachments ----------
  getAttachmentsByRecord(recordId) {
    return this.data.attachments.filter(a => a.record_id === recordId)
  }

  createAttachment(data) {
    const id = this._nextId('attachments')
    const att = {
      id,
      record_id: data.record_id,
      tooth_number: data.tooth_number,
      shape: data.shape || '',
      status: data.status || 'new',
      notes: data.notes || ''
    }
    this.data.attachments.push(att)
    this._save()
    return id
  }

  updateAttachment(id, data) {
    const idx = this.data.attachments.findIndex(a => a.id === id)
    if (idx === -1) return { changes: 0 }
    this.data.attachments[idx] = {
      ...this.data.attachments[idx],
      tooth_number: data.tooth_number,
      shape: data.shape || '',
      status: data.status || 'new',
      notes: data.notes || ''
    }
    this._save()
    return { changes: 1 }
  }

  deleteAttachment(id) {
    const before = this.data.attachments.length
    this.data.attachments = this.data.attachments.filter(a => a.id !== id)
    this._save()
    return { changes: before - this.data.attachments.length }
  }

  // ---------- Photos ----------
  getPhotosByRecord(recordId) {
    return this.data.photos
      .filter(p => p.record_id === recordId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }

  getPhoto(id) {
    return this.data.photos.find(p => p.id === id) || null
  }

  createPhoto(data) {
    const id = this._nextId('photos')
    const photo = {
      id,
      record_id: data.record_id,
      file_path: data.file_path,
      description: data.description || '',
      created_at: this._now()
    }
    this.data.photos.push(photo)
    this._save()
    return id
  }

  deletePhoto(id) {
    const before = this.data.photos.length
    this.data.photos = this.data.photos.filter(p => p.id !== id)
    this._save()
    return { changes: before - this.data.photos.length }
  }

  // ---------- Checkups ----------
  getCheckupsByPatient(patientId) {
    return this.data.checkups
      .filter(c => c.patient_id === patientId)
      .sort((a, b) => new Date(b.checkup_date) - new Date(a.checkup_date))
  }

  getCheckup(id) {
    return this.data.checkups.find(c => c.id === id) || null
  }

  createCheckup(data) {
    const id = this._nextId('checkups')
    const checkup = {
      id,
      patient_id: data.patient_id,
      reference_record_id: data.reference_record_id || null,
      checkup_date: data.checkup_date || this._now(),
      notes: data.notes || ''
    }
    this.data.checkups.push(checkup)
    if (data.items && data.items.length) {
      for (const item of data.items) {
        this.createCheckupItem({ ...item, checkup_id: id })
      }
    }
    this._save()
    return id
  }

  deleteCheckup(id) {
    const before = this.data.checkups.length
    this.data.checkups = this.data.checkups.filter(c => c.id !== id)
    this.data.checkup_items = this.data.checkup_items.filter(ci => ci.checkup_id !== id)
    this._save()
    return { changes: before - this.data.checkups.length }
  }

  // ---------- Checkup Items ----------
  getCheckupItemsByCheckup(checkupId) {
    return this.data.checkup_items.filter(ci => ci.checkup_id === checkupId)
  }

  createCheckupItem(data) {
    const id = this._nextId('checkup_items')
    const item = {
      id,
      checkup_id: data.checkup_id,
      tooth_number: data.tooth_number,
      original_shape: data.original_shape || '',
      check_status: data.check_status || '',
      check_notes: data.check_notes || ''
    }
    this.data.checkup_items.push(item)
    this._save()
    return id
  }

  deleteCheckupItem(id) {
    const before = this.data.checkup_items.length
    this.data.checkup_items = this.data.checkup_items.filter(ci => ci.id !== id)
    this._save()
    return { changes: before - this.data.checkup_items.length }
  }

  // ---------- Export / Import ----------
  getPatientFullData(patientId) {
    const patient = this.getPatient(patientId)
    if (!patient) return null
    const records = this.data.records.filter(r => r.patient_id === patientId)
    const recordIds = records.map(r => r.id)
    const attachments = this.data.attachments.filter(a => recordIds.includes(a.record_id))
    const photos = this.data.photos.filter(p => recordIds.includes(p.record_id))
    const checkups = this.data.checkups.filter(c => c.patient_id === patientId)
    const checkupIds = checkups.map(c => c.id)
    const checkup_items = this.data.checkup_items.filter(ci => checkupIds.includes(ci.checkup_id))
    return {
      patient,
      records,
      attachments,
      photos,
      checkups,
      checkup_items,
      exported_at: this._now(),
      version: 1
    }
  }

  importPatientFullData(data) {
    const pidOld = data.patient.id
    const pidNew = this._nextId('patients')
    const idMap = { patients: {}, records: {}, attachments: {}, photos: {}, checkups: {}, checkup_items: {} }
    idMap.patients[pidOld] = pidNew

    const patient = { ...data.patient, id: pidNew, created_at: this._now(), updated_at: this._now() }
    this.data.patients.push(patient)

    if (data.records) {
      for (const r of data.records) {
        const ridOld = r.id
        const ridNew = this._nextId('records')
        idMap.records[ridOld] = ridNew
        this.data.records.push({
          ...r, id: ridNew, patient_id: pidNew, record_date: r.record_date || this._now()
        })
      }
    }

    if (data.attachments) {
      for (const a of data.attachments) {
        const aidNew = this._nextId('attachments')
        const mappedRid = idMap.records[a.record_id] || a.record_id
        this.data.attachments.push({ ...a, id: aidNew, record_id: mappedRid })
      }
    }

    if (data.photos) {
      for (const p of data.photos) {
        const pidNew2 = this._nextId('photos')
        const mappedRid = idMap.records[p.record_id] || p.record_id
        this.data.photos.push({ ...p, id: pidNew2, record_id: mappedRid })
      }
    }

    if (data.checkups) {
      for (const c of data.checkups) {
        const cidOld = c.id
        const cidNew = this._nextId('checkups')
        idMap.checkups[cidOld] = cidNew
        this.data.checkups.push({
          ...c, id: cidNew, patient_id: pidNew,
          reference_record_id: idMap.records[c.reference_record_id] || null
        })
      }
    }

    if (data.checkup_items) {
      for (const ci of data.checkup_items) {
        const ciiNew = this._nextId('checkup_items')
        const mappedCid = idMap.checkups[ci.checkup_id] || ci.checkup_id
        this.data.checkup_items.push({ ...ci, id: ciiNew, checkup_id: mappedCid })
      }
    }

    this._save()
    return pidNew
  }
}

module.exports = DB
