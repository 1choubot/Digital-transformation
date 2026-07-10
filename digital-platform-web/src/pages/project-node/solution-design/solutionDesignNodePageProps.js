export const solutionDesignNodePageProps = {
  projectId: { type: String, required: true },
  authToken: { type: String, default: '' },
  currentUser: { type: Object, required: true },
  project: { type: Object, default: null },
  workspace: { type: Object, default: null },
  stage: { type: Object, default: null },
  node: { type: Object, default: null },
  nodeCode: { type: String, default: '' },
  nodePageContext: { type: Object, default: () => ({}) }
};
