<template>
  <div class="patient-panel">
    <aside class="patient-list panel">
      <div class="list-header">
        <input
          v-model="searchQuery"
          class="input"
          placeholder="搜索姓名 / 病历号..."
        />
        <button class="btn btn-primary btn-sm" @click="openForm()">
          <span>＋</span> 新建
        </button>
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
            <span v-if="selectedPatient.record_no" class="badge badge-blue">
              病历号: {{ selectedPatient.record_no }}
            </span>
            <span v-if="selectedPatient.appliance_brand" class="badge badge-purple">
              {{ selectedPatient.appliance_brand }}
            </span>
            <span v-if="selectedPatient.current_aligner" class="badge badge-green">
              当前第{{ selectedPatient.current_aligner }}副
            </span>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary btn-sm" @click="openForm(selectedPatient)">
            编辑信息
          </button>
          <button class="btn btn-primary btn-sm" @click="$emit('select', selectedPatient)">
            开始记录
          </button>
        </div>
      </div>

      <div class="detail-section">
        <h3 class="section-title">📋 就诊记录时间线</h3>
        <div v-if="records.length === 0" class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">暂无记录，开始第一次附件粘接记录</div>
        </div>
        <div v-else class="timeline">
          <div v-for="r in records" :key="r.id" class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-date">{{ formatDate(r.record_date) }}</div>
              <div v-if="r.notes" class="timeline-notes">{{ r.notes }}</div>
              <div class="timeline-stats">
                <span class="badge badge-blue">附件 {{ getAttachmentCount(r.id) }} 颗</span>
                <span class="badge badge-gray">照片 {{ getPhotoCount(r.id) }} 张</span>
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
            <input
              v-model.number="formData.current_aligner"
              type="number"
              min="0"
              class="input"
              placeholder="如：12"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeForm">取消</button>
          <button class="btn btn-primary" @click="savePatient">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  selectedId: Number
})
const emit = defineEmits(['select'])

const patients = ref([])
const records = ref([])
const attachmentsMap = ref({})
const photosMap = ref({})
const searchQuery = ref('')
const selectedPatient = ref(null)

const formVisible = ref(false)
const editingPatient = ref(null)
const formData = ref({
  name: '',
  record_no: '',
  appliance_brand: '',
  current_aligner: 0
})

const filteredPatients = computed(() => {
  if (!searchQuery.value) return patients.value
  const q = searchQuery.value.toLowerCase()
  return patients.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.record_no && p.record_no.toLowerCase().includes(q))
  )
})

watch(() => props.selectedId, (id) => {
  if (id) {
    const p = patients.value.find(x => x.id === id)
    if (p) selectPatient(p)
  }
}, { immediate: true })

onMounted(async () => {
  await loadPatients()
})

async function loadPatients() {
  patients.value = await window.electronAPI.listPatients()
}

async function loadRecords(patientId) {
  records.value = await window.electronAPI.listRecords(patientId)
  attachmentsMap.value = {}
  photosMap.value = {}
  for (const r of records.value) {
    const atts = await window.electronAPI.listAttachments(r.id)
    attachmentsMap.value[r.id] = atts
    const photos = await window.electronAPI.listPhotos(r.id)
    photosMap.value[r.id] = photos
  }
}

async function selectPatient(p) {
  selectedPatient.value = p
  await loadRecords(p.id)
  emit('select', p)
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
  if (!formData.value.name.trim()) {
    alert('请填写患者姓名')
    return
  }
  if (editingPatient.value) {
    await window.electronAPI.updatePatient(editingPatient.value.id, formData.value)
  } else {
    await window.electronAPI.createPatient(formData.value)
  }
  await loadPatients()
  if (editingPatient.value) {
    const updated = patients.value.find(p => p.id === editingPatient.value.id)
    if (updated && selectedPatient.value?.id === updated.id) {
      selectedPatient.value = updated
    }
  }
  closeForm()
}

async function deletePatient(p) {
  if (!confirm(`确定删除患者 "${p.name}"？此操作会同时删除全部就诊记录。`)) return
  await window.electronAPI.deletePatient(p.id)
  if (selectedPatient.value?.id === p.id) {
    selectedPatient.value = null
    records.value = []
  }
  await loadPatients()
}

function getAttachmentCount(recordId) {
  return attachmentsMap.value[recordId]?.length || 0
}

function getPhotoCount(recordId) {
  return photosMap.value[recordId]?.length || 0
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.patient-panel {
  display: flex;
  gap: 20px;
  height: 100%;
}

.patient-list {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-header {
  padding: 14px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}
.list-header .input { flex: 1; }

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.patient-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  gap: 10px;
  transition: background 0.15s ease;
}
.patient-item:hover { background: #f9fafb; }
.patient-item.active { background: var(--primary-light); }

.patient-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  flex-shrink: 0;
}

.patient-info {
  flex: 1;
  min-width: 0;
}
.patient-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
}
.patient-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.item-edit, .item-delete {
  opacity: 0;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.15s ease;
}
.patient-item:hover .item-edit,
.patient-item:hover .item-delete { opacity: 1; }
.item-edit:hover { background: #e0e7ff; color: var(--primary); }
.item-delete:hover { background: #fee2e2; color: var(--danger); }

.patient-detail {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.detail-name {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 8px;
}
.detail-sub {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-actions {
  display: flex;
  gap: 8px;
}

.detail-section { margin-top: 8px; }
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
}

.timeline {
  position: relative;
  padding-left: 20px;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: var(--border);
}

.timeline-item {
  position: relative;
  padding-bottom: 20px;
}
.timeline-item:last-child { padding-bottom: 0; }

.timeline-dot {
  position: absolute;
  left: -20px;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  border: 3px solid white;
  box-shadow: 0 0 0 2px var(--primary);
}

.timeline-content {
  background: #f9fafb;
  padding: 12px 14px;
  border-radius: 8px;
}
.timeline-date {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--text);
}
.timeline-notes {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 8px;
  line-height: 1.5;
}
.timeline-stats { display: flex; gap: 6px; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  width: 420px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 { font-size: 16px; font-weight: 600; }
.modal-close {
  font-size: 18px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 4px;
}
.modal-close:hover { background: #f3f4f6; color: var(--text); }

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.form-row {
  margin-bottom: 16px;
}
.form-row:last-child { margin-bottom: 0; }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border);
}
</style>
