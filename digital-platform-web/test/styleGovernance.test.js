import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeStyleGovernance } from '../scripts/check-style-governance.mjs';

function policy(overrides = {}) {
  return {
    allowedScopedStyleFiles: new Set(),
    allowedDeepRoots: new Map(),
    expectedNativeButtons: new Map(),
    maxStylesCssLines: 10,
    maxStylesCssImportant: 0,
    ...overrides
  };
}

function analyze(content, overrides = {}, stylesCss = '.root { display: block; }') {
  return analyzeStyleGovernance({
    vueFiles: [{ path: 'src/TestPage.vue', content }],
    stylesCss,
    policy: policy(overrides)
  }).errors;
}

test('accepts an authorized scoped component style and structural button baseline', () => {
  const errors = analyze(
    '<template><button type="button">切换</button><el-input /></template><style scoped>.root { color: var(--el-text-color-primary); }</style>',
    {
      allowedScopedStyleFiles: new Set(['src/TestPage.vue']),
      expectedNativeButtons: new Map([['src/TestPage.vue', 1]])
    }
  );
  assert.deepEqual(errors, []);
});

test('rejects native form controls and legacy control classes', () => {
  const errors = analyze('<template><input class="primary-button" /><select></select><textarea></textarea></template>');
  assert.equal(errors.length, 4);
});

test('rejects an unapproved native button or changed baseline count', () => {
  assert.match(analyze('<template><button>操作</button></template>')[0], /不在结构化交互允许清单/);
  const errors = analyze('<template><button>一个</button></template>', {
    expectedNativeButtons: new Map([['src/TestPage.vue', 2]])
  });
  assert.ok(errors.some((error) => error.includes('数量应为 2')));
});

test('rejects unapproved, unscoped, important, and hard-coded Vue styles', () => {
  const errors = analyze('<template><div /></template><style>.root { color: #fff !important; }</style>');
  assert.equal(errors.length, 4);
});

test('allows rooted deep selectors only in an authorized component', () => {
  const allowedPolicy = {
    allowedScopedStyleFiles: new Set(['src/TestPage.vue']),
    allowedDeepRoots: new Map([['src/TestPage.vue', '.root']])
  };
  assert.deepEqual(analyze('<template><div /></template><style scoped>.root :deep(.el-input) { width: 100%; }</style>', allowedPolicy), []);
  assert.match(analyze('<template><div /></template><style scoped>:deep(.el-input) { width: 100%; }</style>', allowedPolicy)[0], /必须位于允许文件/);
});

test('enforces styles.css physical-line and important budgets', () => {
  const errors = analyze('<template><div /></template>', { maxStylesCssLines: 2, maxStylesCssImportant: 0 }, '.a {\n color: red !important;\n}');
  assert.ok(errors.some((error) => error.includes('物理行数')));
  assert.ok(errors.some((error) => error.includes('!important 数量')));
});

test('online forms keep the shared clear control surface without review-table overrides', () => {
  const stylesCss = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const reviewForm = readFileSync(
    new URL('../src/components/project-workspace/solution-design/SolutionReviewFormTable.vue', import.meta.url),
    'utf8'
  );

  assert.match(stylesCss, /Shared control surface for project-node online forms/);
  assert.match(stylesCss, /box-shadow: 0 0 0 1px #d7e0e8 inset/);
  assert.doesNotMatch(reviewForm, /:deep\(\.el-input__wrapper\)[\s\S]*?background:\s*transparent/);
  assert.doesNotMatch(reviewForm, /:deep\(\.el-input__wrapper\)[\s\S]*?border-radius:\s*0/);
});
