/* eslint-disable react/prop-types */
import React, { useEffect, useCallback } from "react";
import { push } from "react-router-redux";
import { t } from "ttag";
import _ from "underscore";
import { connect } from "react-redux";

import Databases from "metabase/entities/databases";
import Groups from "metabase/entities/groups";
import {
  getPermissionEditor,
  getSidebar,
} from "../../selectors/group-data-permissions-page";
import { getIsDirty, getDiff } from "../../selectors/data-permissions";
import {
  initializeDataPermissions,
  updateDataPermission,
  saveDataPermissions,
  loadDataPermissions,
} from "../../permissions";

import { PermissionsPageLayout } from "../../components/permissions-page-layout/PermissionsPageLayout";
import { PermissionsSidebar } from "../../components/permissions-sidebar";
import { PermissionEditorEmptyState } from "../../components/permission-editor/PermissionEditorEmptyState";
import { PermissionEditor } from "../../components/permission-editor/PermissionEditor";
import { PermissionsEditBar } from "../../components/permissions-page-layout/PermissionsEditBar";

function GroupsPermissionsPage({
  params,
  sidebar,
  permissionEditor,

  isDirty,
  diff,
  savePermissions,
  loadPermissions,

  initialize,
  navigateToTab,
  navigateToItem,
  switchView,
  navigateToTableItem,
  updateDataPermission,
}) {
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleEntityChange = useCallback(
    entityType => {
      switchView(entityType);
    },
    [switchView],
  );

  const handleSidebarItemSelect = useCallback(
    item => {
      navigateToItem(item, params);
    },
    [navigateToItem, params],
  );

  const handleTableItemSelect = useCallback(
    item => {
      navigateToTableItem(item, params);
    },
    [navigateToTableItem, params],
  );

  const handlePermissionChange = useCallback(
    (item, permission, value) => {
      let entityId;

      switch (item.type) {
        case "database":
          entityId = { databaseId: item.id };
          break;
        case "schema":
          entityId = {
            databaseId: params.databaseId,
            schemaName: item.name,
          };
          break;
        case "table":
          entityId = {
            databaseId: params.databaseId,
            schemaName: params.schemaName,
            tableId: item.id,
          };
          break;
      }

      updateDataPermission({
        groupId: params.groupId,
        permission,
        value,
        entityId,
      });
    },
    [params, updateDataPermission],
  );

  return (
    <PermissionsPageLayout
      tab="data"
      onChangeTab={navigateToTab}
      confirmBar={
        isDirty && (
          <PermissionsEditBar
            diff={diff}
            isDirty={isDirty}
            onSave={savePermissions}
            onCancel={loadPermissions}
          />
        )
      }
    >
      <PermissionsSidebar
        {...sidebar}
        onSelect={handleSidebarItemSelect}
        onEntityChange={handleEntityChange}
      />

      {!permissionEditor && (
        <PermissionEditorEmptyState
          icon="group"
          message={t`Select a group to see it's data permissions`}
        />
      )}

      {permissionEditor && (
        <PermissionEditor
          {...permissionEditor}
          onSelect={params.schemaName != null ? null : handleTableItemSelect}
          onChange={handlePermissionChange}
        />
      )}
    </PermissionsPageLayout>
  );
}

const BASE_PATH = `/admin/permissions/data/group`;

const mapDispatchToProps = {
  initialize: initializeDataPermissions,
  loadPermissions: loadDataPermissions,
  updateDataPermission,
  savePermissions: saveDataPermissions,
  switchView: entityType => push(`/admin/permissions/data/${entityType}/`),
  navigateToItem: (item, params) => push(`${BASE_PATH}/${item.id}`),
  navigateToTab: tab => push(`/admin/permissions/${tab}`),
  navigateToTableItem: (item, { groupId, databaseId }) => {
    if (item.type === "database") {
      return item.schemas.length > 1
        ? push(`${BASE_PATH}/${groupId}/database/${item.id}`)
        : push(
            `${BASE_PATH}/${groupId}/database/${item.id}/schema/${item.schemas[0].name}`,
          );
    } else if (item.type === "schema") {
      return push(
        `${BASE_PATH}/${groupId}/database/${databaseId}/schema/${item.name}`,
      );
    }
  },
};

const mapStateToProps = (state, props) => {
  return {
    sidebar: getSidebar(state, props),
    permissionEditor: getPermissionEditor(state, props),
    isDirty: getIsDirty(state, props),
    diff: getDiff(state, props),
  };
};

export default _.compose(
  Databases.loadList({ entityQuery: { include: "tables" } }),
  Groups.loadList(),
  connect(
    mapStateToProps,
    mapDispatchToProps,
  ),
)(GroupsPermissionsPage);
