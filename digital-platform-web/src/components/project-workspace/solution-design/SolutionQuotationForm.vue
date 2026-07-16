<template>
  <section class="solution-section" v-loading="loading">
    <h4 v-if="showFormContent">报价单在线表单</h4>
    <el-alert v-if="errorMessage" :title="errorMessage" type="error" show-icon :closable="false" />
    <el-form v-if="showFormContent" label-position="top" :disabled="!canEdit">
      <div class="quotation-meta-grid">
        <el-form-item label="收件人"><el-input v-model="formData.recipientName" /></el-form-item>
        <el-form-item label="称谓"><el-select v-model="formData.recipientTitle" clearable><el-option label="先生" value="先生" /><el-option label="女士" value="女士" /></el-select></el-form-item>
        <el-form-item label="联系人"><el-input v-model="formData.contactName" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="formData.contactPhone" /></el-form-item>
        <el-form-item label="报价日期"><el-date-picker v-model="formData.quotationDate" type="date" value-format="YYYY-MM-DD" /></el-form-item>
      </div>
      <div class="quotation-table-wrap">
        <el-table :data="formData.items" border>
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column label="名称" min-width="160"><template #default="{ row }"><el-input v-model="row.name" /></template></el-table-column>
          <el-table-column label="单位" width="100"><template #default="{ row }"><el-input v-model="row.unit" /></template></el-table-column>
          <el-table-column label="数量" width="120"><template #default="{ row }"><el-input v-model="row.quantity" /></template></el-table-column>
          <el-table-column label="单价" width="130"><template #default="{ row }"><el-input v-model="row.unitPrice" /></template></el-table-column>
          <el-table-column label="金额" width="130">
            <template #default="{ row }">{{ lineAmountText(row) }}</template>
          </el-table-column>
          <el-table-column label="备注" min-width="160"><template #default="{ row }"><el-input v-model="row.remark" /></template></el-table-column>
          <el-table-column v-if="canEdit" label="操作" width="80"><template #default="{ $index }"><el-button link type="danger" :disabled="formData.items.length <= 1" @click="removeItem($index)">删除</el-button></template></el-table-column>
        </el-table>
      </div>
      <el-button v-if="canEdit" plain @click="addItem">增加明细</el-button>
    </el-form>
    <el-descriptions v-if="showFormContent" :column="1" border class="quotation-total">
      <el-descriptions-item label="总金额预览">¥{{ totalAmountPreview }}</el-descriptions-item>
      <el-descriptions-item label="大写预览">{{ totalAmountUppercasePreview }}</el-descriptions-item>
    </el-descriptions>
    <SolutionGeneratedFile v-if="dto?.form?.generatedFile" :generated-file="dto.form.generatedFile"
      :pending="pendingAction === 'download'" @download="$emit('download')" />
    <div v-if="showFormContent" class="action-row node-online-form-actions">
      <el-button v-if="canEdit" size="large" :loading="pendingAction === 'save'" @click="$emit('save')">保存草稿</el-button>
      <el-button v-if="canSubmit" size="large" type="primary" :loading="pendingAction === 'submit'"
        @click="$emit('submit')">提交并生成 Word</el-button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import SolutionGeneratedFile from './SolutionGeneratedFile.vue';
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
const emit = defineEmits(['save', 'submit', 'download', 'add-item', 'remove-item']);
const canEdit = computed(() => props.dto?.permissions?.canEditQuotationForm === true);
const canSubmit = computed(() => props.dto?.permissions?.canSubmitQuotationForm === true);
const totalAmountPreview = computed(() => calculateTotalAmount(props.formData.items));
const totalAmountUppercasePreview = computed(() => formatRmbUppercaseFromAmount(totalAmountPreview.value));

const addItem = () => emit('add-item');
const removeItem = (index) => emit('remove-item', index);
const lineAmountText = (row) => calculateLineAmount(row?.quantity, row?.unitPrice) || '';
</script>
