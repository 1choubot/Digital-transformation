<template>
  <div class="stage-document-responsibility-action">
    <label>
      <span>资料责任人</span>
      <select
        v-model="selections[document.id]"
        :disabled="disabled || candidatesLoading || pending"
      >
        <option value="">未分配</option>
        <option
          v-if="showDisabledResponsibleOption(document, candidates)"
          :value="String(document.responsibleUserId)"
          disabled
        >
          {{ formatResponsibleUser(document) }}（已禁用）
        </option>
        <option v-for="user in candidates" :key="user.id" :value="String(user.id)">
          {{ formatResponsibilityCandidate(user) }}
        </option>
      </select>
    </label>
    <div class="stage-document-responsibility-action__buttons">
      <button
        type="button"
        class="ghost-button"
        :disabled="disabled || candidatesLoading || pending"
        @click="$emit('save', document)"
      >
        {{ pending ? '保存中...' : '保存责任人' }}
      </button>
      <button
        type="button"
        class="ghost-button"
        :disabled="disabled || pending || !document.responsibleUserId"
        @click="$emit('clear', document)"
      >
        清空
      </button>
    </div>
    <p v-if="disabled && disabledReason" class="inline-muted">{{ disabledReason }}</p>
  </div>
</template>

<script setup>
import {
  formatResponsibilityCandidate,
  formatResponsibleUser,
  showDisabledResponsibleOption
} from './stageDocumentViewHelpers.js';

defineEmits(['save', 'clear']);

defineProps({
  document: {
    type: Object,
    required: true
  },
  candidates: {
    type: Array,
    default: () => []
  },
  candidatesLoading: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  disabledReason: {
    type: String,
    default: ''
  },
  selections: {
    type: Object,
    required: true
  }
});
</script>
