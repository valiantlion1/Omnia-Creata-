export type NavigationGroup = {
  id: "products" | "platforms" | "company" | "support";
  labelKey: "products" | "platforms" | "company" | "support";
};

export const navigationGroups: NavigationGroup[] = [
  { id: "products", labelKey: "products" },
  { id: "platforms", labelKey: "platforms" },
  { id: "company", labelKey: "company" },
  { id: "support", labelKey: "support" },
];
