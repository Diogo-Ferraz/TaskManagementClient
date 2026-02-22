export const AppRole = {
  Administrator: 'Administrator',
  ProjectManager: 'ProjectManager',
  User: 'User'
} as const;

export type AppRole = (typeof AppRole)[keyof typeof AppRole];

export const MANAGEMENT_ROLES: readonly AppRole[] = [AppRole.Administrator, AppRole.ProjectManager];
export const ALL_ROLES: readonly AppRole[] = [AppRole.Administrator, AppRole.ProjectManager, AppRole.User];
