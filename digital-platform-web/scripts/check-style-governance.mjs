import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');

export const DEFAULT_STYLE_POLICY = Object.freeze({
  allowedScopedStyleFiles: new Set([
    'src/components/project-workspace/contract-signing/ContractSigningNodeLayout.vue',
    'src/components/project-workspace/contract-signing/ContractSigningSection.vue',
    'src/components/project-workspace/contract-signing/ContractUploadSlots.vue',
    'src/components/project-workspace/solution-design/SolutionFormFields.vue',
    'src/components/project-workspace/solution-design/SolutionNodeActions.vue',
    'src/components/project-workspace/solution-design/SolutionRepeatableItems.vue',
    'src/components/project-workspace/solution-design/SolutionReviewFormTable.vue',
    'src/components/project-workspace/solution-design/SolutionReviewNodePage.vue',
    'src/pages/project-node/solution-design/SolutionFinanceCostPage.vue',
    'src/pages/project-node/solution-design/SolutionPreparationPage.vue',
    'src/pages/project-node/contract-signing/ContractAdvancePaymentPage.vue',
    'src/pages/project-node/contract-signing/ContractSigningPage.vue'
  ]),
  allowedDeepRoots: new Map([
    ['src/components/project-workspace/solution-design/SolutionReviewFormTable.vue', '.review-form-table'],
    ['src/pages/project-node/solution-design/SolutionFinanceCostPage.vue', '.finance-approval-flow__options']
  ]),
  expectedNativeButtons: new Map([
    ['src/layouts/MainLayout.vue', 4],
    ['src/components/node/NodeOnlineFormEditor.vue', 1],
    ['src/components/project-workspace/ProjectWorkspaceNodeList.vue', 1],
    ['src/components/project-workspace/ProjectWorkspaceStageNav.vue', 1]
  ]),
  maxStylesCssLines: 7141,
  maxStylesCssImportant: 16
});

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/');
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function extractTemplate(source) {
  const opening = source.match(/<template\b[^>]*>/i);
  if (!opening || opening.index === undefined) return '';
  const start = opening.index + opening[0].length;
  const scriptStart = source.search(/<script\b/i);
  const end = scriptStart >= start ? scriptStart : source.length;
  return source.slice(start, end);
}

function extractStyleBlocks(source) {
  return [...source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi)].map((match) => ({
    attributes: match[1] || '',
    content: match[2] || ''
  }));
}

export function analyzeStyleGovernance({ vueFiles, stylesCss, policy = DEFAULT_STYLE_POLICY }) {
  const errors = [];
  const buttonCounts = new Map();

  for (const file of vueFiles) {
    const filePath = normalizePath(file.path);
    const template = extractTemplate(file.content);
    const styleBlocks = extractStyleBlocks(file.content);

    for (const tag of ['input', 'select', 'textarea']) {
      if (new RegExp(`<${tag}(?:\\s|>)`, 'i').test(template)) {
        errors.push(`${filePath}: 禁止新增原生可见 <${tag}>，请使用 Element Plus。`);
      }
    }

    if (/class\s*=\s*["'][^"']*\b(?:primary-button|ghost-button|form-control)\b/i.test(template)) {
      errors.push(`${filePath}: 禁止恢复旧通用控件类 primary-button/ghost-button/form-control。`);
    }

    const buttonCount = countMatches(template, /<button(?:\s|>)/gi);
    if (buttonCount > 0) buttonCounts.set(filePath, buttonCount);

    if (styleBlocks.length > 0 && !policy.allowedScopedStyleFiles.has(filePath)) {
      errors.push(`${filePath}: 不在 scoped 样式允许清单中。`);
    }

    for (const style of styleBlocks) {
      if (!/\bscoped\b/i.test(style.attributes)) {
        errors.push(`${filePath}: Vue <style> 必须使用 scoped。`);
      }
      if (/!important\b/i.test(style.content)) {
        errors.push(`${filePath}: Vue 局部样式禁止使用 !important。`);
      }
      if (/#[0-9a-f]{3,8}\b/i.test(style.content)) {
        errors.push(`${filePath}: Vue 局部样式禁止硬编码十六进制颜色，请使用语义变量。`);
      }

      const deepRoot = policy.allowedDeepRoots.get(filePath);
      for (const line of style.content.split(/\r?\n/).filter((item) => item.includes(':deep('))) {
        if (!deepRoot || !line.trimStart().startsWith(deepRoot)) {
          errors.push(`${filePath}: :deep() 必须位于允许文件并受 ${deepRoot || '授权组件根类'} 约束。`);
        }
      }
    }
  }

  for (const [filePath, count] of buttonCounts) {
    if (!policy.expectedNativeButtons.has(filePath)) {
      errors.push(`${filePath}: 原生 <button> 不在结构化交互允许清单中。`);
    } else if (policy.expectedNativeButtons.get(filePath) !== count) {
      errors.push(`${filePath}: 原生 <button> 数量应为 ${policy.expectedNativeButtons.get(filePath)}，实际为 ${count}。`);
    }
  }
  for (const [filePath, count] of policy.expectedNativeButtons) {
    if ((buttonCounts.get(filePath) || 0) !== count) {
      errors.push(`${filePath}: 原生 <button> 基线数量应为 ${count}，实际为 ${buttonCounts.get(filePath) || 0}。`);
    }
  }

  const physicalLines = stylesCss.split(/\r?\n/).length;
  const importantCount = countMatches(stylesCss, /!important\b/g);
  if (physicalLines > policy.maxStylesCssLines) {
    errors.push(`src/styles.css: 物理行数 ${physicalLines} 超过治理预算 ${policy.maxStylesCssLines}。`);
  }
  if (importantCount > policy.maxStylesCssImportant) {
    errors.push(`src/styles.css: !important 数量 ${importantCount} 超过治理预算 ${policy.maxStylesCssImportant}。`);
  }

  return { errors, metrics: { physicalLines, importantCount, scopedStyleFiles: vueFiles.filter((file) => extractStyleBlocks(file.content).length > 0).length } };
}

function collectVueFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectVueFiles(absolutePath);
    if (!entry.isFile() || !entry.name.endsWith('.vue')) return [];
    return [{
      path: normalizePath(path.relative(PROJECT_ROOT, absolutePath)),
      content: fs.readFileSync(absolutePath, 'utf8')
    }];
  });
}

export function runStyleGovernanceCheck(projectRoot = PROJECT_ROOT, policy = DEFAULT_STYLE_POLICY) {
  return analyzeStyleGovernance({
    vueFiles: collectVueFiles(path.join(projectRoot, 'src')),
    stylesCss: fs.readFileSync(path.join(projectRoot, 'src', 'styles.css'), 'utf8'),
    policy
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runStyleGovernanceCheck();
  if (result.errors.length > 0) {
    console.error('样式治理检查失败：');
    result.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
  } else {
    console.log(`样式治理检查通过：${result.metrics.scopedStyleFiles} 个 scoped 样式文件，styles.css ${result.metrics.physicalLines} 行，${result.metrics.importantCount} 个 !important。`);
  }
}
