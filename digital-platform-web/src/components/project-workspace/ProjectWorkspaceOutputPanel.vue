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
          <dt>客户联系人</dt>
          <dd>{{ node.projectInput.customerContactPerson || '-' }}</dd>
        </div>
        <div>
          <dt>客户联系方式</dt>
          <dd>{{ node.projectInput.customerContact || '-' }}</dd>
        </div>
        <div>
          <dt>项目编号</dt>
          <dd>{{ node.projectInput.projectCode || '待在 1.2 填写' }}</dd>
        </div>
        <div>
          <dt>商务负责人</dt>
          <dd>{{ formatProjectInputUser(node.projectInput.businessResponsibleUser) }}</dd>
        </div>
        <div>
          <dt>技术负责人</dt>
          <dd>{{ formatProjectInputUser(node.projectInput.technicalResponsibleUser) }}</dd>
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
          :data-workspace-output-document-id="getBoundDocument(output)?.id || null"
          :data-workspace-output-document-code="getBoundDocument(output)?.documentCode || output.documentCode || null"
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

          <div v-if="getOutputPermissionHints(output).length" class="stage-document-missing project-workspace__permission-hints">
            <strong>权限提示</strong>
            <ul>
              <li v-for="reason in getOutputPermissionHints(output)" :key="reason">{{ reason }}</li>
            </ul>
          </div>

          <section v-if="isGenericMigratedOutput(output)" class="project-workspace__output-body" aria-label="产出卡片通用资料操作">
            <ProjectStageDocumentAttachments
              :document="getBoundDocument(output)"
              :state="getOutputAttachmentState(output)"
              @upload="$emit('upload-attachment', $event)"
              @download="$emit('download-attachment', $event)"
              @delete="$emit('delete-attachment', $event)"
            />
            <ProjectStageDocumentActions
              :document="getBoundDocument(output)"
              :responsibility-candidates="responsibilityCandidates"
              :responsibility-candidates-loading="responsibilityCandidatesLoading"
              :responsibility-selections="responsibilitySelections"
              :can-submit-document="canSubmitDocument(getBoundDocument(output))"
              :can-confirm-return-document="canConfirmReturnDocument(getBoundDocument(output))"
              :can-manage-responsibility="canManageResponsibility(getBoundDocument(output))"
              :can-change-applicability="canChangeApplicability(getBoundDocument(output))"
              :return-reasons="returnReasons"
              :not-applicable-reasons="notApplicableReasons"
              :is-action-pending="isActionPending"
              @submit-document="$emit('submit-document', $event)"
              @confirm-document="$emit('confirm-document', $event)"
              @return-document="$emit('return-document', $event)"
              @complete-revision-document="$emit('complete-revision-document', $event)"
              @mark-not-applicable="$emit('mark-not-applicable', $event)"
              @restore-applicable="$emit('restore-applicable', $event)"
              @save-responsible-user="$emit('save-responsible-user', $event)"
              @clear-responsible-user="$emit('clear-responsible-user', $event)"
            />
          </section>

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
            <span v-else-if="isGenericMigratedOutput(output)" class="inline-muted">通用资料操作已迁移到本产出卡片。</span>
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
        <dl v-if="activeOnlineForm.collaboration" class="stage-document-meta online-form-collaboration-status">
          <div>
            <dt>商务部分</dt>
            <dd>{{ formatCollaborationPartStatus(activeOnlineForm.collaboration.businessSubmitted) }}</dd>
          </div>
          <div>
            <dt>技术部分</dt>
            <dd>{{ formatCollaborationPartStatus(activeOnlineForm.collaboration.technicalSubmitted) }}</dd>
          </div>
          <div>
            <dt>当前填写区域</dt>
            <dd>{{ formatEditablePart(activeOnlineForm.permissions?.editablePart) }}</dd>
          </div>
        </dl>
        <form class="online-form-editor__form" @submit.prevent="$emit('submit-online-form')">
          <section v-if="activeOnlineForm.schema?.noticeTemplate" class="online-form-notice-preview">
            <h4>{{ activeOnlineForm.schema.noticeTemplate.title }}</h4>
            <p
              v-for="paragraph in activeOnlineForm.schema.noticeTemplate.bodyParagraphs"
              :key="paragraph"
            >
              {{ paragraph }}
            </p>
            <div class="online-form-notice-table" role="table" aria-label="立项通知项目表格">
              <div class="online-form-notice-table__row online-form-notice-table__row--head" role="row">
                <span
                  v-for="column in activeOnlineForm.schema.noticeTemplate.tableColumns"
                  :key="column"
                  role="columnheader"
                >
                  {{ column }}
                </span>
              </div>
              <div class="online-form-notice-table__row" role="row">
                <span
                  v-for="column in activeOnlineForm.schema.noticeTemplate.tableColumns"
                  :key="column"
                  role="cell"
                >
                  {{ getNoticeTableValue(column) }}
                </span>
              </div>
            </div>
            <p class="online-form-notice-preview__signer">{{ activeOnlineForm.schema.noticeTemplate.signer }}</p>
            <p class="online-form-notice-preview__date">{{ onlineFormData.noticeDate || '日期待填写' }}</p>
          </section>

          <section
            v-for="section in getSchemaSections(activeOnlineForm)"
            :key="section.key"
            class="online-form-section"
          >
            <h4>{{ section.title }}</h4>
            <div class="form-grid">
              <label
                v-for="field in section.fields || []"
                :key="field.key"
                :class="getFieldClass(field)"
              >
                <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
                <select
                  v-if="field.type === 'select'"
                  :value="onlineFormData[field.key]"
                  :disabled="isOnlineFormFieldDisabled(field)"
                  @change="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
                >
                  <option value="">请选择</option>
                  <option v-for="option in field.options || []" :key="option" :value="option">{{ option }}</option>
                </select>
                <select
                  v-else-if="field.type === 'score'"
                  :value="onlineFormData[field.key]"
                  :disabled="isOnlineFormFieldDisabled(field)"
                  @change="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
                >
                  <option value="">请选择分值</option>
                  <option v-for="score in scoreOptions" :key="score" :value="score">{{ score }}</option>
                </select>
                <textarea
                  v-else-if="field.type === 'textarea'"
                  :value="onlineFormData[field.key]"
                  rows="3"
                  :disabled="isOnlineFormFieldDisabled(field)"
                  @input="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
                ></textarea>
                <input
                  v-else
                  :value="onlineFormData[field.key]"
                  :type="field.type === 'date' ? 'date' : 'text'"
                  :readonly="field.readOnly"
                  :disabled="isOnlineFormFieldDisabled(field)"
                  @input="$emit('update-online-form-field', { key: field.key, value: $event.target.value })"
                />
              </label>
            </div>
          </section>

          <section
            v-for="section in activeOnlineForm.schema?.scoringSections || []"
            :key="section.key"
            class="online-form-section"
          >
            <h4>{{ section.title }}</h4>
            <div class="online-form-score-list">
              <article
                v-for="item in section.items || []"
                :key="item.key"
                class="online-form-score-card"
              >
                <header>
                  <strong>{{ item.itemName }}</strong>
                </header>
                <dl class="online-form-score-card__template">
                  <div>
                    <dt>条款内容</dt>
                    <dd>{{ item.clauseContent || '-' }}</dd>
                  </div>
                  <div>
                    <dt>评价标准</dt>
                    <dd>{{ item.evaluationStandard || '-' }}</dd>
                  </div>
                </dl>
                <div class="form-grid online-form-score-card__inputs">
                  <label>
                    <span>分值 0-5 *</span>
                      <select
                        :value="onlineFormData[`${item.key}Score`]"
                      :disabled="isOnlineFormPartDisabled(section.editablePart)"
                      @change="$emit('update-online-form-field', { key: `${item.key}Score`, value: $event.target.value })"
                    >
                      <option value="">请选择分值</option>
                      <option v-for="score in scoreOptions" :key="score" :value="score">{{ score }}</option>
                    </select>
                  </label>
                  <label>
                    <span>信息收集说明</span>
                    <textarea
                      :value="onlineFormData[`${item.key}InformationNotes`]"
                      rows="3"
                      :disabled="isOnlineFormPartDisabled(section.editablePart)"
                      @input="$emit('update-online-form-field', { key: `${item.key}InformationNotes`, value: $event.target.value })"
                    ></textarea>
                  </label>
                  <label>
                    <span>责任人</span>
                    <input
                      :value="onlineFormData[`${item.key}ResponsiblePerson`]"
                      type="text"
                      :disabled="isOnlineFormPartDisabled(section.editablePart)"
                      @input="$emit('update-online-form-field', { key: `${item.key}ResponsiblePerson`, value: $event.target.value })"
                    />
                  </label>
                </div>
              </article>
            </div>
          </section>

          <section v-if="activeOnlineForm.reviewOpinions?.length" class="online-form-section">
            <h4>三方意见</h4>
            <div class="online-form-review-opinions">
              <article
                v-for="opinion in activeOnlineForm.reviewOpinions"
                :key="opinion.nodeKey"
                class="online-form-review-opinion"
              >
                <strong>{{ opinion.nodeName }}</strong>
                <span class="stage-document-pill">{{ formatReviewOpinionStatus(opinion.nodeStatus) }}</span>
                <p>{{ opinion.comment || opinion.returnReason || '暂无意见' }}</p>
                <small>{{ opinion.reviewedByName || opinion.reviewerName || '待处理' }}{{ opinion.reviewedAt ? ` · ${opinion.reviewedAt}` : '' }}</small>
              </article>
            </div>
          </section>

          <div class="form-actions online-form-editor__actions">
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
              {{ onlineFormSubmitting ? '提交中...' : getOnlineFormSubmitLabel() }}
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
import ProjectStageDocumentActions from '../project-detail/ProjectStageDocumentActions.vue';
import ProjectStageDocumentAttachments from '../project-detail/ProjectStageDocumentAttachments.vue';
import ProjectStageDocumentResponsibility from '../project-detail/ProjectStageDocumentResponsibility.vue';
import { formatCompletionStatus as formatCompletionStatusLabel } from '../../utils/format.js';
import { isInitiationOnlineFormDocument } from '../project-detail/stageDocumentViewHelpers.js';

defineEmits([
  'open-online-form',
  'open-legacy-checklist',
  'save-online-form',
  'submit-online-form',
  'update-online-form-field',
  'approve-node',
  'return-node',
  'submit-document',
  'confirm-document',
  'return-document',
  'complete-revision-document',
  'mark-not-applicable',
  'restore-applicable',
  'save-responsible-user',
  'clear-responsible-user',
  'upload-attachment',
  'download-attachment',
  'delete-attachment'
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
  },
  canSubmitDocument: {
    type: Function,
    required: true
  },
  canConfirmReturnDocument: {
    type: Function,
    required: true
  },
  canManageResponsibility: {
    type: Function,
    required: true
  },
  canChangeApplicability: {
    type: Function,
    required: true
  },
  returnReasons: {
    type: Object,
    required: true
  },
  notApplicableReasons: {
    type: Object,
    required: true
  },
  getAttachmentState: {
    type: Function,
    required: true
  }
});

const scoreOptions = [0, 1, 2, 3, 4, 5];

function getSchemaSections(form) {
  if (Array.isArray(form?.schema?.sections) && form.schema.sections.length > 0) {
    return form.schema.sections;
  }

  return [
    {
      key: 'default',
      title: '表单内容',
      fields: form?.schema?.fields || []
    }
  ];
}

function getFieldClass(field) {
  return {
    'form-grid__wide': field.type === 'textarea',
    'online-form-field--readonly': field.readOnly
  };
}

function isOnlineFormFieldDisabled(field) {
  return (
    field.readOnly ||
    isOnlineFormPartDisabled(field.editablePart)
  );
}

function isOnlineFormPartDisabled(editablePart) {
  const permissions = props.activeOnlineForm?.permissions || {};
  if (!permissions.canEdit || props.onlineFormSubmitting) {
    return true;
  }

  return Boolean(editablePart) && editablePart !== permissions.editablePart;
}

function formatCollaborationPartStatus(value) {
  return value ? '已提交' : '待填写';
}

function formatEditablePart(part) {
  return {
    business: '基础模块和商务模块',
    technical: '技术模块'
  }[part] || '仅查看';
}

function getOnlineFormSubmitLabel() {
  const part = props.activeOnlineForm?.permissions?.editablePart;
  if (props.activeOnlineForm?.documentCode === '1.2') {
    if (part === 'business') {
      return '提交商务部分';
    }
    if (part === 'technical') {
      return '提交技术部分';
    }
  }

  return '提交表单';
}

function getNoticeTableValue(column) {
  const keyByColumn = {
    序号: 'sequenceNumber',
    项目编号: 'projectCode',
    项目名称: 'projectName',
    客户单位: 'customerUnit',
    立项日期: 'initiationDate'
  };
  const key = keyByColumn[column];
  return key ? props.onlineFormData[key] || '-' : '-';
}

function formatReviewOpinionStatus(status) {
  return {
    waiting_document_submission: '待表单提交',
    pending: '待处理',
    approved: '已通过',
    returned_blocked_by_rework: '已退回',
    waiting_prerequisite: '等待前置评价',
    invalidated: '已失效'
  }[status] || status || '-';
}

function isAssignableInitiationOutput(output) {
  return output?.documentCode === '1.1';
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

function getBoundDocument(output) {
  return props.getOutputDocument(output);
}

function hasOutputDocumentBinding(output) {
  const document = getBoundDocument(output);
  return Boolean(document?.id || document?.documentCode || output?.documentId || output?.documentCode);
}

function isGenericMigratedOutput(output) {
  const document = getBoundDocument(output);
  return Boolean(document) && hasOutputDocumentBinding(output) && !isInitiationOnlineFormDocument(document);
}

function getOutputAttachmentState(output) {
  const document = getBoundDocument(output);
  return document ? props.getAttachmentState(document.id) : null;
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

function formatProjectInputUser(user) {
  if (!user) {
    return '-';
  }

  return user.name || user.account || `用户 ${user.id}`;
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

  if (isGenericMigratedOutput(output)) {
    return '本卡片处理';
  }

  if (canLocateLegacyChecklist(output)) {
    return '定位旧清单';
  }

  return '仅展示';
}

function canLocateLegacyChecklist(output) {
  return (
    !isGenericMigratedOutput(output) &&
    !output?.formAvailable &&
    output?.legacyChecklistTarget?.available === true &&
    (output?.actionHints || []).includes('locate_legacy_checklist')
  );
}

function getOutputPermissionHints(output) {
  const document = getBoundDocument(output);
  if (!document) {
    return output?.blockingReasons || [];
  }

  if (!isGenericMigratedOutput(output)) {
    return [];
  }

  const permissions = document.permissions || {};
  const hints = [];
  if (permissions.canManageResponsibility !== true) {
    hints.push('当前账号无权分配或清空该资料责任人');
  }
  if (permissions.canViewAttachments !== true) {
    hints.push('当前账号无权查看该资料附件');
  } else if (permissions.canUploadAttachment !== true) {
    hints.push('当前账号无权上传该资料附件');
  }
  if (permissions.canSubmitDocument !== true && ['not_submitted', 'returned'].includes(document.status)) {
    hints.push('当前账号无权提交该资料');
  }
  if (permissions.canReviewDocument !== true && document.status === 'submitted') {
    hints.push('当前账号无权审核通过或退回该资料');
  }
  if (permissions.canChangeApplicability !== true) {
    hints.push('当前账号无权标记不适用或恢复适用');
  }

  return [...new Set(hints)];
}

function formatLegacyDocumentTarget(output) {
  const target = output?.legacyChecklistTarget;
  if (isGenericMigratedOutput(output)) {
    return target?.documentCode ? `${target.documentCode} 兼容区只读` : '兼容区只读';
  }

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
