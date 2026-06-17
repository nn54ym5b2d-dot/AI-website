export type CoreModule = {
  name: string;
  description: string;
};

export type RoleSummary = {
  name: string;
  description: string;
};

export type AssetTypeSummary = {
  name: string;
  rule: string;
};

export type AdminSection = {
  name: string;
  description: string;
  priority: "P0" | "P1" | "P2";
};

export type UserRole =
  | "buyer"
  | "uploader"
  | "super_admin"
  | "operator"
  | "finance"
  | "observer";
