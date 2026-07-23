<template>
  <div class="approval-business-selection">
    <label class="approval-business-selection__label" :id="labelId">
      <strong>{{ label }}</strong>
      <span aria-hidden="true">*</span>
      <small>{{ hint }}</small>
    </label>

    <el-radio-group
      :model-value="modelValue"
      class="approval-business-selection__options"
      :class="`approval-business-selection__options--count-${normalizedOptions.length}`"
      :disabled="disabled"
      :aria-labelledby="labelId"
      aria-required="true"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <el-radio
        v-for="option in normalizedOptions"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled === true"
        border
      >
        {{ option.label }}
      </el-radio>
    </el-radio-group>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, required: true },
  options: { type: Array, default: () => [] },
  disabled: Boolean,
  hint: { type: String, default: '审批通过前必须选择' }
});

defineEmits(['update:modelValue']);

const labelId = `approval-business-selection-${useId()}`;
const normalizedOptions = computed(() => props.options
  .filter((option) => option && option.value !== undefined && option.value !== null)
  .map((option) => ({
    label: String(option.label ?? option.value),
    value: String(option.value),
    disabled: option.disabled === true
  })));
</script>

<style scoped>
.approval-business-selection {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.approval-business-selection__label {
  display: flex;
  align-items: baseline;
  gap: 5px;
  color: var(--el-text-color-primary);
  font-size: 13px;
}

.approval-business-selection__label > span {
  color: var(--el-color-danger);
}

.approval-business-selection__label small {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  font-weight: 400;
}

.approval-business-selection__options {
  display: grid;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.approval-business-selection__options--count-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.approval-business-selection__options--count-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.approval-business-selection__options--count-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.approval-business-selection__options :deep(.el-radio.is-bordered) {
  width: 100%;
  height: auto;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
}

.approval-business-selection__options :deep(.el-radio__label) {
  min-width: 0;
  overflow-wrap: anywhere;
  white-space: normal;
}

.approval-business-selection__options :deep(.el-radio:hover:not(.is-disabled)),
.approval-business-selection__options :deep(.el-radio.is-checked:not(.is-disabled)) {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

.approval-business-selection__options :deep(.el-radio.is-checked:not(.is-disabled)) {
  background: var(--el-color-primary-light-9);
}

@media (max-width: 640px) {
  .approval-business-selection__options {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
