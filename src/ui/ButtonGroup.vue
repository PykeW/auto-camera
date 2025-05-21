<template>
    <div class="button-group" :class="{ vertical }">
      <button
        v-for="(button, index) in buttons"
        :key="index"
        :class="['group-button', { active: modelValue === button.value }]"
        :disabled="button.disabled"
        @click="$emit('update:modelValue', button.value)"
      >
        {{ button.label }}
      </button>
    </div>
  </template>
  
  <script setup>
  import { defineProps, defineEmits } from 'vue'
  
  const props = defineProps({
    buttons: {
      type: Array,
      required: true,
      // 每个按钮的结构: { label: String, value: any, disabled: Boolean }
    },
    modelValue: {
      type: [String, Number, Boolean],
      required: true
    },
    vertical: {
      type: Boolean,
      default: false
    }
  })
  
  const emit = defineEmits(['update:modelValue'])
  </script>
  
  <style scoped>
  .button-group {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
  }
  
  .button-group.vertical {
    flex-direction: column;
  }
  
  .group-button {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #ddd;
    background-color: #f9f9f9;
    cursor: pointer;
    transition: all 0.3s;
    margin: 0;
    font-size: 14px;
  }
  
  .group-button:not(:last-child) {
    border-right: none;
  }
  
  .button-group.vertical .group-button:not(:last-child) {
    border-right: 1px solid #ddd;
    border-bottom: none;
  }
  
  .group-button.active {
    background-color: #42b983;
    color: white;
    border-color: #42b983;
  }
  
  .group-button:hover:not(:disabled):not(.active) {
    background-color: #f0f0f0;
  }
  
  .group-button:disabled {
    background-color: #f5f5f5;
    color: #aaa;
    cursor: not-allowed;
  }
  
  /* 圆角处理 */
  .button-group:not(.vertical) .group-button:first-child {
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
  }
  
  .button-group:not(.vertical) .group-button:last-child {
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
  }
  
  .button-group.vertical .group-button:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  
  .button-group.vertical .group-button:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
  </style>