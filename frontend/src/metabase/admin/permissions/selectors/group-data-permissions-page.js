import { createSelector } from "reselect";
import { msgid, ngettext, t } from "ttag";
import _ from "underscore";

import { getMetadata } from "metabase/selectors/metadata";

import {
  isDefaultGroup,
  isAdminGroup,
  isMetaBotGroup,
} from "metabase/lib/groups";

const isPinnedGroup = group =>
  isAdminGroup(group) || isDefaultGroup(group) || isMetaBotGroup(group);

import Group from "metabase/entities/groups";
import { DATA_PERMISSION_OPTIONS } from "../constants/data-permissions";
import {
  getFieldsPermission,
  getNativePermission,
  getSchemasPermission,
  getTablesPermission,
} from "metabase/lib/permissions";

const getRouteParams = (_state, props) => {
  const { groupId, databaseId, schemaName } = props.params;
  return {
    groupId,
    databaseId,
    schemaName,
  };
};

export const getSidebar = createSelector(
  Group.selectors.getList,
  getRouteParams,
  (groups, params) => {
    const { groupId } = params;

    const [pinnedGroups, unpinnedGroups] = _.partition(groups, isPinnedGroup);

    const pinnedGroupItems = pinnedGroups.map(group => ({
      ...group,
      icon: "bolt",
    }));

    const unpinnedGroupItems = unpinnedGroups.map(group => ({
      ...group,
      icon: "group",
    }));

    return {
      selectedId: parseInt(groupId),
      entityGroups: [pinnedGroupItems, unpinnedGroupItems],
      entitySwitch: {
        value: "group",
        options: [
          {
            name: t`Groups`,
            value: "group",
          },
          {
            name: t`Databases`,
            value: "database",
          },
        ],
      },
      filterPlaceholder: t`Search for a group`,
    };
  },
);

const getDataPermissions = state => state.admin.permissions.dataPermissions;

const getEditorEntityName = ({ databaseId, schemaName }) => {
  if (schemaName != null) {
    return t`Table name`;
  } else if (databaseId) {
    return t`Schema name`;
  } else {
    return t`Database name`;
  }
};

const getFilterPlaceholder = ({ databaseId, schemaName }) => {
  if (schemaName != null) {
    return t`Search tables`;
  } else if (databaseId) {
    return t`Search schemas`;
  } else {
    return t`Search databases`;
  }
};

export const getGroup = (state, props) =>
  Group.selectors.getObject(state, { entityId: props.params.groupId });

export const getPermissionEditor = createSelector(
  getMetadata,
  getRouteParams,
  getDataPermissions,
  getGroup,
  (metadata, params, permissions, group) => {
    const { groupId, databaseId, schemaName } = params;

    if (!permissions || groupId == null) {
      return null;
    }

    const isAdmin = isAdminGroup(group);

    let entities = [];

    const isDatabaseLevelPermission = schemaName == null && databaseId == null;
    const columns = [
      getEditorEntityName(params),
      t`Data access`,
      isDatabaseLevelPermission ? t`SQL queries` : null,
    ].filter(Boolean);

    if (schemaName != null) {
      entities = metadata
        .schema(`${databaseId}:${schemaName}`)
        .tables.map(table => {
          return {
            id: table.id,
            name: table.name,
            type: "table",
            permissions: [
              {
                name: "access",
                isDisabled: isAdmin,
                disabledTooltip: isAdmin
                  ? t`Cannot change the data access for Administrators`
                  : null,
                value: getFieldsPermission(permissions, groupId, {
                  databaseId,
                  schemaName,
                  tableId: table.id,
                }),
                options: [
                  DATA_PERMISSION_OPTIONS.all,
                  DATA_PERMISSION_OPTIONS.none,
                ],
              },
            ],
          };
        });
    } else if (databaseId != null) {
      entities = metadata.database(databaseId).schemas.map(schema => {
        return {
          id: schema.id,
          name: schema.name,
          type: "schema",
          permissions: [
            {
              name: "access",
              isDisabled: isAdmin,
              disabledTooltip: isAdmin
                ? t`Cannot change the data access for Administrators`
                : null,
              value: getTablesPermission(permissions, groupId, {
                databaseId,
                schemaName: schema.name,
              }),
              options: [
                DATA_PERMISSION_OPTIONS.all,
                DATA_PERMISSION_OPTIONS.controlled,
                DATA_PERMISSION_OPTIONS.none,
              ],
            },
          ],
        };
      });
    } else if (groupId != null) {
      entities = metadata
        .databasesList({ savedQuestions: false })
        .map(database => {
          const accessPermission = getSchemasPermission(permissions, groupId, {
            databaseId: database.id,
          });

          return {
            id: database.id,
            name: database.name,
            type: "database",
            schemas: database.schemas,
            permissions: [
              {
                name: "access",
                isDisabled: isAdmin,
                disabledTooltip: isAdmin
                  ? t`Cannot change the data access for Administrators`
                  : null,
                value: accessPermission,
                options: [
                  DATA_PERMISSION_OPTIONS.all,
                  DATA_PERMISSION_OPTIONS.controlled,
                  DATA_PERMISSION_OPTIONS.none,
                ],
              },
              {
                name: "native",
                isDisabled: isAdmin || accessPermission === "none",
                disabledTooltip: isAdmin
                  ? t`Cannot change the data access for Administrators`
                  : t`Data access must be allowed`,
                value: getNativePermission(permissions, group.id, {
                  databaseId: database.id,
                }),
                options: [
                  DATA_PERMISSION_OPTIONS.write,
                  DATA_PERMISSION_OPTIONS.none,
                ],
              },
            ],
          };
        });
    }

    return {
      title: t`Data permissions for ${group.name}`,
      description:
        group != null
          ? ngettext(
              msgid`${group.member_count} person`,
              `${group.member_count} people`,
              group.member_count,
            )
          : null,
      filterPlaceholder: getFilterPlaceholder(params),
      columns,
      entities,
    };
  },
);
