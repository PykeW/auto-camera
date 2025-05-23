<template>
  <div class="control-item side-by-side">
    <label :for="selectId">{{ label }}:</label>
    <div class="position-display-container">
      <select 
        :id="selectId" 
        class="compact-select" 
        :value="modelValue" 
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-for="axis in axes" :key="axis.id" :value="axis.id">{{ axis.name }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  modelValue: { // For v-model
    type: [String, Number],
    required: true
  },
  axes: { // Array of axis objects, e.g., [{ id: '1', name: '轴1' }, ...]
    type: Array,
    required: true,
    default: () => []
  },
  selectId: { // Optional ID for label and select
    type: String,
    default: 'focus-axis-select'
  },
  label: { // New prop for the label text
    type: String,
    default: 'Z轴选择' // Default value if not provided
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>
/* Styles for .control-item, .side-by-side, .position-display-container, .compact-select 
   are expected to be available globally from styles.css or a common stylesheet.
   Add component-specific styles here if needed. */

/* Targeting the label within this component specifically */
label {
  min-width: 80px; /* Consistent with global .control-item.side-by-side label */
  flex-shrink: 0;   /* Consistent with global .control-item.side-by-side label */
  margin-bottom: 0; /* Consistent with global .control-item.side-by-side label */
  text-align: left; /* Consistent with global .control-item.side-by-side label */
  white-space: nowrap;/* Consistent with global .control-item.side-by-side label */
  /* color and font-size should be inherited or globally styled */
}

/* Adjust if the .position-display-container within this component needs specific flex properties */
.position-display-container {
  flex-grow: 1; /* Allow the select box area to take remaining space */
  /* min-width: 0; /* If flex-grow is used, this can prevent overflow issues */
}

/* This rule is crucial to override the global margin-left: 8px on .compact-select */
.compact-select {
  margin-left: 0;
}
</style> 