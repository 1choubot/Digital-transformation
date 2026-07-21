<template>
  <section ref="formRoot" class="solution-section solution-quotation-form" v-loading="loading">
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <h4 v-if="showFormContent">填写报价表</h4>
    <el-form v-if="showFormContent" label-position="top" :disabled="!canEdit">
      <div class="quotation-meta-grid">
        <el-form-item label="报价日期"><el-date-picker v-model="formData.quotationDate" type="date"
            value-format="YYYY-MM-DD" /></el-form-item>
        <el-form-item data-field-key="recipientName" label="收件人 *"
          :class="{ 'online-form-field--invalid': isInvalid('recipientName') }">
          <el-input v-model="formData.recipientName" />
          <small v-if="isInvalid('recipientName')" class="form-field-error">请填写收件人</small>
        </el-form-item>
        <el-form-item data-field-key="contactName" label="本公司联系人 *"
          :class="{ 'online-form-field--invalid': isInvalid('contactName') }">
          <el-input v-model="formData.contactName" />
          <small v-if="isInvalid('contactName')" class="form-field-error">请填写本公司联系人</small>
        </el-form-item>
        <el-form-item data-field-key="contactPhone" label="联系电话 *"
          :class="{ 'online-form-field--invalid': isInvalid('contactPhone') }">
          <el-input v-model="formData.contactPhone" />
          <small v-if="isInvalid('contactPhone')" class="form-field-error">请填写联系电话</small>
        </el-form-item>

      </div>
      <div class="quotation-table-wrap">
        <el-table :data="formData.items" border>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="名称 *" min-width="160"><template #default="{ row, $index }">
              <div :data-field-key="`items.${$index}.name`" :class="{ 'online-form-field--invalid': isInvalid(`items.${$index}.name`) }">
                <el-input v-model="row.name" />
                <small v-if="isInvalid(`items.${$index}.name`)" class="form-field-error">请填写名称</small>
              </div>
            </template></el-table-column>
          <el-table-column label="单位" width="100"><template #default="{ row }"><el-input
                v-model="row.unit" /></template></el-table-column>
          <el-table-column label="数量 *" width="120"><template #default="{ row, $index }">
              <div :data-field-key="`items.${$index}.quantity`" :class="{ 'online-form-field--invalid': isInvalid(`items.${$index}.quantity`) }">
                <el-input v-model="row.quantity" />
                <small v-if="isInvalid(`items.${$index}.quantity`)" class="form-field-error">请填写数量</small>
              </div>
            </template></el-table-column>
          <el-table-column label="单价 *" width="130"><template #default="{ row, $index }">
              <div :data-field-key="`items.${$index}.unitPrice`" :class="{ 'online-form-field--invalid': isInvalid(`items.${$index}.unitPrice`) }">
                <el-input v-model="row.unitPrice" />
                <small v-if="isInvalid(`items.${$index}.unitPrice`)" class="form-field-error">请填写单价</small>
              </div>
            </template></el-table-column>
          <el-table-column label="金额" width="130">
            <template #default="{ row }">{{ lineAmountText(row) }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="160"><template #default="{ row }"><el-input
                v-model="row.remark" /></template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="80"><template #default="{ $index }"><el-button link
                type="danger" :disabled="formData.items.length <= 1"
                @click="removeItem($index)">删除</el-button></template></el-table-column>
        </el-table>
      </div>
      <el-button v-if="canEdit" plain @click="addItem">增加明细</el-button>
    </el-form>
    <el-descriptions v-if="showFormContent" :column="1" border class="quotation-total">
      <el-descriptions-item label="总金额预览">¥{{ totalAmountPreview }}</el-descriptions-item>
      <el-descriptions-item label="大写预览">{{ totalAmountUppercasePreview }}</el-descriptions-item>
    </el-descriptions>
    <div v-if="showFormContent" class="action-row node-online-form-actions">
      <el-button v-if="canEdit" size="large" :loading="pendingAction === 'save'" @click="$emit('save')">保存草稿</el-button>
      <el-button v-if="canSubmit" size="large" type="primary" :loading="pendingAction === 'submit'"
        @click="handleSubmit">提交表单</el-button>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { isFormValueEmpty } from '../../../utils/formValidation.js';
import {
  calculateLineAmount,
  calculateTotalAmount,
  formatRmbUppercaseFromAmount
} from '../../../composables/project-stage/solution-design/quotationAmounts.js';

const props = defineProps({
  dto: { type: Object, default: null }, formData: { type: Object, required: true },
  loading: Boolean, pendingAction: { type: String, default: '' }, errorMessage: { type: String, default: '' },
  showFormContent: { type: Boolean, default: true }
});
const emit = defineEmits(['save', 'submit', 'add-item', 'remove-item']);
const canEdit = computed(() => props.dto?.permissions?.canEditQuotationForm === true);
const canSubmit = computed(() => props.dto?.permissions?.canSubmitQuotationForm === true);
const totalAmountPreview = computed(() => calculateTotalAmount(props.formData.items));
const totalAmountUppercasePreview = computed(() => formatRmbUppercaseFromAmount(totalAmountPreview.value));
const formRoot = ref(null);
const validationAttempted = ref(false);
const missingFields = computed(() => {
  const missing = [];
  [
    ['recipientName', '收件人'],
    ['contactName', '公司联系人'],
    ['contactPhone', '联系电话']
  ].forEach(([key, label]) => {
    if (isFormValueEmpty(props.formData[key])) missing.push({ key, label });
  });
  (props.formData.items || []).forEach((item, index) => {
    [['name', '名称'], ['quantity', '数量'], ['unitPrice', '单价']].forEach(([key, label]) => {
      if (isFormValueEmpty(item?.[key])) missing.push({ key: `items.${index}.${key}`, label: `第 ${index + 1} 行${label}` });
    });
  });
  if ((props.formData.items || []).length === 0) missing.push({ key: 'items', label: '报价明细' });
  return missing;
});

const addItem = () => emit('add-item');
const removeItem = (index) => emit('remove-item', index);
const lineAmountText = (row) => calculateLineAmount(row?.quantity, row?.unitPrice) || '';

function isInvalid(key) {
  return validationAttempted.value && missingFields.value.some((field) => field.key === key);
}

async function handleSubmit() {
  validationAttempted.value = true;
  if (missingFields.value.length === 0) {
    try {
      await ElMessageBox.confirm(
        '提交后将生成报价表并进入后续流程，确认提交？',
        '提交确认',
        {
          type: 'warning',
          confirmButtonText: '确认提交',
          cancelButtonText: '取消'
        }
      );
      emit('submit');
    } catch {
      // 用户取消时不提交表单。
    }
    return;
  }
  ElMessage.warning(`请补充以下必填内容：${missingFields.value.map((field) => field.label).join('、')}`);
  await nextTick();
  const firstField = formRoot.value?.querySelector(`[data-field-key="${missingFields.value[0]?.key}"]`);
  firstField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  firstField?.querySelector('input, textarea, [tabindex]')?.focus?.();
}
</script>
