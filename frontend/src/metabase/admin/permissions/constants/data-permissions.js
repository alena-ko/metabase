import { t } from "ttag";
import { color } from "metabase/lib/colors";

export const DATA_PERMISSION_OPTIONS = {
  all: {
    label: t`Allowed`,
    value: "all",
    icon: "check",
    iconColor: color("success"),
    canSelect: true,
  },
  controlled: {
    label: t`Limited`,
    value: "controlled",
    icon: "permissions_limited",
    iconColor: color("warning"),
    canSelect: false,
  },
  sandboxed: {
    // TODO: move to plugins
    label: t`Sandboxed`,
    value: "controlled",
    icon: "permissions_limited",
    iconColor: color("brand"),
    canSelect: true,
  },
  none: {
    label: t`No access`,
    value: "none",
    icon: "close",
    iconColor: color("danger"),
    canSelect: true,
  },
  write: {
    label: t`Allowed`,
    value: "write",
    icon: "check",
    iconColor: color("success"),
    canSelect: true,
  },
};
