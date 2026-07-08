import navigationConfig from '../config/navigation.json' with { type: 'json' };

export function getModuleNavigation(moduleCode) {
  const normalizedModuleCode = String(moduleCode || '').trim();
  const module = (navigationConfig.modules || []).find((item) => item.code === normalizedModuleCode);

  return module?.children || [];
}
