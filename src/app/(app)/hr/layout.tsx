import { HRShell } from "./HRShell";

export default function HRLayout({ children }: LayoutProps<"/hr">) {
  return <HRShell>{children}</HRShell>;
}
