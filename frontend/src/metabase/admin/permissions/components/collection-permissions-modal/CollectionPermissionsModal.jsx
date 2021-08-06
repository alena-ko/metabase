/* eslint-disable react/prop-types */
import React, { useEffect, useCallback } from "react";
import { connect } from "react-redux";
import { t } from "ttag";
import _ from "underscore";

import * as Urls from "metabase/lib/urls";

import Collections from "metabase/entities/collections";
import SnippetCollections from "metabase/entities/snippet-collections";

import { isPersonalCollectionChild } from "metabase/collections/utils";

import ModalContent from "metabase/components/ModalContent";
import Button from "metabase/components/Button";
import Link from "metabase/components/Link";

import { PermissionsTable } from "../permissions-table";
import Groups from "metabase/entities/groups";
import { getPermissionTable } from "../../selectors/collection-permissions-modal";
import { getDiff, getIsDirty } from "../../selectors/collection-permissions";
import {
  initializeCollectionPermissions,
  updateCollectionPermission,
  saveCollectionPermissions,
} from "../../permissions";

const getDefaultTitle = namespace =>
  namespace === "snippets"
    ? t`Permissions for this folder`
    : t`Permissions for this collection`;

const CollectionPermissionsModal = ({
  permissionTable,
  isDirty,
  onClose,
  namespace,
  collection,
  collectionsList,

  initialize,
  updateCollectionPermission,
  saveCollectionPermissions,
}) => {
  useEffect(() => {
    initialize(namespace);
  }, [initialize, namespace]);

  useEffect(() => {
    const isPersonalCollectionLoaded =
      collection &&
      Array.isArray(collectionsList) &&
      (collection.personal_owner_id ||
        isPersonalCollectionChild(collection, collectionsList));

    if (isPersonalCollectionLoaded) {
      onClose();
    }
  });

  const handleSave = async () => {
    await saveCollectionPermissions(namespace);
    onClose();
  };

  const modalTitle = collection?.name
    ? t`Permissions for ${collection.name}`
    : getDefaultTitle(namespace);

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
    <ModalContent
      title={modalTitle}
      onClose={onClose}
      footer={[
        ...(namespace === "snippets"
          ? []
          : [
              <Link
                key="all-permissions"
                className="link"
                to="/admin/permissions/collections"
              >
                {t`See all collection permissions`}
              </Link>,
            ]),
        <Button key="cancel" onClick={onClose}>{t`Cancel`}</Button>,
        <Button key="save" primary disabled={!isDirty} onClick={handleSave}>
          {t`Save`}
        </Button>,
      ]}
    >
      <div className="relative" style={{ height: "50vh" }}>
        {permissionTable && (
          <PermissionsTable
            entities={permissionTable.entities}
            columns={permissionTable.columns}
            onChange={handlePermissionChange}
          />
        )}
      </div>
    </ModalContent>
  );
};

const getCollectionEntity = props =>
  props.namespace === "snippets" ? SnippetCollections : Collections;

const mapStateToProps = (state, props) => {
  const collectionId = Urls.extractCollectionId(props.params.slug);
  return {
    permissionTable: getPermissionTable(state, props),
    collection: getCollectionEntity(props).selectors.getObject(state, {
      entityId: collectionId,
    }),
    diff: getDiff(state, props),
    isDirty: getIsDirty(state, props),
  };
};

const mapDispatchToProps = {
  initialize: initializeCollectionPermissions,
  updateCollectionPermission,
  saveCollectionPermissions,
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
)(CollectionPermissionsModal);
