<template>
  <div class="record-panel">
    <div v-if="!patient" class="panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-text">请先在「患者档案」中选择一位患者</div>
      </div>
    </div>

    <div v-else class="record-layout">
      <!-- Left: Tooth Chart & Form -->
      <div class="record-left">
        <div class="panel record-card">
          <div class="card-header">
            <h3>本次粘接记录</h3>
            <div class="patient-brief">
              <span class="badge badge-blue">{{ patient.name }}</span>
              <span v-if="patient.current_aligner" class="badge badge-green">第{{ patient.current_aligner }}副</span>
            </div>
          </div>

          <div class="chart-section">
            <ToothChart
              :selectedTeeth="selectedTeeth"
              :attachmentsMap="attachmentsMap"
              @tooth-click="toggleTooth"
            />
            <div class="legend">
              <span class="legend-item"><span class="dot selected"></span>已选中</span>
              <span class="legend-item"><span class="dot att"></span>本次粘接</span>
              <span class="hint">点击牙位选择，再选择附件形态</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Selected teeth detail editor -->
          <div v-if="selectedTeeth.length > 0" class="selected-section">
            <h4 class="section-subtitle">
              已选 <span class="badge badge-blue">{{ selectedTeeth.length }}</span> 颗牙位
            </h4>

            <div v-if="editingMode === 'batch'" class="batch-edit">
              <div class="form-grid">
                <div>
                  <label class="label">附件形态</label>
                  <select v-model="batchForm.shape" class="select">
                    <option value="">请选择</option>
                    <option value="矩形">矩形</option>
                    <option value="椭圆">椭圆</option>
                    <option value="斜向矩形">斜向矩形</option>
                    <option value="三角形">三角形</option>
                    <option value="优化支抗">优化支抗</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label class="label">状态</label>
                  <select v-model="batchForm.status" class="select">
                    <option value="new">新粘接</option>
                    <option value="rebond">重粘</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <label class="label">备注（所有选中牙位）</label>
                <input v-model="batchForm.notes" class="input" placeholder="如：隔湿困难，已加强光固化" />
              </div>
              <div class="batch-actions">
                <button class="btn btn-secondary btn-sm" @click="editingMode = 'single'">单颗编辑</button>
                <button class="btn btn-primary btn-sm" @click="applyBatch">应用到全部选中</button>
              </div>
            </div>

            <div v-else class="single-edit">
              <div class="tooth-tabs">
                <button
                  v-for="t in selectedTeeth"
                  :key="t"
                  class="tooth-tab"
                  :class="{ active: activeTooth === t }"
                  @click="activeTooth = t"
                >
                  {{ t }}
                  <span v-if="attachmentsMap[t]?.shape" class="tab-shape">{{ attachmentsMap[t].shape }}</span>
                </button>
              </div>
              <div v-if="activeTooth" class="single-form">
                <div class="form-grid">
                  <div>
                    <label class="label">附件形态</label>
                    <select v-model="activeForm.shape" class="select" @change="updateActiveAttachment">
                      <option value="">请选择</option>
                      <option value="矩形">矩形</option>
                      <option value="椭圆">椭圆</option>
                      <option value="斜向矩形">斜向矩形</option>
                      <option value="三角形">三角形</option>
                      <option value="优化支抗">优化支抗</option>
                      <option value="其他">其他</option>
                    </select>
                  </div>
                  <div>
                    <label class="label">状态</label>
                    <select v-model="activeForm.status" class="select" @change="updateActiveAttachment">
                      <option value="new">新粘接</option>
                      <option value="rebond">重粘</option>
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <label class="label">备注（仅 {{ activeTooth }}）</label>
                  <input v-model="activeForm.notes" class="input" placeholder="如：隔湿困难" @change="updateActiveAttachment" />
                </div>
                <div class="single-actions">
                  <button class="btn btn-secondary btn-sm" @click="editingMode = 'batch'">批量编辑</button>
                  <button class="btn btn-danger btn-sm" @click="removeFromSelection(activeTooth)">取消该牙位</button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="hint-box">
            👆 请先在上方牙位图点击选择本次粘接的牙位
          </div>

          <div class="divider"></div>

          <div class="form-row">
            <label class="label">整体备注</label>
            <textarea v-model="recordNotes" class="textarea" placeholder="本次就诊的整体情况，如：患者配合良好，粘接顺利..."></textarea>
          </div>
        </div>

        <!-- Photos -->
        <div class="panel record-card">
          <div class="card-header">
            <h3>📷 本次照片</h3>
            <button class="btn btn-secondary btn-sm" @click="triggerPhotoInput">
              添加照片
            </button>
            <input
              ref="photoInput"
              type="file"
              accept="image/*"
              multiple
              style="display:none"
              @change="onPhotoFiles"
            />
          </div>
          <div
            class="photo-dropzone"
            :class="{ drag: isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onPhotoDrop"
          >
            <div v-if="photos.length === 0" class="dropzone-hint">
              <div class="dz-icon">🖼️</div>
              <div>拖放照片到此处，或点击上方按钮</div>
              <div class="dz-sub">支持 JPG、PNG 格式</div>
            </div>
            <div v-else class="photo-grid">
              <div v-for="(ph, idx) in photos" :key="idx" class="photo-item">
                <img :src="ph.preview" />
                <button class="photo-remove" @click="removePhoto(idx)">✕</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: History Timeline -->
      <div class="record-right">
        <div class="panel history-card">
          <div class="card-header">
            <h3>📋 历史记录</h3>
            <span class="badge badge-gray">{{ records.length }} 次就诊</span>
          </div>
          <div class="history-list">
            <div v-if="records.length === 0" class="empty-state">
              <div class="empty-state-icon">📝</div>
              <div class="empty-state-text">这是第一次记录</div>
            </div>
            <div
              v-for="r in records"
              :key="r.id"
              class="history-item"
              :class="{ active: viewingRecord?.id === r.id }"
              @click="toggleViewRecord(r)"
            >
              <div class="h-date">{{ formatDate(r.record_date) }}</div>
              <div class="h-meta">
                <span class="badge badge-blue">{{ getAttachCount(r.id) }}颗</span>
                <span class="badge badge-gray">{{ getPhotoCount(r.id) }}张</span>
              </div>
              <div v-if="r.notes" class="h-notes">{{ r.notes }}</div>
              <div class="h-teeth" v-if="getAttachTeeth(r.id).length">
                {{ getAttachTeeth(r.id).join('、') }}
              </div>
            </div>
          </div>
        </div>

        <div class="panel summary-card">
          <div class="card-header">
            <h3>💾 保存记录</h3>
          </div>
          <div class="summary-body">
            <div class="summary-row">
              <span>本次粘接牙位</span>
              <span class="summary-value">{{ attachmentCount }} 颗</span>
            </div>
            <div class="summary-row">
              <span>已填写形态</span>
              <span class="summary-value">{{ filledShapeCount }} / {{ attachmentCount }}</span>
            </div>
            <div class="summary-row">
              <span>照片数量</span>
              <span class="summary-value">{{ photos.length }} 张</span>
            </div>
            <button
              class="btn btn-primary save-btn"
              :disabled="!canSave"
              @click="saveRecord"
            >
              {{ canSave ? '保存本次记录' : '请先选择牙位' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import ToothChart from './ToothChart.vue'

const props = defineProps({ patient: Object })
const emit = defineEmits(['updated'])

const selectedTeeth = ref([])
const attachmentsMap = reactive({})
const recordNotes = ref('')
const photos = ref([])
const isDragging = ref(false)
const photoInput = ref(null)

const editingMode = ref('batch')
const activeTooth = ref(null)
const batchForm = reactive({ shape: '', status: 'new', notes: '' })
const activeForm = reactive({ shape: '', status: 'new', notes: '' })

const records = ref([])
const attachmentsByRecord = reactive({})
const photosByRecord = reactive({})
const viewingRecord = ref(null)

const attachmentCount = computed(() => Object.keys(attachmentsMap).length)
const filledShapeCount = computed(() =>
  Object.values(attachmentsMap).filter(a => a.shape).length
)
const canSave = computed(() => attachmentCount.value > 0)

watch(() => props.patient, (p) => {
  if (p) loadHistory()
}, { immediate: true })

watch(selectedTeeth, (teeth) => {
  for (const t of teeth) {
    if (!attachmentsMap[t]) {
      attachmentsMap[t] = { tooth_number: t, shape: '', status: 'new', notes: '' }
    }
  }
  for (const t of Object.keys(attachmentsMap)) {
    if (!teeth.includes(t)) {
      delete attachmentsMap[t]
    }
  }
  if (teeth.length > 0 && !activeTooth.value) activeTooth.value = teeth[0]
  if (activeTooth.value && !teeth.includes(activeTooth.value)) {
    activeTooth.value = teeth[0] || null
  }
  syncActiveForm()
})

watch(activeTooth, syncActiveForm)

function syncActiveForm() {
  if (activeTooth.value && attachmentsMap[activeTooth.value]) {
    const a = attachmentsMap[activeTooth.value]
    activeForm.shape = a.shape
    activeForm.status = a.status
    activeForm.notes = a.notes
  }
}

function toggleTooth(t) {
  const idx = selectedTeeth.value.indexOf(t)
  if (idx > -1) {
    selectedTeeth.value.splice(idx, 1)
  } else {
    selectedTeeth.value.push(t)
  }
}

function removeFromSelection(t) {
  const idx = selectedTeeth.value.indexOf(t)
  if (idx > -1) selectedTeeth.value.splice(idx, 1)
}

function applyBatch() {
  for (const t of selectedTeeth.value) {
    attachmentsMap[t] = {
      tooth_number: t,
      shape: batchForm.shape,
      status: batchForm.status,
      notes: batchForm.notes
    }
  }
  syncActiveForm()
}

function updateActiveAttachment() {
  if (!activeTooth.value) return
  attachmentsMap[activeTooth.value] = {
    tooth_number: activeTooth.value,
    ...activeForm
  }
}

async function loadHistory() {
  records.value = await window.electronAPI.listRecords(props.patient.id)
  for (const r of records.value) {
    const atts = await window.electronAPI.listAttachments(r.id)
    attachmentsByRecord[r.id] = atts
    const phs = await window.electronAPI.listPhotos(r.id)
    photosByRecord[r.id] = phs
    for (const p of phs) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
  }
}

function toggleViewRecord(r) {
  viewingRecord.value = viewingRecord.value?.id === r.id ? null : r
}

function getAttachCount(recordId) {
  return attachmentsByRecord[recordId]?.length || 0
}
function getPhotoCount(recordId) {
  return photosByRecord[recordId]?.length || 0
}
function getAttachTeeth(recordId) {
  return (attachmentsByRecord[recordId] || []).map(a => a.tooth_number)
}

function triggerPhotoInput() { photoInput.value?.click() }

async function onPhotoFiles(e) {
  for (const file of e.target.files) {
    await addPhotoFile(file)
  }
  e.target.value = ''
}

async function onPhotoDrop(e) {
  isDragging.value = false
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('image/')) {
      await addPhotoFile(file)
    }
  }
}

function addPhotoFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      photos.value.push({
        name: file.name,
        preview: ev.target.result
      })
      resolve()
    }
    reader.readAsDataURL(file)
  })
}

function removePhoto(idx) {
  photos.value.splice(idx, 1)
}

async function saveRecord() {
  const attachments = Object.values(attachmentsMap)
  const recordId = await window.electronAPI.createRecord({
    patient_id: props.patient.id,
    notes: recordNotes.value,
    attachments
  })
  for (const ph of photos.value) {
    const filePath = await window.electronAPI.savePhoto(ph.preview, ph.name)
    await window.electronAPI.createPhoto({ record_id: recordId, file_path: filePath })
  }
  alert('记录已保存！')
  selectedTeeth.value = []
  for (const k of Object.keys(attachmentsMap)) delete attachmentsMap[k]
  recordNotes.value = ''
  photos.value = []
  batchForm.shape = ''
  batchForm.notes = ''
  await loadHistory()
  emit('updated')
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.record-panel { width: 100%; height: 100%; }

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.record-layout {
  display: flex;
  gap: 20px;
  height: 100%;
}

.record-left {
  flex: 1.3;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.record-right {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

.record-card, .history-card, .summary-card {
  padding: 16px 18px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 10px;
}
.card-header h3 {
  font-size: 15px;
  font-weight: 600;
}
.patient-brief { display: flex; gap: 6px; }

.chart-section { margin-bottom: 8px; }

.legend {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.dot {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}
.dot.selected { background: var(--primary-light); border: 2px solid var(--primary); }
.dot.att { background: var(--accent); border-radius: 50%; }
.hint { font-size: 12px; color: var(--text-muted); margin-left: auto; }

.section-subtitle {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
}

.batch-edit, .single-edit {
  background: #f9fafb;
  padding: 14px;
  border-radius: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row { margin-bottom: 12px; }
.form-row:last-child { margin-bottom: 0; }

.batch-actions, .single-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.tooth-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.tooth-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 6px;
  background: white;
  border: 1px solid var(--border);
  font-size: 12px;
  transition: all 0.15s ease;
}
.tooth-tab:hover { border-color: var(--primary); }
.tooth-tab.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.tab-shape {
  font-size: 10px;
  opacity: 0.8;
}
.tooth-tab.active .tab-shape { opacity: 0.9; }

.hint-box {
  background: #fef3c7;
  color: #92400e;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  text-align: center;
}

.photo-dropzone {
  border: 2px dashed var(--border);
  border-radius: 8px;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  background: #fafafa;
}
.photo-dropzone.drag {
  border-color: var(--primary);
  background: var(--primary-light);
}

.dropzone-hint {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
}
.dz-icon { font-size: 32px; margin-bottom: 8px; }
.dz-sub { font-size: 11px; margin-top: 4px; }

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  padding: 12px;
  width: 100%;
}
.photo-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
}
.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.photo-remove:hover { background: var(--danger); }

.history-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}
.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.history-item:hover { border-color: var(--border); }
.history-item.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.h-date {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
}
.h-meta {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.h-notes {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 4px;
}
.h-teeth {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.summary-card { flex-shrink: 0; }
.summary-body { display: flex; flex-direction: column; gap: 10px; }

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.summary-value {
  font-weight: 600;
  color: var(--text);
}

.save-btn {
  margin-top: 8px;
  padding: 11px;
  justify-content: center;
  font-size: 14px;
}
.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--border);
}
</style>
