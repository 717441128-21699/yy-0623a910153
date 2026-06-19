<template>
  <div class="tooth-chart" :class="size">
    <div class="jaw upper">
      <div class="jaw-label">上颌</div>
      <div class="teeth-row">
        <div
          v-for="t in upperTeeth"
          :key="t"
          class="tooth"
          :class="getToothClass(t)"
          @click="onClick(t)"
          :title="t"
        >
          <div class="tooth-num">{{ t }}</div>
          <div v-if="getAttachment(t)" class="tooth-attachment">
            <span class="att-dot"></span>
          </div>
        </div>
      </div>
    </div>

    <div class="jaw lower">
      <div class="teeth-row">
        <div
          v-for="t in lowerTeeth"
          :key="t"
          class="tooth"
          :class="getToothClass(t)"
          @click="onClick(t)"
          :title="t"
        >
          <div v-if="getAttachment(t)" class="tooth-attachment">
            <span class="att-dot"></span>
          </div>
          <div class="tooth-num">{{ t }}</div>
        </div>
      </div>
      <div class="jaw-label">下颌</div>
    </div>
  </div>
</template>

<script setup>const props = defineProps({
 selectedTeeth: { type: Array, default: () => [] },
 attachmentsMap: { type: Object, default: () => ({}) },
 statusColors: { type: Object, default: () => ({}) },
 size: { type: String, default: 'normal' },
 interactive: { type: Boolean, default: true },
 clickableOverride: { type: Function, default: null }
});
const emit = defineEmits(['tooth-click']);
const upperTeeth = ['18', '17', '16', '15', '14', '13', '12', '11',
 '21', '22', '23', '24', '25', '26', '27', '28'];
const lowerTeeth = ['48', '47', '46', '45', '44', '43', '42', '41',
 '31', '32', '33', '34', '35', '36', '37', '38'];
function isSelected(t) {
 return props.selectedTeeth.includes(t);
}
function getAttachment(t) {
 return props.attachmentsMap[t];
}
function getToothClass(t) {
 const classes = [];
 if (props.interactive)
 classes.push('interactive');
 if (isSelected(t))
 classes.push('selected');
 const att = getAttachment(t);
 if (att) {
 const status = att.status || 'new';
 const color = props.statusColors[status];
 if (color)
 classes.push('status-' + color);
 else
 classes.push('has-attachment');
 }
 if (props.clickableOverride && !props.clickableOverride(t)) {
 classes.push('disabled');
 }
 return classes;
}
function onClick(t) {
 if (!props.interactive)
 return;
 if (props.clickableOverride && !props.clickableOverride(t))
 return;
 emit('tooth-click', t);
}
</script>

<style scoped>
.tooth-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.jaw {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.jaw-label {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.teeth-row {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
}

.tooth {
  width: 40px;
  height: 48px;
  background: white;
  border: 2px solid var(--border);
  border-radius: 6px 6px 10px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.15s ease;
  font-size: 11px;
  color: var(--text-muted);
}
.jaw.lower .tooth { border-radius: 10px 10px 6px 6px; }

.tooth.interactive { cursor: pointer; }
.tooth.interactive:hover { border-color: var(--primary); transform: translateY(-2px); }
.tooth.disabled { opacity: 0.4; cursor: not-allowed; }

.tooth.selected {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 600;
}

.tooth.has-attachment {
  background: #ede9fe;
  border-color: var(--accent);
}

.tooth.status-green {
  background: #dcfce7;
  border-color: var(--success);
}
.tooth.status-yellow {
  background: #fef3c7;
  border-color: var(--warning);
}
.tooth.status-red {
  background: #fee2e2;
  border-color: var(--danger);
}
.tooth.status-blue {
  background: var(--primary-light);
  border-color: var(--primary);
}

.tooth-num { font-size: 10px; }

.tooth-attachment {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.att-dot {
  width: 10px;
  height: 10px;
  background: var(--accent);
  border-radius: 50%;
  border: 2px solid white;
}
.tooth.status-green .att-dot { background: var(--success); }
.tooth.status-yellow .att-dot { background: var(--warning); }
.tooth.status-red .att-dot { background: var(--danger); }
.tooth.status-blue .att-dot { background: var(--primary); }

.tooth-chart.small .tooth {
  width: 30px;
  height: 36px;
  font-size: 9px;
}
.tooth-chart.small .att-dot {
  width: 8px;
  height: 8px;
}
</style>
