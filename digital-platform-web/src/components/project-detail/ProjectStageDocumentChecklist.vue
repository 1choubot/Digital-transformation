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

<style scoped>
/* ===== 卡片容器 ===== */
.stage-documents {
  background: #ffffff;
  border-radius: 8px;
  border: none;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.04);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
}

.stage-documents:hover {
  box-shadow: 0 8px 20px rgba(0, 21, 41, 0.06);
}

/* ===== 面板头部 ===== */
.panel-heading {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #ebeef5;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #909399;
  margin-bottom: 0.25rem;
}

.panel-heading h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #303133;
  margin: 0 0 0.25rem 0;
  position: relative;
  padding-left: 10px;
}

.panel-heading h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 2px;
  bottom: 2px;
  width: 4px;
  background: #3e63dd;
  border-radius: 2px;
}

.manual-status-note {
  font-size: 0.8rem;
  color: #909399;
  margin: 0.25rem 0 0 0;
  line-height: 1.5;
}

/* ===== 状态面板 ===== */
.state-panel {
  padding: 0.75rem 1.5rem;
  margin: 0 1.5rem 1rem;
  border-radius: 6px;
  text-align: center;
}

.state-panel--success {
  background: #f0f9eb;
  color: #67c23a;
}

.state-panel--error {
  background: #fef0f0;
  color: #f56c6c;
}

.state-panel p {
  margin: 0;
  font-size: 0.9rem;
}

.state-panel h3 {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.25rem 0;
  color: inherit;
}

/* ===== 阶段分组容器 ===== */
.stage-document-groups {
  padding: 0.5rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ===== 单个阶段组 ===== */
.stage-document-group {
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  padding: 1.25rem 1.5rem;
  transition: border-color 0.2s;
}

.stage-document-group:hover {
  border-color: #dcdfe6;
}

.stage-document-group__heading {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e4e7ed;
}

.stage-document-group__heading strong {
  font-size: 1.05rem;
  font-weight: 600;
  color: #303133;
}

.stage-document-group__heading span {
  font-size: 0.8rem;
  color: #909399;
  background: #f4f6f9;
  padding: 0.1rem 0.6rem;
  border-radius: 4px;
}

/* ===== 阶段齐套摘要 ===== */
.stage-document-completeness {
  margin-bottom: 1rem;
  padding: 0.75rem 0.75rem 0.5rem;
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.stage-document-completeness__summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px dashed #f0f0f0;
  margin-bottom: 0.5rem;
}

.stage-document-completeness__summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.stage-document-completeness__summary span {
  font-size: 0.65rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #909399;
}

.stage-document-completeness__summary strong {
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
}

.stage-document-missing strong {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #e6a23c;
  margin-bottom: 0.3rem;
}

.stage-document-missing ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stage-document-missing li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #606266;
  padding: 0.15rem 0.3rem;
  background: #fefcf5;
  border-radius: 3px;
}

.stage-document-missing li .mono {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  border-radius: 3px;
  padding: 0.05rem 0.4rem;
  flex-shrink: 0;
}

.stage-document-missing li span:nth-child(2) {
  flex: 1;
  word-break: break-word;
}

.stage-document-missing p {
  margin: 0;
  font-size: 0.8rem;
  color: #909399;
  font-style: italic;
}

/* ===== 空状态 ===== */
.stage-document-empty {
  font-size: 0.85rem;
  color: #909399;
  text-align: center;
  padding: 1rem 0;
  background: #ffffff;
  border-radius: 4px;
}

/* ===== 资料卡片列表 ===== */
.stage-document-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ===== 单个资料卡片 ===== */
.stage-document-card {
  background: #ffffff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
  padding: 1rem 1.25rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.stage-document-card:hover {
  border-color: #d6e0ff;
  box-shadow: 0 2px 8px rgba(62, 99, 221, 0.04);
}

.stage-document-card--not-applicable {
  background: #fafbfc;
  opacity: 0.75;
}

.stage-document-card--not-applicable:hover {
  border-color: #dcdfe6;
}

/* ===== 卡片头部：编号 + 名称 + 徽章 ===== */
.stage-document-card__main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-bottom: 0.5rem;
}

.stage-document-card__identity {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 150px;
}

.stage-document-code {
  font-family: Consolas, monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: #3e63dd;
  background: #f0f3ff;
  border: 1px solid #d6e0ff;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  flex-shrink: 0;
}

.stage-document-card__identity strong {
  font-size: 0.95rem;
  font-weight: 600;
  color: #303133;
  word-break: break-word;
}

.stage-document-card__badges {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.stage-document-pill {
  font-size: 0.65rem;
  font-weight: 500;
  color: #606266;
  background: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
  white-space: nowrap;
}

/* 统一状态标签紧凑样式（全局） */
.stage-documents :deep(.status-badge),
.stage-documents :deep(.status-badge) span {
  font-size: 0.7rem;
  padding: 0.1rem 0.45rem;
  line-height: 1.4;
  border-radius: 3px;
  white-space: nowrap;
}

/* ===== 元数据（定义列表） ===== */
.stage-document-meta {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.25rem 1.5rem;
  margin: 0.25rem 0 0.5rem;
  padding: 0.25rem 0;
  border-top: 1px solid #f4f4f5;
  border-bottom: 1px solid #f4f4f5;
}

.stage-document-meta > div {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.15rem 0;
}

.stage-document-meta dt {
  font-size: 0.6rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #909399;
}

.stage-document-meta dd {
  margin: 0;
  font-size: 0.8rem;
  color: #303133;
  word-break: break-word;
}

.stage-document-meta dd .mono {
  font-family: Consolas, monospace;
  font-size: 0.75rem;
  color: #606266;
}

.inline-muted {
  font-size: 0.7rem;
  color: #c0c4cc;
}

/* ===== 卡片主体（附件 + 操作） ===== */
.stage-document-card__body {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* ===== 子组件内部样式微调 ===== */
.stage-document-card__body :deep(.stage-document-trace) {
  margin: 0;
  padding: 0.25rem 0;
}

.stage-document-card__body :deep(.stage-document-attachments) {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid #f0f0f0;
}

.stage-document-card__body :deep(.stage-document-card__actions) {
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid #f0f0f0;
}

/* ============================================================ */
/* ===== 响应式适配 ===== */
/* ============================================================ */

/* 1024px 以下：元数据改为两列 */
@media (max-width: 1024px) {
  .stage-document-completeness__summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .stage-document-meta {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 768px 以下：阶段组内边距缩小，卡片堆叠 */
@media (max-width: 768px) {
  .panel-heading {
    padding: 0.85rem 1rem;
  }

  .state-panel {
    margin: 0 1rem 0.75rem;
    padding: 0.5rem 1rem;
  }

  .stage-document-groups {
    padding: 0.5rem 1rem 1rem;
  }

  .stage-document-group {
    padding: 1rem;
  }

  .stage-document-completeness__summary {
    grid-template-columns: 1fr 1fr;
  }

  .stage-document-card {
    padding: 0.75rem 1rem;
  }

  .stage-document-card__main {
    flex-direction: column;
    align-items: stretch;
  }

  .stage-document-card__badges {
    justify-content: flex-start;
  }

  .stage-document-meta {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }

  .stage-document-meta > div {
    padding: 0.1rem 0;
  }
}

/* 480px 以下：进一步缩小内边距和字体 */
@media (max-width: 480px) {
  .panel-heading {
    padding: 0.75rem;
  }

  .panel-heading h3 {
    font-size: 0.95rem;
  }

  .manual-status-note {
    font-size: 0.75rem;
  }

  .state-panel {
    margin: 0 0.5rem 0.5rem;
    padding: 0.5rem;
  }

  .stage-document-groups {
    padding: 0.25rem 0.5rem 0.75rem;
    gap: 1rem;
  }

  .stage-document-group {
    padding: 0.75rem;
  }

  .stage-document-group__heading strong {
    font-size: 0.95rem;
  }

  .stage-document-completeness__summary {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }

  .stage-document-completeness__summary > div {
    border-bottom: 1px solid #f4f4f5;
    padding: 0.2rem 0;
  }

  .stage-document-completeness__summary > div:last-child {
    border-bottom: none;
  }

  .stage-document-card {
    padding: 0.6rem 0.75rem;
  }

  .stage-document-card__identity strong {
    font-size: 0.85rem;
  }

  .stage-document-card__badges {
    gap: 0.2rem;
  }

  .stage-document-pill {
    font-size: 0.6rem;
    padding: 0.05rem 0.3rem;
  }

  .stage-document-meta dt {
    font-size: 0.55rem;
  }

  .stage-document-meta dd {
    font-size: 0.75rem;
  }

  .stage-document-missing li {
    font-size: 0.75rem;
    flex-wrap: wrap;
  }
}
</style>