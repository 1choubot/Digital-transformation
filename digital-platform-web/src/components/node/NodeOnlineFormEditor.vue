<template>
  <section v-if="form" class="online-form-editor" aria-label="在线表单动作区">
    <div class="project-workspace__detail-heading">
      <div>
        <span class="section-eyebrow">在线表单</span>
        <h3>{{ form.documentCode }} {{ form.documentName }}</h3>
      </div>
      <div class="online-form-editor__heading-actions">
        <button
          type="button"
          class="ghost-button"
          :disabled="downloadDisabled || downloading"
          @click="$emit('download-form')"
        >
          下载表单
        </button>
        <span class="stage-document-pill">{{ form.status }}</span>
      </div>
    </div>

    <section v-if="errorMessage" class="state-panel state-panel--inline state-panel--error">
      <p>{{ errorMessage }}</p>
    </section>


    <dl v-if="form.collaboration" class="stage-document-meta online-form-collaboration-status">
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
    </dl>

    <form class="online-form-editor__form" @submit.prevent="$emit('submit')">
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
            <select
              v-if="field.type === 'select'"
              :value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              @change="$emit('update-field', { key: field.key, value: $event.target.value })"
            >
              <option value="">请选择</option>
              <option v-for="option in field.options || []" :key="option" :value="option">{{ option }}</option>
            </select>
            <select
              v-else-if="field.type === 'score'"
              :value="formData[field.key]"
              :disabled="isOnlineFormFieldDisabled(field)"
              @change="$emit('update-field', { key: field.key, value: $event.target.value })"
            >
              <option value="">请选择分值</option>
              <option v-for="score in scoreOptions" :key="score" :value="score">{{ score }}</option>
            </select>
            <textarea
              v-else-if="field.type === 'textarea'"
              :value="formData[field.key]"
              rows="3"
              :disabled="isOnlineFormFieldDisabled(field)"
              @input="$emit('update-field', { key: field.key, value: $event.target.value })"
            ></textarea>
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
                    <button
                      type="button"
                      class="ghost-button"
                      :disabled="isImageDownloadPending(image)"
                      @click="$emit('download-image', { field, image })"
                    >
                      {{ isImageDownloadPending(image) ? '下载中...' : '下载' }}
                    </button>
                    <button
                      type="button"
                      class="ghost-button"
                      :disabled="isOnlineFormFieldDisabled(field) || isImageDeletePending(image)"
                      @click="$emit('delete-image', { field, image })"
                    >
                      {{ isImageDeletePending(image) ? '删除中...' : '删除' }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="online-form-image-field__upload">
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  :disabled="isOnlineFormFieldDisabled(field) || isImageUploadPending(field) || isImageLimitReached(field)"
                  @change="handleImageFileChange(field, $event)"
                />
                <span>{{ getImageUploadText(field) }}</span>
              </div>
            </div>
            <input
              v-else
              :value="formData[field.key]"
              :type="field.type === 'date' ? 'date' : 'text'"
              :readonly="field.readOnly"
              :disabled="isOnlineFormFieldDisabled(field)"
              @input="$emit('update-field', { key: field.key, value: $event.target.value })"
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
            <div class="form-grid online-form-score-card__inputs">
              <label>
                <span>分值 0-5 *</span>
                <select
                  :value="formData[`${item.key}Score`]"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @change="$emit('update-field', { key: `${item.key}Score`, value: $event.target.value })"
                >
                  <option value="">请选择分值</option>
                  <option v-for="score in scoreOptions" :key="score" :value="score">{{ score }}</option>
                </select>
              </label>
              <label>
                <span>信息收集说明</span>
                <textarea
                  :value="formData[`${item.key}InformationNotes`]"
                  rows="3"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @input="$emit('update-field', { key: `${item.key}InformationNotes`, value: $event.target.value })"
                ></textarea>
              </label>
              <label>
                <span>责任人</span>
                <input
                  :value="formData[`${item.key}ResponsiblePerson`]"
                  type="text"
                  :disabled="isOnlineFormPartDisabled(section.editablePart)"
                  @input="$emit('update-field', { key: `${item.key}ResponsiblePerson`, value: $event.target.value })"
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
            <span class="stage-document-pill">{{ formatReviewOpinionStatus(opinion.nodeStatus) }}</span>
            <p>{{ opinion.comment || opinion.returnReason || '暂无意见' }}</p>
            <small>
              {{ opinion.reviewedByName || opinion.reviewerName || '待处理' }}{{ opinion.reviewedAt ? ` · ${opinion.reviewedAt}` : '' }}
            </small>
          </article>
        </div>
      </section>

      <div class="form-actions online-form-editor__actions">
        <button
          type="button"
          class="ghost-button"
          :disabled="!form.permissions?.canEdit || saving"
          @click="$emit('save')"
        >
          {{ saving ? '保存中...' : '保存草稿' }}
        </button>
        <button
          type="submit"
          class="primary-button"
          :disabled="!form.permissions?.canSubmit || submitting"
        >
          {{ submitting ? '提交中...' : getOnlineFormSubmitLabel() }}
        </button>
      </div>
    </form>
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

function handleImageFileChange(field, event) {
  const file = event.target.files?.[0] || null;
  event.target.value = '';
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
