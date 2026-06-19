<template>
  <div class="app">
    <header class="app-header">
      <div class="brand">
        <span class="brand-icon">🦷</span>
        <span class="brand-name">正畸附件记录本</span>
      </div>
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </nav>
      <div class="header-right">
        <div v-if="currentPatient" class="patient-chip" @click="activeTab = 'patients'">
          <span class="chip-name">{{ currentPatient.name }}</span>
          <span v-if="currentPatient.record_no" class="chip-no">#{{ currentPatient.record_no }}</span>
        </div>
      </div>
    </header>

    <main class="app-main">
      <PatientPanel
        v-if="activeTab === 'patients'"
        @select="onSelectPatient"
        :selectedId="currentPatient?.id"
      />
      <RecordPanel
        v-else-if="activeTab === 'record'"
        :patient="currentPatient"
        @updated="onRecordUpdated"
      />
      <ComparePanel
        v-else-if="activeTab === 'compare'"
        :patient="currentPatient"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import PatientPanel from './components/PatientPanel.vue'
import RecordPanel from './components/RecordPanel.vue'
import ComparePanel from './components/ComparePanel.vue'

const tabs = [
  { id: 'patients', label: '患者档案', icon: '👤' },
  { id: 'record', label: '快速记录', icon: '✏️' },
  { id: 'compare', label: '复诊对比', icon: '🔍' }
]

const activeTab = ref('patients')
const currentPatient = ref(null)

function onSelectPatient(patient) {
  currentPatient.value = patient
  if (patient) activeTab.value = 'record'
}

function onRecordUpdated() {
  // Can trigger refresh if needed
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.app-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 56px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  gap: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.brand-icon { font-size: 22px; }
.brand-name { font-weight: 600; font-size: 15px; }

.tabs {
  display: flex;
  gap: 4px;
  flex: 1;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  color: var(--text-muted);
  transition: all 0.15s ease;
  font-weight: 500;
}
.tab:hover { background: #f3f4f6; color: var(--text); }
.tab.active { background: var(--primary-light); color: var(--primary); }
.tab-icon { font-size: 16px; }

.header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.patient-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  background: #f3f4f6;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
}
.patient-chip:hover { background: #e5e7eb; }
.chip-name { font-weight: 500; }
.chip-no { color: var(--text-muted); font-size: 12px; }

.app-main {
  flex: 1;
  overflow: hidden;
  padding: 20px;
}
</style>
