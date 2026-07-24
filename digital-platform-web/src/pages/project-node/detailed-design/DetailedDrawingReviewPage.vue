<template>
  <DetailedDesignNodeLayout
    :workflow="workflow"
    :node="currentNode"
    :loading="context.workspaceLoading"
    :error-message="context.workspaceErrorMessage"
  >
    <section class="drawing-review-section">
      <h4>图纸审查状态</h4>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="审查负责人状态">
          <el-tag :type="checkerStatusType">{{ checkerStatusText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="研发审批状态">
          <el-tag :type="rdStatusType">{{ rdStatusText }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </section>

    <section class="drawing-review-section">
      <h4>当前图纸文件</h4>
      <el-empty
        v-if="currentInputFiles.length === 0"
        description="当前版本产品平面图和零部件清单尚未齐套"
      />
      <div v-else class="drawing-review-file-list" role="table" aria-label="当前图纸文件">
        <div class="drawing-review-file-list__head" role="row">
          <span role="columnheader">文件</span>
          <span role="columnheader">当前版本</span>
          <span role="columnheader">上传人</span>
          <span role="columnheader">上传时间</span>
          <span role="columnheader">操作</span>
        </div>
        <div
          v-for="file in currentInputFiles"
          :key="file.slotKey"
          class="drawing-review-file-list__row"
          role="row"
        >
          <strong role="cell">{{ file.slotName }}</strong>
          <span role="cell" :title="file.currentFile?.originalFileName || '-'">
            {{ displayFileName(file) }}
          </span>
          <span role="cell">{{ displayUploader(file) }}</span>
          <span role="cell">{{ formatDate(file.currentFile?.uploadedAt) }}</span>
          <div class="drawing-review-file-list__actions" role="cell">
            <el-button
              v-if="canDownloadCurrentInputs"
              type="primary"
              plain
              :loading="isPending(`download:${file.slotKey}`)"
              @click="downloadUpload(file)"
            >
              下载
            </el-button>
          </div>
        </div>
      </div>
    </section>

    <section class="drawing-review-section">
      <div class="drawing-review-section__title-row">
        <h4>图纸审查记录</h4>
        <el-upload
          v-if="canUploadRecord"
          :show-file-list="false"
          :auto-upload="true"
          :http-request="requestRecordUpload"
        >
          <el-button type="primary" :loading="isPending('drawing-review:record-upload')">
            上传记录
          </el-button>
        </el-upload>
      </div>

      <el-alert
        v-if="canCheckerReturn && !hasCurrentCycleRecord"
        title="有问题退回前必须先上传本次图纸审查记录。"
        type="warning"
        show-icon
        :closable="false"
      />

      <el-table v-if="recordHistory.length" :data="recordHistory" border class="drawing-review-record-table">
        <el-table-column label="记录版本" width="100">
          <template #default="{ row }">v{{ row.revision }}</template>
        </el-table-column>
        <el-table-column label="图纸版本" width="100">
          <template #default="{ row }">v{{ row.drawingRevision }}</template>
        </el-table-column>
        <el-table-column prop="originalFileName" label="文件名" min-width="180" show-overflow-tooltip />
        <el-table-column label="上传人" width="130">
          <template #default="{ row }">{{ row.uploadedBy?.name || row.uploadedBy?.account || '-' }}</template>
        </el-table-column>
        <el-table-column label="上传时间" width="180">
          <template #default="{ row }">{{ formatDate(row.uploadedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="right">
          <template #default="{ row }">
            <el-button
              v-if="canDownloadRecord(row)"
              type="primary"
              plain
              :loading="isPending(`drawing-review:record-download:${row.id}`)"
              @click="downloadDrawingReviewRecord(row)"
            >
              下载
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-else description="尚未上传图纸审查记录" />
    </section>

    <ApprovalActionCard
      v-if="hasCheckerActions"
      title="图纸审查负责人处理"
      description="无问题可直接通过；有问题退回前必须上传本次图纸审查记录。"
      :status-text="checkerStatusText"
      :status-type="checkerStatusType"
      :comment="checkerComment"
      comment-label="处理意见"
      comment-placeholder="通过可选填意见；退回时请填写问题和修改要求"
      :comment-max-length="1000"
      :can-approve="canCheckerPass"
      :can-return="canCheckerReturn"
      :return-disabled="!hasCurrentCycleRecord"
      approve-text="无问题通过"
      return-text="有问题退回"
      :busy="checkerBusy"
      :pending-action="checkerPendingAction"
      @update:comment="checkerComment = $event"
      @approve="confirmCheckerPass"
      @return="confirmCheckerReturn"
    />

    <ApprovalActionCard
      v-if="hasRdActions"
      title="研发中心负责人审批"
      description="审批产品平面图、零部件清单；如有图纸审查记录历史，可一并下载查看。"
      :status-text="rdStatusText"
      :status-type="rdStatusType"
      :comment="rdComment"
      comment-label="审批意见"
      comment-placeholder="通过可选填意见；退回时请填写原因和修改要求"
      :comment-max-length="1000"
      :can-approve="canRdApprove"
      :can-return="canRdReturn"
      approve-text="审批通过"
      return-text="审批退回"
      :busy="rdBusy"
      :pending-action="rdPendingAction"
      @update:comment="rdComment = $event"
      @approve="confirmRdApprove"
      @return="confirmRdReturn"
    />
  </DetailedDesignNodeLayout>
</template>

<script setup>
import { computed, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import ApprovalActionCard from '../../../components/approval/ApprovalActionCard.vue';
import DetailedDesignNodeLayout from '../../../components/project-workspace/detailed-design/DetailedDesignNodeLayout.vue';
import {
  canRenderDrawingReviewCurrentInputDownload,
  canRenderDrawingReviewPassButton,
  canRenderDrawingReviewRdApproveButton,
  canRenderDrawingReviewRdReturnButton,
  canRenderDrawingReviewRecordDownload,
  canRenderDrawingReviewRecordUpload,
  canRenderDrawingReviewReturnButton,
  hasCurrentDrawingReviewRecord,
  hasDrawingReviewCheckerActions,
  hasDrawingReviewRdActions
} from '../../../components/project-workspace/detailed-design/detailedDesignPermissionViewHelpers.js';
import {
  detailedDesignNodePageProps,
  useDetailedDesignNodePage
} from '../../../composables/project-stage/detailed-design/useDetailedDesignNodePage.js';

const emit = defineEmits(['business-state-changed']);
const props = defineProps(detailedDesignNodePageProps);
const {
  context,
  workflow,
  currentNode,
  isPending,
  downloadUpload,
  uploadDrawingReviewRecord,
  downloadDrawingReviewRecord,
  passDrawingReview,
  returnDrawingReview,
  approveDrawingReview,
  returnDrawingReviewApproval
} = useDetailedDesignNodePage(props, emit);

const checkerComment = ref('');
const rdComment = ref('');

const drawingReview = computed(() => workflow.value?.drawingReview || null);
const currentInputFiles = computed(() => drawingReview.value?.downloadableFiles || []);
const recordHistory = computed(() => drawingReview.value?.recordHistory || []);
const hasCurrentCycleRecord = computed(() => hasCurrentDrawingReviewRecord(drawingReview.value, currentNode.value));
const canDownloadCurrentInputs = computed(() => canRenderDrawingReviewCurrentInputDownload(drawingReview.value));
const canUploadRecord = computed(() => canRenderDrawingReviewRecordUpload(drawingReview.value));
const canCheckerPass = computed(() => canRenderDrawingReviewPassButton(drawingReview.value));
const canCheckerReturn = computed(() => canRenderDrawingReviewReturnButton(drawingReview.value));
const canRdApprove = computed(() => canRenderDrawingReviewRdApproveButton(drawingReview.value));
const canRdReturn = computed(() => canRenderDrawingReviewRdReturnButton(drawingReview.value));
const hasCheckerActions = computed(() => hasDrawingReviewCheckerActions(drawingReview.value));
const hasRdActions = computed(() => hasDrawingReviewRdActions(drawingReview.value));
const checkerBusy = computed(() =>
  isPending('drawing-review:pass') ||
  isPending('drawing-review:return') ||
  isPending('drawing-review:record-upload')
);
const rdBusy = computed(() =>
  isPending('drawing-review:rd-approve') ||
  isPending('drawing-review:rd-return')
);
const checkerPendingAction = computed(() => {
  if (isPending('drawing-review:pass')) return 'approve';
  if (isPending('drawing-review:return')) return 'return';
  return '';
});
const rdPendingAction = computed(() => {
  if (isPending('drawing-review:rd-approve')) return 'approve';
  if (isPending('drawing-review:rd-return')) return 'return';
  return '';
});
const checkerStatusText = computed(() => statusText(drawingReview.value?.checkerStatus));
const rdStatusText = computed(() => statusText(drawingReview.value?.rdApprovalStatus));
const checkerStatusType = computed(() => statusType(drawingReview.value?.checkerStatus));
const rdStatusType = computed(() => statusType(drawingReview.value?.rdApprovalStatus));

function statusText(status) {
  return {
    pending: '待处理',
    approved: '已通过',
    returned: '已退回'
  }[status] || status || '-';
}

function statusType(status) {
  return {
    pending: 'warning',
    approved: 'success',
    returned: 'danger'
  }[status] || 'info';
}

function canDownloadRecord(record) {
  return canRenderDrawingReviewRecordDownload(record);
}

function displayFileName(file) {
  const currentFile = file.currentFile;
  if (!currentFile) return '-';
  return `v${currentFile.revision || '-'} · ${currentFile.originalFileName || '-'}`;
}

function displayUploader(file) {
  const uploader = file.currentFile?.uploadedBy;
  return uploader?.name || uploader?.account || '-';
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

async function requestRecordUpload(options) {
  const workflowResult = await uploadDrawingReviewRecord(options.file);
  if (workflowResult) {
    options.onSuccess?.({});
    return workflowResult;
  }
  options.onError?.(new Error('upload failed'));
  return null;
}

async function confirmCheckerPass(comment) {
  try {
    await ElMessageBox.confirm(
      '确认图纸审查无问题并提交研发中心负责人审批？',
      '图纸审查通过',
      {
        type: 'warning',
        confirmButtonText: '确认通过',
        cancelButtonText: '取消'
      }
    );
    const result = await passDrawingReview(comment);
    if (result) checkerComment.value = '';
  } catch {
    // 用户取消时不请求后端。
  }
}

async function confirmCheckerReturn(comment) {
  if (!hasCurrentCycleRecord.value) {
    ElMessage.error('请先上传本次图纸审查记录。');
    return;
  }
  try {
    await ElMessageBox.confirm(
      '确认退回并要求从产品平面图重新返工？',
      '图纸审查退回',
      {
        type: 'warning',
        confirmButtonText: '确认退回',
        cancelButtonText: '取消'
      }
    );
    const result = await returnDrawingReview(comment);
    if (result) checkerComment.value = '';
  } catch {
    // 用户取消时不请求后端。
  }
}

async function confirmRdApprove(comment) {
  try {
    await ElMessageBox.confirm(
      '确认研发中心负责人图纸审查审批通过？',
      '审批通过',
      {
        type: 'warning',
        confirmButtonText: '确认通过',
        cancelButtonText: '取消'
      }
    );
    const result = await approveDrawingReview(comment);
    if (result) rdComment.value = '';
  } catch {
    // 用户取消时不请求后端。
  }
}

async function confirmRdReturn(comment) {
  try {
    await ElMessageBox.confirm(
      '确认研发中心负责人审批退回并要求从产品平面图重新返工？',
      '审批退回',
      {
        type: 'warning',
        confirmButtonText: '确认退回',
        cancelButtonText: '取消'
      }
    );
    const result = await returnDrawingReviewApproval(comment);
    if (result) rdComment.value = '';
  } catch {
    // 用户取消时不请求后端。
  }
}
</script>

<style scoped>
.drawing-review-section {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.drawing-review-section h4 {
  margin: 0;
  font-size: 15px;
}

.drawing-review-section__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.drawing-review-file-list {
  display: grid;
  gap: 0;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow-x: auto;
}

.drawing-review-file-list__head,
.drawing-review-file-list__row {
  display: grid;
  grid-template-columns:
    minmax(140px, 1fr)
    minmax(220px, 1.4fr)
    minmax(120px, 0.8fr)
    minmax(160px, 1fr)
    minmax(100px, auto);
  align-items: center;
  min-width: 760px;
}

.drawing-review-file-list__head {
  min-height: 40px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  font-weight: 500;
  background: var(--el-fill-color-light);
}

.drawing-review-file-list__row {
  min-height: 56px;
  border-top: 1px solid var(--el-border-color);
}

.drawing-review-file-list__head > span,
.drawing-review-file-list__row > span,
.drawing-review-file-list__row > strong,
.drawing-review-file-list__actions {
  min-width: 0;
  padding: 8px 10px;
}

.drawing-review-file-list__row > span,
.drawing-review-file-list__row > strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.drawing-review-file-list__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.drawing-review-record-table {
  width: 100%;
}
</style>
