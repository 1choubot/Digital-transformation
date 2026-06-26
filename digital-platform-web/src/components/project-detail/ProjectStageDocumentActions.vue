<template>
  <section class="stage-document-card__actions" aria-label="资料项手工操作">
    <h4>资料操作</h4>
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
          {{ isActionPending(document.id, 'submit') ? '提交中...' : submitButtonText }}
        </button>

        <template v-else-if="canReview(document) && canConfirmReturnDocument">
          <button
            type="button"
            class="ghost-button"
            :disabled="isActionPending(document.id, 'confirm')"
            @click="$emit('confirm-document', document)"
          >
            {{ isActionPending(document.id, 'confirm') ? '审核中...' : '资料审核通过' }}
          </button>
          <div class="stage-document-return">
            <input
              v-model.trim="returnReasons[document.id]"
              type="text"
              placeholder="资料审核退回原因"
              :disabled="isActionPending(document.id, 'return')"
            />
            <button
              type="button"
              class="ghost-button"
              :disabled="isActionPending(document.id, 'return')"
              @click="$emit('return-document', document)"
            >
              {{ isActionPending(document.id, 'return') ? '退回中...' : '退回资料审核' }}
            </button>
          </div>
        </template>

        <span v-else class="stage-document-actions__empty">
          {{ emptyActionText }}
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
import { computed } from 'vue';
import ProjectStageDocumentResponsibility from './ProjectStageDocumentResponsibility.vue';
import {
  canReview,
  canSubmit,
  formatDocumentCompletionStatus,
  getCompletionMode,
  isApplicable
} from './stageDocumentViewHelpers.js';

defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
  'mark-not-applicable',
  'restore-applicable',
  'save-responsible-user',
  'clear-responsible-user'
]);

const props = defineProps({
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

const submitButtonText = computed(() => {
  const completionMode = getCompletionMode(props.document);
  if (completionMode === 'approval_required' || completionMode === 'conditional_approval') {
    return '提交资料审核';
  }

  return props.document.status === 'returned' ? '重新提交资料' : '提交资料';
});

const emptyActionText = computed(() => {
  if (!isApplicable(props.document)) {
    return '条件未触发/不适用';
  }

  if (props.document.status === 'confirmed') {
    return '资料审核通过';
  }

  if (props.document.isComplete || props.document.completionStatus === 'completed') {
    return formatDocumentCompletionStatus(props.document);
  }

  if (props.document.completionStatus === 'pending_review') {
    return '待资料审核';
  }

  return '暂无资料操作';
});
</script>
