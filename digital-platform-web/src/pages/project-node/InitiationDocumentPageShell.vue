<template>
  <section class="project-workspace__detail initiation-node-page">
    <div class="project-workspace__detail-heading">
      <div>
        <span class="section-eyebrow">{{ eyebrow }}</span>
        <h3>{{ title }}</h3>
      </div>
      <span class="stage-document-pill">{{ formatWorkspaceStatus(node?.nodeStatus) }}</span>
    </div>

    <div v-if="node?.blockingReasons?.length" class="stage-document-missing">
      <strong>节点阻塞</strong>
      <ul>
        <li v-for="reason in node.blockingReasons" :key="reason">{{ reason }}</li>
      </ul>
    </div>

    <section v-if="output" class="project-workspace__output">
      <div class="stage-document-card__main">
        <div class="stage-document-card__identity">
          <span class="stage-document-code mono">{{ output.targetOutputCode || output.documentCode || '-' }}</span>
          <strong>{{ output.documentName }}</strong>
          <small v-if="output.legacyDocumentCode" class="inline-muted">
            旧资料 {{ output.legacyDocumentCode }}{{ output.legacyDocumentName ? ` ${output.legacyDocumentName}` : '' }}
          </small>
        </div>
        <div class="stage-document-card__badges">
          <span class="stage-document-pill">{{ formatWorkspaceStatus(output.status) }}</span>
          <span class="stage-document-pill">{{ formatBaseStatus(output.baseStatus) }}</span>
        </div>
      </div>

      <dl class="stage-document-meta project-workspace__output-meta">
        <div>
          <dt>责任人</dt>
          <dd>{{ formatWorkspaceResponsible(output) }}</dd>
        </div>
        <div>
          <dt>责任角色</dt>
          <dd>{{ output.targetResponsibleRole || output.defaultResponsibilityRole || '-' }}</dd>
        </div>
        <div>
          <dt>完成状态</dt>
          <dd>{{ formatCompletionStatus(output.completionStatus) }}</dd>
        </div>
        <div>
          <dt>完成规则</dt>
          <dd>{{ formatCompletionMode(output.completionMode) }}</dd>
        </div>
      </dl>

      <ProjectStageDocumentResponsibility
        v-if="documentCode === '1.1' && document"
        :document="document"
        :candidates="context.responsibilityCandidates || []"
        :candidates-loading="context.responsibilityCandidatesLoading === true"
        :pending="isActionPending(document.id, 'responsible-user')"
        :disabled="!canManageResponsibility(output)"
        :disabled-reason="responsibilityDisabledReason(output)"
        :selections="context.responsibilitySelections || emptyObject"
        @save="invoke('saveResponsibleUser', $event)"
        @clear="invoke('clearResponsibleUser', $event)"
      />
      <p v-if="documentCode === '1.1' && canManageResponsibility(output) && context.responsibilityCandidatesErrorMessage" class="inline-muted">
        {{ context.responsibilityCandidatesErrorMessage }}
      </p>

      <div v-if="output.blockingReasons?.length" class="stage-document-missing">
        <strong>产出阻塞</strong>
        <ul>
          <li v-for="reason in output.blockingReasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>

      <section class="generated-file-panel" aria-label="生成文件状态">
        <div class="generated-file-panel__main">
          <span class="section-eyebrow">模板文件</span>
          <strong>{{ formatGeneratedFileStatus(output.generatedFile) }}</strong>
          <small v-if="output.generatedFile?.fileName">{{ output.generatedFile.fileName }}</small>
          <small v-else>达到触发点后由后端生成。</small>
          <small v-if="output.generatedFile?.status === 'failed' && output.generatedFile.failureSummary">
            {{ output.generatedFile.failureSummary }}
          </small>
          <small v-if="output.generatedFile?.status === 'failed' && output.generatedFile?.downloadable">
            可下载最近一次成功生成的 v{{ output.generatedFile.downloadableVersion }}。
          </small>
        </div>
        <button
          v-if="canDownloadGeneratedFile(output)"
          type="button"
          class="ghost-button"
          :disabled="isActionPending(output.documentId, 'download-generated-file')"
          @click="invoke('downloadGeneratedFile', output)"
        >
          {{ isActionPending(output.documentId, 'download-generated-file') ? '下载中...' : '下载生成文件' }}
        </button>
      </section>

      <div class="project-workspace__output-actions">
        <button
          v-if="output.formAvailable"
          type="button"
          class="primary-button"
          :disabled="context.onlineFormLoading === true"
          @click="openOnlineForm"
        >
          {{ isActiveOutputForm ? '正在查看在线表单' : actionText }}
        </button>
        <span v-else class="inline-muted">关联资料未初始化，暂不能打开在线表单。</span>
      </div>

      <ProjectInitiationReviewPanel
        v-if="document?.initiationReview"
        :document="document"
        :is-action-pending="isActionPending"
        @approve-node="approveNode"
        @return-node="returnNode"
      />
    </section>

    <section v-else class="state-panel state-panel--inline">
      <p>当前节点尚未返回 {{ documentCode }} 资料产出。</p>
    </section>

    <section v-if="context.onlineFormErrorMessage && !activeForm" class="state-panel state-panel--inline state-panel--error">
      <p>{{ context.onlineFormErrorMessage }}</p>
    </section>

    <NodeOnlineFormEditor
      v-if="activeForm"
      :form="activeForm"
      :form-data="context.onlineFormData || emptyObject"
      :error-message="context.onlineFormErrorMessage || ''"
      :saving="context.onlineFormSaving === true"
      :submitting="context.onlineFormSubmitting === true"
      :image-state="context.onlineFormImageState || emptyObject"
      @save="saveOnlineForm"
      @submit="submitOnlineForm"
      @update-field="invoke('updateOnlineFormField', $event)"
      @upload-image="invoke('uploadOnlineFormImage', $event)"
      @download-image="invoke('downloadOnlineFormImage', $event)"
      @delete-image="invoke('deleteOnlineFormImage', $event)"
    />
  </section>
</template>

<script setup>
import { computed } from 'vue';
import ProjectInitiationReviewPanel from '../../components/project-detail/ProjectInitiationReviewPanel.vue';
import ProjectStageDocumentResponsibility from '../../components/project-detail/ProjectStageDocumentResponsibility.vue';
import { formatCompletionStatus as formatCompletionStatusLabel } from '../../utils/format.js';
import NodeOnlineFormEditor from '../../components/node/NodeOnlineFormEditor.vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  eyebrow: {
    type: String,
    default: '立项阶段'
  },
  actionText: {
    type: String,
    default: '填写资料/查看在线表单'
  },
  documentCode: {
    type: String,
    required: true
  },
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  nodePageContext: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['business-state-changed']);

const emptyObject = Object.freeze({});
const context = computed(() => props.nodePageContext || emptyObject);
const output = computed(() =>
  (props.node?.outputs || []).find((item) => String(item.documentCode || item.legacyDocumentCode || '') === props.documentCode) || null
);
const document = computed(() => output.value ? context.value.getOutputDocument?.(output.value) || null : null);
const isActiveOutputForm = computed(
  () => output.value?.documentId && String(context.value.activeOnlineFormDocumentId || '') === String(output.value.documentId)
);
const activeForm = computed(() =>
  isActiveOutputForm.value ? context.value.activeOnlineForm || null : null
);

function invoke(name, payload) {
  const handler = context.value?.[name];
  if (typeof handler === 'function') {
    return handler(payload);
  }
  return undefined;
}

function notify(payload) {
  emit('business-state-changed', payload);
}

function openOnlineForm() {
  invoke('openOnlineForm', output.value);
}

function saveOnlineForm() {
  invoke('saveOnlineForm');
  notify({
    changedDocumentIds: output.value?.documentId ? [output.value.documentId] : [],
    affectedNodeCodes: props.node?.nodeKey ? [props.node.nodeKey] : [],
    refreshCurrentDetail: true
  });
}

function submitOnlineForm() {
  invoke('submitOnlineForm');
  notify({
    changedDocumentIds: output.value?.documentId ? [output.value.documentId] : [],
    affectedNodeCodes: props.node?.nodeKey ? [props.node.nodeKey] : [],
    refreshCurrentDetail: true
  });
}

function approveNode(payload) {
  invoke('approveInitiationNode', payload);
  notify({
    changedDocumentIds: payload?.document?.id ? [payload.document.id] : [],
    affectedNodeCodes: ['initiation_approval'],
    refreshCurrentDetail: true
  });
}

function returnNode(payload) {
  invoke('returnInitiationNode', payload);
  notify({
    changedDocumentIds: payload?.document?.id ? [payload.document.id] : [],
    affectedNodeCodes: ['market_research', 'initiation_approval'],
    refreshCurrentDetail: true
  });
}

function isActionPending(documentId, action) {
  return context.value.isActionPending?.(documentId, action) || false;
}

function canManageResponsibility(targetOutput) {
  return (
    targetOutput?.documentCode === '1.1' &&
    targetOutput?.permissions?.canManageResponsibility === true &&
    Boolean(document.value)
  );
}

function responsibilityDisabledReason(targetOutput) {
  if (targetOutput?.documentCode !== '1.1') {
    return '';
  }

  return targetOutput?.permissions?.canManageResponsibility === true ? '' : '当前账号无权分配该资料责任人。';
}

function canDownloadGeneratedFile(targetOutput) {
  return targetOutput?.generatedFile?.downloadable === true && Boolean(targetOutput?.documentId);
}

function formatGeneratedFileStatus(generatedFile) {
  if (!generatedFile) {
    return '待生成';
  }

  return {
    pending: '待生成',
    generating: '生成中',
    generated: `已生成 v${generatedFile.version || '-'}`,
    failed: '生成失败',
    superseded: '已被新版本替代'
  }[generatedFile.status] || generatedFile.status || '待生成';
}

function formatWorkspaceStatus(status) {
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待处理',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    not_configured: '未配置',
    not_applicable: '不适用',
    shell_placeholder: 'Shell 占位',
    legacy_document_unavailable: '资料不可见',
    legacy_checklist_available: '未配置',
    process_node: '过程节点'
  }[status] || status || '-';
}

function formatWorkspaceResponsible(targetOutput) {
  if (!targetOutput?.responsibleUser) {
    return targetOutput?.targetResponsibleRole || targetOutput?.defaultResponsibilityRole || (targetOutput?.documentCode === '1.3' ? '营销中心负责人' : '未分配');
  }

  return targetOutput.responsibleUser.name || targetOutput.responsibleUser.account || `用户 ${targetOutput.responsibleUser.id}`;
}

function formatBaseStatus(status) {
  return {
    not_submitted: '未提交',
    submitted: '已提交',
    confirmed: '已确认',
    returned: '已退回'
  }[status] || status || '-';
}

function formatCompletionStatus(status) {
  return status ? formatCompletionStatusLabel(status) : '-';
}

function formatCompletionMode(mode) {
  return {
    submit_only: '提交即完成',
    approval_required: '提交后审核',
    conditional_submit: '条件触发提交',
    conditional_approval: '条件触发审核'
  }[mode] || mode || '-';
}
</script>
