import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LANGUAGES } from "#/lib/domain.ts";
import { CategoryPicker, OptionToggle } from "./controls.tsx";

describe("OptionToggle", () => {
  it("marks the current option and reports changes", async () => {
    const onChange = vi.fn();
    render(<OptionToggle labelledBy="lang" onChange={onChange} options={LANGUAGES} value="en" />);

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Deutsch" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    await userEvent.click(screen.getByRole("button", { name: "Deutsch" }));
    expect(onChange).toHaveBeenCalledWith("de");
  });

  it("keeps a value selected when the active option is pressed again", async () => {
    const onChange = vi.fn();
    render(<OptionToggle labelledBy="lang" onChange={onChange} options={LANGUAGES} value="en" />);
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CategoryPicker", () => {
  it("adds categories in canonical order", async () => {
    const onChange = vi.fn();
    render(<CategoryPicker onChange={onChange} value={["wirtschaft"]} />);

    await userEvent.click(screen.getByRole("button", { name: "Germany" }));
    expect(onChange).toHaveBeenCalledWith(["inland", "wirtschaft"]);
  });

  it("removes a selected category", async () => {
    const onChange = vi.fn();
    render(<CategoryPicker onChange={onChange} value={["inland", "sport"]} />);

    expect(screen.getByRole("button", { name: "Sports" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "Sports" }));
    expect(onChange).toHaveBeenCalledWith(["inland"]);
  });
});
