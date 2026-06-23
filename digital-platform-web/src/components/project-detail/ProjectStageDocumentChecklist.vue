<template>
  <section class="panel stage-documents">
    <div class="panel-heading">
      <div>
        <span class="section-eyebrow">阶段资料清单</span>
        <h3>资料基础状态</h3>
        <p class="manual-status-note">
          当前操作仅为手工标记状态，不代表文件已上传，也不代表在线表单已提交。
          阶段资料齐套情况基于当前手工状态统计，不代表文件已上传或已归档。
          不适用是人工业务判断，用于说明该项目不需要该资料，不代表资料已提交、已确认或已归档。
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
              <span>适用必填总数</span>
              <strong>{{ stageCompleteness(stage).requiredTotal }}</strong>
            </div>
            <div>
              <span>已确认适用</span>
              <strong>{{ stageCompleteness(stage).confirmedRequiredCount }}</strong>
            </div>
            <div>
              <span>未完成适用</span>
              <strong>{{ stageCompleteness(stage).incompleteRequiredCount }}</strong>
            </div>
            <div>
              <span>完成百分比</span>
              <strong>{{ stageCompleteness(stage).completionPercent }}%</strong>
            </div>
          </div>

          <div class="stage-document-missing">
            <strong>缺失必填资料</strong>
            <ul v-if="stageCompleteness(stage).incompleteRequiredDocuments.length > 0">
              <li
                v-for="document in stageCompleteness(stage).incompleteRequiredDocuments"
                :key="document.id || document.documentCode"
              >
                <span class="mono">{{ document.documentCode }}</span>
                <span>{{ document.documentName }}</span>
                <StatusBadge :status="document.status" />
              </li>
            </ul>
            <p v-else>暂无缺失必填资料。</p>
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
  formatResponsibleUser,
  isApplicable,
  isResponsibleUserDisabled,
  stageCompleteness
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
