<template>
  <el-form label-position="top" class="solution-form-grid">
    <template v-for="item in displayItems" :key="item.key">
      <section
        v-if="item.type === 'threshold-group'"
        class="threshold-field-group"
        :class="{ 'threshold-field-group--paired': item.paired }"
      >
        <h5>{{ item.label }}</h5>
        <div class="threshold-field-group__inputs">
          <el-form-item
            v-for="field in item.fields"
            :key="field.key"
            :data-field-key="field.key"
            class="threshold-field-input"
            :label="`${field.limitLabel}${field.required ? ' *' : ''}`"
          >
            <el-input
              :model-value="displayValue(model[field.key])"
              :disabled="disabled || field.type === 'readonly'"
              @update:model-value="update(field, $event)"
            />
          </el-form-item>
        </div>
      </section>

      <el-form-item
        v-else
        :data-field-key="item.field.key"
        :label="`${item.field.label}${item.field.required ? ' *' : ''}`"
        :class="{ 'solution-form-grid__wide': item.field.type === 'textarea' }"
      >
        <el-date-picker
          v-if="item.field.type === 'date'"
          :model-value="displayValue(model[item.field.key])"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled="disabled"
          @update:model-value="update(item.field, $event)"
        />
        <el-input
          v-else
          :model-value="displayValue(model[item.field.key])"
          :type="item.field.type === 'textarea' ? 'textarea' : 'text'"
          :rows="item.field.type === 'textarea' ? 3 : undefined"
          :disabled="disabled || item.field.type === 'readonly'"
          @update:model-value="update(item.field, $event)"
        />
      </el-form-item>
    </template>
  </el-form>
</template>

<script setup>
import { computed } from 'vue';
import { groupThresholdFields } from '../../../utils/thresholdFieldGroups.js';

const emit = defineEmits(['update']);
const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  disabled: Boolean
});

const displayItems = computed(() => groupThresholdFields(props.fields));

function displayValue(value) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function update(field, value) {
  if (field.type !== 'readonly') {
    emit('update', { key: field.key, value });
  }
}
</script>
