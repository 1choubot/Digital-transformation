import { reactive, ref } from 'vue';
import {
  downloadSolutionDesignQuotationGeneratedFile,
  getSolutionDesignQuotationForm,
  saveSolutionDesignQuotationForm,
  submitSolutionDesignQuotationForm,
  toReadableApiError
} from '../../../api/projects.js';
import { saveSolutionDesignBlob } from './useSolutionDesignWorkflow.js';

const emptyItem = () => ({ name: '', unit: '', quantity: '', unitPrice: '', amount: '0.00', remark: '' });

export function useSolutionQuotationForm({ projectId, authToken, notifyChanged }) {
  const dto = ref(null);
  const loading = ref(false);
  const pendingAction = ref('');
  const errorMessage = ref('');
  const formData = reactive({
    recipientName: '', recipientTitle: '', contactName: '', contactPhone: '', quotationDate: '',
    items: [emptyItem()], totalAmount: '0.00', totalAmountUppercase: '零元整'
  });

  function syncForm(source = {}) {
    Object.assign(formData, {
      recipientName: String(source.recipientName || ''),
      recipientTitle: String(source.recipientTitle || ''),
      contactName: String(source.contactName || ''),
      contactPhone: String(source.contactPhone || ''),
      quotationDate: String(source.quotationDate || ''),
      items: Array.isArray(source.items) && source.items.length ? source.items.map((item) => ({ ...emptyItem(), ...item })) : [emptyItem()],
      totalAmount: String(source.totalAmount || '0.00'),
      totalAmountUppercase: String(source.totalAmountUppercase || '零元整')
    });
  }

  function payload() {
    return {
      recipientName: formData.recipientName,
      recipientTitle: formData.recipientTitle,
      contactName: formData.contactName,
      contactPhone: formData.contactPhone,
      quotationDate: formData.quotationDate,
      items: formData.items.map(({ name, unit, quantity, unitPrice, remark }) => ({ name, unit, quantity, unitPrice, remark }))
    };
  }

  async function run(key, action, { notify = false } = {}) {
    if (pendingAction.value) return null;
    pendingAction.value = key;
    errorMessage.value = '';
    try {
      const result = await action();
      if (result?.form || result?.defaultFormData) {
        dto.value = result;
        syncForm(result.form?.formData || result.defaultFormData);
      }
      if (notify) notifyChanged?.();
      return result;
    } catch (error) {
      errorMessage.value = toReadableApiError(error);
      return null;
    } finally {
      pendingAction.value = '';
    }
  }

  async function load() {
    loading.value = true;
    await run('load', () => getSolutionDesignQuotationForm(projectId.value, authToken.value));
    loading.value = false;
  }

  const save = () => run('save', () => saveSolutionDesignQuotationForm(projectId.value, payload(), authToken.value));
  const submit = () => run('submit', () => submitSolutionDesignQuotationForm(projectId.value, payload(), authToken.value), { notify: true });
  const download = () => run('download', async () => {
    const file = await downloadSolutionDesignQuotationGeneratedFile(projectId.value, authToken.value);
    saveSolutionDesignBlob(file, dto.value?.form?.generatedFile?.fileName || '报价单.docx');
  });

  function addItem() { formData.items.push(emptyItem()); }
  function removeItem(index) { if (formData.items.length > 1) formData.items.splice(index, 1); }

  return { dto, formData, loading, pendingAction, errorMessage, load, save, submit, download, addItem, removeItem };
}
