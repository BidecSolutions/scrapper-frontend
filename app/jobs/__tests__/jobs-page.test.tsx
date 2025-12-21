import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobsPage from "../page";
import { vi } from "vitest";

const { retryJobMock } = vi.hoisted(() => ({
  retryJobMock: vi.fn().mockResolvedValue({}),
}));

const consoleError = console.error;

beforeAll(() => {
  vi.spyOn(console, "error").mockImplementation((...args: any[]) => {
    const message = typeof args[0] === "string" ? args[0] : "";
    if (message.includes("not wrapped in act")) {
      return;
    }
    consoleError(...args);
  });
});

afterAll(() => {
  (console.error as any).mockRestore?.();
});

vi.mock("@/hooks/useJobsPolling", () => ({
  useJobsPolling: () => ({
    jobs: [
      {
        id: 123,
        niche: "Test niche",
        location: "Test city",
        status: "failed",
        created_at: "2025-01-01T00:00:00Z",
        completed_at: "2025-01-01T00:00:10Z",
        result_count: 0,
        sites_crawled: 0,
        total_targets: 10,
        processed_targets: 5,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    getLlmHealth: vi.fn().mockResolvedValue({
      configured: true,
      provider: null,
      status: "ok",
      message: "ok",
    }),
    retryJob: retryJobMock,
    getJobLogs: vi.fn().mockResolvedValue([
      {
        id: 1,
        created_at: "2025-01-01T00:00:05Z",
        activity_type: "job.status",
        description: "Job failed",
        meta: {},
      },
    ]),
  },
}));

vi.mock("@/components/saved-views/SavedViewsBar", () => ({
  SavedViewsBar: () => <div data-testid="saved-views-bar" />,
}));

vi.mock("@/components/ui/CommandPalette", () => ({
  CommandPalette: () => null,
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

describe("JobsPage drawer + retry", () => {
  it("opens the detail drawer on row click and calls retry", async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    await user.click(screen.getByText((text) => text.includes("Test niche")));

    await waitFor(() => expect(screen.getByText(/Retry from here/)).toBeInTheDocument());
    expect(screen.getByText(/Open job page/)).toBeInTheDocument();

    await user.click(screen.getByText("Retry from here"));

    await waitFor(() => expect(retryJobMock).toHaveBeenCalledWith(123));
  });

  it("clears filters when Reset is clicked", async () => {
    const user = userEvent.setup();
    render(<JobsPage />);

    const searchInput = screen.getByPlaceholderText("Search by niche or location...");
    await user.type(searchInput, "Test");
    expect(searchInput).toHaveValue("Test");

    await user.click(screen.getByText("Reset"));
    expect(searchInput).toHaveValue("");
  });
});
