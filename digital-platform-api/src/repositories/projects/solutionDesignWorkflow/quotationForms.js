import {
  SOLUTION_DESIGN_ERROR,
  SOLUTION_DESIGN_GENERATED_FILE_STATUS,
  SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION,
  SOLUTION_DESIGN_QUOTATION_FORM_STATUS,
  SolutionDesignWorkflowError
} from '../../../domain/solutionDesignWorkflow.js';
import { renderDocxTemplate } from '../../../utils/ooxmlRenderer.js';
import { updateZipTextEntry } from '../../../utils/ooxmlZip.js';
import {
  GENERATED_DOCX_MIME_TYPE,
  SOLUTION_DESIGN_DOCX_GENERATED_FILE_TYPE,
  buildGenerationErrorMessage,
  readSolutionDesignTemplate
} from './generatedFiles.js';

const MAX_QUOTATION_FORM_JSON_LENGTH = 100000;
const MAX_TEXT_LENGTH = 255;
const MAX_ITEM_REMARK_LENGTH = 500;
const VALID_RECIPIENT_TITLES = new Set(['', '先生', '女士']);
const DEFAULT_TEMPLATE_DATE_TEXT = '2026年7月10日';

function parseStoredJson(value, fallback = {}) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value, { fieldPath, required = false, maxLength = MAX_TEXT_LENGTH } = {}) {
  const text = String(value ?? '').trim();
  if (required && !text) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      `${fieldPath} is required`,
      400,
      [fieldPath]
    );
  }

  if (text.length > maxLength) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      `${fieldPath} is too long`,
      400,
      [fieldPath]
    );
  }

  return text;
}

function parseDate(value, { required = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
        'quotationDate is required',
        400,
        ['formData.quotationDate']
      );
    }
    return '';
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      'quotationDate must use YYYY-MM-DD',
      400,
      ['formData.quotationDate']
    );
  }

  return text;
}

function extractDateParts(value) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate()
    };
  }

  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
}

function decimalFactor(scale) {
  return 10n ** BigInt(scale);
}

function parseDecimalToScaled(value, { scale, fieldPath, required = false }) {
  const text = String(value ?? '').trim();
  if (!text) {
    if (required) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
        `${fieldPath} is required`,
        400,
        [fieldPath]
      );
    }
    return null;
  }

  const pattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(text)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      `${fieldPath} must be a non-negative number with at most ${scale} decimal places`,
      400,
      [fieldPath]
    );
  }

  const [integerPart, fractionalPart = ''] = text.split('.');
  const factor = decimalFactor(scale);
  return BigInt(integerPart) * factor + BigInt(fractionalPart.padEnd(scale, '0'));
}

function formatScaledDecimal(value, scale, { trimTrailingZeros = false } = {}) {
  const factor = decimalFactor(scale);
  const integerPart = value / factor;
  const fractionalPart = (value % factor).toString().padStart(scale, '0');
  if (scale === 0) {
    return integerPart.toString();
  }

  const fraction = trimTrailingZeros ? fractionalPart.replace(/0+$/, '') : fractionalPart;
  return fraction ? `${integerPart}.${fraction}` : integerPart.toString();
}

function roundHalfUpDivision(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

const RMB_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const RMB_SECTION_UNITS = ['', '万', '亿', '兆'];
const RMB_DIGIT_UNITS = ['', '拾', '佰', '仟'];

function convertRmbSection(section) {
  let result = '';
  let zeroPending = false;
  let value = Number(section);

  for (let index = 0; index < 4; index += 1) {
    const digit = value % 10;
    if (digit === 0) {
      if (result) {
        zeroPending = true;
      }
    } else {
      result = `${RMB_DIGITS[digit]}${RMB_DIGIT_UNITS[index]}${zeroPending ? '零' : ''}${result}`;
      zeroPending = false;
    }
    value = Math.floor(value / 10);
  }

  return result;
}

function formatRmbInteger(integerValue) {
  if (integerValue === 0n) {
    return '零';
  }

  const sections = [];
  let value = integerValue;
  while (value > 0n) {
    sections.push(Number(value % 10000n));
    value /= 10000n;
  }

  let result = '';
  let zeroPending = false;
  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const section = sections[index];
    if (section === 0) {
      zeroPending = Boolean(result);
      continue;
    }

    const sectionText = convertRmbSection(section);
    const needsBridgeZero = zeroPending || (section < 1000 && Boolean(result));
    result += `${needsBridgeZero ? '零' : ''}${sectionText}${RMB_SECTION_UNITS[index]}`;
    zeroPending = false;
  }

  return result;
}

export function formatRmbUppercaseFromCents(totalCents) {
  const cents = BigInt(totalCents);
  const integerPart = cents / 100n;
  const decimalPart = cents % 100n;
  const jiao = Number(decimalPart / 10n);
  const fen = Number(decimalPart % 10n);
  const integerText = `${formatRmbInteger(integerPart)}元`;

  if (jiao === 0 && fen === 0) {
    return `${integerText}整`;
  }

  if (jiao === 0) {
    return `${integerText}零${RMB_DIGITS[fen]}分`;
  }

  return `${integerText}${RMB_DIGITS[jiao]}角${fen === 0 ? '' : `${RMB_DIGITS[fen]}分`}`;
}

function normalizeQuotationItem(item, index, { requireComplete }) {
  const fieldPrefix = `formData.items[${index}]`;
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      `${fieldPrefix} must be an object`,
      400,
      [`${fieldPrefix}`]
    );
  }

  const hasInput = ['name', 'unit', 'quantity', 'unitPrice', 'remark']
    .some((key) => String(item[key] ?? '').trim());
  if (!hasInput && !requireComplete) {
    return null;
  }

  const quantityScaled = parseDecimalToScaled(item.quantity, {
    scale: 4,
    fieldPath: `${fieldPrefix}.quantity`,
    required: requireComplete
  });
  const unitPriceCents = parseDecimalToScaled(item.unitPrice, {
    scale: 2,
    fieldPath: `${fieldPrefix}.unitPrice`,
    required: requireComplete
  });
  const lineAmountCents = quantityScaled === null || unitPriceCents === null
    ? 0n
    : roundHalfUpDivision(quantityScaled * unitPriceCents, 10000n);

  return {
    name: normalizeText(item.name, {
      fieldPath: `${fieldPrefix}.name`,
      required: requireComplete
    }),
    unit: normalizeText(item.unit, { fieldPath: `${fieldPrefix}.unit` }),
    quantity: quantityScaled === null
      ? ''
      : formatScaledDecimal(quantityScaled, 4, { trimTrailingZeros: true }),
    unitPrice: unitPriceCents === null ? '' : formatScaledDecimal(unitPriceCents, 2),
    amount: formatScaledDecimal(lineAmountCents, 2),
    remark: normalizeText(item.remark, {
      fieldPath: `${fieldPrefix}.remark`,
      maxLength: MAX_ITEM_REMARK_LENGTH
    })
  };
}

function normalizeQuotationItems(sourceItems, { requireComplete }) {
  if (!Array.isArray(sourceItems)) {
    if (requireComplete) {
      throw new SolutionDesignWorkflowError(
        SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
        'items must contain at least one quotation line',
        400,
        ['formData.items']
      );
    }
    return [];
  }

  const items = sourceItems
    .map((item, index) => normalizeQuotationItem(item, index, { requireComplete }))
    .filter(Boolean);

  if (requireComplete && items.length === 0) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      'items must contain at least one quotation line',
      400,
      ['formData.items']
    );
  }

  return items;
}

function calculateTotalAmount(items) {
  return items.reduce((sum, item) => {
    const cents = parseDecimalToScaled(item.amount, {
      scale: 2,
      fieldPath: 'formData.items[].amount',
      required: true
    });
    return sum + cents;
  }, 0n);
}

export function normalizeQuotationFormPayload(payload = {}, { requireComplete = false } = {}) {
  const sourceFormData = Object.hasOwn(payload, 'formData') ? payload.formData : payload;
  if (
    sourceFormData === null ||
    Array.isArray(sourceFormData) ||
    typeof sourceFormData !== 'object'
  ) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      'Quotation form data must be an object',
      400,
      ['formData']
    );
  }

  const recipientTitle = normalizeText(sourceFormData.recipientTitle, {
    fieldPath: 'formData.recipientTitle'
  });
  if (!VALID_RECIPIENT_TITLES.has(recipientTitle)) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      'recipientTitle must be 先生 or 女士',
      400,
      ['formData.recipientTitle']
    );
  }

  const items = normalizeQuotationItems(sourceFormData.items, { requireComplete });
  const totalAmountCents = calculateTotalAmount(items);
  const totalAmount = formatScaledDecimal(totalAmountCents, 2);
  const totalAmountUppercase = formatRmbUppercaseFromCents(totalAmountCents);
  const formData = {
    recipientName: normalizeText(sourceFormData.recipientName, {
      fieldPath: 'formData.recipientName',
      required: requireComplete
    }),
    recipientTitle,
    items,
    totalAmount,
    totalAmountUppercase,
    contactName: normalizeText(sourceFormData.contactName, {
      fieldPath: 'formData.contactName',
      required: requireComplete
    }),
    contactPhone: normalizeText(sourceFormData.contactPhone, {
      fieldPath: 'formData.contactPhone',
      required: requireComplete
    }),
    quotationDate: parseDate(sourceFormData.quotationDate)
  };

  const formDataJson = JSON.stringify(formData);
  if (formDataJson.length > MAX_QUOTATION_FORM_JSON_LENGTH) {
    throw new SolutionDesignWorkflowError(
      SOLUTION_DESIGN_ERROR.INVALID_QUOTATION_FORM,
      'Quotation form data is too large',
      400,
      ['formData']
    );
  }

  return {
    formData,
    formDataJson
  };
}

function sanitizeGeneratedFileNamePart(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function buildQuotationFileName({ projectRow, revision }) {
  const projectName = sanitizeGeneratedFileNamePart(projectRow.project_name || `项目${projectRow.id}`);
  const documentCode = sanitizeGeneratedFileNamePart(SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode);
  const formName = sanitizeGeneratedFileNamePart(SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.generatedFileNamePrefix);
  return `${documentCode}-${formName}-${projectName}-v${revision}.${SOLUTION_DESIGN_DOCX_GENERATED_FILE_TYPE}`;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function replaceTemplateSplitLine(xml, { label, middleText, suffixReplacement }) {
  const pattern = new RegExp(
    `(<w:t>${label}<\\/w:t><\\/w:r><w:r[\\s\\S]*?<w:t(?: xml:space="preserve")?>)[\\s\\S]*?(<\\/w:t><\\/w:r><w:r[\\s\\S]*?<w:t>)[\\s\\S]*?(<\\/w:t>)`
  );
  if (!pattern.test(xml)) {
    throw new Error(`Invalid Word document XML: quotation line not found ${label}`);
  }

  return xml.replace(pattern, (_match, prefix, middleSuffix, suffix) =>
    `${prefix}${escapeXml(middleText)}${middleSuffix}${escapeXml(suffixReplacement)}${suffix}`
  );
}

function replaceContactLine(xml, { contactName, contactPhone }) {
  const pattern = new RegExp(
    '(<w:t>联系人：<\\/w:t><\\/w:r><w:r[\\s\\S]*?<w:t(?: xml:space="preserve")?>)' +
      '[\\s\\S]*?' +
      '(<\\/w:t><\\/w:r><w:r[\\s\\S]*?<w:t>电话<\\/w:t><\\/w:r><w:r[\\s\\S]*?<w:t(?: xml:space="preserve")?>)' +
      '[\\s\\S]*?' +
      '(<\\/w:t>)'
  );
  if (!pattern.test(xml)) {
    throw new Error('Invalid Word document XML: quotation contact line not found');
  }

  const contactText = contactName ? ` ${contactName} ` : '           ';
  const phoneText = contactPhone ? ` ${contactPhone} ` : '                       ';
  return xml.replace(pattern, (_match, contactPrefix, phonePrefix, suffix) =>
    `${contactPrefix}${escapeXml(contactText)}${phonePrefix}${escapeXml(phoneText)}${suffix}`
  );
}

function formatChineseDate(value) {
  const parts = extractDateParts(value);
  if (!parts) {
    return '';
  }

  return `${parts.year}年${parts.month}月${parts.day}日`;
}

function getSubmittedDate(formRow) {
  const formData = parseStoredJson(formRow.form_data_json, {});
  return formData.quotationDate || formRow.submitted_at || '';
}

function buildQuotationRenderValues(formRow) {
  const formData = parseStoredJson(formRow.form_data_json, {});
  const items = Array.isArray(formData.items) ? formData.items : [];
  const totalRowIndex = 1 + items.length;

  return {
    formData,
    tableRows: [
      {
        target: {
          tableIndex: 0,
          templateRowIndex: 1,
          replaceUntilRowIndex: 9
        },
        rows: items.map((item, index) => [
          String(index + 1),
          item.name,
          item.unit,
          item.quantity,
          item.unitPrice,
          item.amount,
          item.remark
        ]),
        removeRowsAfterTemplate: false
      }
    ],
    tableCellValues: [
      {
        target: {
          tableIndex: 0,
          rowIndex: totalRowIndex,
          cellIndex: 1
        },
        value: formData.totalAmountUppercase
      },
      {
        target: {
          tableIndex: 0,
          rowIndex: totalRowIndex,
          cellIndex: 3
        },
        value: formData.totalAmount
      }
    ],
    textReplacements: [
      {
        target: {
          matchText: DEFAULT_TEMPLATE_DATE_TEXT
        },
        value: formatChineseDate(getSubmittedDate(formRow))
      }
    ]
  };
}

function applyQuotationLineReplacements(buffer, formData) {
  return updateZipTextEntry(buffer, 'word/document.xml', (documentXml) => {
    const withRecipient = replaceTemplateSplitLine(documentXml, {
      label: 'TO：',
      middleText: formData.recipientName ? ` ${formData.recipientName} ` : '            ',
      suffixReplacement: formData.recipientTitle || '先生/女士'
    });
    return replaceContactLine(withRecipient, {
      contactName: formData.contactName,
      contactPhone: formData.contactPhone
    });
  });
}

export async function generateSolutionDesignQuotationFormFile({
  projectRow,
  formRow,
  storage
}) {
  let storageKey = null;
  const templateName = SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.templateName;
  const fileName = buildQuotationFileName({
    projectRow,
    revision: formRow.revision
  });

  try {
    const templateBuffer = await readSolutionDesignTemplate(templateName);
    const renderValues = buildQuotationRenderValues(formRow);
    const generatedBuffer = applyQuotationLineReplacements(
      renderDocxTemplate(templateBuffer, {
        tableRows: renderValues.tableRows,
        tableCellValues: renderValues.tableCellValues,
        textReplacements: renderValues.textReplacements
      }),
      renderValues.formData
    );
    storageKey = storage.createStorageKey({
      projectId: projectRow.id,
      documentCode: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode,
      revision: formRow.revision,
      fileType: SOLUTION_DESIGN_DOCX_GENERATED_FILE_TYPE
    });
    const stored = await storage.writeFile(storageKey, generatedBuffer);
    return {
      success: true,
      storageKey,
      fileName,
      mimeType: GENERATED_DOCX_MIME_TYPE,
      fileSize: Number(stored.size ?? generatedBuffer.length),
      templateName
    };
  } catch (error) {
    if (storageKey) {
      await storage.cleanupFile(storageKey);
    }
    return {
      success: false,
      templateName,
      errorMessage: buildGenerationErrorMessage(error)
    };
  }
}

export function mapQuotationForm(row) {
  if (!row) {
    return null;
  }

  const status = row.generated_file_status;
  const canDownload = status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(row.generated_file_storage_key);

  return {
    id: row.id,
    projectId: row.project_id,
    nodeKey: row.node_key,
    documentCode: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode,
    formName: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.formName,
    templateName: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.templateName,
    revision: row.revision,
    status: row.form_status,
    formData: parseStoredJson(row.form_data_json),
    isCurrent: Boolean(row.is_current),
    submittedByUserId: row.submitted_by_user_id,
    submittedAt: row.submitted_at,
    submittedByUser: row.submitted_by_user_id
      ? {
          id: row.submitted_by_user_id,
          account: row.submitted_by_account,
          name: row.submitted_by_display_name
        }
      : null,
    generatedFile: {
      status,
      fileName: row.generated_file_name,
      mimeType: row.generated_file_mime_type,
      fileSize: row.generated_file_size === null || row.generated_file_size === undefined
        ? null
        : Number(row.generated_file_size),
      templateName: row.generated_file_template_name ?? SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.templateName,
      generatedByUserId: row.generated_by_user_id ?? null,
      generatedAt: row.generated_at,
      errorMessage: row.generation_error_message,
      canDownload
    },
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function buildDefaultQuotationFormData() {
  return {
    recipientName: '',
    recipientTitle: '',
    items: [
      {
        name: '',
        unit: '',
        quantity: '',
        unitPrice: '',
        amount: '0.00',
        remark: ''
      }
    ],
    totalAmount: '0.00',
    totalAmountUppercase: formatRmbUppercaseFromCents(0n),
    contactName: '',
    contactPhone: '',
    quotationDate: ''
  };
}

export function buildQuotationFormDto({
  projectRow,
  quotationNode,
  quotationTenderFlow,
  quotationFormRow,
  permissions,
  isProjectEnded
}) {
  return {
    projectId: projectRow.id,
    nodeKey: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.nodeKey,
    nodeStatus: quotationNode?.status ?? null,
    nodeRevision: quotationNode?.current_revision ?? 1,
    branchType: quotationTenderFlow?.branch_type ?? null,
    branchStatus: quotationTenderFlow?.branch_status ?? null,
    branchRevision: quotationTenderFlow?.revision ?? null,
    documentCode: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.documentCode,
    formName: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.formName,
    templateName: SOLUTION_DESIGN_QUOTATION_FORM_DEFINITION.templateName,
    form: mapQuotationForm(quotationFormRow),
    defaultFormData: buildDefaultQuotationFormData(),
    permissions,
    isProjectEnded
  };
}

export function isQuotationFormGeneratedForRevision(quotationFormRow, requiredRevision) {
  return (
    quotationFormRow?.form_status === SOLUTION_DESIGN_QUOTATION_FORM_STATUS.SUBMITTED &&
    Number(quotationFormRow.revision ?? 0) >= Number(requiredRevision ?? 1) &&
    quotationFormRow.generated_file_status === SOLUTION_DESIGN_GENERATED_FILE_STATUS.GENERATED &&
    Boolean(quotationFormRow.generated_file_storage_key)
  );
}
