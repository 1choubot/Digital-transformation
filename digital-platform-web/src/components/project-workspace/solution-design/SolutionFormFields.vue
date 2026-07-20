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
            :class="{ 'online-form-field--invalid': isFieldInvalid(field.key) }"
            :label="`${field.limitLabel}${field.required ? ' *' : ''}`"
          >
            <el-input
              :model-value="displayValue(model[field.key])"
              :disabled="disabled || field.type === 'readonly'"
              @update:model-value="update(field, $event)"
            />
            <small v-if="isFieldInvalid(field.key)" class="form-field-error">
              {{ validationMessage(field) }}
            </small>
          </el-form-item>
        </div>
      </section>

      <el-form-item
        v-else-if="item.field.type === 'repeatable'"
        :data-field-key="item.field.key"
        class="solution-form-grid__wide solution-repeatable-field"
        :class="{
          'solution-form-field--emphasized': item.field.emphasized,
          'online-form-field--invalid': isFieldInvalid(item.field.key)
        }"
      >
        <template #label>
          <div class="solution-repeatable-field__heading">
            <span>{{ item.field.label }}{{ item.field.required ? ' *' : '' }}</span>
            <el-button size="small" :disabled="disabled" @click="addRow(item.field)">新增一行</el-button>
          </div>
        </template>
        <div class="solution-repeatable-field__rows">
          <div v-for="(row, index) in repeatableRows(item.field)" :key="`${item.field.key}:${index}`"
            class="solution-repeatable-field__row">
            <el-input :model-value="row" type="textarea" :rows="2" :disabled="disabled"
              @update:model-value="updateRow(item.field, index, $event)" />
            <el-button plain :disabled="disabled || repeatableRows(item.field).length <= 1"
              @click="removeRow(item.field, index)">删除</el-button>
          </div>
        </div>
        <small v-if="isFieldInvalid(item.field.key)" class="form-field-error">
          {{ validationMessage(item.field) }}
        </small>
      </el-form-item>

      <el-form-item
        v-else
        :data-field-key="item.field.key"
        :label="`${item.field.label}${item.field.required ? ' *' : ''}`"
        :class="{
          'solution-form-grid__wide': item.field.type === 'textarea',
          'solution-form-field--emphasized': item.field.emphasized,
          'online-form-field--invalid': isFieldInvalid(item.field.key)
        }"
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
        <small v-if="isFieldInvalid(item.field.key)" class="form-field-error">
          {{ validationMessage(item.field) }}
        </small>
      </el-form-item>
      <slot
        v-if="item.type !== 'threshold-group'"
        name="after-field"
        :field="item.field"
      />
    </template>
  </el-form>
</template>

<script setup>
import { computed } from 'vue';
import { groupThresholdFields } from '../../../utils/thresholdFieldGroups.js';
import { getRequiredFieldErrorMessage } from '../../../utils/formValidation.js';

const emit = defineEmits(['update']);
const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  invalidFieldKeys: { type: Array, default: () => [] },
  disabled: Boolean
});

const displayItems = computed(() => groupThresholdFields(props.fields));

function isFieldInvalid(fieldKey) {
  return props.invalidFieldKeys.includes(fieldKey);
}

function validationMessage(field) {
  return getRequiredFieldErrorMessage(field);
}

function displayValue(value) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function repeatableRows(field) {
  const value = props.model[field.key];
  if (Array.isArray(value) && value.length) return value;
  if (value === null || value === undefined || value === '') return [''];
  return String(value).split(/\r?\n/);
}

function updateRow(field, index, value) {
  const rows = [...repeatableRows(field)];
  rows[index] = value;
  update(field, rows);
}

function addRow(field) {
  update(field, [...repeatableRows(field), '']);
}

function removeRow(field, index) {
  const rows = repeatableRows(field).filter((_, rowIndex) => rowIndex !== index);
  update(field, rows.length ? rows : ['']);
}

function update(field, value) {
  if (field.type !== 'readonly') {
    emit('update', { key: field.key, value });
  }
}
</script>

<style scoped>
.solution-repeatable-field__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.solution-repeatable-field__rows {
  display: grid;
  gap: 10px;
  width: 100%;
}

.solution-repeatable-field__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.solution-repeatable-field__row .el-textarea {
  flex: 1 1 auto;
}

@media (max-width: 640px) {
  .solution-repeatable-field__heading,
  .solution-repeatable-field__row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
