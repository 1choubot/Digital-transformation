<template><el-form label-position="top" class="solution-form-grid"><el-form-item v-for="field in fields"
            :key="field.key" :label="`${field.label}${field.required ? ' *' : ''}`"
            :class="{ 'solution-form-grid__wide': field.type === 'textarea' }"><el-date-picker v-if="field.type === 'date'"
                :model-value="displayValue(model[field.key])" type="date" value-format="YYYY-MM-DD" :disabled="disabled"
                @update:model-value="update(field, $event)" /><el-input v-else
                :model-value="displayValue(model[field.key])" :type="field.type === 'textarea' ? 'textarea' : 'text'"
                :rows="field.type === 'textarea' ? 3 : undefined" :disabled="disabled || field.type === 'readonly'"
                @update:model-value="update(field, $event)" /></el-form-item></el-form></template>
<script
    setup>    const emit = defineEmits(['update']); defineProps({ fields: { type: Array, default: () => [] }, model: { type: Object, required: true }, disabled: Boolean }); function displayValue(value) { return Array.isArray(value) ? value.join('\n') : value ?? '' } function update(field, value) { if (field.type !== 'readonly') emit('update', { key: field.key, value }) }</script>
<style
    scoped>
    .solution-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0 var(--space-4, 16px)
    }

    .solution-form-grid__wide {
        grid-column: 1/-1
    }

    @media(max-width:768px) {
        .solution-form-grid {
            grid-template-columns: 1fr
        }
    }
</style>
