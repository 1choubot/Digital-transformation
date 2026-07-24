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
        <el-button
          v-if="canChangeApplicability" plain
          :disabled="isActionPending(document.id, 'restore-applicable')"
          @click="$emit('restore-applicable', document)"
        >
          {{ isActionPending(document.id, 'restore-applicable') ? '恢复中...' : '恢复适用' }}
        </el-button>
      </template>

      <template v-else>
        <el-button
          v-if="canSubmitDocument && canCompleteRevisionDocument && !isOnlineFormOnlyDocument" plain
          :disabled="isActionPending(document.id, 'complete-revision')"
          @click="$emit('complete-revision-document', document)"
        >
          {{ isActionPending(document.id, 'complete-revision') ? '处理中...' : '完成返工' }}
        </el-button>

        <el-button
          v-else-if="canSubmitDocument && canSubmit(document) && !isOnlineFormOnlyDocument" plain
          :disabled="isActionPending(document.id, 'submit')"
          @click="$emit('submit-document', document)"
        >
          {{ isActionPending(document.id, 'submit') ? '提交中...' : submitButtonText }}
        </el-button>

        <template v-else-if="canReview(document) && canConfirmReturnDocument">
          <el-button plain
            :disabled="isActionPending(document.id, 'confirm')"
            @click="$emit('confirm-document', document)"
          >
            {{ isActionPending(document.id, 'confirm') ? '审核中...' : '资料审核通过' }}
          </el-button>
          <div class="stage-document-return">
            <el-input
              v-model.trim="returnReasons[document.id]"
              placeholder="资料审核退回原因"
              :disabled="isActionPending(document.id, 'return')"
            />
            <div v-if="isAClassReturn" class="stage-document-rework-selector">
              <strong>选择需返工资料</strong>
              <p v-if="revisionCandidates.length === 0">当前没有可选的适用返工候选。</p>
              <label v-for="candidate in revisionCandidates" :key="candidate.id">
                <el-checkbox
                  v-model="revisionTargetSelections[document.id]"
                  :value="candidate.id"
                  :disabled="isActionPending(document.id, 'return')"
                />
                <span class="mono">{{ candidate.documentCode }}</span>
                <span>{{ candidate.documentName }}</span>
                <span>{{ formatResponsibleUser(candidate) }}</span>
                <span>{{ formatDocumentCompletionMode(candidate) }}</span>
                <span>{{ formatDocumentCompletionStatus(candidate) }}</span>
                <span>{{ formatApplicability(candidate) }}</span>
              </label>
            </div>
            <div v-if="isCClassReturn" class="stage-document-rework-selector">
              <strong>选择设计变更触发资料</strong>
              <label v-for="candidate in designChangeCandidates" :key="candidate.id">
                <el-checkbox
                  v-model="designChangeTargetSelections[document.id]"
                  :value="candidate.id"
                  :disabled="isActionPending(document.id, 'return')"
                />
                <span class="mono">{{ candidate.documentCode }}</span>
                <span>{{ candidate.documentName }}</span>
                <span>{{ formatResponsibleUser(candidate) }}</span>
                <span>{{ formatDocumentCompletionMode(candidate) }}</span>
                <span>{{ formatDocumentCompletionStatus(candidate) }}</span>
                <span>将设置为适用且需返工</span>
              </label>
            </div>
            <el-button type="warning" plain
              :disabled="isActionPending(document.id, 'return') || !canSubmitReturn"
              @click="emitReturnDocument"
            >
              {{ isActionPending(document.id, 'return') ? '退回中...' : '退回资料审核' }}
            </el-button>
          </div>
        </template>

        <span v-else class="stage-document-actions__empty">
          {{ emptyActionText }}
        </span>

        <div v-if="canChangeApplicability" class="stage-document-applicability-action">
          <el-input
            v-model.trim="notApplicableReasons[document.id]"
            placeholder="不适用原因"
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
          />
          <el-button plain
            :disabled="isActionPending(document.id, 'mark-not-applicable')"
            @click="$emit('mark-not-applicable', document)"
          >
            {{ isActionPending(document.id, 'mark-not-applicable') ? '标记中...' : '标记不适用' }}
          </el-button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, watch } from 'vue';
import ProjectStageDocumentResponsibility from './ProjectStageDocumentResponsibility.vue';
import {
  canReview,
  canSubmit,
  formatDocumentCompletionStatus,
  formatApplicability,
  getCompletionMode,
  formatDocumentCompletionMode,
  formatResponsibleUser,
  isApplicable,
  isInitiationOnlineFormDocument,
  isReviewCompletionMode,
  isRevisionRequired,
  isRevisionResubmitted,
  isSubmitCompletionMode
} from './stageDocumentViewHelpers.js';

const emit = defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
  'complete-revision-document',
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

const revisionTargetSelections = reactive({});
const designChangeTargetSelections = reactive({});

watch(
  () => props.document.id,
  (documentId) => {
    if (!Array.isArray(revisionTargetSelections[documentId])) {
      revisionTargetSelections[documentId] = [];
    }
    if (!Array.isArray(designChangeTargetSelections[documentId])) {
      designChangeTargetSelections[documentId] = [];
    }
  },
  { immediate: true }
);

const revisionCandidates = computed(() => props.document.reworkCandidates || []);
const designChangeCandidates = computed(() => props.document.designChangeCandidates || []);
const reworkClass = computed(() => props.document.reworkClass || props.document.rework_class || 'b_class');
const isAClassReturn = computed(() => reworkClass.value === 'a_class');
const isCClassReturn = computed(() => props.document.documentCode === '5.12' || reworkClass.value === 'c_class');
const isDetailedDesignWorkflowDocument = computed(() => {
  const source =
    props.document?.derivedCompletionSource ??
    props.document?.derived_completion_source ??
    props.document?.detailedDesignDerivedCompletion?.source ??
    props.document?.detailed_design_derived_completion?.source ??
    null;
  return source === 'detailed_design_workflow';
});
const isOnlineFormOnlyDocument = computed(() => isInitiationOnlineFormDocument(props.document));
const selectedRevisionTargetIds = computed(() => revisionTargetSelections[props.document.id] || []);
const selectedDesignChangeTargetIds = computed(() => designChangeTargetSelections[props.document.id] || []);
const canSubmitReturn = computed(() => {
  if (isAClassReturn.value) {
    return selectedRevisionTargetIds.value.length > 0;
  }

  if (isCClassReturn.value) {
    return selectedDesignChangeTargetIds.value.length > 0;
  }

  return true;
});
const canCompleteRevisionDocument = computed(
  () =>
    !isOnlineFormOnlyDocument.value &&
    isRevisionRequired(props.document) &&
    isSubmitCompletionMode(props.document) &&
    ['submitted', 'confirmed'].includes(props.document.status)
);

const submitButtonText = computed(() => {
  if (isRevisionRequired(props.document) && isReviewCompletionMode(props.document)) {
    return '返工重提';
  }

  if (isRevisionRequired(props.document) && isSubmitCompletionMode(props.document)) {
    return '提交返工资料';
  }

  const completionMode = getCompletionMode(props.document);
  if (completionMode === 'approval_required' || completionMode === 'conditional_approval') {
    return '提交资料审核';
  }

  return props.document.status === 'returned' ? '重新提交资料' : '提交资料';
});

const emptyActionText = computed(() => {
  if (isDetailedDesignWorkflowDocument.value) {
    return '请通过详细设计专用节点处理该资料。';
  }

  if (!isApplicable(props.document)) {
    return '条件未触发/不适用';
  }

  if (isOnlineFormOnlyDocument.value && isRevisionRequired(props.document)) {
    return '请通过在线表单重提';
  }

  if (isOnlineFormOnlyDocument.value && canSubmit(props.document)) {
    return props.document.status === 'returned' ? '请通过在线表单重提' : '请通过在线表单提交';
  }

  if (props.document.status === 'confirmed') {
    return isRevisionRequired(props.document) ? '需返工' : '资料审核通过';
  }

  if (isRevisionRequired(props.document)) {
    if (!props.document.responsibleUserId && !props.document.responsibleUser) {
      return '需返工但未分配责任人';
    }

    return isRevisionResubmitted(props.document) ? '返工已重提，待审核' : '需返工';
  }

  if (props.document.isComplete || props.document.completionStatus === 'completed') {
    return formatDocumentCompletionStatus(props.document);
  }

  if (props.document.completionStatus === 'pending_review') {
    return '待资料审核';
  }

  return '暂无资料操作';
});

function emitReturnDocument() {
  emit('return-document', {
    document: props.document,
    revisionTargetDocumentIds: isAClassReturn.value ? [...selectedRevisionTargetIds.value] : [],
    designChangeTargetDocumentIds: isCClassReturn.value ? [...selectedDesignChangeTargetIds.value] : []
  });
}
</script>
