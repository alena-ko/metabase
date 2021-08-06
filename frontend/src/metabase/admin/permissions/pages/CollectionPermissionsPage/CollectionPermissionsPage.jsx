/* eslint-disable react/prop-types */
import React, { useEffect, useCallback } from "react";
import { push } from "react-router-redux";
import { connect } from "react-redux";
import { t } from "ttag";
import _ from "underscore";

import Groups from "metabase/entities/groups";
import Collections from "metabase/entities/collections";

import { PermissionEditor } from "../../components/permission-editor/PermissionEditor";
import { PermissionEditorEmptyState } from "../../components/permission-editor/PermissionEditorEmptyState";
import { PermissionsPageLayout } from "../../components/permissions-page-layout/PermissionsPageLayout";
import {
  initializeCollectionPermissions,
  updateCollectionPermission,
  saveCollectionPermissions,
  loadCollectionPermissions,
} from "../../permissions";
import {
  getSidebar,
  getPermissionEditor,
  getCollection,
} from "../../selectors/collection-permissions-page";

import { getIsDirty, getDiff } from "../../selectors/collection-permissions";
import { PermissionsSidebar } from "../../components/permissions-sidebar";
import { PermissionsEditBar } from "../../components/permissions-page-layout/PermissionsEditBar";

function CollectionsPermissionsPage({
  sidebar,
  permissionEditor,
  collection,

  isDirty,
  diff,
  savePermissions,
  loadPermissions,

  updateCollectionPermission,
  navigateToItem,
  navigateToTab,
  initialize,
}) {
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handlePermissionChange = useCallback(
    (item, _permission, value, toggleState) => {
      updateCollectionPermission({
        groupId: item.id,
        collection,
        value,
        shouldPropagate: toggleState,
      });
    },
    [collection, updateCollectionPermission],
  );

  return (
    <PermissionsPageLayout
      tab="collections"
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
      <PermissionsSidebar {...sidebar} onSelect={navigateToItem} />

      {!permissionEditor && (
        <PermissionEditorEmptyState
          icon="database"
          message={t`Select a database to see it's data permissions`}
        />
      )}

      {permissionEditor && (
        <PermissionEditor
          {...permissionEditor}
          onChange={handlePermissionChange}
        />
      )}
    </PermissionsPageLayout>
  );
}

const mapDispatchToProps = {
  initialize: initializeCollectionPermissions,
  loadPermissions: loadCollectionPermissions,
  navigateToTab: tab => push(`/admin/permissions/${tab}`),
  navigateToItem: ({ id }) => push(`/admin/permissions/collections/${id}`),
  updateCollectionPermission,
  savePermissions: saveCollectionPermissions,
};

const mapStateToProps = (state, props) => {
  return {
    sidebar: getSidebar(state, props),
    permissionEditor: getPermissionEditor(state, props),
    isDirty: getIsDirty(state, props),
    diff: getDiff(state, props),
    collection: getCollection(state, props),
  };
};

export default _.compose(
  Collections.loadList({
    query: () => ({ tree: true }),
  }),
  Groups.loadList(),
  connect(
    mapStateToProps,
    mapDispatchToProps,
  ),
)(CollectionsPermissionsPage);
