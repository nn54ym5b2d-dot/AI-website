export const LOCAL_TEST_ACCOUNTS = [
  {
    email: "observer@example.test",
    displayName: "本地外部观察员",
    accessLabel: "观察员只读工作台",
    loginPath: "/observer",
    roles: ["observer"]
  },
  {
    email: "admin@example.test",
    displayName: "本地超级管理员",
    accessLabel: "完整管理后台",
    loginPath: "/admin",
    roles: ["admin"],
    adminRole: "super_admin"
  },
  {
    email: "operator@example.test",
    displayName: "本地运营管理员",
    accessLabel: "运营管理后台",
    loginPath: "/admin",
    roles: ["admin"],
    adminRole: "operator"
  },
  {
    email: "finance@example.test",
    displayName: "本地财务管理员",
    accessLabel: "财务管理后台",
    loginPath: "/admin",
    roles: ["admin"],
    adminRole: "finance"
  }
] as const;

export type LocalTestAccount = (typeof LOCAL_TEST_ACCOUNTS)[number];
