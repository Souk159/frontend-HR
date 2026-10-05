// Shared frame for signed-in screens (prototype .app-frame > .app-window)
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="app-frame">
      <div className="app-window">{children}</div>
    </div>
  );
}
