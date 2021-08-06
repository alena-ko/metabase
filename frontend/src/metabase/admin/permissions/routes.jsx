/* eslint-disable react/prop-types */
import React from "react";
import { Route } from "metabase/hoc/Title";
import { IndexRedirect } from "react-router";
import { t } from "ttag";

import CollectionPermissionsPage from "./pages/CollectionPermissionsPage/CollectionPermissionsPage";
import DatabasesPermissionsPage from "./pages/DatabasePermissionsPage/DatabasesPermissionsPage";
import GroupsPermissionsPage from "./pages/GroupDataPermissionsPage/GroupsPermissionsPage";

import { PLUGIN_ADMIN_PERMISSIONS_TABLE_ROUTES } from "metabase/plugins";

const getRoutes = () => (
  <Route title={t`Permissions`} path="permissions">
    <IndexRedirect to="data" />

    {/* Data permissions */}
    <Route path="data">
      <IndexRedirect to="group" />

      {/* Database focus view */}
      <Route path="database" component={DatabasesPermissionsPage}>
        <Route path=":databaseId" component={DatabasesPermissionsPage}>
          <Route path="schema/:schemaName" component={DatabasesPermissionsPage}>
            <Route path="table/:tableId" component={DatabasesPermissionsPage}>
              {PLUGIN_ADMIN_PERMISSIONS_TABLE_ROUTES}
            </Route>
          </Route>
        </Route>
      </Route>

      {/* Group focus view */}
      <Route path="group" component={GroupsPermissionsPage}>
        <Route path=":groupId" component={GroupsPermissionsPage}>
          <Route path="database/:databaseId" component={GroupsPermissionsPage}>
            <Route path="schema/:schemaName" component={GroupsPermissionsPage}>
              {PLUGIN_ADMIN_PERMISSIONS_TABLE_ROUTES}
            </Route>
          </Route>
        </Route>
      </Route>
    </Route>

    <Route path="collections" component={CollectionPermissionsPage}>
      <Route path=":collectionId" component={CollectionPermissionsPage} />
    </Route>
  </Route>
);

export default getRoutes;
