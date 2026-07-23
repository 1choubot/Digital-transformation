<template>
  <section class="contract-signing-section" :class="`contract-signing-section--${tone}`">
    <header class="contract-signing-section__header">
      <div class="contract-signing-section__heading">
        <span class="section-eyebrow">{{ eyebrow }}</span>
        <strong>{{ title }}</strong>
      </div>
      <div v-if="$slots.status" class="contract-signing-section__status">
        <slot name="status" />
      </div>
    </header>

    <div class="contract-signing-section__body">
      <slot />
    </div>

    <footer v-if="$slots.actions" class="contract-signing-section__actions">
      <slot name="actions" />
    </footer>
  </section>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  tone: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'danger'].includes(value)
  }
});
</script>

<style scoped>
.contract-signing-section {
  display: grid;
  gap: var(--app-space-4);
  min-width: 0;
  padding: var(--app-space-4);
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface);
}

.contract-signing-section--danger {
  border-color: var(--el-color-danger-light-7);
  background: var(--el-color-danger-light-9);
}

.contract-signing-section__header,
.contract-signing-section__heading,
.contract-signing-section__body,
.contract-signing-section__actions {
  min-width: 0;
}

.contract-signing-section__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--app-space-3);
}

.contract-signing-section__heading,
.contract-signing-section__body {
  display: grid;
  gap: var(--app-space-2);
}

.contract-signing-section__heading strong {
  color: var(--app-text-primary);
  font-size: 16px;
}

.contract-signing-section__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--app-space-2);
  padding-top: var(--app-space-3);
  border-top: 1px solid var(--app-border);
}

@media (max-width: 760px) {
  .contract-signing-section {
    padding: 14px;
  }

  .contract-signing-section__actions {
    justify-content: flex-start;
  }
}
</style>
