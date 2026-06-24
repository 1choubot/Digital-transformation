<template>
  <section class="stage-document-card__actions" aria-label="资料项手工操作">
    <h4>手工操作</h4>
    <div class="stage-document-actions">
      <ProjectStageDocumentResponsibility
        v-if="canManageResponsibility"
        :document="document"
        :candidates="responsibilityCandidates"
        :candidates-loading="responsibilityCandidatesLoading"
        :pending="isActionPending(document.id, 'responsible-user')"
        :selections="responsibilitySelections"
        @save="$emit('save-responsible-user', $event)"
        @clear="$emit('clear-responsible-user', $event)"
      />

      <template v-if="!isApplicable(document)">
        <button
          v-if="canChangeApplicability"
          type="button"
          class="ghost-button"
          :disabled="isActionPending(document.id, 'restore-applicable')"
          @click="$emit('restore-applicable', document)"
        >
          {{ isActionPending(document.id, 'restore-applicable') ? '恢复中...' : '恢复适用' }}
        </button>
      </template>

      <template v-else>
        <button
          v-if="canSubmitDocument && canSubmit(document)"
          type="button"
          class="ghost-button"
          :disabled="isActionPending(document.id, 'submit')"
          @click="$emit('submit-document', document)"
        >
          {{ isActionPending(document.id, 'submit') ? '标记中...' : '标记提交' }}
        </button>

        <template v-else-if="document.status === 'submitted' && canConfirmReturnDocument">
          <button
            type="button"
            class="ghost-button"
            :disabled="isActionPending(document.id, 'confirm')"
            @click="$emit('confirm-document', document)"
          >
            {{ isActionPending(document.id, 'confirm') ? '确认中...' : '确认' }}
          </button>
          <div class="stage-document-return">
            <input
              v-model.trim="returnReasons[document.id]"
              type="text"
              placeholder="退回原因"
              :disabled="isActionPending(document.id, 'return')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isActionPending(document.id, 'return')"
              @click="$emit('return-document', document)"
            >
              {{ isActionPending(document.id, 'return') ? '退回中...' : '退回' }}
            </button>
          </div>
        </template>

        <span v-else class="stage-document-actions__empty">
          {{ document.status === 'confirmed' ? '已确认' : '暂无状态操作' }}
        </span>

        <div v-if="canChangeApplicability" class="stage-document-applicability-action">
          <input
            v-model.trim="notApplicableReasons[document.id]"
            type="text"
            placeholder="不适用原因"
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
          />
          <button
            type="button"
            class="ghost-button"
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
            @click="$emit('mark-not-applicable', document)"
          >
            {{ isActionPending(document.id, 'mark-not-applicable') ? '标记中...' : '标记不适用' }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import ProjectStageDocumentResponsibility from './ProjectStageDocumentResponsibility.vue';
import { canSubmit, isApplicable } from './stageDocumentViewHelpers.js';

defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
  'mark-not-applicable',
  'restore-applicable',
  'save-responsible-user',
  'clear-responsible-user'
]);

defineProps({
  document: {
    type: Object,
    required: true
  },
  responsibilityCandidates: {
    type: Array,
    default: () => []
  },
  responsibilityCandidatesLoading: {
    type: Boolean,
    default: false
  },
  responsibilitySelections: {
    type: Object,
    required: true
  },
  canSubmitDocument: {
    type: Boolean,
    default: true
  },
  canConfirmReturnDocument: {
    type: Boolean,
    default: true
  },
  canManageResponsibility: {
    type: Boolean,
    default: true
  },
  canChangeApplicability: {
    type: Boolean,
    default: true
  },
  returnReasons: {
    type: Object,
    required: true
  },
  notApplicableReasons: {
    type: Object,
    required: true
  },
  isActionPending: {
    type: Function,
    required: true
  }
});
</script>
