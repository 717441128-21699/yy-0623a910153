<template>
  <div class="compare-panel">
    <div v-if="!patient" class="panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-text">请先在「患者档案」中选择一位患者</div>
      </div>
    </div>

    <div v-else-if="records.length < 1" class="panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">暂无就诊记录，先去「快速记录」创建一条吧</div>
      </div>
    </div>

    <div v-else class="compare-layout">
      <!-- Left sidebar: Record list timeline -->
      <div class="panel timeline-sidebar">
        <div class="sidebar-header">
          <h3>📋 就诊时间线</h3>
          <span class="hint">选择 1-2 次记录对比</span>
        </div>
        <div class="timeline-list">
          <div
            v-for="r in records"
            :key="r.id"
            class="timeline-card"
            :class="{
              'sel-primary': primaryRecord?.id === r.id,
              'sel-compare': compareRecord?.id === r.id
            }"
            @click="selectRecord(r)"
          >
            <div class="tc-header">
              <span class="tc-date">{{ formatDate(r.record_date) }}</span>
              <div class="tc-badges">
                <span v-if="primaryRecord?.id === r.id" class="badge badge-blue">基准</span>
                <span v-if="compareRecord?.id === r.id" class="badge badge-purple">对比</span>
              </div>
            </div>
            <div class="tc-stats">
              <span class="badge badge-gray">附件 {{ getAttachCount(r.id) }}颗</span>
              <span class="badge badge-gray">照片 {{ getPhotoCount(r.id) }}张</span>
            </div>
            <div v-if="r.notes" class="tc-notes">{{ r.notes }}</div>
            <div v-if="getAttachList(r.id).length" class="tc-teeth">
              {{ getAttachList(r.id).join('、') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Main content: Comparison -->
      <div class="compare-main">
        <div class="panel compare-charts">
          <div class="compare-chart" :class="{ single: !compareRecord }">
            <div class="chart-title">
              <span class="title-dot primary"></span>
              <span class="title-text">
                {{ primaryRecord ? formatDate(primaryRecord.record_date) : '请选择基准记录' }}
              </span>
              <span v-if="primaryRecord" class="title-count">{{ getAttachCount(primaryRecord.id) }}颗附件</span>
            </div>
            <ToothChart
              :selectedTeeth="[]"
              :attachmentsMap="primaryAttachments"
              :statusColors="statusColors"
              :interactive="false"
            />
          </div>

          <div v-if="compareRecord" class="compare-chart">
            <div class="chart-title">
              <span class="title-dot compare"></span>
              <span class="title-text">{{ formatDate(compareRecord.record_date) }}</span>
              <span class="title-count">{{ getAttachCount(compareRecord.id) }}颗附件</span>
            </div>
            <ToothChart
              :selectedTeeth="[]"
              :attachmentsMap="compareAttachments"
              :statusColors="statusColors"
              :interactive="false"
            />
          </div>
        </div>

        <!-- Status legend -->
        <div class="panel compare-legend">
          <div class="legend-row">
            <span class="legend-item"><span class="badge badge-blue">基准记录</span> 作为本次复诊的参考（上次应有状态）</span>
          </div>
          <div class="legend-row">
            <span class="legend-item"><span class="dot green"></span>完好</span>
            <span class="legend-item"><span class="dot yellow"></span>磨耗</span>
            <span class="legend-item"><span class="dot red"></span>脱落</span>
            <span class="legend-item"><span class="dot blue"></span>重粘/新增</span>
            <span class="legend-item"><span class="dot purple"></span>历史记录</span>
          </div>
        </div>

        <!-- Check & Mark panel -->
        <div class="panel check-panel" v-if="primaryRecord">
          <div class="check-header">
            <h3>🔍 本次复诊检查</h3>
            <button class="btn btn-secondary btn-sm" @click="clearMarks">清空标记</button>
          </div>

          <div class="check-hint">在下方列表中点击每颗牙的当前状态：</div>

          <div class="check-grid">
            <div
              v-for="tooth in allCheckTeeth"
              :key="tooth"
              class="check-item"
              :class="'st-' + (checkResults[tooth] || 'none')"
            >
              <div class="ci-tooth">
                <span class="ci-num">{{ tooth }}</span>
                <span class="ci-shape" v-if="getToothShape(tooth)">
                  {{ getToothShape(tooth) }}
                </span>
              </div>
              <div class="ci-buttons">
                <button
                  class="st-btn green"
                  :class="{ active: checkResults[tooth] === 'good' }"
                  @click="markStatus(tooth, 'good')"
                  title="完好"
                >✓</button>
                <button
                  class="st-btn yellow"
                  :class="{ active: checkResults[tooth] === 'worn' }"
                  @click="markStatus(tooth, 'worn')"
                  title="磨耗"
                >⚠</button>
                <button
                  class="st-btn red"
                  :class="{ active: checkResults[tooth] === 'lost' }"
                  @click="markStatus(tooth, 'lost')"
                  title="脱落"
                >✕</button>
                <button
                  class="st-btn blue"
                  :class="{ active: checkResults[tooth] === 'rebond' }"
                  @click="markStatus(tooth, 'rebond')"
                  title="重粘"
                >↻</button>
              </div>
              <input
                v-model="checkNotes[tooth]"
                class="ci-note"
                placeholder="备注..."
              />
            </div>
          </div>

          <div v-if="allCheckTeeth.length === 0" class="empty-state" style="padding:20px;">
            <div class="empty-state-icon">🦷</div>
            <div class="empty-state-text">基准记录中暂无附件</div>
          </div>

          <!-- Summary -->
          <div class="check-summary" v-if="summary.total > 0">
            <div class="divider"></div>
            <h4 class="sum-title">检查结果汇总</h4>
            <div class="sum-stats">
              <div class="sum-stat">
                <span class="sum-label">应检查</span>
                <span class="sum-value">{{ summary.total }}</span>
              </div>
              <div class="sum-stat">
                <span class="sum-label">已标记</span>
                <span class="sum-value">{{ summary.marked }}</span>
              </div>
              <div class="sum-stat good">
                <span class="sum-label">完好</span>
                <span class="sum-value">{{ summary.good }}</span>
              </div>
              <div class="sum-stat worn">
                <span class="sum-label">磨耗</span>
                <span class="sum-value">{{ summary.worn }}</span>
              </div>
              <div class="sum-stat lost">
                <span class="sum-label">脱落</span>
                <span class="sum-value">{{ summary.lost }}</span>
              </div>
              <div class="sum-stat rebond">
                <span class="sum-label">重粘</span>
                <span class="sum-value">{{ summary.rebond }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Photos comparison -->
        <div class="panel photos-panel" v-if="primaryRecord && (primaryPhotos.length || comparePhotos.length)">
          <div class="check-header">
            <h3>📷 照片对比</h3>
          </div>
          <div class="photos-compare">
            <div class="photos-col">
              <div class="col-label">
                <span class="title-dot primary"></span>
                {{ primaryRecord ? formatDate(primaryRecord.record_date) : '' }}
                ({{ primaryPhotos.length }}张)
              </div>
              <div class="photos-grid">
                <div v-for="(p, i) in primaryPhotos" :key="'p'+i" class="photo-thumb">
                  <img :src="p.preview" />
                </div>
                <div v-if="primaryPhotos.length === 0" class="empty-photos">无照片</div>
              </div>
            </div>
            <div v-if="compareRecord" class="photos-col">
              <div class="col-label">
                <span class="title-dot compare"></span>
                {{ formatDate(compareRecord.record_date) }}
                ({{ comparePhotos.length }}张)
              </div>
              <div class="photos-grid">
                <div v-for="(p, i) in comparePhotos" :key="'c'+i" class="photo-thumb">
                  <img :src="p.preview" />
                </div>
                <div v-if="comparePhotos.length === 0" class="empty-photos">无照片</div>
              </div>
            </div>
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

const records = ref([])
const attachmentsByRecord = reactive({})
const photosByRecord = reactive({})

const primaryRecord = ref(null)
const compareRecord = ref(null)

const checkResults = reactive({})
const checkNotes = reactive({})

const statusColors = {
  good: 'green',
  worn: 'yellow',
  lost: 'red',
  rebond: 'blue',
  new: 'purple',
  history: 'purple'
}

const primaryAttachments = computed(() => {
  if (!primaryRecord.value) return {}
  const map = {}
  const list = attachmentsByRecord[primaryRecord.value.id] || []
  for (const a of list) {
    map[a.tooth_number] = { ...a, status: checkResults[a.tooth_number] || 'history' }
  }
  return map
})

const compareAttachments = computed(() => {
  if (!compareRecord.value) return {}
  const map = {}
  const list = attachmentsByRecord[compareRecord.value.id] || []
  for (const a of list) {
    map[a.tooth_number] = { ...a, status: 'history' }
  }
  return map
})

const allCheckTeeth = computed(() => {
  if (!primaryRecord.value) return []
  const list = attachmentsByRecord[primaryRecord.value.id] || []
  return list.map(a => a.tooth_number).sort()
})

const primaryPhotos = computed(() => {
  if (!primaryRecord.value) return []
  return photosByRecord[primaryRecord.value.id] || []
})

const comparePhotos = computed(() => {
  if (!compareRecord.value) return []
  return photosByRecord[compareRecord.value.id] || []
})

const summary = computed(() => {
  const total = allCheckTeeth.value.length
  let good = 0, worn = 0, lost = 0, rebond = 0, marked = 0
  for (const t of allCheckTeeth.value) {
    const s = checkResults[t]
    if (s) {
      marked++
      if (s === 'good') good++
      else if (s === 'worn') worn++
      else if (s === 'lost') lost++
      else if (s === 'rebond') rebond++
    }
  }
  return { total, marked, good, worn, lost, rebond }
})

watch(() => props.patient, async (p) => {
  if (p) await loadData()
}, { immediate: true })

async function loadData() {
  records.value = await window.electronAPI.listRecords(props.patient.id)
  for (const r of records.value) {
    const atts = await window.electronAPI.listAttachments(r.id)
    attachmentsByRecord[r.id] = atts
    const phs = await window.electronAPI.listPhotos(r.id)
    for (const p of phs) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
    photosByRecord[r.id] = phs
  }
  if (records.value.length > 0) {
    primaryRecord.value = records.value[0]
    if (records.value.length > 1) {
      compareRecord.value = records.value[1]
    }
  }
  clearMarks()
}

function selectRecord(r) {
  if (!primaryRecord.value || (primaryRecord.value.id !== r.id && !compareRecord.value)) {
    primaryRecord.value = r
  } else if (primaryRecord.value.id === r.id) {
    primaryRecord.value = compareRecord.value
    compareRecord.value = null
  } else if (compareRecord.value?.id === r.id) {
    compareRecord.value = null
  } else {
    compareRecord.value = r
  }
  clearMarks()
}

function getAttachCount(recordId) {
  return attachmentsByRecord[recordId]?.length || 0
}
function getPhotoCount(recordId) {
  return photosByRecord[recordId]?.length || 0
}
function getAttachList(recordId) {
  return (attachmentsByRecord[recordId] || []).map(a => a.tooth_number)
}
function getToothShape(tooth) {
  if (!primaryRecord.value) return ''
  const atts = attachmentsByRecord[primaryRecord.value.id] || []
  const found = atts.find(a => a.tooth_number === tooth)
  return found?.shape || ''
}

function markStatus(tooth, status) {
  if (checkResults[tooth] === status) {
    delete checkResults[tooth]
  } else {
    checkResults[tooth] = status
  }
}

function clearMarks() {
  for (const k of Object.keys(checkResults)) delete checkResults[k]
  for (const k of Object.keys(checkNotes)) delete checkNotes[k]
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<style scoped>
.compare-panel { width: 100%; height: 100%; }
.empty-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.compare-layout {
  display: flex;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

.timeline-sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px;
}
.sidebar-header {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.sidebar-header h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.sidebar-header .hint {
  font-size: 11px;
  color: var(--text-muted);
}

.timeline-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.timeline-card {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
}
.timeline-card:hover { border-color: var(--border); }
.timeline-card.sel-primary {
  border-color: var(--primary);
  background: var(--primary-light);
}
.timeline-card.sel-compare {
  border-color: var(--accent);
  background: #ede9fe;
}

.tc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.tc-date {
  font-weight: 600;
  font-size: 13px;
}
.tc-badges { display: flex; gap: 4px; }

.tc-stats {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.tc-notes {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 4px;
}
.tc-teeth {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}

.compare-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.compare-charts {
  display: flex;
  gap: 16px;
  padding: 16px;
}
.compare-chart {
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}
.compare-chart.single { flex: 1; max-width: 600px; margin: 0 auto; }

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
}
.title-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.title-dot.primary { background: var(--primary); }
.title-dot.compare { background: var(--accent); }
.title-text { flex: 1; }
.title-count {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: normal;
}

.compare-legend {
  padding: 12px 18px;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.legend-row:first-child { margin-bottom: 8px; }
.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.legend-item .dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  display: inline-block;
}
.legend-item .dot.green { background: var(--success); }
.legend-item .dot.yellow { background: var(--warning); }
.legend-item .dot.red { background: var(--danger); }
.legend-item .dot.blue { background: var(--primary); }
.legend-item .dot.purple { background: var(--accent); }

.check-panel, .photos-panel {
  padding: 16px 18px;
}
.check-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.check-header h3 {
  font-size: 15px;
  font-weight: 600;
}
.check-hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 14px;
}

.check-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f9fafb;
  border: 2px solid transparent;
  transition: all 0.15s ease;
}
.check-item.st-good { border-color: var(--success); background: #f0fdf4; }
.check-item.st-worn { border-color: var(--warning); background: #fffbeb; }
.check-item.st-lost { border-color: var(--danger); background: #fef2f2; }
.check-item.st-rebond { border-color: var(--primary); background: #eff6ff; }

.ci-tooth {
  display: flex;
  flex-direction: column;
  min-width: 70px;
}
.ci-num {
  font-weight: 700;
  font-size: 14px;
}
.ci-shape {
  font-size: 10px;
  color: var(--text-muted);
}

.ci-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.st-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  border: 2px solid var(--border);
  background: white;
  transition: all 0.15s ease;
}
.st-btn.green { color: var(--success); }
.st-btn.yellow { color: var(--warning); }
.st-btn.red { color: var(--danger); }
.st-btn.blue { color: var(--primary); }
.st-btn.green.active { background: var(--success); color: white; border-color: var(--success); }
.st-btn.yellow.active { background: var(--warning); color: white; border-color: var(--warning); }
.st-btn.red.active { background: var(--danger); color: white; border-color: var(--danger); }
.st-btn.blue.active { background: var(--primary); color: white; border-color: var(--primary); }

.ci-note {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  font-size: 12px;
  background: white;
  outline: none;
}
.ci-note:focus { border-color: var(--primary); }

.check-summary {
  margin-top: 16px;
}
.sum-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}
.sum-stats {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.sum-stat {
  background: #f3f4f6;
  padding: 8px 14px;
  border-radius: 8px;
  text-align: center;
  min-width: 70px;
}
.sum-stat.good { background: #dcfce7; }
.sum-stat.worn { background: #fef3c7; }
.sum-stat.lost { background: #fee2e2; }
.sum-stat.rebond { background: #dbeafe; }

.sum-label {
  font-size: 11px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 2px;
}
.sum-value {
  font-size: 18px;
  font-weight: 700;
}

.photos-compare {
  display: flex;
  gap: 16px;
}
.photos-col {
  flex: 1;
}
.col-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-muted);
}

.photos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
  min-height: 80px;
}
.photo-thumb {
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
}
.photo-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.empty-photos {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 12px;
  background: #f9fafb;
  border-radius: 6px;
}
</style>
