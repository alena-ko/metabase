import { createSelector } from "reselect";
import Group from "metabase/entities/groups";
import { diffPermissions } from "metabase/lib/permissions";

export const getIsDirty = createSelector(
  state => state.admin.permissions.collectionPermissions,
  state => state.admin.permissions.originalCollectionPermissions,
  (permissions, originalPermissions) =>
    JSON.stringify(permissions) !== JSON.stringify(originalPermissions),
);

export const getDiff = createSelector(
  Group.selectors.getList,
  state => state.admin.permissions.collectionPermissions,
  state => state.admin.permissions.originalCollectionPermissions,
  (groups, permissions, originalPermissions) =>
    diffPermissions(permissions, originalPermissions, groups),
);
