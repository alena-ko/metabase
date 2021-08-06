import { createSelector } from "reselect";

import { getMetadata } from "metabase/selectors/metadata";
import Group from "metabase/entities/groups";
import { diffPermissions } from "metabase/lib/permissions";

export const getIsDirty = createSelector(
  state => state.admin.permissions.dataPermissions,
  state => state.admin.permissions.originalDataPermissions,
  (permissions, originalPermissions) =>
    JSON.stringify(permissions) !== JSON.stringify(originalPermissions),
);

export const getDiff = createSelector(
  getMetadata,
  Group.selectors.getList,
  state => state.admin.permissions.dataPermissions,
  state => state.admin.permissions.originalDataPermissions,
  (metadata, groups, permissions, originalPermissions) =>
    diffPermissions(permissions, originalPermissions, groups, metadata),
);
