<template>
  <div class="patient-panel">
    <aside class="patient-list panel">
      <div class="list-header">
        <input v-model="searchQuery" class="input" placeholder="搜索姓名 / 病历号..." />
        <button class="btn btn-primary btn-sm" @click="openForm()"><span>＋</span> 新建</button>
      </div>
      <div class="list-body">
        <div v-if="filteredPatients.length === 0" class="empty-state">
          <div class="empty-state-icon">👥</div>
          <div class="empty-state-text">暂无患者，点击"新建"添加</div>
        </div>
        <div
          v-for="p in filteredPatients"
          :key="p.id"
          class="patient-item"
          :class="{ active: p.id === selectedId }"
          @click="selectPatient(p)"
        >
          <div class="patient-avatar">{{ p.name.slice(-2) }}</div>
          <div class="patient-info">
            <div class="patient-name">{{ p.name }}</div>
            <div class="patient-meta">
              <span v-if="p.record_no">#{{ p.record_no }}</span>
              <span v-if="p.appliance_brand">{{ p.appliance_brand }}</span>
              <span v-if="p.current_aligner">第{{ p.current_aligner }}副</span>
            </div>
          </div>
          <button class="item-edit" @click.stop="openForm(p)">✎</button>
          <button class="item-delete" @click.stop="deletePatient(p)">🗑</button>
        </div>
      </div>
    </aside>

    <section class="patient-detail panel" v-if="selectedPatient">
      <div class="detail-header">
        <div>
          <h2 class="detail-name">{{ selectedPatient.name }}</h2>
          <div class="detail-sub">
            <span v-if="selectedPatient.record_no" class="badge badge-blue">病历号: {{ selectedPatient.record_no }}</span>
            <span v-if="selectedPatient.appliance_brand" class="badge badge-purple">{{ selectedPatient.appliance_brand }}</span>
            <span v-if="selectedPatient.current_aligner" class="badge badge-green">当前第{{ selectedPatient.current_aligner }}副</span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary btn-sm" @click="exportPatient">📤 导出</button>
          <button class="btn btn-secondary btn-sm" @click="importPatient">📥 导入</button>
          <button class="btn btn-secondary btn-sm" @click="openForm(selectedPatient)">编辑信息</button>
          <button class="btn btn-primary btn-sm" @click="$emit('start-record', selectedPatient)">开始记录</button>
        </div>
      </div>

      <div class="overview-cards">
        <div class="ov-card">
          <div class="ov-label">最近粘接</div>
          <div class="ov-value">{{ overview.lastBonding ? formatDateShort(overview.lastBonding) : '—' }}</div>
          <div class="ov-sub">
            <span v-if="overview.lastBondingAttach > 0">{{ overview.lastBondingAttach }}颗附件</span>
            <span v-else class="ov-empty">暂无记录</span>
          </div>
        </div>
        <div class="ov-card">
          <div class="ov-label">最近复诊</div>
          <div class="ov-value">{{ overview.lastCheckup ? formatDateShort(overview.lastCheckup) : '—' }}</div>
          <div class="ov-sub">
            <span v-if="overview.lastCheckupItems > 0">检查{{ overview.lastCheckupItems }}颗</span>
            <span v-else class="ov-empty">暂无复诊</span>
          </div>
        </div>
        <div class="ov-card ov-warn">
          <div class="ov-label">累计脱落</div>
          <div class="ov-value ov-red">{{ overview.totalLost }}</div>
          <div class="ov-sub">次脱落记录</div>
        </div>
        <div class="ov-card">
          <div class="ov-label">累计重粘</div>
          <div class="ov-value ov-blue">{{ overview.totalRebond }}</div>
          <div class="ov-sub">次重粘记录</div>
        </div>
      </div>

      <div class="detail-section">
        <h3 class="section-title">📋 就诊记录时间线</h3>
        <div v-if="allEvents.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">暂无记录，开始第一次附件粘接记录</div>
        </div>
        <div v-else class="timeline">
          <div v-for="ev in allEvents" :key="ev.key" class="timeline-item">
            <div class="timeline-dot" :class="ev.type === 'checkup' ? 'dot-checkup' : ''"></div>
            <div class="timeline-content" :class="{ expanded: expandedEvent === ev.key }">
              <div class="tl-row" @click="toggleExpand(ev.key)">
                <div class="tl-left">
                  <span class="tl-badge" v-if="ev.type === 'bonding'">粘接</span>
                  <span class="tl-badge tl-checkup" v-else>复诊</span>
                  <span class="tl-date">{{ formatDate(ev.date) }}</span>
                </div>
                <span class="tl-expand">{{ expandedEvent === ev.key ? '▲' : '▼' }}</span>
              </div>

              <div v-if="ev.type === 'bonding'" class="tl-stats">
                <span class="badge badge-blue">附件 {{ getAttachmentCount(ev.id) }}颗</span>
                <span class="badge badge-gray">照片 {{ getPhotoCount(ev.id) }}张</span>
              </div>
              <div v-else class="tl-stats">
                <span v-for="s in checkupSummary(ev.id)" :key="s.status" class="mini-badge" :class="'mb-' + s.cls">
                  {{ s.label }} {{ s.count }}
                </span>
              </div>
              <div v-if="ev.notes" class="tl-notes">{{ ev.notes }}</div>

              <!-- Expanded detail -->
              <div v-if="expandedEvent === ev.key" class="tl-detail">
                <div v-if="ev.type === 'bonding'" class="tl-attachments">
                  <div v-for="att in getAttachments(ev.id)" :key="att.id" class="att-row">
                    <span class="att-tooth">{{ att.tooth_number }}</span>
                    <span class="att-shape">{{ att.shape || '未指定形态' }}</span>
                    <span class="att-status badge" :class="att.status === 'rebond' ? 'badge-yellow' : 'badge-blue'">
                      {{ att.status === 'rebond' ? '重粘' : '新粘接' }}
                    </span>
                    <span v-if="att.notes" class="att-notes">{{ att.notes }}</span>
                  </div>
                  <div v-if="getPhotos(ev.id).length > 0" class="tl-photos">
                    <div class="tl-photos-label">粘接照片 ({{ getPhotos(ev.id).length }}张)</div>
                    <div v-for="(p, i) in getPhotos(ev.id)" :key="i" class="tl-photo-thumb" @click="openPhotoViewer(getPhotos(ev.id), i, '粘接记录 · ' + formatDate(ev.date))">
                      <img :src="p.preview" />
                    </div>
                  </div>
                </div>

                <div v-else class="tl-checkup-detail">
                  <table class="checkup-table">
                    <thead>
                      <tr>
                        <th>牙位</th>
                        <th>上次应有</th>
                        <th>本次状态</th>
                        <th>备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in getCheckupItems(ev.id)" :key="item.id">
                        <td class="ct-tooth">{{ item.tooth_number }}</td>
                        <td>{{ item.original_shape || '-' }}</td>
                        <td><span class="status-tag" :class="'st-' + item.check_status">{{ statusLabel(item.check_status) }}</span></td>
                        <td class="ct-notes">{{ item.check_notes || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div v-if="getCheckupPhotos(ev.id).length > 0" class="tl-photos">
                    <div class="tl-photos-label">复诊照片 ({{ getCheckupPhotos(ev.id).length }}张)</div>
                    <div v-for="(p, i) in getCheckupPhotos(ev.id)" :key="i" class="tl-photo-thumb" @click="openPhotoViewer(getCheckupPhotos(ev.id), i, '复诊检查 · ' + formatDate(ev.date))">
                      <img :src="p.preview" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="patient-detail panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">👈</div>
        <div class="empty-state-text">从左侧选择或新建一位患者</div>
      </div>
    </section>

    <!-- Patient Form Modal -->
    <div v-if="formVisible" class="modal-overlay" @click.self="closeForm">
      <div class="modal panel">
        <div class="modal-header">
          <h3>{{ editingPatient ? '编辑患者' : '新建患者' }}</h3>
          <button class="modal-close" @click="closeForm">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label class="label">姓名 <span style="color:var(--danger)">*</span></label>
            <input v-model="formData.name" class="input" placeholder="患者姓名" />
          </div>
          <div class="form-row">
            <label class="label">病历号</label>
            <input v-model="formData.record_no" class="input" placeholder="如：2024001" />
          </div>
          <div class="form-row">
            <label class="label">矫治器品牌</label>
            <select v-model="formData.appliance_brand" class="select">
              <option value="">请选择</option>
              <option value="隐适美">隐适美 Invisalign</option>
              <option value="时代天使">时代天使 Angelalign</option>
              <option value="正雅">正雅 Smartee</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-row">
            <label class="label">当前副数</label>
            <input v-model.number="formData.current_aligner" type="number" min="0" class="input" placeholder="如：12" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeForm">取消</button>
          <button class="btn btn-primary" @click="savePatient">保存</button>
        </div>
      </div>
    </div>

    <PhotoViewer
      :visible="photoViewerVisible"
      :photos="photoViewerPhotos"
      :startIndex="photoViewerIndex"
      @close="photoViewerVisible = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import PhotoViewer from './PhotoViewer.vue'

const props = defineProps({ selectedId: Number })
const emit = defineEmits(['select', 'start-record'])

const patients = ref([])
const records = ref([])
const checkups = ref([])
const attachmentsMap = ref({})
const photosMap = ref({})
const checkupItemsMap = ref({})
const checkupPhotosMap = ref({})
const searchQuery = ref('')
const selectedPatient = ref(null)
const expandedEvent = ref(null)
const photoViewerVisible = ref(false)
const photoViewerPhotos = ref([])
const photoViewerIndex = ref(0)

const formVisible = ref(false)
const editingPatient = ref(null)
const formData = ref({ name: '', record_no: '', appliance_brand: '', current_aligner: 0 })

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value
  const q = searchQuery.value.toLowerCase()
  return patients.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.record_no && p.record_no.toLowerCase().includes(q))
  )
})

const allEvents = computed(() => {
  const events = []
  for (const r of records.value) {
    events.push({ key: 'bonding-' + r.id, type: 'bonding', id: r.id, date: r.record_date, notes: r.notes })
  }
  for (const c of checkups.value) {
    events.push({ key: 'checkup-' + c.id, type: 'checkup', id: c.id, date: c.checkup_date, notes: c.notes })
  }
  events.sort((a, b) => new Date(b.date) - new Date(a.date))
  return events
})

const overview = computed(() => {
  const sortedRecords = [...records.value].sort((a, b) => new Date(b.record_date) - new Date(a.record_date))
  const sortedCheckups = [...checkups.value].sort((a, b) => new Date(b.checkup_date) - new Date(a.checkup_date))
  const lastBonding = sortedRecords[0] || null
  const lastCheckup = sortedCheckups[0] || null
  let lastBondingAttach = 0
  if (lastBonding) {
    lastBondingAttach = (attachmentsMap.value[lastBonding.id] || []).length
  }
  let lastCheckupItems = 0
  if (lastCheckup) {
    lastCheckupItems = (checkupItemsMap.value[lastCheckup.id] || []).length
  }
  let totalLost = 0
  let totalRebond = 0
  for (const cid of Object.keys(checkupItemsMap.value)) {
    const items = checkupItemsMap.value[cid]
    for (const item of items) {
      if (item.check_status === 'lost') totalLost++
      if (item.check_status === 'rebond') totalRebond++
    }
  }
  return {
    lastBonding: lastBonding?.record_date || null,
    lastBondingAttach,
    lastCheckup: lastCheckup?.checkup_date || null,
    lastCheckupItems,
    totalLost,
    totalRebond
  }
})

watch(() => props.selectedId, (id) => {
  if (id && patients.value.length > 0) {
    const p = patients.value.find(x => x.id === id)
    if (p && selectedPatient.value?.id !== id) selectPatient(p)
  }
})

onMounted(async () => { await loadPatients() })

async function loadPatients() {
  patients.value = await window.electronAPI.listPatients()
  if (props.selectedId && !selectedPatient.value) {
    const p = patients.value.find(x => x.id === props.selectedId)
    if (p) await selectPatient(p)
  }
}

async function loadRecords(patientId) {
  records.value = await window.electronAPI.listRecords(patientId)
  checkups.value = await window.electronAPI.listCheckups(patientId)
  attachmentsMap.value = {}
  photosMap.value = {}
  checkupItemsMap.value = {}
  checkupPhotosMap.value = {}

  for (const r of records.value) {
    attachmentsMap.value[r.id] = await window.electronAPI.listAttachments(r.id)
    const photos = await window.electronAPI.listPhotos(r.id)
    for (const p of photos) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
    photosMap.value[r.id] = photos
  }

  for (const c of checkups.value) {
    checkupItemsMap.value[c.id] = await window.electronAPI.listCheckupItems(c.id)
    const chPhotos = await window.electronAPI.listCheckupPhotos(c.id)
    for (const p of chPhotos) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
    checkupPhotosMap.value[c.id] = chPhotos
  }
}

async function selectPatient(p) {
  selectedPatient.value = p
  await loadRecords(p.id)
  emit('select', p)
}

function toggleExpand(key) {
  expandedEvent.value = expandedEvent.value === key ? null : key
}

function openForm(patient) {
  editingPatient.value = patient || null
  if (patient) {
    formData.value = { ...patient }
  } else {
    formData.value = { name: '', record_no: '', appliance_brand: '', current_aligner: 0 }
  }
  formVisible.value = true
}

function closeForm() {
  formVisible.value = false
  editingPatient.value = null
}

async function savePatient() {
  if (!formData.value.name.trim()) { alert('请填写患者姓名'); return }
  if (editingPatient.value) {
    await window.electronAPI.updatePatient(editingPatient.value.id, formData.value)
  } else {
    await window.electronAPI.createPatient(formData.value)
  }
  await loadPatients()
  if (editingPatient.value) {
    const updated = patients.value.find(p => p.id === editingPatient.value.id)
    if (updated && selectedPatient.value?.id === updated.id) selectedPatient.value = updated
  }
  closeForm()
}

async function deletePatient(p) {
  if (!confirm(`确定删除患者 "${p.name}"？此操作会同时删除全部就诊记录。`)) return
  await window.electronAPI.deletePatient(p.id)
  if (selectedPatient.value?.id === p.id) { selectedPatient.value = null; records.value = []; checkups.value = [] }
  await loadPatients()
}

async function exportPatient() {
  if (!selectedPatient.value) return
  const result = await window.electronAPI.exportPatientToFile(selectedPatient.value.id)
  if (result) alert('导出成功！文件已保存。')
}

async function importPatient() {
  const newId = await window.electronAPI.importPatientFromFile()
  if (newId) {
    await loadPatients()
    const imported = patients.value.find(p => p.id === newId)
    if (imported) {
      selectedPatient.value = imported
      await loadRecords(newId)
    }
    alert('导入成功！')
  }
}

function getAttachmentCount(recordId) { return attachmentsMap.value[recordId]?.length || 0 }
function getPhotoCount(recordId) { return photosMap.value[recordId]?.length || 0 }
function getAttachments(recordId) { return attachmentsMap.value[recordId] || [] }
function getPhotos(recordId) { return photosMap.value[recordId] || [] }
function getCheckupItems(checkupId) { return checkupItemsMap.value[checkupId] || [] }
function getCheckupPhotos(checkupId) { return checkupPhotosMap.value[checkupId] || [] }

function checkupSummary(checkupId) {
  const items = checkupItemsMap.value[checkupId] || []
  const counts = { good: 0, worn: 0, lost: 0, rebond: 0 }
  for (const item of items) {
    if (counts[item.check_status] !== undefined) counts[item.check_status]++
  }
  return [
    { status: 'good', label: '完好', count: counts.good, cls: 'green' },
    { status: 'worn', label: '磨耗', count: counts.worn, cls: 'yellow' },
    { status: 'lost', label: '脱落', count: counts.lost, cls: 'red' },
    { status: 'rebond', label: '重粘', count: counts.rebond, cls: 'blue' }
  ].filter(s => s.count > 0)
}

function statusLabel(s) {
  const map = { good: '完好', worn: '磨耗', lost: '脱落', rebond: '重粘' }
  return map[s] || s
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function formatDateShort(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function openPhotoViewer(photos, index, title) {
  photoViewerPhotos.value = photos.map(p => ({
    ...p,
    title: title
  }))
  photoViewerIndex.value = index
  photoViewerVisible.value = true
}
</script>

<style scoped>
.patient-panel { display: flex; gap: 20px; height: 100%; }

.patient-list {
  width: 320px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden;
}
.list-header { padding: 14px; display: flex; gap: 8px; border-bottom: 1px solid var(--border); }
.list-header .input { flex: 1; }

.list-body { flex: 1; overflow-y: auto; padding: 8px; }

.patient-item {
  display: flex; align-items: center; padding: 10px; border-radius: 8px;
  cursor: pointer; gap: 10px; transition: background 0.15s ease;
}
.patient-item:hover { background: #f9fafb; }
.patient-item.active { background: var(--primary-light); }

.patient-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #a78bfa); color: white;
  display: flex; align-items: center; justify-content: center;
  font-weight: 600; font-size: 13px; flex-shrink: 0;
}
.patient-info { flex: 1; min-width: 0; }
.patient-name { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
.patient-meta { font-size: 11px; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap; }

.item-edit, .item-delete {
  opacity: 0; padding: 4px 6px; border-radius: 4px; font-size: 13px; transition: all 0.15s ease;
}
.patient-item:hover .item-edit, .patient-item:hover .item-delete { opacity: 1; }
.item-edit:hover { background: #e0e7ff; color: var(--primary); }
.item-delete:hover { background: #fee2e2; color: var(--danger); }

.patient-detail { flex: 1; overflow-y: auto; padding: 24px; }
.empty-panel { display: flex; align-items: center; justify-content: center; }

.detail-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 16px; border-bottom: 1px solid var(--border); margin-bottom: 20px;
}
.detail-name { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
.detail-sub { display: flex; gap: 8px; flex-wrap: wrap; }
.detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.detail-section { margin-top: 8px; }

.overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.ov-card {
  background: #f9fafb;
  border-radius: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border);
}
.ov-card.ov-warn { background: #fffbeb; border-color: #fde68a; }
.ov-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.ov-value {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 2px;
}
.ov-value.ov-red { color: var(--danger); }
.ov-value.ov-blue { color: var(--primary); }
.ov-sub {
  font-size: 11px;
  color: var(--text-muted);
}
.ov-empty { opacity: 0.6; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }

.timeline { position: relative; padding-left: 20px; }
.timeline::before {
  content: ''; position: absolute; left: 7px; top: 4px; bottom: 4px;
  width: 2px; background: var(--border);
}
.timeline-item { position: relative; padding-bottom: 16px; }
.timeline-item:last-child { padding-bottom: 0; }

.timeline-dot {
  position: absolute; left: -20px; top: 4px; width: 16px; height: 16px;
  border-radius: 50%; background: var(--primary); border: 3px solid white;
  box-shadow: 0 0 0 2px var(--primary);
}
.timeline-dot.dot-checkup { background: var(--accent); box-shadow: 0 0 0 2px var(--accent); }

.timeline-content {
  background: #f9fafb; padding: 12px 14px; border-radius: 8px;
}
.timeline-content.expanded { background: #f0f4ff; }

.tl-row { display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 6px; }
.tl-left { display: flex; align-items: center; gap: 8px; }
.tl-badge {
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
  background: var(--primary-light); color: var(--primary);
}
.tl-badge.tl-checkup { background: #ede9fe; color: var(--accent); }
.tl-date { font-weight: 600; font-size: 13px; }
.tl-expand { font-size: 10px; color: var(--text-muted); }

.tl-stats { display: flex; gap: 6px; margin-bottom: 4px; flex-wrap: wrap; }
.tl-notes { font-size: 13px; color: var(--text); line-height: 1.5; margin-bottom: 4px; }

.mini-badge { padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; }
.mb-green { background: #dcfce7; color: var(--success); }
.mb-yellow { background: #fef3c7; color: var(--warning); }
.mb-red { background: #fee2e2; color: var(--danger); }
.mb-blue { background: #dbeafe; color: var(--primary); }

.tl-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }

.att-row {
  display: flex; align-items: center; gap: 10px; padding: 6px 0;
  border-bottom: 1px solid #f0f0f0; font-size: 13px;
}
.att-row:last-child { border-bottom: none; }
.att-tooth { font-weight: 700; min-width: 30px; }
.att-shape { color: var(--text-muted); min-width: 70px; }
.att-notes { color: var(--text-muted); font-size: 12px; flex: 1; }

.tl-photos { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.tl-photos-label { font-size: 12px; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; width: 100%; }
.tl-photo-thumb {
  width: 64px; height: 64px; border-radius: 6px; overflow: hidden; background: #000;
}
.tl-photo-thumb img { width: 100%; height: 100%; object-fit: cover; }

.tl-checkup-detail { overflow-x: auto; }

.checkup-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.checkup-table th {
  text-align: left; padding: 6px 10px; background: #eef2ff;
  border-bottom: 1px solid var(--border); font-weight: 600; font-size: 12px; color: var(--text-muted);
}
.checkup-table td {
  padding: 6px 10px; border-bottom: 1px solid #f0f0f0;
}
.ct-tooth { font-weight: 700; }
.ct-notes { color: var(--text-muted); max-width: 200px; }

.status-tag {
  padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
}
.st-good { background: #dcfce7; color: var(--success); }
.st-worn { background: #fef3c7; color: var(--warning); }
.st-lost { background: #fee2e2; color: var(--danger); }
.st-rebond { background: #dbeafe; color: var(--primary); }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal { width: 420px; max-width: 90vw; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-close { font-size: 18px; color: var(--text-muted); padding: 4px 8px; border-radius: 4px; }
.modal-close:hover { background: #f3f4f6; color: var(--text); }
.modal-body { padding: 20px; overflow-y: auto; }
.form-row { margin-bottom: 16px; }
.form-row:last-child { margin-bottom: 0; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--border); }
</style>
