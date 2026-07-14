<template>
  <el-form label-position="top" class="solution-form-grid">
    <el-form-item
      v-for="field in fields"
      :key="field.key"
      :data-field-key="field.key"
      :error="fieldError(field)"
      :class="{
        'solution-form-grid__wide': field.type === 'textarea',
        'solution-form-grid__with-image': Boolean(field.imageField)
      }"
    >
      <template #label>
        <span class="form-field-label">
          <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
          <small v-if="field.description" class="form-field-description">{{ field.description }}</small>
        </span>
      </template>
      <el-date-picker
        v-if="field.type === 'date'"
        :model-value="displayValue(model[field.key])"
        type="date"
        value-format="YYYY-MM-DD"
        :disabled="disabled"
        @update:model-value="update(field, $event)"
      />
      <el-input
        v-else
        :model-value="displayValue(model[field.key])"
        :type="field.type === 'textarea' ? 'textarea' : 'text'"
        :rows="field.type === 'textarea' ? field.rows || 3 : undefined"
        :disabled="disabled || field.type === 'readonly'"
        @update:model-value="update(field, $event)"
      />
      <slot name="after-field" :field="field" />
    </el-form-item>
  </el-form>
</template>

<script setup>
const emit = defineEmits(['update']);

const props = defineProps({
  fields: {
    type: Array,
    default: () => []
  },
  model: {
    type: Object,
    required: true
  },
  disabled: Boolean,
  invalidFieldKeys: {
    type: Array,
    default: () => []
  }
});

function fieldError(field) {
  if (!props.invalidFieldKeys.includes(field.key)) {
    return '';
  }
  return field.type === 'date' || field.type === 'select'
    ? `请选择${field.label}`
    : `请填写${field.label}`;
}

function displayValue(value) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function update(field, value) {
  if (field.type !== 'readonly') {
    emit('update', { key: field.key, value });
  }
}
</script>
