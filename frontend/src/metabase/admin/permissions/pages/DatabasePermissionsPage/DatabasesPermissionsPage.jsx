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
} from "../../selectors/databases-data-permissions-page";
import { getIsDirty, getDiff } from "../../selectors/data-permissions";
import {
  initializeDataPermissions,
  updateDataPermission,
  saveDataPermissions,
  loadDataPermissions,
} from "../../permissions";

import { PermissionsEditBar } from "../../components/permissions-page-layout/PermissionsEditBar";
import { PermissionsPageLayout } from "../../components/permissions-page-layout/PermissionsPageLayout";
import { PermissionsSidebar } from "../../components/permissions-sidebar";
import { PermissionEditorEmptyState } from "../../components/permission-editor/PermissionEditorEmptyState";
import { PermissionEditor } from "../../components/permission-editor/PermissionEditor";

function DatabasesPermissionsPage({
  params,
  sidebar,
  permissionEditor,

  isDirty,
  diff,
  savePermissions,
  loadPermissions,

  initialize,
  navigateToItem,
  navigateToDatabaseList,
  navigateToTab,
  switchView,
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

  const handlePermissionChange = useCallback(
    (item, permission, value) => {
      updateDataPermission({
        groupId: item.id,
        permission,
        value,
        entityId: params,
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
        onSelect={navigateToItem}
        onBack={params.databaseId == null ? null : navigateToDatabaseList}
        onEntityChange={handleEntityChange}
      />

      {!permissionEditor && (
        <PermissionEditorEmptyState
          icon="database"
          message={t`Select a database to see it's data permissions`}
        />
      )}

      {permissionEditor && (
        <PermissionEditor
          {...permissionEditor}
          onBreadcrumbsItemSelect={navigateToItem}
          onChange={handlePermissionChange}
        />
      )}
    </PermissionsPageLayout>
  );
}

const BASE_PATH = `/admin/permissions/data/database/`;

const mapDispatchToProps = {
  initialize: initializeDataPermissions,
  updateDataPermission,
  loadPermissions: loadDataPermissions,
  savePermissions: saveDataPermissions,
  switchView: entityType => push(`/admin/permissions/data/${entityType}/`),
  navigateToDatabaseList: () => push(BASE_PATH),
  navigateToItem: item => {
    switch (item.type) {
      case "database":
        return push(`${BASE_PATH}${item.id}`);
      case "schema":
        return push(`${BASE_PATH}${item.databaseId}/schema/${item.name}`);
      case "table":
        return push(
          `${BASE_PATH}${item.databaseId}/schema/${item.schemaName}/table/${item.originalId}`,
        );
    }

    return push(BASE_PATH);
  },
  navigateToTab: tab => push(`/admin/permissions/${tab}`),
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
)(DatabasesPermissionsPage);
