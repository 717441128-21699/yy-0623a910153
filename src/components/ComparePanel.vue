<template>
  <div class="compare-panel">
    <div v-if="!patient" class="panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-text">请先在「患者档案」中选择一位患者</div>
      </div>
    </div>

    <div v-else-if="allEvents.length === 0" class="panel empty-panel">
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">暂无就诊记录，先去「快速记录」创建一条吧</div>
      </div>
    </div>

    <div v-else class="compare-layout">
      <div class="panel timeline-sidebar">
        <div class="sidebar-header">
          <h3>📋 就诊时间线</h3>
          <span class="hint">粘接可选为基准/对比</span>
        </div>
        <div class="timeline-list">
          <div
            v-for="ev in allEvents"
            :key="ev.key"
            class="timeline-card"
            :class="{
              'sel-primary': primaryRecord?.id === ev.id && ev.type === 'bonding',
              'sel-compare': compareRecord?.id === ev.id && ev.type === 'bonding',
              expanded: expandedTimelineId === ev.key
            }"
          >
            <div class="tc-header" @click="toggleTimelineExpand(ev)">
              <span class="tc-date">{{ formatDate(ev.date) }}</span>
              <div class="tc-badges">
                <span v-if="ev.type === 'bonding'" class="badge badge-blue">粘接</span>
                <span v-else class="badge badge-purple">复诊</span>
                <span v-if="primaryRecord?.id === ev.id && ev.type === 'bonding'" class="badge badge-blue">基准</span>
                <span v-if="compareRecord?.id === ev.id && ev.type === 'bonding'" class="badge badge-purple">对比</span>
                <span class="tc-expand">{{ expandedTimelineId === ev.key ? '▲' : '▼' }}</span>
              </div>
            </div>

            <div v-if="ev.type === 'bonding'" class="tc-stats">
              <span class="badge badge-gray">附件 {{ getAttachCount(ev.id) }}颗</span>
              <span class="badge badge-gray">照片 {{ getPhotoCount(ev.id) }}张</span>
            </div>
            <div v-else class="tc-stats">
              <span class="badge badge-gray">检查 {{ getCheckupItemCount(ev.id) }}颗</span>
              <span class="badge badge-gray">照片 {{ getCheckupPhotoCount(ev.id) }}张</span>
            </div>

            <div v-if="ev.type === 'checkup'" class="tc-status-bar">
              <div v-for="s in checkupSummary(ev.id)" :key="s.status" class="sb-seg" :class="'sb-' + s.cls" :style="{ width: getCheckupRatio(ev.id, s.count) + '%' }">
                <span v-if="s.count > 0" class="sb-label">{{ s.count }}</span>
              </div>
            </div>

            <div v-if="ev.notes" class="tc-notes">{{ ev.notes }}</div>

            <div v-if="expandedTimelineId === ev.key" class="tc-expand-body">
              <div v-if="ev.type === 'bonding'" class="tc-teeth-list">
                <div class="tc-expand-title">附件明细 ({{ getAttachCount(ev.id) }}颗)</div>
                <div class="teeth-grid">
                  <span v-for="att in getAttachItems(ev.id)" :key="att.tooth_number" class="tooth-pill">
                    <span class="tp-num">{{ att.tooth_number }}</span>
                    <span class="tp-shape">{{ att.shape }}</span>
                  </span>
                </div>
              </div>

              <div v-else class="tc-teeth-list">
                <div class="tc-expand-title">检查明细 ({{ getCheckupItemCount(ev.id) }}颗)</div>
                <div class="teeth-grid">
                  <span v-for="item in getCheckupItems(ev.id)" :key="item.tooth_number" class="tooth-pill" :class="'tp-st-' + item.check_status">
                    <span class="tp-num">{{ item.tooth_number }}</span>
                    <span class="tp-status">{{ statusLabel(item.check_status) }}</span>
                  </span>
                </div>
                <div v-if="getCheckupItems(ev.id).length === 0" class="empty-small">暂无明细</div>
              </div>

              <div v-if="getPhotosByEvent(ev).length > 0" class="tc-photos">
                <div class="tc-expand-title">照片 ({{ getPhotosByEvent(ev).length }}张)</div>
                <div class="tc-photos-grid">
                  <div v-for="(p, i) in getPhotosByEvent(ev)" :key="i" class="tc-photo-thumb" @click.stop="openEventPhoto(ev, i)">
                    <img :src="p.preview" />
                  </div>
                </div>
              </div>

              <button v-if="ev.type === 'bonding'" class="btn btn-primary btn-sm btn-full" @click.stop="selectRecord(ev)">
                {{ primaryRecord?.id === ev.id ? '已设为基准' : '设为基准记录' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="compare-main">
        <div class="panel compare-charts">
          <div class="compare-chart" :class="{ single: !compareRecord }">
            <div class="chart-title">
              <span class="title-dot primary"></span>
              <span class="title-text">
                {{ primaryRecord ? formatDate(primaryRecord.record_date) : '请选择基准粘接记录' }}
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

        <div class="panel compare-legend">
          <div class="legend-row">
            <span class="legend-item"><span class="badge badge-blue">基准记录</span> 上次应有附件状态</span>
          </div>
          <div class="legend-row">
            <span class="legend-item"><span class="dot green"></span>完好</span>
            <span class="legend-item"><span class="dot yellow"></span>磨耗</span>
            <span class="legend-item"><span class="dot red"></span>脱落</span>
            <span class="legend-item"><span class="dot blue"></span>重粘</span>
            <span class="legend-item"><span class="dot purple"></span>历史</span>
          </div>
        </div>

        <div class="panel check-panel" v-if="primaryRecord">
          <div class="check-header">
            <h3>🔍 本次复诊检查</h3>
            <div class="check-actions">
              <button class="btn btn-secondary btn-sm" @click="clearMarks">清空</button>
              <button
                class="btn btn-primary btn-sm"
                :disabled="summary.marked === 0"
                @click="saveCheckup"
              >保存检查记录</button>
            </div>
          </div>

          <div class="check-hint">点击标记每颗牙的当前状态，完成后点「保存检查记录」：</div>

          <div class="check-grid">
            <div
              v-for="tooth in allCheckTeeth"
              :key="tooth"
              class="check-item"
              :class="'st-' + (checkResults[tooth] || 'none')"
              @click="openToothHistory(tooth)"
            >
              <div class="ci-tooth">
                <span class="ci-num">{{ tooth }}</span>
                <span class="ci-shape" v-if="getToothShape(tooth)">
                  {{ getToothShape(tooth) }}
                </span>
              </div>
              <div class="ci-buttons">
                <button class="st-btn green" :class="{ active: checkResults[tooth] === 'good' }" @click.stop="markStatus(tooth, 'good')" title="完好">✓</button>
                <button class="st-btn yellow" :class="{ active: checkResults[tooth] === 'worn' }" @click.stop="markStatus(tooth, 'worn')" title="磨耗">⚠</button>
                <button class="st-btn red" :class="{ active: checkResults[tooth] === 'lost' }" @click.stop="markStatus(tooth, 'lost')" title="脱落">✕</button>
                <button class="st-btn blue" :class="{ active: checkResults[tooth] === 'rebond' }" @click.stop="markStatus(tooth, 'rebond')" title="重粘">↻</button>
              </div>
              <input v-model="checkNotes[tooth]" class="ci-note" placeholder="备注..." @click.stop />
            </div>
          </div>

          <div v-if="allCheckTeeth.length === 0" class="empty-state" style="padding:20px;">
            <div class="empty-state-icon">🦷</div>
            <div class="empty-state-text">基准记录中暂无附件</div>
          </div>

          <div class="check-summary" v-if="summary.total > 0">
            <div class="divider"></div>
            <h4 class="sum-title">检查结果汇总</h4>
            <div class="sum-stats">
              <div class="sum-stat"><span class="sum-label">应检查</span><span class="sum-value">{{ summary.total }}</span></div>
              <div class="sum-stat"><span class="sum-label">已标记</span><span class="sum-value">{{ summary.marked }}</span></div>
              <div class="sum-stat good"><span class="sum-label">完好</span><span class="sum-value">{{ summary.good }}</span></div>
              <div class="sum-stat worn"><span class="sum-label">磨耗</span><span class="sum-value">{{ summary.worn }}</span></div>
              <div class="sum-stat lost"><span class="sum-label">脱落</span><span class="sum-value">{{ summary.lost }}</span></div>
              <div class="sum-stat rebond"><span class="sum-label">重粘</span><span class="sum-value">{{ summary.rebond }}</span></div>
            </div>
          </div>

          <div class="checkup-photos">
            <div class="photos-header">
              <h4 class="sum-title">📷 本次复诊照片</h4>
              <button class="btn btn-secondary btn-sm" @click="triggerCheckupPhotoInput">添加照片</button>
              <input ref="checkupPhotoInput" type="file" accept="image/*" multiple style="display:none" @change="onCheckupPhotoFiles" />
            </div>
            <div
              class="photo-dropzone small"
              :class="{ drag: isCheckupPhotoDragging }"
              @dragover.prevent="isCheckupPhotoDragging = true"
              @dragleave="isCheckupPhotoDragging = false"
              @drop.prevent="onCheckupPhotoDrop"
            >
              <div v-if="checkupPhotos.length === 0" class="dropzone-hint">
                <div class="dz-icon">🖼️</div>
                <div>拖放或点击上方按钮添加</div>
              </div>
              <div v-else class="photo-grid">
                <div v-for="(ph, idx) in checkupPhotos" :key="idx" class="photo-item" @click="openPhotoViewer(checkupPhotos, idx, '本次复诊照片')">
                  <img :src="ph.preview" />
                  <button class="photo-remove" @click.stop="removeCheckupPhoto(idx)">✕</button>
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <div v-for="(p, i) in primaryPhotos" :key="'p'+i" class="photo-thumb" @click="openPhotoViewer(primaryPhotos, i, '基准记录 · ' + formatDate(primaryRecord.record_date))"><img :src="p.preview" /></div>
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
                <div v-for="(p, i) in comparePhotos" :key="'c'+i" class="photo-thumb" @click="openPhotoViewer(comparePhotos, i, '对比记录 · ' + formatDate(compareRecord.record_date))"><img :src="p.preview" /></div>
                <div v-if="comparePhotos.length === 0" class="empty-photos">无照片</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="toothHistoryVisible" class="tooth-history-drawer" @click.self="toothHistoryVisible = false">
        <div class="th-panel">
          <div class="th-header">
            <div>
              <h3>🦷 {{ historyTooth }}号牙 时间线</h3>
              <div class="th-sub">从粘接到每次复诊的完整记录</div>
            </div>
            <button class="btn btn-ghost btn-sm" @click="toothHistoryVisible = false">✕</button>
          </div>
          <div class="th-body">
            <div v-if="toothHistory.length === 0" class="empty-state">
              <div class="empty-state-icon">📭</div>
              <div class="empty-state-text">该牙位暂无记录</div>
            </div>
            <div v-else class="th-timeline">
              <div v-for="item in toothHistory" :key="item.key" class="th-item">
                <div class="th-dot" :class="'thd-' + item.type"></div>
                <div class="th-content">
                  <div class="th-date">{{ formatDate(item.date) }}</div>
                  <div class="th-type">
                    <span class="badge" :class="item.type === 'bonding' ? 'badge-blue' : 'badge-purple'">
                      {{ item.type === 'bonding' ? '粘接记录' : '复诊检查' }}
                    </span>
                    <span v-if="item.status" class="th-status" :class="'ths-' + item.status">
                      {{ statusLabel(item.status) }}
                    </span>
                  </div>
                  <div v-if="item.shape" class="th-detail">附件形态：{{ item.shape }}</div>
                  <div v-if="item.notes" class="th-notes">{{ item.notes }}</div>
                </div>
              </div>
            </div>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import ToothChart from './ToothChart.vue'
import PhotoViewer from './PhotoViewer.vue'

const props = defineProps({ patient: Object })

const records = ref([])
const checkups = ref([])
const attachmentsByRecord = reactive({})
const photosByRecord = reactive({})
const checkupItemsMap = reactive({})
const checkupPhotosByCheckup = reactive({})

const expandedTimelineId = ref(null)

const primaryRecord = ref(null)
const compareRecord = ref(null)

const checkResults = reactive({})
const checkNotes = reactive({})
const checkupPhotos = ref([])
const isCheckupPhotoDragging = ref(false)
const checkupPhotoInput = ref(null)

const toothHistoryVisible = ref(false)
const historyTooth = ref(null)
const photoViewerVisible = ref(false)
const photoViewerPhotos = ref([])
const photoViewerIndex = ref(0)

const statusColors = {
  good: 'green',
  worn: 'yellow',
  lost: 'red',
  rebond: 'blue',
  new: 'purple',
  history: 'purple'
}

const allEvents = computed(() => {
  const events = []
  for (const r of records.value) {
    events.push({ key: 'bonding-' + r.id, type: 'bonding', id: r.id, date: r.record_date, notes: r.notes, ref: r })
  }
  for (const c of checkups.value) {
    events.push({ key: 'checkup-' + c.id, type: 'checkup', id: c.id, date: c.checkup_date, notes: c.notes, ref: c })
  }
  events.sort((a, b) => new Date(b.date) - new Date(a.date))
  return events
})

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
  checkups.value = await window.electronAPI.listCheckups(props.patient.id)

  for (const k of Object.keys(attachmentsByRecord)) delete attachmentsByRecord[k]
  for (const k of Object.keys(photosByRecord)) delete photosByRecord[k]
  for (const k of Object.keys(checkupItemsMap)) delete checkupItemsMap[k]
  for (const k of Object.keys(checkupPhotosByCheckup)) delete checkupPhotosByCheckup[k]

  for (const r of records.value) {
    attachmentsByRecord[r.id] = await window.electronAPI.listAttachments(r.id)
    const phs = await window.electronAPI.listPhotos(r.id)
    for (const p of phs) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
    photosByRecord[r.id] = phs
  }

  for (const c of checkups.value) {
    checkupItemsMap[c.id] = await window.electronAPI.listCheckupItems(c.id)
    const chPhs = await window.electronAPI.listCheckupPhotos(c.id)
    for (const p of chPhs) {
      p.preview = await window.electronAPI.readPhoto(p.file_path)
    }
    checkupPhotosByCheckup[c.id] = chPhs
  }

  if (records.value.length > 0) {
    primaryRecord.value = records.value[0]
    if (records.value.length > 1) {
      compareRecord.value = records.value[1]
    }
  }
  clearMarks()
}

function selectRecord(ev) {
  if (ev.type !== 'bonding') return
  if (!primaryRecord.value || (primaryRecord.value.id !== ev.id)) {
    if (primaryRecord.value?.id === ev.id) {
      primaryRecord.value = compareRecord.value
      compareRecord.value = null
    } else if (compareRecord.value?.id === ev.id) {
      compareRecord.value = null
    } else if (!primaryRecord.value) {
      primaryRecord.value = ev.ref
    } else {
      compareRecord.value = ev.ref
    }
  } else {
    primaryRecord.value = compareRecord.value
    compareRecord.value = null
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
function getCheckupItemCount(checkupId) {
  return checkupItemsMap[checkupId]?.length || 0
}
function checkupSummary(checkupId) {
  const items = checkupItemsMap[checkupId] || []
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
  checkupPhotos.value = []
}

async function saveCheckup() {
  const items = []
  for (const t of allCheckTeeth.value) {
    const status = checkResults[t]
    const notes = checkNotes[t] || ''
    if (status) {
      const atts = attachmentsByRecord[primaryRecord.value.id] || []
      const att = atts.find(a => a.tooth_number === t)
      items.push({
        tooth_number: t,
        original_shape: att?.shape || '',
        check_status: status,
        check_notes: notes
      })
    }
  }
  if (items.length === 0 && checkupPhotos.value.length === 0) {
    alert('请先标记牙位状态或添加照片')
    return
  }

  const checkupId = await window.electronAPI.createCheckup({
    patient_id: props.patient.id,
    reference_record_id: primaryRecord.value.id,
    items
  })

  for (const ph of checkupPhotos.value) {
    const filePath = await window.electronAPI.savePhoto(ph.preview, ph.name)
    await window.electronAPI.createCheckupPhoto({ checkup_id: checkupId, file_path: filePath })
  }

  checkups.value = await window.electronAPI.listCheckups(props.patient.id)
  for (const c of checkups.value) {
    if (!checkupItemsMap[c.id]) {
      checkupItemsMap[c.id] = await window.electronAPI.listCheckupItems(c.id)
    }
  }

  alert('复诊检查记录已保存！')
  clearMarks()
}

function triggerCheckupPhotoInput() { checkupPhotoInput.value?.click() }

function onCheckupPhotoFiles(e) {
  for (const file of e.target.files) addCheckupPhotoFile(file)
  e.target.value = ''
}

function onCheckupPhotoDrop(e) {
  isCheckupPhotoDragging.value = false
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('image/')) addCheckupPhotoFile(file)
  }
}

function addCheckupPhotoFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      checkupPhotos.value.push({ name: file.name, preview: ev.target.result })
      resolve()
    }
    reader.readAsDataURL(file)
  })
}

function removeCheckupPhoto(idx) {
  checkupPhotos.value.splice(idx, 1)
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function statusLabel(s) {
  const map = { good: '完好', worn: '磨耗', lost: '脱落', rebond: '重粘', new: '新粘接' }
  return map[s] || s
}

const toothHistory = computed(() => {
  if (!historyTooth.value) return []
  const items = []
  for (const r of records.value) {
    const att = (attachmentsByRecord[r.id] || []).find(a => a.tooth_number === historyTooth.value)
    if (att) {
      items.push({
        key: 'b-' + r.id,
        type: 'bonding',
        date: r.record_date,
        status: att.status || 'new',
        shape: att.shape,
        notes: att.notes || ''
      })
    }
  }
  for (const c of checkups.value) {
    const item = (checkupItemsMap[c.id] || []).find(i => i.tooth_number === historyTooth.value)
    if (item) {
      items.push({
        key: 'c-' + c.id,
        type: 'checkup',
        date: c.checkup_date,
        status: item.check_status,
        shape: null,
        notes: item.check_notes || ''
      })
    }
  }
  items.sort((a, b) => new Date(a.date) - new Date(b.date))
  return items
})

function openToothHistory(tooth) {
  historyTooth.value = tooth
  toothHistoryVisible.value = true
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
  position: relative;
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
.sidebar-header h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.sidebar-header .hint { font-size: 11px; color: var(--text-muted); }

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
.timeline-card.sel-primary { border-color: var(--primary); background: var(--primary-light); }
.timeline-card.sel-compare { border-color: var(--accent); background: #ede9fe; }

.tc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.tc-date { font-weight: 600; font-size: 13px; }
.tc-badges { display: flex; gap: 4px; }

.tc-stats { display: flex; gap: 6px; margin-bottom: 6px; }
.tc-notes { font-size: 12px; color: var(--text-muted); line-height: 1.4; margin-bottom: 4px; }
.tc-teeth { font-size: 11px; color: var(--accent); font-weight: 500; }

.tc-checkup-summary { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.mini-badge {
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}
.mb-green { background: #dcfce7; color: var(--success); }
.mb-yellow { background: #fef3c7; color: var(--warning); }
.mb-red { background: #fee2e2; color: var(--danger); }
.mb-blue { background: #dbeafe; color: var(--primary); }

.compare-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  padding-right: 4px;
}

.compare-charts { display: flex; gap: 16px; padding: 16px; }
.compare-chart { flex: 1; border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.compare-chart.single { flex: 1; max-width: 600px; margin: 0 auto; }

.chart-title { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 13px; font-weight: 600; }
.title-dot { width: 10px; height: 10px; border-radius: 50%; }
.title-dot.primary { background: var(--primary); }
.title-dot.compare { background: var(--accent); }
.title-text { flex: 1; }
.title-count { font-size: 11px; color: var(--text-muted); font-weight: normal; }

.compare-legend { padding: 12px 18px; }
.legend-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.legend-row:first-child { margin-bottom: 8px; }
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.legend-item .dot { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.legend-item .dot.green { background: var(--success); }
.legend-item .dot.yellow { background: var(--warning); }
.legend-item .dot.red { background: var(--danger); }
.legend-item .dot.blue { background: var(--primary); }
.legend-item .dot.purple { background: var(--accent); }

.check-panel, .photos-panel { padding: 16px 18px; }
.check-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.check-header h3 { font-size: 15px; font-weight: 600; }
.check-actions { display: flex; gap: 8px; }
.check-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }

.check-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }

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

.ci-tooth { display: flex; flex-direction: column; min-width: 70px; }
.ci-num { font-weight: 700; font-size: 14px; }
.ci-shape { font-size: 10px; color: var(--text-muted); }

.ci-buttons { display: flex; gap: 4px; flex-shrink: 0; }
.st-btn {
  width: 30px; height: 30px; border-radius: 6px; font-size: 13px; font-weight: 700;
  border: 2px solid var(--border); background: white; transition: all 0.15s ease;
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
  flex: 1; min-width: 0; padding: 5px 8px; border: 1px solid var(--border);
  border-radius: 5px; font-size: 12px; background: white; outline: none;
}
.ci-note:focus { border-color: var(--primary); }

.check-summary { margin-top: 16px; }
.sum-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
.sum-stats { display: flex; gap: 16px; flex-wrap: wrap; }
.sum-stat { background: #f3f4f6; padding: 8px 14px; border-radius: 8px; text-align: center; min-width: 70px; }
.sum-stat.good { background: #dcfce7; }
.sum-stat.worn { background: #fef3c7; }
.sum-stat.lost { background: #fee2e2; }
.sum-stat.rebond { background: #dbeafe; }
.sum-label { font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 2px; }
.sum-value { font-size: 18px; font-weight: 700; }

.photos-compare { display: flex; gap: 16px; }
.photos-col { flex: 1; }
.col-label { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 10px; color: var(--text-muted); }
.photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; min-height: 80px; }
.photo-thumb { aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #000; }
.photo-thumb img { width: 100%; height: 100%; object-fit: cover; }
.empty-photos { grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px; background: #f9fafb; border-radius: 6px; }

.checkup-photos { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border); }
.photos-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.photo-dropzone {
  border: 2px dashed var(--border); border-radius: 8px; min-height: 100px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease; background: #fafafa;
}
.photo-dropzone.small { min-height: 80px; }
.photo-dropzone.drag { border-color: var(--primary); background: var(--primary-light); }
.dropzone-hint { text-align: center; color: var(--text-muted); padding: 16px; }
.dz-icon { font-size: 24px; margin-bottom: 4px; }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; padding: 10px; width: 100%; }
.photo-item { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #000; }
.photo-item img { width: 100%; height: 100%; object-fit: cover; }
.photo-remove {
  position: absolute; top: 4px; right: 4px; width: 20px; height: 20px;
  border-radius: 50%; background: rgba(0,0,0,0.6); color: white; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
}
.photo-remove:hover { background: var(--danger); }

.check-item { cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.check-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }

.tooth-history-drawer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}

.th-panel {
  width: 360px;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.25s ease;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.th-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.th-header h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px 0; }
.th-sub { font-size: 12px; color: var(--text-muted); }

.th-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.th-timeline { position: relative; padding-left: 20px; }
.th-timeline::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--border);
}

.th-item { position: relative; padding-bottom: 18px; }
.th-item:last-child { padding-bottom: 0; }

.th-dot {
  position: absolute;
  left: -20px;
  top: 3px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--border);
}
.th-dot.thd-bonding { background: var(--primary); box-shadow: 0 0 0 2px var(--primary-light); }
.th-dot.thd-checkup { background: var(--accent); box-shadow: 0 0 0 2px #ede9fe; }

.th-date {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
}
.th-type {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.th-status {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 4px;
}
.th-status.ths-good { background: #ecfdf5; color: #059669; }
.th-status.ths-worn { background: #fffbeb; color: #d97706; }
.th-status.ths-lost { background: #fef2f2; color: #dc2626; }
.th-status.ths-rebond { background: #eff6ff; color: #2563eb; }
.th-status.ths-new { background: #faf5ff; color: #9333ea; }

.th-detail { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }
.th-notes {
  font-size: 12px;
  color: var(--text-secondary);
  background: #f9fafb;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 4px;
}
</style>
