import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import PaymentProofUploader from "./PaymentProofUploader";

vi.mock("lucide-react", () => ({ Camera: () => null, CheckCircle2: () => null, ImagePlus: () => null, Loader2: () => null, Trash2: () => null }));
vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));

describe("unggah bukti QRIS", () => {
  it("menyediakan foto langsung dan pemilih galeri atau berkas", () => {
    render(<PaymentProofUploader value={null} onChange={vi.fn()} />);
    expect(screen.getByText("Foto langsung")).toBeTruthy();
    expect(screen.getByText("Galeri / berkas")).toBeTruthy();
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0]?.getAttribute("capture")).toBe("environment");
    expect(inputs[1]?.getAttribute("capture")).toBeNull();
    fireEvent.change(inputs[0]!, { target: { files: [] } });
  });
});
