import { t } from "ttag";
import { color } from "metabase/lib/colors";

export const COLLECTION_OPTIONS = {
  write: {
    label: t`Curate`,
    value: "write",
    icon: "check",
    iconColor: color("success"),
    canSelect: true,
  },
  read: {
    label: t`View`,
    value: "read",
    icon: "eye",
    iconColor: color("warning"),
    canSelect: true,
  },
  none: {
    label: t`No access`,
    value: "none",
    icon: "close",
    iconColor: color("danger"),
    canSelect: true,
  },
};
