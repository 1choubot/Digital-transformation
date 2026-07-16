import assert from 'node:assert/strict';
import test from 'node:test';
import { buildImplementationPlanItems } from '../src/composables/project-stage/solution-design/implementationPlanItems.js';

test('implementation plan array sources keep each array entry as one source item', () => {
  const items = buildImplementationPlanItems({
    customerRequirements: ['需求第一条\n同一条的补充说明', '需求第二条'],
    implementationPlanItems: [
      {
        sourceType: 'requirement',
        sourceLabel: '需求',
        sourceIndex: 1,
        sourceText: '需求第一条\n同一条的补充说明',
        planText: '需求1计划'
      },
      {
        sourceType: 'requirement',
        sourceLabel: '需求',
        sourceIndex: 2,
        sourceText: '需求第二条',
        planText: '需求2计划'
      }
    ]
  });

  assert.equal(items.length, 2);
  assert.equal(items[0].sourceText, '需求第一条\n同一条的补充说明');
  assert.equal(items[0].planText, '需求1计划');
  assert.equal(items[1].sourceText, '需求第二条');
  assert.equal(items[1].planText, '需求2计划');
});

test('implementation plan source text matching avoids inheriting a deleted requirement plan', () => {
  const initialItems = buildImplementationPlanItems({
    customerRequirements: ['需求第一行', '需求第二行'],
    implementationPlanItems: [
      {
        sourceType: 'requirement',
        sourceLabel: '需求',
        sourceIndex: 1,
        sourceText: '需求第一行',
        planText: '需求1计划'
      },
      {
        sourceType: 'requirement',
        sourceLabel: '需求',
        sourceIndex: 2,
        sourceText: '需求第二行',
        planText: '需求2计划'
      }
    ]
  });

  assert.deepEqual(initialItems.map((item) => item.planText), ['需求1计划', '需求2计划']);

  const afterDeletingFirstRequirement = buildImplementationPlanItems({
    customerRequirements: ['需求第二行'],
    implementationPlanItems: initialItems
  });

  assert.equal(afterDeletingFirstRequirement.length, 1);
  assert.equal(afterDeletingFirstRequirement[0].sourceType, 'requirement');
  assert.equal(afterDeletingFirstRequirement[0].sourceIndex, 1);
  assert.equal(afterDeletingFirstRequirement[0].sourceText, '需求第二行');
  assert.equal(afterDeletingFirstRequirement[0].planText, '需求2计划');
});

test('implementation plan same-position source text edits keep the plan text', () => {
  const initialItems = buildImplementationPlanItems({
    projectTargetDescription: ['旧目标描述'],
    implementationPlanItems: [
      {
        sourceType: 'target',
        sourceLabel: '目标',
        sourceIndex: 1,
        sourceText: '旧目标描述',
        planText: '目标计划'
      }
    ]
  });

  const editedItems = buildImplementationPlanItems({
    projectTargetDescription: ['新目标描述'],
    implementationPlanItems: initialItems
  });

  assert.equal(editedItems.length, 1);
  assert.equal(editedItems[0].sourceType, 'target');
  assert.equal(editedItems[0].sourceText, '新目标描述');
  assert.equal(editedItems[0].planText, '目标计划');
});

test('implementation plan unchanged source count keeps plans by index when texts become duplicates', () => {
  const initialItems = buildImplementationPlanItems({
    projectTargetDescription: ['目标A', '目标B'],
    implementationPlanItems: [
      {
        sourceType: 'target',
        sourceLabel: '目标',
        sourceIndex: 1,
        sourceText: '目标A',
        planText: '计划A'
      },
      {
        sourceType: 'target',
        sourceLabel: '目标',
        sourceIndex: 2,
        sourceText: '目标B',
        planText: '计划B'
      }
    ]
  });

  const editedItems = buildImplementationPlanItems({
    projectTargetDescription: ['目标B', '目标B'],
    implementationPlanItems: initialItems
  });

  assert.deepEqual(
    editedItems.map((item) => `${item.sourceText}:${item.planText}`),
    ['目标B:计划A', '目标B:计划B']
  );
});

test('implementation plan deleted sources remove their plan items', () => {
  const initialItems = buildImplementationPlanItems({
    customerRequirements: ['需求第一行'],
    technicalRisks: ['风险第一行'],
    implementationPlanItems: [
      {
        sourceType: 'requirement',
        sourceLabel: '需求',
        sourceIndex: 1,
        sourceText: '需求第一行',
        planText: '需求计划'
      },
      {
        sourceType: 'risk',
        sourceLabel: '风险',
        sourceIndex: 1,
        sourceText: '风险第一行',
        planText: '风险计划'
      }
    ]
  });

  const afterDeletingRequirement = buildImplementationPlanItems({
    customerRequirements: [''],
    technicalRisks: ['风险第一行'],
    implementationPlanItems: initialItems
  });

  assert.deepEqual(
    afterDeletingRequirement.map((item) => `${item.sourceType}:${item.sourceText}:${item.planText}`),
    ['risk:风险第一行:风险计划']
  );
});

test('implementation plan empty source rows do not generate numbered items', () => {
  const items = buildImplementationPlanItems({
    solutionSuggestions: ['建议第一行', ' ', '\n', null],
    implementationPlanItems: [
      {
        sourceType: 'suggestion',
        sourceLabel: '建议',
        sourceIndex: 1,
        sourceText: '建议第一行',
        planText: '建议计划'
      }
    ]
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].sourceType, 'suggestion');
  assert.equal(items[0].sourceIndex, 1);
  assert.equal(items[0].sourceText, '建议第一行');
  assert.equal(items[0].planText, '建议计划');
});
