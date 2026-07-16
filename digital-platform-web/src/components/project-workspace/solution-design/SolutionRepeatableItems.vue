<template>
  <section class="repeatable-items" :data-field-key="fieldKey">
    <div class="repeatable-items__heading">
      <h4>{{ title }}</h4>
      <el-button type="primary" plain :disabled="disabled" @click="$emit('add')">
        <el-icon><Plus /></el-icon>
        <span>{{ addLabel }}</span>
      </el-button>
    </div>
    <div class="repeatable-items__list">
      <article v-for="(item, index) in displayItems" :key="index" class="repeatable-items__row">
        <el-input
          :model-value="item"
          type="textarea"
          :rows="2"
          :disabled="disabled"
          :placeholder="`${title}${index + 1}`"
          @update:model-value="value => $emit('update', { index, value })"
        />
        <el-button
          :icon="Delete"
          type="danger"
          plain
          :disabled="disabled"
          :aria-label="`删除${title}${index + 1}`"
          @click="$emit('remove', { index })"
        />
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { Delete, Plus } from '@element-plus/icons-vue';

const props = defineProps({
  title: { type: String, required: true },
  fieldKey: { type: String, required: true },
  addLabel: { type: String, required: true },
  items: { type: Array, default: () => [''] },
  disabled: Boolean
});

defineEmits(['update', 'add', 'remove']);

const displayItems = computed(() => props.items.length ? props.items : ['']);
</script>

<style scoped>
.repeatable-items {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.repeatable-items__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.repeatable-items__heading h4 {
  margin: 0;
}

.repeatable-items__list {
  display: grid;
  gap: 10px;
}

.repeatable-items__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}
</style>
