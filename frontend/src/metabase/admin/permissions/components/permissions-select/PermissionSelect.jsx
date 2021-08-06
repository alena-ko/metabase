import React, { useState } from "react";
import PropTypes from "prop-types";

import PopoverWithTrigger from "metabase/components/PopoverWithTrigger";
import colors from "metabase/lib/colors";
import Icon from "metabase/components/Icon";
import Toggle from "metabase/components/Toggle";
import { PermissionSelectOption } from "./PermissionSelectOption";

import {
  PermissionSelectRoot,
  OptionsList,
  OptionsListItem,
  ToggleContainer,
  ToggleLabel,
} from "./PermissionSelect.styled";
import Tooltip from "metabase/components/Tooltip";

const propTypes = {
  options: PropTypes.arrayOf(PropTypes.object).isRequired,
  value: PropTypes.string.isRequired,
  toggleLabel: PropTypes.string,
  colorScheme: PropTypes.oneOf(["default", "admin"]),
  onChange: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool,
  disabledTooltip: PropTypes.string,
};

export function PermissionSelect({
  options,
  value,
  toggleLabel,
  colorScheme,
  onChange,
  isDisabled,
  disabledTooltip,
}) {
  const [toggleState, setToggleState] = useState(false);
  const selected = options.find(option => option.value === value);
  const selectableOptions = options
    .filter(option => option !== selected)
    .filter(option => option.canSelect);

  const shouldShowDisabledTooltip = isDisabled;
  const selectedValue = (
    <Tooltip tooltip={disabledTooltip} isEnabled={shouldShowDisabledTooltip}>
      <PermissionSelectRoot isDisabled={isDisabled}>
        <PermissionSelectOption {...selected} />
        <Icon name="chevrondown" size={12} color={colors["text-light"]} />
      </PermissionSelectRoot>
    </Tooltip>
  );

  return (
    <PopoverWithTrigger
      disabled={isDisabled}
      triggerElement={selectedValue}
      targetOffsetX={16}
      targetOffsetY={8}
    >
      {({ onClose }) => (
        <React.Fragment>
          <OptionsList role="listbox">
            {selectableOptions.map(option => (
              <OptionsListItem
                role="option"
                key={option.value}
                colorScheme={colorScheme}
                onClick={() => {
                  onClose();
                  onChange(option.value, toggleLabel ? toggleState : null);
                }}
              >
                <PermissionSelectOption {...option} />
              </OptionsListItem>
            ))}
          </OptionsList>
          {toggleLabel && (
            <ToggleContainer>
              <ToggleLabel>{toggleLabel}</ToggleLabel>
              <Toggle small value={toggleState} onChange={setToggleState} />
            </ToggleContainer>
          )}
        </React.Fragment>
      )}
    </PopoverWithTrigger>
  );
}

PermissionSelect.propTypes = propTypes;
