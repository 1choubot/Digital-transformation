<template>
  <section class="panel stage-documents">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段资料清单</span>
        <h3>资料级审核状态</h3>
        <p class="manual-status-note">
          阶段资料按 completionMode 计算完成状态：提交即完成资料提交后完成，需审核资料审核通过后完成，条件资料未触发时不阻塞。
          附件保存在在线平台，不展示文件平台归档状态。
          不适用是人工业务判断，用于说明该项目当前不需要该资料。
          资料责任人为手工分配，不代表权限控制、个人待办或文件权限。
        </p>
      </div>
    </div>

    <section v-if="actionMessage" class="state-panel state-panel--inline state-panel--success">
      <p>{{ actionMessage }}</p>
    </section>

    <section v-if="actionErrorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ actionErrorMessage }}</p>
    </section>

    <section v-if="responsibilityCandidatesErrorMessage" class="state-panel state-panel--inline state-panel--error">
      <h3>责任人候选用户加载失败</h3>
      <p>{{ responsibilityCandidatesErrorMessage }}</p>
    </section>

    <section v-if="loading" class="state-panel state-panel--inline">
      <p>正在加载阶段资料清单...</p>
    </section>

    <section v-else-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
      <h3>阶段资料清单加载失败</h3>
      <p>{{ errorMessage }}</p>
    </section>

    <section v-else-if="!checklist" class="state-panel state-panel--inline">
      <p>暂无阶段资料清单。</p>
    </section>

    <section v-else-if="isChecklistEmpty" class="state-panel state-panel--inline">
      <p>暂无阶段资料清单。</p>
    </section>

    <div v-else class="stage-document-groups">
      <article v-for="stage in checklist.stages" :key="stage.stageKey" class="stage-document-group">
        <div class="stage-document-group__heading">
          <strong>{{ stage.stageOrder }}. {{ stage.stageName }}</strong>
          <span>{{ stage.documents.length }} 项资料</span>
        </div>

        <div class="stage-document-completeness">
          <div class="stage-document-completeness__summary">
            <div>
              <span>阶段资料总数</span>
              <strong>{{ stageDocumentSummary(stage).documentTotal }}</strong>
            </div>
            <div>
              <span>适用资料总数</span>
              <strong>{{ stageDocumentSummary(stage).applicableTotal }}</strong>
            </div>
            <div>
              <span>门禁资料总数</span>
              <strong>{{ stageCompleteness(stage).requiredTotal }}</strong>
            </div>
            <div>
              <span>适用已完成</span>
              <strong>{{ stageCompleteness(stage).completedRequiredCount ?? stageCompleteness(stage).confirmedRequiredCount }}</strong>
            </div>
            <div>
              <span>非必填/条件性</span>
              <strong>
                {{ stageDocumentSummary(stage).optionalConditionalTotal }}，适用
                {{ stageDocumentSummary(stage).applicableOptionalConditionalTotal }}
              </strong>
            </div>
            <div>
              <span>门禁未完成</span>
              <strong>{{ stageCompleteness(stage).incompleteRequiredCount }}</strong>
            </div>
            <div>
              <span>门禁完成率</span>
              <strong>{{ stageCompleteness(stage).completionPercent }}%</strong>
            </div>
          </div>

          <div class="stage-document-missing">
            <strong>推进门禁未完成的适用资料</strong>
            <p>条件资料未触发时不计入缺失；触发后按 completionMode 判断。</p>
            <ul v-if="stageCompleteness(stage).incompleteRequiredDocuments.length > 0">
              <li
                v-for="document in stageCompleteness(stage).incompleteRequiredDocuments"
                :key="document.id || document.documentCode"
              >
                <span class="mono">{{ document.documentCode }}</span>
                <span>{{ document.documentName }}</span>
                <span class="stage-document-pill">{{ formatApplicability(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionMode(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionStatus(document) }}</span>
                <span v-if="isRevisionRequired(document)" class="stage-document-pill stage-document-pill--warning">需返工</span>
                <StatusBadge :status="document.status" />
              </li>
            </ul>
            <p v-else>当前阶段适用资料均已按完成规则完成。</p>
          </div>

          <div class="stage-document-missing stage-document-optional">
            <strong>非必填/条件性资料</strong>
            <ul v-if="stageDocumentSummary(stage).optionalConditionalDocuments.length > 0">
              <li
                v-for="document in stageDocumentSummary(stage).optionalConditionalDocuments"
                :key="document.id || document.documentCode"
              >
                <span class="mono">{{ document.documentCode }}</span>
                <span>{{ document.documentName }}</span>
                <span class="stage-document-pill">{{ formatApplicability(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionMode(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionStatus(document) }}</span>
                <span v-if="isRevisionRequired(document)" class="stage-document-pill stage-document-pill--warning">需返工</span>
                <StatusBadge :status="document.status" />
              </li>
            </ul>
            <p v-else>本阶段暂无非必填/条件性资料。</p>
          </div>
        </div>

        <div v-if="stage.documents.length === 0" class="stage-document-empty">本阶段暂无资料项。</div>
        <div v-else class="stage-document-list">
          <article
            v-for="document in stage.documents"
            :key="document.documentCode"
            class="stage-document-card"
            :class="{
              'stage-document-card--not-applicable': !isApplicable(document),
              'stage-document-card--revision-required': isRevisionRequired(document)
            }"
          >
            <div class="stage-document-card__main">
              <div class="stage-document-card__identity">
                <span class="stage-document-code mono">{{ document.documentCode }}</span>
                <strong>{{ document.documentName }}</strong>
              </div>
              <div class="stage-document-card__badges">
                <span class="stage-document-pill">{{ formatRequired(document.isRequired) }}</span>
                <span class="stage-document-pill">{{ formatApplicability(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionMode(document) }}</span>
                <span class="stage-document-pill">{{ formatDocumentCompletionStatus(document) }}</span>
                <span v-if="isRevisionRequired(document)" class="stage-document-pill stage-document-pill--warning">需返工</span>
                <StatusBadge :status="document.status" />
              </div>
            </div>

            <dl class="stage-document-meta">
              <div>
                <dt>默认责任中心</dt>
                <dd>{{ formatDepartment(document.ownerDepartment) }}</dd>
              </div>
              <div>
                <dt>默认审核中心</dt>
                <dd>{{ formatDepartment(document.reviewDepartment) }}</dd>
              </div>
              <div>
                <dt>责任角色</dt>
                <dd>{{ document.defaultResponsibilityRole || '-' }}</dd>
              </div>
              <div>
                <dt>资料责任人</dt>
                <dd>
                  {{ formatResponsibleUser(document) }}
                  <span v-if="isResponsibleUserDisabled(document)" class="inline-muted">（已禁用）</span>
                </dd>
              </div>
              <div>
                <dt>提交方式</dt>
                <dd>{{ formatSubmitMode(document.submitMode) }}</dd>
              </div>
              <div>
                <dt>完成规则</dt>
                <dd>{{ formatDocumentCompletionMode(document) }}</dd>
              </div>
              <div>
                <dt>完成状态</dt>
                <dd>{{ formatDocumentCompletionStatus(document) }}</dd>
              </div>
              <div v-if="isRevisionRequired(document)">
                <dt>返工状态</dt>
                <dd>
                  {{ formatRevisionSummary(document) }}
                  <span v-if="!document.responsibleUserId && !document.responsibleUser" class="inline-muted">
                    （需返工但未分配责任人）
                  </span>
                </dd>
              </div>
            </dl>

            <div class="stage-document-card__body">
              <ProjectStageDocumentTrace :document="document" />
              <section
                v-if="isInitiationOnlineFormDocument(document)"
                class="stage-document-card__actions"
                aria-label="立项阶段资料辅助提示"
              >
                <h4>立项阶段在线表单</h4>
                <span class="stage-document-actions__empty">
                  请在上方项目工作区处理立项阶段在线表单。
                </span>
              </section>
              <template v-else>
                <ProjectInitiationReviewPanel
                  v-if="document.initiationReview"
                  :document="document"
                  :is-action-pending="isActionPending"
                  @approve-node="$emit('approve-initiation-review-node', $event)"
                  @return-node="$emit('return-initiation-review-node', $event)"
                />
                <ProjectStageDocumentAttachments
                  :document="document"
                  :state="getAttachmentState(document.id)"
                  @upload="$emit('upload-attachment', $event)"
                  @download="$emit('download-attachment', $event)"
                  @delete="$emit('delete-attachment', $event)"
                />
                <ProjectStageDocumentActions
                  :document="document"
                  :responsibility-candidates="responsibilityCandidates"
                  :responsibility-candidates-loading="responsibilityCandidatesLoading"
                  :responsibility-selections="responsibilitySelections"
                  :can-submit-document="canSubmitDocument(document)"
                  :can-confirm-return-document="canConfirmReturnDocument(document)"
                  :can-manage-responsibility="canManageResponsibility(document)"
                  :can-change-applicability="canChangeApplicability(document)"
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
              </template>
            </div>
          </article>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import StatusBadge from '../StatusBadge.vue';
import { formatRequired, formatSubmitMode } from '../../utils/format.js';
import ProjectStageDocumentActions from './ProjectStageDocumentActions.vue';
import ProjectStageDocumentAttachments from './ProjectStageDocumentAttachments.vue';
import ProjectStageDocumentTrace from './ProjectStageDocumentTrace.vue';
import ProjectInitiationReviewPanel from './ProjectInitiationReviewPanel.vue';
import {
  formatApplicability,
  formatDocumentCompletionMode,
  formatDocumentCompletionStatus,
  formatDepartment,
  formatRevisionSummary,
  formatResponsibleUser,
  isApplicable,
  isInitiationOnlineFormDocument,
  isRevisionRequired,
  isResponsibleUserDisabled,
  stageCompleteness,
  stageDocumentSummary
} from './stageDocumentViewHelpers.js';

defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
  'approve-initiation-review-node',
  'return-initiation-review-node',
  'complete-revision-document',
  'mark-not-applicable',
  'restore-applicable',
  'save-responsible-user',
  'clear-responsible-user',
  'upload-attachment',
  'download-attachment',
  'delete-attachment'
]);

defineProps({
  checklist: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  },
  isChecklistEmpty: {
    type: Boolean,
    default: false
  },
  actionMessage: {
    type: String,
    default: ''
  },
  actionErrorMessage: {
    type: String,
    default: ''
  },
  responsibilityCandidatesErrorMessage: {
    type: String,
    default: ''
  },
  responsibilityCandidatesLoading: {
    type: Boolean,
    default: false
  },
  responsibilityCandidates: {
    type: Array,
    default: () => []
  },
  responsibilitySelections: {
    type: Object,
    required: true
  },
  canSubmitDocument: {
    type: Function,
    default: () => true
  },
  canConfirmReturnDocument: {
    type: Function,
    default: () => true
  },
  canManageResponsibility: {
    type: Function,
    default: () => true
  },
  canChangeApplicability: {
    type: Function,
    default: () => true
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
  },
  getAttachmentState: {
    type: Function,
    required: true
  }
});
</script>
