import React from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppBrand, JAJANANKU_MAIN_LOGO_URL, JajanankuLogoMark } from "./AppBrand";

describe("AppBrand", () => {
  it("menampilkan logo utama Jajananku pada mark aplikasi", () => {
    const { container } = render(<JajanankuLogoMark />);
    const image = container.querySelector("img[data-brand-mark='jajananku']");

    expect(image?.getAttribute("src")).toBe(JAJANANKU_MAIN_LOGO_URL);
  });

  it("menampilkan mark dan nama aplikasi pada mode lengkap", () => {
    const { getByText, container } = render(<AppBrand />);

    expect(getByText("Jajananku")).toBeTruthy();
    expect(container.querySelector("img[data-brand-mark='jajananku']")).toBeTruthy();
  });
});
