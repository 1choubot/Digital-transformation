<template>
  <section v-if="form" class="online-form-editor" aria-label="在线表单动作区">
    <div class="project-workspace__detail-heading">
      <div>
        <!-- <span class="section-eyebrow">在线表单</span> -->
        <h3>{{ form.documentName }}</h3>
      </div>
      <div class="online-form-editor__heading-actions">
        <el-button
          class="form-download-button"
          type="primary"
          size="large"
          :loading="downloading"
          :disabled="downloadDisabled"
          @click="$emit('download-form')"
        >
          下载表单
        </el-button>
        <!-- <el-tag :type="statusTagType(nodeStatus || form.status)">
          {{ formatHeaderStatus(nodeStatus, form.status) }}
        </el-tag> -->
      </div>
    </div>

    <el-alert
      v-if="blockingReasons.length"
      :title="`阻塞原因：${blockingReasons.join('；')}`"
      type="warning"
      show-icon
      :closable="false"
    />

    <el-alert v-if="errorMessage" :description="errorMessage" type="error" show-icon :closable="false" />


    <!-- <dl v-if="form.collaboration" class="stage-document-meta online-form-collaboration-status">
      <div>
        <dt>商务部分</dt>
        <dd>{{ formatCollaborationPartStatus(form.collaboration.businessSubmitted) }}</dd>
      </div>
      <div>
        <dt>技术部分</dt>
        <dd>{{ formatCollaborationPartStatus(form.collaboration.technicalSubmitted) }}</dd>
      </div>
      <div>
        <dt>当前填写区域</dt>
        <dd>{{ formatEditablePart(form.permissions?.editablePart) }}</dd>
      </div>
    </dl> -->

    <el-form class="online-form-editor__form" :model="formData" @submit.prevent="$emit('submit')">
      <section v-if="form.schema?.noticeTemplate" class="online-form-notice-preview">
        <h4>{{ form.schema.noticeTemplate.title }}</h4>
        <p v-for="paragraph in form.schema.noticeTemplate.bodyParagraphs" :key="paragraph">
          {{ paragraph }}
        </p>
        <div class="online-form-notice-table" role="table" aria-label="立项通知项目表格">
          <div class="online-form-notice-table__row online-form-notice-table__row--head" role="row">
            <span v-for="column in form.schema.noticeTemplate.tableColumns" :key="column" role="columnheader">
              {{ column }}
            </span>
          </div>
          <div class="online-form-notice-table__row" role="row">
            <span v-for="column in form.schema.noticeTemplate.tableColumns" :key="column" role="cell">
              {{ getNoticeTableValue(column) }}
            </span>
          </div>
        </div>
        <p class="online-form-notice-preview__signer">{{ form.schema.noticeTemplate.signer }}</p>
        <p class="online-form-notice-preview__date">{{ formData.noticeDate || '日期待填写' }}</p>
      </section>

      <section v-for="section in getSchemaSections(form)" :key="section.key" class="online-form-section">
        <h4>{{ section.title }}</h4>
        <div class="form-grid">
          <label v-for="field in section.fields || []" :key="field.key" :class="getFieldClass(field)">
            <span>{{ field.label }}{{ field.required ? ' *' : '' }}</span>
            <el-select
              v-if="field.type === 'select'"
              :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              placeholder="请选择"
              @change="$emit('update-field', { key: field.key, value: $event })"
            >
              <el-option v-for="option in field.options || []" :key="option" :label="option" :value="option" />
            </el-select>
            <el-select
              v-else-if="field.type === 'score'"
              :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              placeholder="请选择分值"
              @change="$emit('update-field', { key: field.key, value: String($event) })"
            >
              <el-option v-for="score in scoreOptions" :key="score" :label="String(score)" :value="String(score)" />
            </el-select>
            <el-input
              v-else-if="field.type === 'textarea'"
              type="textarea"
              :rows="3"
              :model-value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event })"
            />
            <div v-else-if="field.type === 'image'" class="online-form-image-field">
              <div v-if="getOnlineFormImages(field.key).length" class="online-form-image-field__list">
                <div
                  v-for="(image, imageIndex) in getOnlineFormImages(field.key)"
                  :key="image.id"
                  class="online-form-image-field__current"
                >
                  <div>
                    <strong>{{ imageIndex + 1 }}. {{ image.originalFileName }}</strong>
                    <small>{{ formatFileSize(image.fileSize) }}</small>
                  </div>
                  <div class="online-form-image-field__actions">
                    <el-button
                      link
                      type="primary"
                      :loading="isImageDownloadPending(image)"
                      @click="$emit('download-image', { field, image })"
                    >
                      下载
                    </el-button>
                    <el-button
                      link
                      type="danger"
                      :loading="isImageDeletePending(image)"
                      :disabled="isOnlineFormFieldDisabled(field)"
                      @click="$emit('delete-image', { field, image })"
                    >
                      删除
                    </el-button>
                  </div>
                </div>
              </div>
              <el-upload
                class="online-form-image-field__upload"
                :show-file-list="false"
                accept="image/png,image/jpeg"
                :disabled="isOnlineFormFieldDisabled(field) || isImageUploadPending(field) || isImageLimitReached(field)"
                :http-request="(request) => handleImageUpload(field, request)"
              >
                <el-button :loading="isImageUploadPending(field)" :disabled="isImageLimitReached(field)">{{ getImageUploadText(field) }}</el-button>
              </el-upload>
            </div>
            <el-date-picker
              v-else-if="field.type === 'date'"
              :model-value="formData[field.key]"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择日期"
              :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event || '' })"
            />
            <el-input
              v-else
              :model-value="formData[field.key]"
              :readonly="field.readOnly"
              :disabled="isOnlineFormFieldDisabled(field)"
              @update:model-value="$emit('update-field', { key: field.key, value: $event })"
            />
            <small v-if="field.description" class="online-form-field__description">
              {{ field.description }}
            </small>
          </label>
        </div>
      </section>

      <section
        v-for="section in form.schema?.scoringSections || []"
        :key="section.key"
        class="online-form-section"
      >
        <h4>{{ section.title }}</h4>
        <div class="online-form-score-list">
          <article v-for="item in section.items || []" :key="item.key" class="online-form-score-card">
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
            <div class="online-form-score-card__inputs">
              <label>
                <span>分值 0-5 *</span>
                <el-select
                  :model-value="formData[`${item.key}Score`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  placeholder="请选择分值"
                  @change="$emit('update-field', { key: `${item.key}Score`, value: $event })"
                >
                  <el-option v-for="score in scoreOptions" :key="score" :label="String(score)" :value="String(score)" />
                </el-select>
              </label>
              <label>
                <span>信息收集说明（选填）</span>
                <el-input
                  type="textarea"
                  :rows="2"
                  :model-value="formData[`${item.key}InformationNotes`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @update:model-value="$emit('update-field', { key: `${item.key}InformationNotes`, value: $event })"
                />
              </label>
              <label>
                <span>责任人（选填）</span>
                <el-input
                  :model-value="formData[`${item.key}ResponsiblePerson`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @update:model-value="$emit('update-field', { key: `${item.key}ResponsiblePerson`, value: $event })"
                />
              </label>
            </div>
          </article>
        </div>
      </section>

      <section v-if="form.reviewOpinions?.length" class="online-form-section">
        <h4>三方意见</h4>
        <div class="online-form-review-opinions">
          <article v-for="opinion in form.reviewOpinions" :key="opinion.nodeKey" class="online-form-review-opinion">
            <strong>{{ opinion.nodeName }}</strong>
            <el-tag :type="statusTagType(opinion.nodeStatus)">
              {{ formatReviewOpinionStatus(opinion.nodeStatus) }}
            </el-tag>
            <p>{{ opinion.comment || opinion.returnReason || '暂无意见' }}</p>
            <small>
              {{ opinion.reviewedByName || opinion.reviewerName || '待处理' }}{{ opinion.reviewedAt ? ` · ${opinion.reviewedAt}` : '' }}
            </small>
          </article>
        </div>
      </section>

      <div class="form-actions online-form-editor__actions">
        <el-button
          :loading="saving"
          :disabled="!form.permissions?.canEdit"
          @click="$emit('save')"
        >
          保存草稿
        </el-button>
        <el-button
          type="primary"
          native-type="submit"
          :loading="submitting"
          :disabled="!form.permissions?.canSubmit"
        >
          {{ getOnlineFormSubmitLabel() }}
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<script setup>
const emit = defineEmits([
  'save',
  'submit',
  'update-field',
  'upload-image',
  'download-image',
  'delete-image',
  'download-form'
]);

const props = defineProps({
  form: {
    type: Object,
    default: null
  },
  nodeStatus: {
    type: String,
    default: ''
  },
  blockingReasons: {
    type: Array,
    default: () => []
  },
  formData: {
    type: Object,
    required: true
  },
  errorMessage: {
    type: String,
    default: ''
  },
  saving: {
    type: Boolean,
    default: false
  },
  submitting: {
    type: Boolean,
    default: false
  },
  downloading: {
    type: Boolean,
    default: false
  },
  downloadDisabled: {
    type: Boolean,
    default: false
  },
  imageState: {
    type: Object,
    default: () => ({})
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
    'form-grid__wide': field.type === 'textarea' || field.type === 'image',
    'online-form-field--readonly': field.readOnly
  };
}

function getOnlineFormImages(fieldKey) {
  return (props.form?.images || []).filter((image) => image.fieldKey === fieldKey);
}

function getImageLimit(field) {
  const maxImages = Number(field?.maxImages);
  return Number.isSafeInteger(maxImages) && maxImages > 0 ? maxImages : 3;
}

function isImageLimitReached(field) {
  return getOnlineFormImages(field.key).length >= getImageLimit(field);
}

function getImageUploadText(field) {
  if (isImageUploadPending(field)) {
    return '上传中...';
  }
  const count = getOnlineFormImages(field.key).length;
  const limit = getImageLimit(field);
  return count >= limit ? `已达上限 ${limit} 张` : `选择图片（${count}/${limit}）`;
}

function isImageUploadPending(field) {
  return props.imageState?.uploadPendingFieldKey === field.key;
}

function isImageDownloadPending(image) {
  return Boolean(image?.id) && String(props.imageState?.downloadPendingId ?? '') === String(image.id);
}

function isImageDeletePending(image) {
  return Boolean(image?.id) && String(props.imageState?.deletePendingId ?? '') === String(image.id);
}

function handleImageUpload(field, { file }) {
  if (!file || isOnlineFormFieldDisabled(field) || isImageLimitReached(field)) {
    return;
  }
  emit('upload-image', { field, file });
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) {
    return '-';
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function isOnlineFormFieldDisabled(field) {
  return field.readOnly || isOnlineFormPartDisabled(field.editablePart);
}

function isOnlineFormPartDisabled(editablePart) {
  const permissions = props.form?.permissions || {};
  if (!permissions.canEdit || props.submitting) {
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
  const part = props.form?.permissions?.editablePart;
  if (props.form?.documentCode === '1.2') {
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
  return key ? props.formData[key] || '-' : '-';
}

function statusTagType(status) {
  if (['completed', 'confirmed', 'approved'].includes(status)) return 'success';
  if (['submitted', 'pending', 'pending_review', 'pending_general_review'].includes(status)) return 'warning';
  if (['returned', 'blocked_by_rework', 'returned_for_rework', 'returned_blocked_by_rework', 'invalidated'].includes(status)) {
    return 'danger';
  }
  if (['draft', 'not_started', 'not_submitted', 'not_configured', 'not_applicable', 'process_node', 'waiting_document_submission', 'waiting_prerequisite'].includes(status)) {
    return 'info';
  }
  return 'primary';
}

function formatHeaderStatus(nodeStatus, formStatus) {
  const status = nodeStatus || formStatus;
  return {
    completed: '已完成',
    in_progress: '处理中',
    waiting_submission: '待提交',
    pending_review: '待审批',
    pending_general_review: '待总经理审批',
    blocked_by_rework: '返工阻塞',
    returned_for_rework: '需重填',
    process_node: '过程节点',
    not_configured: '未配置',
    not_applicable: '不适用',
    draft: '草稿',
    not_submitted: '未提交',
    submitted: '已提交',
    confirmed: '已完成',
    returned: '已退回'
  }[status] || status || '-';
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
</script>
