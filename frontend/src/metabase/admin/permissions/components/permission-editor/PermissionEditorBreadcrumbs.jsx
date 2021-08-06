import React from "react";
import PropTypes from "prop-types";

import Icon from "metabase/components/Icon";

import {
  BreadcrumbsLink,
  BreadcrumbsSeparator,
} from "./PermissionEditorBreadcrumbs.styled";

const propTypes = {
  items: PropTypes.array,
  onBreadcrumbsItemSelect: PropTypes.func,
};

export const PermissionEditorBreadcrubms = ({
  items,
  onBreadcrumbsItemSelect,
}) => {
  return (
    <React.Fragment>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {isLast ? (
              item.text
            ) : (
              <React.Fragment>
                <BreadcrumbsLink onClick={() => onBreadcrumbsItemSelect(item)}>
                  {item.text}
                </BreadcrumbsLink>
                <BreadcrumbsSeparator>
                  <Icon name="chevronright" />
                </BreadcrumbsSeparator>
              </React.Fragment>
            )}
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
};

PermissionEditorBreadcrubms.propTypes = propTypes;
