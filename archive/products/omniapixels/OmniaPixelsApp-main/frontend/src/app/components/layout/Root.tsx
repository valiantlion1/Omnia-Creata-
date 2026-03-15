import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

const NAV_ROUTES = ["/home", "/gallery", "/queue", "/settings"];

export function Root() {
  const location = useLocation();
  const showNav = NAV_ROUTES.includes(location.pathname);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-background text-foreground"
      style={{
        backgroundImage: "radial-gradient(ellipse at center top, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, var(--color-background) 60%)",
      }}
    >
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #C9A84C 0%, transparent 70%)" }}
        />
      </div>

      {/* Main Content Area - Mobile Focus */}
      <div className="relative w-full max-w-md h-screen sm:h-[844px] sm:max-h-screen bg-card sm:rounded-[32px] sm:border sm:border-border shadow-2xl overflow-hidden flex flex-col">
        {/* Screen content */}
        <div
          className="flex-1 flex flex-col overflow-hidden relative"
          style={{ paddingBottom: showNav ? "80px" : "0" }}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden omnia-scroll relative z-10" style={{ scrollBehavior: "smooth" }}>
            <Outlet />
          </div>
        </div>

        {/* Bottom navigation */}
        {showNav && <BottomNav />}
      </div>
    </div>
  );
}
