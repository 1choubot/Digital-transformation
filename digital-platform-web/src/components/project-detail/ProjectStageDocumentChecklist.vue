<template>
  <section class="panel stage-documents">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段资料清单</span>
        <h3>资料级审核状态</h3>
        <p class="manual-status-note">
          单个资料项先完成资料级审核，审核通过后才计入阶段齐套。
          上传附件只表示资料文件准备，不等于提交资料审核、资料审核通过或阶段关口审批通过。
          阶段资料齐套情况基于资料审核状态和人工适用性统计，不代表文件已归档。
          不适用是人工业务判断，用于说明该项目不需要该资料，不代表资料已提交审核、审核通过或已归档。
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
              <span>适用必填总数</span>
              <strong>{{ stageCompleteness(stage).requiredTotal }}</strong>
            </div>
            <div>
              <span>必填已审核通过</span>
              <strong>{{ stageCompleteness(stage).confirmedRequiredCount }}</strong>
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
            <strong>推进门禁未完成的适用必填资料</strong>
            <p>非必填/条件性资料不计入必填齐套门禁。</p>
            <ul v-if="stageCompleteness(stage).incompleteRequiredDocuments.length > 0">
              <li
                v-for="document in stageCompleteness(stage).incompleteRequiredDocuments"
                :key="document.id || document.documentCode"
              >
                <span class="mono">{{ document.documentCode }}</span>
                <span>{{ document.documentName }}</span>
                <span class="stage-document-pill">{{ formatApplicability(document) }}</span>
                <StatusBadge :status="document.status" />
              </li>
            </ul>
            <p v-else>当前阶段适用必填资料均已通过资料级审核。</p>
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
            :class="{ 'stage-document-card--not-applicable': !isApplicable(document) }"
          >
            <div class="stage-document-card__main">
              <div class="stage-document-card__identity">
                <span class="stage-document-code mono">{{ document.documentCode }}</span>
                <strong>{{ document.documentName }}</strong>
              </div>
              <div class="stage-document-card__badges">
                <span class="stage-document-pill">{{ formatRequired(document.isRequired) }}</span>
                <span class="stage-document-pill">{{ formatApplicability(document) }}</span>
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
                <dt>目标目录</dt>
                <dd class="mono">{{ document.targetFolderPath || '-' }}</dd>
              </div>
              <div>
                <dt>目录ID</dt>
                <dd>{{ document.targetFolderId || '-' }}</dd>
              </div>
            </dl>

            <div class="stage-document-card__body">
              <ProjectStageDocumentTrace :document="document" />
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
                @mark-not-applicable="$emit('mark-not-applicable', $event)"
                @restore-applicable="$emit('restore-applicable', $event)"
                @save-responsible-user="$emit('save-responsible-user', $event)"
                @clear-responsible-user="$emit('clear-responsible-user', $event)"
              />
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
import {
  formatApplicability,
  formatDepartment,
  formatResponsibleUser,
  isApplicable,
  isResponsibleUserDisabled,
  stageCompleteness,
  stageDocumentSummary
} from './stageDocumentViewHelpers.js';

defineEmits([
  'submit-document',
  'confirm-document',
  'return-document',
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
