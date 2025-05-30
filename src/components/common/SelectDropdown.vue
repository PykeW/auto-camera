<template>
  <div class="control-item side-by-side">
    <label :for="selectId">{{ label }}:</label>
    <div class="position-display-container">
      <select 
        :id="selectId" 
        class="compact-select" 
        :value="modelValue" 
        @change="$emit('update:modelValue', $event.target.value)"
        :disabled="disabled"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.id" :value="option.id">
          {{ option.name }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { // For v-model
    type: [String, Number],
    required: true
  },
  options: { // Array of option objects, e.g., [{ id: '1', name: '选项1' }, ...]
    type: Array,
    required: true,
    default: () => []
  },
  selectId: { // Optional ID for label and select
    type: String,
    default: 'dropdown-select'
  },
  label: { // Label text
    type: String,
    required: true
  },
  placeholder: { // Optional placeholder for the select
    type: String,
    default: ''
  },
  disabled: { // Whether the dropdown is disabled
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
/* 组件整体外边距 */
.control-item.side-by-side {
  margin-bottom: 0; /* 移除底部间距，由父组件的gap控制 */
}

/* 标签样式 */
label {
  min-width: 80px; /* 固定标签宽度 */
  flex-shrink: 0;   
  margin-bottom: 0; 
  text-align: left; 
  white-space: nowrap;
}

/* 下拉框容器 */
.position-display-container {
  flex-grow: 1; /* 允许下拉框区域占据剩余空间 */
  min-width: 0; /* 防止溢出问题 */
}

/* 这条规则是关键，覆盖全局样式中的 margin-left: 8px */
.compact-select {
  margin-left: 0;
}
</style> 