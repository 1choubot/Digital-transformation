export function filterSolutionDesignRoleCandidates(role, candidates = []) {
  return candidates.filter((candidate) => {
    if (candidate?.isEnabled === false || candidate?.organizationRole === 'system_admin') {
      return false;
    }

    return !role?.requiredDepartment || candidate?.department === role.requiredDepartment;
  });
}
