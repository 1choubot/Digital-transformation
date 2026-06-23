export const STAGE_STATUS = {
  NOT_STARTED: 'not_started',
  CURRENT: 'current',
  COMPLETED: 'completed'
};

export const STANDARD_PROJECT_STAGES = [
  { stageOrder: 1, stageKey: 'initiation', stageName: '立项阶段' },
  { stageOrder: 2, stageKey: 'solution', stageName: '方案设计阶段' },
  { stageOrder: 3, stageKey: 'contract', stageName: '合同签订阶段' },
  { stageOrder: 4, stageKey: 'detailedDesign', stageName: '详细设计阶段' },
  { stageOrder: 5, stageKey: 'manufacturing', stageName: '生产制作阶段' },
  { stageOrder: 6, stageKey: 'preAcceptance', stageName: '预验收阶段' },
  { stageOrder: 7, stageKey: 'finalAcceptance', stageName: '终验收阶段' },
  { stageOrder: 8, stageKey: 'closeout', stageName: '结题阶段' }
];

export function buildInitialStages() {
  return STANDARD_PROJECT_STAGES.map((stage, index) => ({
    ...stage,
    stageStatus: index === 0 ? STAGE_STATUS.CURRENT : STAGE_STATUS.NOT_STARTED,
    isCurrent: index === 0
  }));
}
