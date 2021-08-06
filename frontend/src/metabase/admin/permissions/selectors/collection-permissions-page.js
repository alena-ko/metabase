import { createSelector } from "reselect";
import { t } from "ttag";
import { getIn } from "icepick";

import Collections, { ROOT_COLLECTION } from "metabase/entities/collections";
import { nonPersonalOrArchivedCollection } from "metabase/collections/utils";
import Group from "metabase/entities/groups";

import { COLLECTION_OPTIONS } from "../constants/collections-permissions";
import { isAdminGroup } from "metabase/lib/groups";

export const getCurrentCollectionId = (_state, props) =>
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

const findCollection = (collections, collectionId) => {
  if (collections.length === 0) {
    return null;
  }

  const collection = collections.find(
    collection => collection.id === collectionId,
  );

  if (collection) {
    return collection;
  }

  return findCollection(
    collections.map(collection => collection.children).flat(),
    collectionId,
  );
};

export const getCollection = (state, props) => {
  const collectionId = getCurrentCollectionId(state, props);
  const collections = Collections.selectors.getList(state, {
    entityQuery: { tree: true },
  });

  if (collectionId === ROOT_COLLECTION.id) {
    return {
      ...ROOT_COLLECTION,
      children: collections,
    };
  }

  return findCollection(collections, collectionId);
};

const getCollectionPermission = (permissions, groupId, collectionId) =>
  getIn(permissions, [groupId, collectionId]);

export const getPermissionEditor = createSelector(
  getCollectionsPermissions,
  getCollection,
  Group.selectors.getList,
  (permissions, collection, groups) => {
    if (!permissions || collection == null) {
      return null;
    }

    const hasChildren = collection.children?.length > 0;
    const toggleLabel = hasChildren ? t`Also change sub-collections` : null;

    const entities = groups.map(group => {
      const isAdmin = isAdminGroup(group);
      return {
        id: group.id,
        name: group.name,
        permissions: [
          {
            collection,
            toggleLabel,
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
