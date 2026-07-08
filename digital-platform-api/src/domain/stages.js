import {
  SELF_DEVELOPED_PROJECT_STAGES,
  getProjectProcessTemplate
} from './projectProcessTemplates.js';

export const STAGE_STATUS = {
  NOT_STARTED: 'not_started',
  CURRENT: 'current',
  COMPLETED: 'completed'
};

export const STANDARD_PROJECT_STAGES = SELF_DEVELOPED_PROJECT_STAGES;

export function buildInitialStages(projectMode = null) {
  const template = getProjectProcessTemplate(projectMode);

  return template.stages.map((stage, index) => ({
    ...stage,
    stageStatus: index === 0 ? STAGE_STATUS.CURRENT : STAGE_STATUS.NOT_STARTED,
    isCurrent: index === 0
  }));
}
