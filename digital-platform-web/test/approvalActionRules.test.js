import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { buildApprovalActionState } from '../src/components/approval/approvalActionRules.js';

function collectNodeActionSources(directoryUrl) {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) return collectNodeActionSources(entryUrl);
    return /\.(?:js|vue)$/.test(entry.name)
      ? [{ path: entryUrl.pathname, source: readFileSync(entryUrl, 'utf8') }]
      : [];
  });
}

test('ordinary approval allows an empty approve comment but requires return and end reasons', () => {
  const state = buildApprovalActionState({ comment: '' });
  assert.equal(state.approveDisabled, false);
  assert.equal(state.returnDisabled, true);
  assert.equal(state.endDisabled, true);
});

test('required evaluations disable approval until a comment is entered', () => {
  assert.equal(buildApprovalActionState({ approveCommentRequired: true }).approveDisabled, true);
  assert.equal(buildApprovalActionState({ approveCommentRequired: true, comment: '评价通过' }).approveDisabled, false);
});

test('an incomplete required selection locks the input and every action', () => {
  const state = buildApprovalActionState({
    selectionRequired: true,
    selectionComplete: false,
    comment: '已有意见'
  });
  assert.equal(state.interactionLocked, true);
  assert.equal(state.approveDisabled, true);
  assert.equal(state.returnDisabled, true);
  assert.equal(state.endDisabled, true);
});

test('contract approvals use the shared approval card without a signing-page danger wrapper', () => {
  const approvalCard = readFileSync(
    new URL('../src/components/approval/ApprovalActionCard.vue', import.meta.url),
    'utf8'
  );
  const businessSelection = readFileSync(
    new URL('../src/components/approval/ApprovalBusinessSelection.vue', import.meta.url),
    'utf8'
  );
  const uploadSlots = readFileSync(
    new URL('../src/components/project-workspace/contract-signing/ContractUploadSlots.vue', import.meta.url),
    'utf8'
  );
  const solutionUploadSlots = readFileSync(
    new URL('../src/components/project-workspace/solution-design/SolutionUploadSlots.vue', import.meta.url),
    'utf8'
  );
  const solutionNodeActions = readFileSync(
    new URL('../src/components/project-workspace/solution-design/SolutionNodeActions.vue', import.meta.url),
    'utf8'
  );
  const solutionPreparationPage = readFileSync(
    new URL('../src/pages/project-node/solution-design/SolutionPreparationPage.vue', import.meta.url),
    'utf8'
  );
  const preparationPage = readFileSync(
    new URL('../src/pages/project-node/contract-signing/ContractPreparationPage.vue', import.meta.url),
    'utf8'
  );
  const projectApprovalPage = readFileSync(
    new URL('../src/pages/project-node/project-approval/ProjectApprovalPage.vue', import.meta.url),
    'utf8'
  );
  const financeCostPage = readFileSync(
    new URL('../src/pages/project-node/solution-design/SolutionFinanceCostPage.vue', import.meta.url),
    'utf8'
  );
  const signingPage = readFileSync(
    new URL('../src/pages/project-node/contract-signing/ContractSigningPage.vue', import.meta.url),
    'utf8'
  );
  const paymentPage = readFileSync(
    new URL('../src/pages/project-node/contract-signing/ContractAdvancePaymentPage.vue', import.meta.url),
    'utf8'
  );

  assert.match(approvalCard, /showComment:\s*\{\s*type:\s*Boolean,\s*default:\s*true\s*\}/);
  assert.match(approvalCard, /<div v-if="showComment" class="approval-review-card__form">/);
  assert.match(approvalCard, /<\/div>\s*<div v-else class="approval-review-card__footer">/);
  assert.doesNotMatch(approvalCard, /<div class="approval-review-card__form">/);
  assert.match(approvalCard, /if \(props\.canReturn\) return '退回原因必填'/);
  assert.match(businessSelection, /<el-radio-group/);
  assert.match(businessSelection, /<el-radio[\s\S]*?border/);
  assert.doesNotMatch(businessSelection, /<el-radio-button/);
  assert.match(businessSelection, /:disabled="disabled"/);
  assert.match(businessSelection, /@update:model-value="\$emit\('update:modelValue', \$event\)"/);
  assert.match(businessSelection, /hint:\s*\{\s*type:\s*String,\s*default:\s*'审批通过前必须选择'/);
  assert.match(businessSelection, /approval-business-selection__options--count-2[\s\S]*?repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(businessSelection, /approval-business-selection__options--count-3[\s\S]*?repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(businessSelection, /approval-business-selection__options--count-4[\s\S]*?repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(businessSelection, /min-height:\s*40px/);
  assert.match(businessSelection, /@media \(max-width:\s*640px\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.doesNotMatch(uploadSlots, /<ApprovalActionCard/);
  assert.doesNotMatch(uploadSlots, /@click="\$emit\('approve'/);
  assert.match(uploadSlots, /<span role="columnheader">文件名<\/span>/);
  assert.doesNotMatch(uploadSlots, /<span role="columnheader">文件信息<\/span>/);
  assert.doesNotMatch(uploadSlots, /formatFileSize|formatUser|formatDateTime/);
  assert.match(uploadSlots, /\{\{\s*uploadButtonText\(slot\)\s*\}\}/);
  assert.match(uploadSlots, /slot\.status === 'returned' \? '整改重传' : '上传\/替换'/);
  assert.match(solutionUploadSlots, /\{\{\s*uploadButtonText\(slot\)\s*\}\}/);
  assert.match(solutionUploadSlots, /slot\.isReturnedForRework \? '整改重传' : '上传\/替换'/);
  assert.match(solutionNodeActions, /node\.permissions\?\.canSubmit === true/);
  assert.match(solutionNodeActions, /isPending\(`submit:\$\{node\.nodeKey\}`\)/);
  assert.match(solutionNodeActions, /\.solution-node-submit-action\s*\{[\s\S]*?justify-content:\s*flex-end;[\s\S]*?width:\s*90%;[\s\S]*?margin-inline:\s*auto;/);
  assert.match(solutionNodeActions, /@media \(max-width:\s*640px\)[\s\S]*?\.solution-node-submit-action\s*\{[\s\S]*?width:\s*100%;[\s\S]*?justify-content:\s*flex-start;/);
  assert.match(solutionPreparationPage, /<el-form[\s\S]*?@submit\.prevent="assignRoles"/);
  assert.match(solutionPreparationPage, /class="solution-role-actions"/);
  assert.match(solutionPreparationPage, /:loading="isPending\('roles'\)"/);
  assert.match(solutionPreparationPage, /\.solution-role-actions\s*\{[\s\S]*?justify-content:\s*flex-end;[\s\S]*?width:\s*90%;[\s\S]*?margin-inline:\s*auto;/);
  assert.match(solutionPreparationPage, /@media \(max-width:\s*640px\)[\s\S]*?\.solution-role-actions\s*\{[\s\S]*?width:\s*100%;[\s\S]*?justify-content:\s*flex-start;/);
  assert.match(uploadSlots, /canDownload[\s\S]{0,180}type="primary"/);
  assert.doesNotMatch(uploadSlots, /canDownload[\s\S]{0,180}type="primary"\s+plain/);
  assert.match(uploadSlots, /grid-template-columns:\s*200px minmax\(260px,\s*1fr\) 264px/);
  assert.match(uploadSlots, /min-height:\s*52px/);
  assert.match(uploadSlots, /padding:\s*8px 14px/);
  assert.match(uploadSlots, /\.contract-upload-table__filename\s*\{[\s\S]*?color:\s*var\(--color-text-secondary,\s*var\(--app-text-muted\)\)/);
  assert.match(uploadSlots, /@media \(max-width:\s*640px\)/);
  assert.match(uploadSlots, /grid-template-columns:\s*minmax\(100px,\s*0\.8fr\) minmax\(0,\s*1\.2fr\)/);
  assert.match(uploadSlots, /\.contract-upload-table__actions\s*>\s*\*\s*\{[\s\S]*?width:\s*auto/);
  assert.match(preparationPage, /<ApprovalActionCard/);
  assert.ok(preparationPage.indexOf('<ApprovalActionCard') > preparationPage.indexOf('<ContractUploadSlots'));
  assert.match(projectApprovalPage, /<ApprovalBusinessSelection/);
  assert.doesNotMatch(projectApprovalPage, /<el-select|<el-option/);
  assert.match(projectApprovalPage, /\{\s*label:\s*'自研模式',\s*value:\s*'自研模式'\s*\}/);
  assert.match(projectApprovalPage, /\{\s*label:\s*'供应链模式',\s*value:\s*'供应链模式'\s*\}/);
  assert.match(financeCostPage, /<ApprovalBusinessSelection/);
  assert.match(financeCostPage, /\{\s*label:\s*'报价流程',\s*value:\s*'quotation'\s*\}/);
  assert.match(financeCostPage, /\{\s*label:\s*'投标流程',\s*value:\s*'tender'\s*\}/);
  assert.doesNotMatch(financeCostPage, /<style scoped>|finance-approval-flow/);
  assert.equal(signingPage.match(/<ApprovalActionCard/g)?.length, 2);
  assert.doesNotMatch(signingPage, /<ContractSigningSection|源合同文件处理|tone="danger"/);
  assert.match(signingPage, /returnReasons\.technical_agreement/);
  assert.match(signingPage, /returnReasons\.sales_contract/);
  assert.match(paymentPage, /:show-comment="false"/);
  assert.match(paymentPage, /:selection-required="true"/);
  assert.match(paymentPage, /v-model="paymentApprovalDecision"/);
  assert.match(paymentPage, /<ApprovalBusinessSelection/);
  assert.match(paymentPage, /canApprovePaymentReleasePaid[\s\S]*?\{\s*label:\s*'客户已付款',\s*value:\s*'paid'\s*\}/);
  assert.match(paymentPage, /canApprovePaymentReleaseUnpaid[\s\S]*?\{\s*label:\s*'客户未付款',\s*value:\s*'unpaid'\s*\}/);
  assert.match(paymentPage, /handlePaymentReleaseApproval/);
  assert.match(paymentPage, /import GeneratedFormFileCard/);
  assert.match(paymentPage, /<GeneratedFormFileCard/);
  assert.match(paymentPage, /:generated-file="kickoffNoticeDownloadFile"/);
  assert.match(paymentPage, /button-text="查看项目启动通知"/);
  assert.match(paymentPage, /:pending="isPending\('download:kickoff-notice-generated-file'\)"/);
  assert.match(paymentPage, /@download="downloadKickoffNoticeGeneratedFile"/);
  assert.match(paymentPage, /canDownload:\s*generatedFile\.downloadable === true/);
  assert.doesNotMatch(paymentPage, /下载项目启动通知/);
});

test('only online form submission and explicit contract risks keep confirmation dialogs', () => {
  const roots = [
    new URL('../src/pages/project-node/', import.meta.url),
    new URL('../src/components/project-workspace/', import.meta.url),
    new URL('../src/composables/project-stage/', import.meta.url)
  ];
  const files = roots.flatMap(collectNodeActionSources);
  const projectDetailLayout = {
    path: '/src/pages/project-detail/ProjectDetailLayout.vue',
    source: readFileSync(new URL('../src/pages/project-detail/ProjectDetailLayout.vue', import.meta.url), 'utf8')
  };
  const onlineFormConfirmationFiles = [
    projectDetailLayout,
    ...files.filter(({ path }) => [
      '/SolutionAnalysisPage.vue',
      '/SolutionReviewNodePage.vue',
      '/SolutionQuotationForm.vue'
    ].some((suffix) => path.endsWith(suffix)))
  ];
  const contractRiskConfirmationFiles = files.filter(({ path }) =>
    path.endsWith('/contract-signing/useContractSigningWorkflow.js')
  );
  const allSources = [...files, projectDetailLayout].map(({ source }) => source).join('\n');

  assert.doesNotMatch(allSources, /ElMessageBox\.prompt\s*\(/);
  for (const { source } of onlineFormConfirmationFiles) {
    assert.equal(source.match(/ElMessageBox\.confirm\s*\(/g)?.length, 1);
    assert.match(source, /confirmButtonText:\s*'确认提交'/);
  }
  assert.equal(contractRiskConfirmationFiles.length, 1);
  assert.equal(contractRiskConfirmationFiles[0].source.match(/ElMessageBox\.confirm\s*\(/g)?.length, 6);
  assert.doesNotMatch(contractRiskConfirmationFiles[0].source, /,\s*'审批确认'\s*,/);
  assert.doesNotMatch(contractRiskConfirmationFiles[0].source, /,\s*'退回确认'\s*,/);
  assert.match(contractRiskConfirmationFiles[0].source, /客户退回确认/);
  assert.doesNotMatch(contractRiskConfirmationFiles[0].source, /签订完成确认/);
  assert.match(contractRiskConfirmationFiles[0].source, /预付款处理/);
  assert.match(contractRiskConfirmationFiles[0].source, /总经理放行/);
  for (const { path, source } of [...files, projectDetailLayout]) {
    if ([...onlineFormConfirmationFiles, ...contractRiskConfirmationFiles].some((item) => item.path === path)) continue;
    assert.doesNotMatch(source, /ElMessageBox\.confirm\s*\(/);
  }

  const quotationPage = readFileSync(
    new URL('../src/pages/project-node/solution-design/SolutionQuotationTenderPage.vue', import.meta.url),
    'utf8'
  );
  assert.match(quotationPage, /<ApprovalActionCard/);
  assert.match(quotationPage, /return-text="退回研发成本"/);
  assert.doesNotMatch(quotationPage, /quotation-page-bottom-actions/);
});
