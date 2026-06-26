<template>
  <section class="stage-document-trace" aria-label="资料项追溯">
    <h4>追溯</h4>
    <div class="trace-list">
      <span>提交审核：{{ formatTrace(document.submittedByUserId, document.submittedAt) }}</span>
      <span>审核通过：{{ formatTrace(document.confirmedByUserId, document.confirmedAt) }}</span>
      <span>审核退回：{{ formatTrace(document.returnedByUserId, document.returnedAt) }}</span>
      <span v-if="document.returnReason">审核退回原因：{{ document.returnReason }}</span>
      <span v-if="document.revisionRequired">返工请求：{{ formatTrace(document.revisionRequestedByUserId, document.revisionRequestedAt) }}</span>
      <span v-if="document.revisionReason">返工原因：{{ document.revisionReason }}</span>
      <span v-if="document.revisionRequired && document.revisionSourceDocument">
        来源审批资料：{{ document.revisionSourceDocument.documentCode || '-' }} {{ document.revisionSourceDocument.documentName || '' }}
      </span>
      <span v-if="document.revisionResubmittedAt">返工重提：{{ formatTrace(document.revisionResubmittedByUserId, document.revisionResubmittedAt) }}</span>
      <span v-if="document.revisionCompletedAt">返工完成：{{ formatTrace(document.revisionCompletedByUserId, document.revisionCompletedAt) }}</span>
      <span>不适用：{{ formatTrace(document.notApplicableByUserId, document.notApplicableAt) }}</span>
      <span v-if="document.notApplicableReason">不适用原因：{{ document.notApplicableReason }}</span>
      <span>恢复适用：{{ formatTrace(document.restoredApplicableByUserId, document.restoredApplicableAt) }}</span>
      <span>责任人变更：{{ formatTrace(document.responsibilityUpdatedByUserId, document.responsibilityUpdatedAt) }}</span>
    </div>
  </section>
</template>

<script setup>
import { formatTrace } from './stageDocumentViewHelpers.js';

defineProps({
  document: {
    type: Object,
    required: true
  }
});
</script>
