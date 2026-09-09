// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

afterEach(cleanup);
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
import type { UploadedFileMetadata } from "@/lib/supabase/storage";

const imageFile: UploadedFileMetadata = {
  name: "license.jpg",
  path: "u1/license.jpg",
  publicUrl: "https://example.com/license.jpg",
  size: 1000,
  type: "image/jpeg",
  uploadedAt: "2026-01-01T00:00:00.000Z",
};

function btn(name: RegExp) {
  return screen.getByRole("button", { name }) as HTMLButtonElement;
}

describe("DocumentPreviewCard", () => {
  it("renders enabled Approve/Reject buttons and fires the handlers", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(
      <DocumentPreviewCard
        label="Medical Council"
        file={imageFile}
        status="pending"
        readOnly={false}
        onApprove={onApprove}
        onReject={onReject}
        onView={vi.fn()}
      />
    );

    expect(btn(/approve/i).disabled).toBe(false);
    expect(btn(/reject/i).disabled).toBe(false);

    fireEvent.click(btn(/approve/i));
    fireEvent.click(btn(/reject/i));
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it("shows the image preview for an image with a real URL", () => {
    render(
      <DocumentPreviewCard
        label="ID"
        file={imageFile}
        status="pending"
        readOnly={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(screen.getByRole("img", { name: "ID" }).getAttribute("src")).toBe(
      "https://example.com/license.jpg"
    );
  });

  it("flags a blob: URL as not viewable instead of a blank frame", () => {
    render(
      <DocumentPreviewCard
        label="Degree"
        file={{ ...imageFile, publicUrl: "blob:http://localhost:3000/abc" }}
        status="pending"
        readOnly={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(screen.getByText(/can't be opened here/i)).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("reflects an approved decision and disables Approve", () => {
    render(
      <DocumentPreviewCard
        label="ID"
        file={{ ...imageFile, status: "approved" }}
        status="approved"
        reviewedAt="2026-02-02T00:00:00.000Z"
        readOnly={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(btn(/approve/i).disabled).toBe(true);
  });

  it("locks both buttons when the registration is already decided (readOnly)", () => {
    render(
      <DocumentPreviewCard
        label="ID"
        file={imageFile}
        status="pending"
        readOnly
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(btn(/approve/i).disabled).toBe(true);
    expect(btn(/reject/i).disabled).toBe(true);
  });

  it("shows 'Not viewed' until viewedAt is set, then shows 'Viewed'", () => {
    const { rerender } = render(
      <DocumentPreviewCard
        label="ID"
        file={imageFile}
        status="pending"
        readOnly={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(screen.getByText("Not viewed")).toBeTruthy();

    rerender(
      <DocumentPreviewCard
        label="ID"
        file={imageFile}
        status="pending"
        viewedAt="2026-02-02T00:00:00.000Z"
        readOnly={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onView={vi.fn()}
      />
    );
    expect(screen.getByText("Viewed")).toBeTruthy();
  });

  it("opens the full-screen viewer and fires onView, with Approve/Reject present there too", () => {
    const onView = vi.fn();
    const onApprove = vi.fn();
    render(
      <DocumentPreviewCard
        label="ID"
        file={imageFile}
        status="pending"
        readOnly={false}
        onApprove={onApprove}
        onReject={vi.fn()}
        onView={onView}
      />
    );

    fireEvent.click(btn(/full screen/i));
    expect(onView).toHaveBeenCalledTimes(1);

    // Two Approve buttons now: the inline footer and the full-screen viewer.
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    expect(approveButtons.length).toBe(2);
    fireEvent.click(approveButtons[approveButtons.length - 1]);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });
});
