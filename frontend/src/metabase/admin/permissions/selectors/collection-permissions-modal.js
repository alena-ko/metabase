import { createSelector } from "reselect";
import { t } from "ttag";
import { getIn } from "icepick";

import * as Urls from "metabase/lib/urls";
import Collections, { ROOT_COLLECTION } from "metabase/entities/collections";
import SnippetCollections from "metabase/entities/snippet-collections";
import { nonPersonalOrArchivedCollection } from "metabase/collections/utils";
import Group from "metabase/entities/groups";

import { COLLECTION_OPTIONS } from "../constants/collections-permissions";
import { isAdminGroup } from "metabase/lib/groups";

const getCurrentCollectionId = (_state, props) =>
  props.params.collectionId === ROOT_COLLECTION.id
    ? ROOT_COLLECTION.id
    : parseInt(props.params.collectionId);

const getCollectionsTree = (state, _props) => {
  const collections =
    Collections.selectors.getList(state, {
      entityQuery: { tree: true },
    }) || [];
  const nonPersonalCollections = collections.filter(
    nonPersonalOrArchivedCollection,
  );

  return [ROOT_COLLECTION, ...nonPersonalCollections];
};

export const getSidebar = createSelector(
  getCollectionsTree,
  getCurrentCollectionId,
  (collectionsTree, collectionId) => {
    return {
      selectedId: collectionId,
      title: t`Collections`,
      entityGroups: [collectionsTree || []],
      filterPlaceholder: t`Search for a collection`,
    };
  },
);

const getCollectionsPermissions = state =>
  state.admin.permissions.collectionPermissions;

const getCollectionEntity = props =>
  props.namespace === "snippets" ? SnippetCollections : Collections;

const getCollection = (state, props) => {
  const collectionId = Urls.extractCollectionId(props.params.slug);
  const collection = getCollectionEntity(props).selectors.getObject(state, {
    entityId: collectionId,
  });

  return collection;
};

const getCollectionPermission = (permissions, groupId, collectionId) =>
  getIn(permissions, [groupId, collectionId]);

export const getPermissionTable = createSelector(
  getCollectionsPermissions,
  getCollection,
  Group.selectors.getList,
  (permissions, collection, groups) => {
    if (!permissions || collection == null) {
      return null;
    }

    const entities = groups.map(group => {
      const isAdmin = isAdminGroup(group);
      return {
        id: group.id,
        name: group.name,
        permissions: [
          {
            isDisabled: isAdmin,
            disabledTooltip: isAdmin
              ? t`Cannot change the data access for Administrators`
              : null,
            value: getCollectionPermission(
              permissions,
              group.id,
              collection.id,
            ),
            options: [
              COLLECTION_OPTIONS.write,
              COLLECTION_OPTIONS.read,
              COLLECTION_OPTIONS.none,
            ],
          },
        ],
      };
    });

    return {
      title: t`Data permissions for ${collection.name}`,
      filterPlaceholder: t`Search for a group`,
      columns: [`Group name`, t`Collection access`],
      entities,
    };
  },
);
