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
  assert.equal(contractRiskConfirmationFiles[0].source.match(/ElMessageBox\.confirm\s*\(/g)?.length, 9);
  assert.match(contractRiskConfirmationFiles[0].source, /客户退回确认/);
  assert.match(contractRiskConfirmationFiles[0].source, /签订完成确认/);
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
