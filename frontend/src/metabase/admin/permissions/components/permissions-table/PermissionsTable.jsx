import React, { useState } from "react";
import PropTypes from "prop-types";

import Label from "metabase/components/type/Label";
import Icon from "metabase/components/Icon";
import Tooltip from "metabase/components/Tooltip";
import Modal from "metabase/components/Modal";
import ConfirmContent from "metabase/components/ConfirmContent";

import { PermissionSelect } from "../permissions-select";
import {
  PermissionsTableRoot,
  PermissionsTableRow,
  PermissionsTableCell,
  EntityNameCell,
  EntityNameLink,
  EntityName,
} from "./PermissionsTable.styled";

const propTypes = {
  entities: PropTypes.arrayOf(PropTypes.object),
  columns: PropTypes.arrayOf(PropTypes.string),
  emptyState: PropTypes.node,
  onSelect: PropTypes.func,
  onChange: PropTypes.func,
  colorScheme: PropTypes.oneOf(["default", "admin"]),
  horizontalPadding: PropTypes.oneOf(["sm", "lg"]),
};

export function PermissionsTable({
  entities,
  columns,
  onSelect,
  onChange,
  horizontalPadding = "sm",
  colorScheme,
  emptyState = null,
}) {
  const [confirmations, setConfirmations] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const hasItems = entities.length > 0;

  const handleChange = (value, toggleState, entity, permission) => {
    const confirmAction = () => {
      onChange(entity, permission, value, toggleState);
    };
    const confirmations = [];
    if (confirmations.length > 0) {
      setConfirmations(confirmations);
      setConfirmAction(confirmAction);
    } else {
      confirmAction();
    }
  };

  return (
    <React.Fragment>
      <PermissionsTableRoot>
        <thead>
          <tr>
            {columns.map((column, index) => {
              const isFirst = index === 0;
              const isLast = index === columns.length - 1;

              const width = isFirst ? "340px" : isLast ? null : "200px";

              return (
                <PermissionsTableCell
                  key={column}
                  style={{ width }}
                  horizontalPadding={horizontalPadding}
                >
                  <Label>{column}</Label>
                </PermissionsTableCell>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {entities.map(entity => {
            return (
              <PermissionsTableRow key={entity.id}>
                <EntityNameCell horizontalPadding={horizontalPadding}>
                  {onSelect ? (
                    <EntityNameLink
                      onClick={() => onSelect && onSelect(entity)}
                    >
                      {entity.name}
                    </EntityNameLink>
                  ) : (
                    <EntityName>{entity.name}</EntityName>
                  )}

                  {entity.hint && (
                    <Tooltip tooltip="text">
                      <Icon
                        style={{ marginLeft: "0.25rem", cursor: "pointer" }}
                        name="question"
                      />
                    </Tooltip>
                  )}
                </EntityNameCell>

                {entity.permissions.map(permission => {
                  return (
                    <PermissionsTableCell
                      key={permission.name}
                      horizontalPadding={horizontalPadding}
                    >
                      <PermissionSelect
                        {...permission}
                        onChange={(value, toggleState) =>
                          handleChange(value, toggleState, entity, permission)
                        }
                        colorScheme={colorScheme}
                      />
                    </PermissionsTableCell>
                  );
                })}
              </PermissionsTableRow>
            );
          })}
        </tbody>
      </PermissionsTableRoot>
      {!hasItems && emptyState}
      {confirmations && confirmations.length > 0 && (
        <Modal>
          <ConfirmContent
            {...confirmations[0]}
            onAction={() => {
              // if it's the last one call confirmAction, otherwise remove the confirmation that was just confirmed
              if (confirmations.length === 1) {
                confirmAction();
                setConfirmations(null);
                setConfirmAction(null);
              } else {
                setConfirmations(prev => prev.slice(1));
              }
            }}
            onCancel={() => {
              setConfirmations(null);
              setConfirmAction(null);
            }}
          />
        </Modal>
      )}
    </React.Fragment>
  );
}

PermissionsTable.propTypes = propTypes;
