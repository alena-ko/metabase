import { createSelector } from "reselect";
import { t } from "ttag";
import _ from "underscore";

import { getMetadata } from "metabase/selectors/metadata";

import Group from "metabase/entities/groups";
import {
  isAdminGroup,
  isDefaultGroup,
  isMetaBotGroup,
} from "metabase/lib/groups";
import { DATA_PERMISSION_OPTIONS } from "../constants/data-permissions";
import {
  getFieldsPermission,
  getNativePermission,
  getSchemasPermission,
  getTablesPermission,
} from "metabase/lib/permissions";

const getRouteParams = (_state, props) => {
  const { databaseId, schemaName, tableId } = props.params;
  return {
    databaseId,
    schemaName,
    tableId,
  };
};

const getSchemaId = name => `schema:${name}`;
const getTableId = id => `table:${id}`;

export const getSidebar = createSelector(
  getMetadata,
  getRouteParams,
  (metadata, params) => {
    const { databaseId, schemaName, tableId } = params;

    if (databaseId == null) {
      const entities = (Object.values(metadata.databases) || []).map(
        database => ({
          ...database,
          icon: "database",
          type: "database",
        }),
      );

      return {
        entityGroups: [entities],
        entitySwitch: {
          value: "database",
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
        filterPlaceholder: t`Search for a database`,
      };
    }

    const database = metadata.databases[databaseId];

    let selectedId = null;

    if (tableId != null) {
      selectedId = getTableId(tableId);
    } else if (schemaName != null) {
      selectedId = getSchemaId(schemaName);
    }

    let entities = database.schemas.map(schema => {
      return {
        id: getSchemaId(schema.name),
        name: schema.name,
        databaseId: databaseId,
        type: "schema",
        children: schema.tables.map(table => ({
          id: getTableId(table.id),
          originalId: table.id,
          name: table.name,
          schemaName: schema.name,
          databaseId: databaseId,
          type: "table",
        })),
      };
    });

    const shouldIncludeSchemas = database.schemas.length > 1;
    if (!shouldIncludeSchemas) {
      entities = entities[0].children;
    }

    return {
      selectedId,
      title: database.name,
      description: t`Select a table to set more specific permissions`,
      entityGroups: [entities],
      filterPlaceholder: t`Search for a table`,
    };
  },
);

const getBreadcrumbs = (params, metadata) => {
  const { databaseId, schemaName, tableId } = params;

  if (databaseId == null) {
    return null;
  }

  const database = metadata.database(databaseId);

  const databaseItem = {
    text: database.name,
    id: databaseId,
    type: "database",
  };

  if (schemaName == null) {
    return [databaseItem];
  }

  const schema = metadata.schema(`${databaseId}:${schemaName}`);
  const schemaItem = {
    id: schema.id,
    text: schema.name,
    name: schema.name,
    databaseId,
    type: "schema",
  };

  if (tableId == null) {
    return [databaseItem, schemaItem];
  }

  const table = metadata.table(tableId);
  const tableItem = {
    text: table.name,
    type: "table",
    schemaName: schema.name,
    databaseId,
    originalId: table.id,
  };

  const hasMultipleSchemas = database.schemas.length > 1;

  return [databaseItem, hasMultipleSchemas && schemaItem, tableItem].filter(
    Boolean,
  );
};

export const getGroupsWithoutMetabot = createSelector(
  [Group.selectors.getList],
  groups => groups.filter(group => !isMetaBotGroup(group)),
);

const getDataPermissions = state => state.admin.permissions.dataPermissions;

export const getPermissionEditor = createSelector(
  getMetadata,
  getRouteParams,
  getDataPermissions,
  getGroupsWithoutMetabot,
  (metadata, params, permissions, groups) => {
    const { databaseId, schemaName, tableId } = params;

    if (!permissions || databaseId == null) {
      return null;
    }

    const defaultGroup = _.find(groups, isDefaultGroup);

    const isDatabaseLevelPermission = tableId == null && schemaName == null;
    const columns = [
      t`Group name`,
      t`Data access`,
      isDatabaseLevelPermission ? t`SQL queries` : null,
    ].filter(Boolean);

    const entities = groups.map(group => {
      const isAdmin = isAdminGroup(group);
      let groupPermissions;

      if (tableId != null) {
        groupPermissions = [
          {
            name: "access",
            isDisabled: isAdmin,
            value: getFieldsPermission(permissions, group.id, {
              databaseId,
              schemaName,
              tableId,
            }),
            options: [
              DATA_PERMISSION_OPTIONS.all,
              DATA_PERMISSION_OPTIONS.sandboxed,
              DATA_PERMISSION_OPTIONS.none,
            ],
          },
        ];
      } else if (schemaName != null) {
        groupPermissions = [
          {
            name: "access",
            isDisabled: isAdmin,
            value: getTablesPermission(permissions, group.id, {
              databaseId,
              schemaName,
            }),
            options: [
              DATA_PERMISSION_OPTIONS.all,
              DATA_PERMISSION_OPTIONS.none,
            ],
          },
        ];
      } else if (databaseId != null) {
        const accessPermission = getSchemasPermission(permissions, group.id, {
          databaseId,
        });
        groupPermissions = [
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
              databaseId,
            }),
            options: [
              DATA_PERMISSION_OPTIONS.write,
              DATA_PERMISSION_OPTIONS.none,
            ],
          },
        ];
      }

      return {
        id: group.id,
        name: group.name,
        permissions: groupPermissions,
      };
    });

    return {
      title: t`Permissions for`,
      filterPlaceholder: t`Search groups`,
      breadcrumbs: getBreadcrumbs(params, metadata),
      columns,
      entities,
    };
  },
);
