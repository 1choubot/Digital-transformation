<template>
  <section class="project-workspace__detail">
    <template v-if="node">
      <div class="project-workspace__detail-heading">
        <div>
          <span class="section-eyebrow">{{ stage?.stageName || '阶段节点' }}</span>
          <h3>{{ node.nodeName }}</h3>
        </div>
        <span class="stage-document-pill">{{ formatWorkspaceStatus(node.nodeStatus) }}</span>
      </div>

      <dl v-if="node.projectInput" class="stage-document-meta">
        <div>
          <dt>项目名称</dt>
          <dd>{{ node.projectInput.projectName || '-' }}</dd>
        </div>
        <div>
          <dt>客户</dt>
          <dd>{{ node.projectInput.customerName || '-' }}</dd>
        </div>
        <div>
          <dt>客户联系方式</dt>
          <dd>{{ node.projectInput.customerContact || '-' }}</dd>
        </div>
        <div>
          <dt>项目编号</dt>
          <dd>{{ node.projectInput.projectCode || '待后置生成' }}</dd>
        </div>
      </dl>

      <div v-if="node.blockingReasons?.length" class="stage-document-missing">
        <strong>阻塞原因</strong>
        <ul>
          <li v-for="reason in node.blockingReasons" :key="reason">{{ reason }}</li>
        </ul>
      </div>

      <div v-if="node.outputs?.length" class="project-workspace__outputs" aria-label="节点产出区">
        <div class="project-workspace__subheading">
          <span class="section-eyebrow">节点产出区</span>
          <strong>产出、责任人、状态和动作入口</strong>
        </div>
        <article
          v-for="output in node.outputs"
          :key="output.outputKey || output.documentId || output.documentCode || output.targetOutputCode"
          class="project-workspace__output"
        >
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
              <span class="stage-document-pill">{{ formatRequirementType(output.requirementType, output.isRequired) }}</span>
              <span class="stage-document-pill">{{ formatOutputKind(output.outputKind) }}</span>
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
              <dt>资料状态</dt>
              <dd>{{ formatBaseStatus(output.baseStatus) }}</dd>
            </div>
            <div>
              <dt>完成状态</dt>
              <dd>{{ formatCompletionStatus(output.completionStatus) }}</dd>
            </div>
            <div>
              <dt>完成规则</dt>
              <dd>{{ formatCompletionMode(output.completionMode) }}</dd>
            </div>
            <div>
              <dt>权限入口</dt>
              <dd>{{ formatPermissionSummary(output) }}</dd>
            </div>
            <div>
              <dt>旧清单定位</dt>
              <dd>{{ formatLegacyDocumentTarget(output) }}</dd>
            </div>
          </dl>

          <ProjectStageDocumentResponsibility
            v-if="isAssignableInitiationOutput(output) && getOutputDocument(output)"
            :document="getOutputDocument(output)"
            :candidates="responsibilityCandidates"
            :candidates-loading="responsibilityCandidatesLoading"
            :pending="isResponsibleActionPending(output)"
            :disabled="!canManageOutputResponsibility(output)"
            :disabled-reason="responsibilityDisabledReason(output)"
            :selections="responsibilitySelections"
            @save="$emit('save-responsible-user', $event)"
            @clear="$emit('clear-responsible-user', $event)"
          />
          <p
            v-if="canManageOutputResponsibility(output) && responsibilityCandidatesErrorMessage"
            class="inline-muted"
          >
            {{ responsibilityCandidatesErrorMessage }}
          </p>
          <section
            v-if="isAssignableInitiationOutput(output) && !getOutputDocument(output)"
            class="state-panel state-panel--inline project-workspace__output-note"
          >
            <p>关联资料尚未加载，暂不能分配责任人。</p>
          </section>

          <div v-if="output.blockingReasons?.length" class="stage-document-missing">
            <strong>产出阻塞</strong>
            <ul>
              <li v-for="reason in output.blockingReasons" :key="reason">{{ reason }}</li>
            </ul>
          </div>

          <div class="project-workspace__output-actions">
            <button
              v-if="output.formAvailable"
              type="button"
              class="primary-button"
              :disabled="onlineFormLoading"
              @click="$emit('open-online-form', output)"
            >
              {{ activeOnlineFormDocumentId === output.documentId ? '正在查看在线表单' : '填写资料/查看在线表单' }}
            </button>
            <button
              v-else-if="canLocateLegacyChecklist(output)"
              type="button"
              class="ghost-button"
              @click="$emit('open-legacy-checklist', output)"
            >
              定位旧资料清单
            </button>
            <span v-else class="inline-muted">{{ formatUnavailableActionText(output) }}</span>
          </div>

          <ProjectInitiationReviewPanel
            v-if="getOutputDocument(output)?.initiationReview"
            :document="getOutputDocument(output)"
            :is-action-pending="isActionPending"
            @approve-node="$emit('approve-node', $event)"
            @return-node="$emit('return-node', $event)"
          />
        </article>
      </div>

      <section v-else-if="node.projectInput" class="state-panel state-panel--inline">
        <p>项目输入节点展示轻量项目基础信息，不新增资料产出。</p>
      </section>

      <section v-if="onlineFormErrorMessage && !activeOnlineForm" class="state-panel state-panel--inline state-panel--error">
        <p>{{ onlineFormErrorMessage }}</p>
      </section>

      <section v-if="activeOnlineForm" class="online-form-editor" aria-label="在线表单动作区">
        <div class="project-workspace__detail-heading">
          <div>
            <span class="section-eyebrow">在线表单</span>
            <h3>{{ activeOnlineForm.documentCode }} {{ activeOnlineForm.documentName }}</h3>
          </div>
          <span class="stage-document-pill">{{ activeOnlineForm.status }}</span>
        </div>
        <section v-if="onlineFormErrorMessage" class="state-panel state-panel--inline state-panel--error">
          <p>{{ onlineFormErrorMessage }}</p>
        </section>
        <div v-if="activeOnlineForm.blockingReasons?.length" class="stage-document-missing">
          <strong>表单阻塞</strong>
          <ul>
            <li v-for="reason in activeOnlineForm.blockingReasons" :key="reason">{{ reason }}</li>
          </ul>
        </div>
        <form class="form-grid" @submit.prevent="$emit('submit-online-form')">
          <label
            v-for="field in activeOnlineForm.schema?.fields || []"
            :key="field.key"
            :class="{ 'form-grid__wide': field.type === 'textarea' }"
          >
            <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
            <textarea
              v-if="field.type === 'textarea'"
              :value="onlineFormData[field.key]"
              rows="3"
              :disabled="!activeOnlineForm.permissions?.canEdit || onlineFormSubmitting"
              @input="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
            ></textarea>
            <input
              v-else
              :value="onlineFormData[field.key]"
              :type="field.type === 'date' ? 'date' : 'text'"
              :disabled="!activeOnlineForm.permissions?.canEdit || onlineFormSubmitting"
              @input="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
            />
          </label>
          <div class="form-actions form-grid__wide">
            <button
              type="button"
              class="ghost-button"
              :disabled="!activeOnlineForm.permissions?.canEdit || onlineFormSaving"
              @click="$emit('save-online-form')"
            >
              {{ onlineFormSaving ? '保存中...' : '保存草稿' }}
            </button>
            <button
              type="submit"
              class="primary-button"
              :disabled="!activeOnlineForm.permissions?.canSubmit || onlineFormSubmitting"
            >
              {{ onlineFormSubmitting ? '提交中...' : '提交表单' }}
            </button>
          </div>
        </form>
      </section>
    </template>

    <section v-else class="project-workspace__placeholder">
      <strong>{{ emptyStateTitle() }}</strong>
      <p>{{ emptyStateText() }}</p>
      <button
        v-if="stage?.legacyChecklistAvailable"
        type="button"
        class="ghost-button project-workspace__legacy-link"
        @click="$emit('open-legacy-checklist')"
      >
        查看旧资料清单入口
      </button>
    </section>
  </section>
</template>

<script setup>
import ProjectInitiationReviewPanel from '../project-detail/ProjectInitiationReviewPanel.vue';
import ProjectStageDocumentResponsibility from '../project-detail/ProjectStageDocumentResponsibility.vue';
import { formatCompletionStatus as formatCompletionStatusLabel } from '../../utils/format.js';

defineEmits([
  'open-online-form',
  'open-legacy-checklist',
  'save-online-form',
  'submit-online-form',
  'update-online-form-field',
  'approve-node',
  'return-node',
  'save-responsible-user',
  'clear-responsible-user'
]);

const props = defineProps({
  stage: {
    type: Object,
    default: null
  },
  node: {
    type: Object,
    default: null
  },
  activeOnlineForm: {
    type: Object,
    default: null
  },
  activeOnlineFormDocumentId: {
    type: [Number, String],
    default: null
  },
  onlineFormData: {
    type: Object,
    required: true
  },
  onlineFormLoading: {
    type: Boolean,
    default: false
  },
  onlineFormSaving: {
    type: Boolean,
    default: false
  },
  onlineFormSubmitting: {
    type: Boolean,
    default: false
  },
  onlineFormErrorMessage: {
    type: String,
    default: ''
  },
  isActionPending: {
    type: Function,
    required: true
  },
  getOutputDocument: {
    type: Function,
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
  responsibilityCandidatesErrorMessage: {
    type: String,
    default: ''
  },
  responsibilitySelections: {
    type: Object,
    required: true
  }
});

function isAssignableInitiationOutput(output) {
  return ['1.1', '1.2'].includes(output?.documentCode);
}

function canManageOutputResponsibility(output) {
  return (
    isAssignableInitiationOutput(output) &&
    output?.permissions?.canManageResponsibility === true &&
    Boolean(props.getOutputDocument(output))
  );
}

function responsibilityDisabledReason(output) {
  if (!isAssignableInitiationOutput(output)) {
    return '';
  }

  return output?.permissions?.canManageResponsibility === true ? '' : '当前账号无权分配该资料责任人。';
}

function isResponsibleActionPending(output) {
  const document = props.getOutputDocument(output);
  return Boolean(document) && props.isActionPending(document.id, 'responsible-user');
}

function hasConfiguredStageNodes() {
  return Boolean(props.stage?.nodes?.length);
}

function emptyStateTitle() {
  return hasConfiguredStageNodes() ? '等待选择蓝色节点' : '本阶段暂未配置蓝色节点';
}

function emptyStateText() {
  if (hasConfiguredStageNodes()) {
    return '请先在当前阶段选择蓝色节点，再查看节点关联产出和在线表单入口。';
  }

  return '本阶段暂未配置蓝色节点，可使用旧资料清单入口查看阶段资料。';
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
    legacy_document_unavailable: '旧资料不可见',
    legacy_checklist_available: '旧清单入口',
    process_node: '过程节点'
  }[status] || status || '-';
}

function formatWorkspaceResponsible(output) {
  if (!output?.responsibleUser) {
    return output?.targetResponsibleRole || output?.defaultResponsibilityRole || (output?.documentCode === '1.3' ? '营销中心负责人' : '未分配');
  }

  return output.responsibleUser.name || output.responsibleUser.account || `用户 ${output.responsibleUser.id}`;
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

function formatRequirementType(requirementType, isRequired) {
  if (requirementType === 'conditional') {
    return '条件触发';
  }

  if (requirementType === 'to_be_confirmed') {
    return '待确认';
  }

  return isRequired === false ? '非必填' : '必填';
}

function formatOutputKind(outputKind) {
  return {
    draft: '草稿',
    final: '成品',
    multi_node_final: '多节点成品'
  }[outputKind] || '成品';
}

function formatPermissionSummary(output) {
  if (output?.formAvailable) {
    return '在线表单';
  }

  if (canLocateLegacyChecklist(output)) {
    return '定位旧清单';
  }

  return '仅展示';
}

function canLocateLegacyChecklist(output) {
  return (
    !output?.formAvailable &&
    output?.legacyChecklistTarget?.available === true &&
    (output?.actionHints || []).includes('locate_legacy_checklist')
  );
}

function formatLegacyDocumentTarget(output) {
  const target = output?.legacyChecklistTarget;
  if (target?.available) {
    return target.documentCode ? `${target.documentCode} 可定位` : '可定位';
  }

  if (output?.legacyDocumentCode) {
    return `${output.legacyDocumentCode} 未返回`;
  }

  return '无旧资料';
}

function formatUnavailableActionText(output) {
  if (output?.formKey && !output?.formAvailable) {
    return '关联资料未初始化，暂不能打开在线表单。';
  }

  if (output?.legacyDocumentCode) {
    return '旧资料清单未返回对应资料，暂不能定位。';
  }

  return '目标产出尚未初始化为当前项目资料。';
}
</script>
