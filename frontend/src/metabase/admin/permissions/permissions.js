import {
  createAction,
  createThunkAction,
  handleActions,
  combineReducers,
} from "metabase/lib/redux";
import { CollectionsApi, PermissionsApi } from "metabase/services";
import Group from "metabase/entities/groups";
import MetabaseAnalytics from "metabase/lib/analytics";
import {
  inferAndUpdateEntityPermissions,
  updateFieldsPermission,
  updateNativePermission,
  updateSchemasPermission,
  updateTablesPermission,
} from "metabase/lib/permissions";
import { getMetadata } from "metabase/selectors/metadata";
import { assocIn } from "icepick";

const INITIALIZE_DATA_PERMISSIONS =
  "metabase/admin/permissions/INITIALIZE_DATA_PERMISSIONS";
export const initializeDataPermissions = createThunkAction(
  INITIALIZE_DATA_PERMISSIONS,
  () => async dispatch => {
    await Promise.all([
      dispatch(loadDataPermissions()),
      dispatch(Group.actions.fetchList()),
    ]);
  },
);

const REFRESH_DATA_PERMISSIONS =
  "metabase/admin/permissions/REFRESH_DATA_PERMISSIONS";
export const refreshDataPermissions = createThunkAction(
  REFRESH_DATA_PERMISSIONS,
  () => async () => {
    return PermissionsApi.graph();
  },
);

const LOAD_DATA_PERMISSIONS =
  "metabase/admin/permissions/LOAD_DATA_PERMISSIONS";
export const loadDataPermissions = createThunkAction(
  LOAD_DATA_PERMISSIONS,
  () => async (dispatch, getState) => {
    if (!getState().admin.dataPermissions) {
      await dispatch(refreshDataPermissions());
    }
  },
);

const INITIALIZE_COLLECTION_PERMISSIONS =
  "metabase/admin/permissions/INITIALIZE_COLLECTION_PERMISSIONS";
export const initializeCollectionPermissions = createThunkAction(
  INITIALIZE_COLLECTION_PERMISSIONS,
  namespace => async dispatch => {
    await Promise.all([
      dispatch(loadCollectionPermissions(namespace)),
      dispatch(Group.actions.fetchList()),
    ]);
  },
);

const REFRESH_COLLECTION_PERMISSIONS =
  "metabase/admin/permissions/REFRESH_COLLECTION_PERMISSIONS";
export const refreshCollectionPermissions = createThunkAction(
  REFRESH_COLLECTION_PERMISSIONS,
  namespace => async () => {
    return CollectionsApi.graph({ namespace });
  },
);

const LOAD_COLLECTION_PERMISSIONS =
  "metabase/admin/permissions/LOAD_COLLECTION_PERMISSIONS";
export const loadCollectionPermissions = createThunkAction(
  LOAD_COLLECTION_PERMISSIONS,
  namespace => async (dispatch, getState) => {
    if (!getState().admin.collectionPermissions) {
      await dispatch(refreshCollectionPermissions(namespace));
    }
  },
);

const UPDATE_DATA_PERMISSION =
  "metabase/admin/permissions/UPDATE_DATA_PERMISSION";
export const updateDataPermission = createThunkAction(
  UPDATE_DATA_PERMISSION,
  ({ groupId, permission, value, entityId }) => {
    return (_dispatch, getState) => {
      const metadata = getMetadata(getState());
      return { groupId, permission, value, metadata, entityId };
    };
  },
);

const SAVE_DATA_PERMISSIONS =
  "metabase/admin/permissions/data/SAVE_DATA_PERMISSIONS";
export const saveDataPermissions = createThunkAction(
  SAVE_DATA_PERMISSIONS,
  () => async (_dispatch, getState) => {
    MetabaseAnalytics.trackEvent("Permissions", "save");
    const {
      dataPermissions,
      dataPermissionsRevision,
    } = getState().admin.permissions;
    const result = await PermissionsApi.updateGraph({
      groups: dataPermissions,
      revision: dataPermissionsRevision,
    });

    return result;
  },
);

const RESET_DATA_PERMISSIONS =
  "metabase/admin/permissions/RESET_DATA_PERMISSIONS";
export const resetDataPermissions = createAction(RESET_DATA_PERMISSIONS);

const UPDATE_COLLECTION_PERMISSION =
  "metabase/admin/permissions/UPDATE_COLLECTION_PERMISSION";
export const updateCollectionPermission = createAction(
  UPDATE_COLLECTION_PERMISSION,
);

const SAVE_COLLECTION_PERMISSIONS =
  "metabase/admin/permissions/data/SAVE_COLLECTION_PERMISSIONS";
export const saveCollectionPermissions = createThunkAction(
  SAVE_COLLECTION_PERMISSIONS,
  namespace => async (_dispatch, getState) => {
    MetabaseAnalytics.trackEvent("Permissions", "save");
    const {
      collectionPermissions,
      collectionPermissionsRevision,
    } = getState().admin.permissions;
    const result = await CollectionsApi.updateGraph({
      namespace,
      revision: collectionPermissionsRevision,
      groups: collectionPermissions,
    });
    return result;
  },
);

const RESET_COLLECTION_PERMISSIONS =
  "metabase/admin/permissions/RESET_COLLECTION_PERMISSIONS";
export const resetCollectionPermissions = createAction(
  RESET_COLLECTION_PERMISSIONS,
);

function getDecendentCollections(collection) {
  const subCollections = collection.children.filter(
    collection => !collection.is_personal,
  );
  return subCollections.concat(...subCollections.map(getDecendentCollections));
}

const dataPermissions = handleActions(
  {
    [RESET_DATA_PERMISSIONS]: {
      next: (_state, { payload }) => null,
    },
    [REFRESH_DATA_PERMISSIONS]: {
      next: (_state, { payload }) => payload.groups,
    },
    [UPDATE_DATA_PERMISSION]: {
      next: (state, { payload }) => {
        const { value, groupId, entityId, metadata, permission } = payload;

        if (entityId.tableId != null) {
          MetabaseAnalytics.trackEvent("Permissions", "fields", value);
          const updatedPermissions = updateFieldsPermission(
            StaticRange,
            groupId,
            entityId,
            value,
            metadata,
          );
          return inferAndUpdateEntityPermissions(
            updatedPermissions,
            groupId,
            entityId,
            metadata,
          );
        } else if (entityId.schemaName != null) {
          MetabaseAnalytics.trackEvent("Permissions", "tables", value);
          return updateTablesPermission(
            state,
            groupId,
            entityId,
            value,
            metadata,
          );
        } else if (permission.name === "native") {
          MetabaseAnalytics.trackEvent("Permissions", "native", value);
          return updateNativePermission(
            state,
            groupId,
            entityId,
            value,
            metadata,
          );
        } else {
          MetabaseAnalytics.trackEvent("Permissions", "schemas", value);
          return updateSchemasPermission(
            state,
            groupId,
            entityId,
            value,
            metadata,
          );
        }
      },
    },
  },
  null,
);

const originalDataPermissions = handleActions(
  {
    [REFRESH_DATA_PERMISSIONS]: {
      next: (_state, { payload }) => payload.groups,
    },
    [SAVE_DATA_PERMISSIONS]: { next: (state, { payload }) => payload.groups },
  },
  null,
);

const dataPermissionsRevision = handleActions(
  {
    [RESET_DATA_PERMISSIONS]: { next: () => null },
    [REFRESH_DATA_PERMISSIONS]: {
      next: (_state, { payload }) => payload.revision,
    },
    [SAVE_DATA_PERMISSIONS]: {
      next: (_state, { payload }) => payload.revision,
    },
  },
  null,
);

const collectionPermissions = handleActions(
  {
    [RESET_COLLECTION_PERMISSIONS]: {
      next: _state => null,
    },
    [REFRESH_COLLECTION_PERMISSIONS]: {
      next: (_state, { payload }) => payload.groups,
    },
    [UPDATE_COLLECTION_PERMISSION]: {
      next: (state, { payload }) => {
        const { groupId, collection, value, shouldPropagate } = payload;
        let newPermissions = assocIn(state, [groupId, collection.id], value);

        if (shouldPropagate) {
          for (const descendent of getDecendentCollections(collection)) {
            newPermissions = assocIn(
              newPermissions,
              [groupId, descendent.id],
              value,
            );
          }
        }
        return newPermissions;
      },
    },
  },
  null,
);

const originalCollectionPermissions = handleActions(
  {
    [REFRESH_COLLECTION_PERMISSIONS]: {
      next: (_state, { payload }) => payload.groups,
    },
    [SAVE_COLLECTION_PERMISSIONS]: {
      next: (_state, { payload }) => payload.groups,
    },
  },
  null,
);

const collectionPermissionsRevision = handleActions(
  {
    [RESET_COLLECTION_PERMISSIONS]: { next: () => null },
    [REFRESH_COLLECTION_PERMISSIONS]: {
      next: (_state, { payload }) => payload.revision,
    },
    [SAVE_COLLECTION_PERMISSIONS]: {
      next: (_state, { payload }) => payload.revision,
    },
  },
  null,
);

export default combineReducers({
  dataPermissions,
  originalDataPermissions,
  dataPermissionsRevision,
  collectionPermissions,
  originalCollectionPermissions,
  collectionPermissionsRevision,
});
