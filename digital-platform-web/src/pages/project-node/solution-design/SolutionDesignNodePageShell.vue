<template>
  <ProjectSolutionDesignWorkflowPanel
    :project-id="projectId"
    :auth-token="authToken"
    :current-user="currentUser"
    :project="project"
    :workflow="context.solutionDesignWorkflow || null"
    :uploads="context.solutionDesignUploads || null"
    :loading="context.solutionDesignLoading === true"
    :error-message="context.solutionDesignErrorMessage || ''"
    :responsibility-candidates="context.responsibilityCandidates || []"
    :responsibility-candidates-loading="context.responsibilityCandidatesLoading === true"
    :responsibility-candidates-error-message="context.responsibilityCandidatesErrorMessage || ''"
    :selected-node-key="nodeKey"
    :focus-node-key="nodeKey"
    hide-node-nav
    @changed="notifyBusinessStateChanged"
  />
</template>

<script setup>
import { computed } from 'vue';
import ProjectSolutionDesignWorkflowPanel from '../../../components/project-workspace/ProjectSolutionDesignWorkflowPanel.vue';

const emit = defineEmits(['business-state-changed']);

const props = defineProps({
  projectId: { type: String, required: true },
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  project: { type: Object, default: null },
  workspace: { type: Object, default: null },
  stage: { type: Object, default: null },
  node: { type: Object, default: null },
  nodeCode: { type: String, required: true },
  nodeKey: { type: String, required: true },
  nodePageContext: { type: Object, default: () => ({}) }
});

const context = computed(() => props.nodePageContext || {});

function notifyBusinessStateChanged() {
  emit('business-state-changed', {
    source: 'solution-design',
    nodeKey: props.nodeKey
  });
}
</script>
