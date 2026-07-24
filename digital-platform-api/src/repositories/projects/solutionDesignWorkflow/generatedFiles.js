import {
  GENERATED_DOCX_MIME_TYPE,
  GENERATED_XLSX_MIME_TYPE,
  WORKFLOW_DOCX_GENERATED_FILE_TYPE,
  WORKFLOW_FORM_GENERATED_FILE_TYPE,
  buildTemplateMappingValue,
  buildWorkflowGeneratedFormCellValues,
  buildWorkflowGeneratedFormImageValues,
  buildWorkflowGeneratedFormSource,
  buildWorkflowGenerationErrorMessage,
  cleanTemplateValue,
  generateWorkflowXlsxFormFile,
  getTemplateSourceValue,
  getTemplateSourceValues,
  groupOnlineFormImagesByFieldKey,
  readWorkflowTemplate
} from '../workflowGeneratedFiles.js';

export { GENERATED_DOCX_MIME_TYPE, GENERATED_XLSX_MIME_TYPE };

export const SOLUTION_DESIGN_FORM_GENERATED_FILE_TYPE = WORKFLOW_FORM_GENERATED_FILE_TYPE;
export const SOLUTION_DESIGN_DOCX_GENERATED_FILE_TYPE = WORKFLOW_DOCX_GENERATED_FILE_TYPE;

export {
  buildTemplateMappingValue,
  cleanTemplateValue,
  getTemplateSourceValue,
  getTemplateSourceValues,
  groupOnlineFormImagesByFieldKey
};

export function buildGeneratedFormSource(args) {
  return buildWorkflowGeneratedFormSource(args);
}

export function buildGeneratedFormCellValues(args) {
  return buildWorkflowGeneratedFormCellValues(args);
}

export async function buildGeneratedFormImageValues(args) {
  return buildWorkflowGeneratedFormImageValues(args);
}

export async function readSolutionDesignTemplate(templateName) {
  return readWorkflowTemplate(templateName, {
    errorCode: 'SOLUTION_DESIGN_TEMPLATE_NOT_FOUND',
    messagePrefix: 'Solution design template file not found'
  });
}

export function buildGenerationErrorMessage(error) {
  return buildWorkflowGenerationErrorMessage(error, 'Solution design generated file failed');
}

export async function generateSolutionDesignFormFile(args) {
  return generateWorkflowXlsxFormFile({
    ...args,
    readTemplate: readSolutionDesignTemplate,
    buildErrorMessage: buildGenerationErrorMessage
  });
}
