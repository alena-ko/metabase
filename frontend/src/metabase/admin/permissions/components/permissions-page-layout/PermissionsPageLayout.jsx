/* eslint-disable react/prop-types */
import React from "react";
import { Flex } from "grid-styled";
import { PermissionsTabs } from "./PermissionsTabs";
import fitViewport from "metabase/hoc/FitViewPort";

export const PermissionsPageLayout = fitViewport(
  ({ children, tab, onChangeTab, confirmBar }) => {
    return (
      <Flex flexDirection="column" style={{ height: "100%" }}>
        {confirmBar}
        <div className="border-bottom">
          <PermissionsTabs tab={tab} onChangeTab={onChangeTab} />
        </div>
        <Flex style={{ height: "100%" }}>{children}</Flex>
      </Flex>
    );
  },
);
