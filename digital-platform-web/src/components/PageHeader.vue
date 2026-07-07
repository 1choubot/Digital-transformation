<template>
  <header class="page-header">
    <div class="page-header__content">
      <span class="section-eyebrow">{{ eyebrow }}</span>
      <h2>{{ title }}</h2>
      <span v-if="currentUser" class="page-user">当前用户：{{ formatUser(currentUser) }}</span>
      <p v-if="subtitle" class="manual-status-note">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="page-title-actions">
      <slot name="actions"></slot>
    </div>
  </header>
</template>

<script setup>
import { formatUser } from '../utils/format.js';

defineProps({
  eyebrow: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  currentUser: {
    type: Object,
    default: null
  },
  subtitle: {
    type: String,
    default: ''
  }
});
</script>
