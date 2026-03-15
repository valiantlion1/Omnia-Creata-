import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Root } from "./Root";
import { MemoryRouter } from "react-router-dom";

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: vi.fn(),
    Outlet: () => <div data-testid="outlet" />,
  };
});

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock BottomNav to avoid rendering its internals
vi.mock("./BottomNav", () => ({
  BottomNav: () => <div data-testid="bottom-nav" />,
}));

import { useLocation } from "react-router-dom";

describe("Root", () => {
  it("renders the layout and outlet", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/any-route" } as any);

    render(
      <MemoryRouter>
        <Root />
      </MemoryRouter>
    );

    expect(screen.getByTestId("outlet")).toBeInTheDocument();
  });

  it("shows BottomNav on valid nav routes", () => {
    const navRoutes = ["/home", "/gallery", "/queue", "/settings"];

    navRoutes.forEach((route) => {
      vi.mocked(useLocation).mockReturnValue({ pathname: route } as any);

      const { unmount } = render(
        <MemoryRouter>
          <Root />
        </MemoryRouter>
      );

      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
      unmount();
    });
  });

  it("hides BottomNav on non-nav routes", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/other" } as any);

    render(
      <MemoryRouter>
        <Root />
      </MemoryRouter>
    );

    expect(screen.queryByTestId("bottom-nav")).not.toBeInTheDocument();
  });

  it("applies correct padding when BottomNav is shown", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/home" } as any);

    const { container } = render(
      <MemoryRouter>
        <Root />
      </MemoryRouter>
    );

    // Find the content area that has the conditional padding
    // It's the div wrapping the outlet container
    const contentArea = container.querySelector('div[style*="padding-bottom"]');
    expect(contentArea).toHaveStyle({ paddingBottom: "80px" });
  });

  it("applies no bottom padding when BottomNav is hidden", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/other" } as any);

    const { container } = render(
      <MemoryRouter>
        <Root />
      </MemoryRouter>
    );

    const contentArea = container.querySelector('div[style*="padding-bottom"]');
    expect(contentArea).toHaveStyle({ paddingBottom: "0" });
  });
});
