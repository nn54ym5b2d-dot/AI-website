import { Flask } from "@phosphor-icons/react/ssr";

export function DemoNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="demo-label" role="note">
      <Flask aria-hidden="true" size={14} weight="bold" />
      <span>{children ?? "演示数据，不代表真实上架或交易记录"}</span>
    </div>
  );
}
