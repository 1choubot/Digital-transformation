import { PROJECT_MODE } from './organization.js';

export const DEFAULT_PROJECT_MODE = PROJECT_MODE.SELF_DEVELOPED;

export const SELF_DEVELOPED_PROJECT_STAGES = Object.freeze([
  { stageOrder: 1, stageKey: 'initiation', stageName: '立项阶段' },
  { stageOrder: 2, stageKey: 'solution', stageName: '方案设计阶段' },
  { stageOrder: 3, stageKey: 'contract', stageName: '合同签订阶段' },
  { stageOrder: 4, stageKey: 'detailedDesign', stageName: '详细设计阶段' },
  { stageOrder: 5, stageKey: 'manufacturing', stageName: '生产制作阶段' },
  { stageOrder: 6, stageKey: 'preAcceptance', stageName: '预验收阶段' },
  { stageOrder: 7, stageKey: 'finalAcceptance', stageName: '终验收阶段' },
  { stageOrder: 8, stageKey: 'closeout', stageName: '结题阶段' }
]);

const SELF_DEVELOPED_TEMPLATE = Object.freeze({
  mode: PROJECT_MODE.SELF_DEVELOPED,
  name: '自研模式',
  stages: SELF_DEVELOPED_PROJECT_STAGES.map((stage) =>
    Object.freeze({
      ...stage,
      nodes:
        stage.stageKey === 'initiation'
          ? Object.freeze([
              { nodeKey: 'project_input', nodeName: '项目输入' },
              { nodeKey: 'market_research', nodeName: '项目市场调研' },
              { nodeKey: 'initiation_approval', nodeName: '项目立项审批' },
              { nodeKey: 'initiation_notice', nodeName: '项目立项通知' }
            ])
          : Object.freeze([])
    })
  )
});

const SUPPLIER_TEMPLATE = Object.freeze({
  mode: PROJECT_MODE.SUPPLIER,
  name: '供货商模式',
  stages: Object.freeze([
    {
      stageOrder: 1,
      stageKey: 'supplier_requirement',
      stageName: '需求确认阶段',
      nodes: Object.freeze([])
    },
    {
      stageOrder: 2,
      stageKey: 'supplier_delivery',
      stageName: '供货交付阶段',
      nodes: Object.freeze([])
    },
    {
      stageOrder: 3,
      stageKey: 'supplier_acceptance',
      stageName: '验收结算阶段',
      nodes: Object.freeze([])
    }
  ])
});

const OUTSOURCED_TEMPLATE = Object.freeze({
  mode: PROJECT_MODE.OUTSOURCED,
  name: '外协模式',
  stages: Object.freeze([
    {
      stageOrder: 1,
      stageKey: 'outsourced_requirement',
      stageName: '需求确认阶段',
      nodes: Object.freeze([])
    },
    {
      stageOrder: 2,
      stageKey: 'outsourced_execution',
      stageName: '外协执行阶段',
      nodes: Object.freeze([])
    },
    {
      stageOrder: 3,
      stageKey: 'outsourced_acceptance',
      stageName: '验收阶段',
      nodes: Object.freeze([])
    }
  ])
});

const PROCESS_TEMPLATES = Object.freeze({
  [PROJECT_MODE.SELF_DEVELOPED]: SELF_DEVELOPED_TEMPLATE,
  [PROJECT_MODE.SUPPLIER]: SUPPLIER_TEMPLATE,
  [PROJECT_MODE.OUTSOURCED]: OUTSOURCED_TEMPLATE
});

export function getEffectiveProjectMode(projectMode) {
  return PROCESS_TEMPLATES[projectMode] ? projectMode : DEFAULT_PROJECT_MODE;
}

export function getProjectProcessTemplate(projectMode) {
  return PROCESS_TEMPLATES[getEffectiveProjectMode(projectMode)];
}

export function isSelfDevelopedProjectMode(projectMode) {
  return getEffectiveProjectMode(projectMode) === PROJECT_MODE.SELF_DEVELOPED;
}
