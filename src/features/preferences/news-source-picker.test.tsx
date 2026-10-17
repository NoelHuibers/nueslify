import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { NewsSourcePicker } from "./news-source-picker.tsx";

describe("NewsSourcePicker", () => {
  it("groups outlets and shows ownership, leaning and the rating source", () => {
    render(<NewsSourcePicker onChange={vi.fn()} regionChosen={false} value={["tagesschau"]} />);

    const germany = screen.getByRole("group", { name: "Germany" });
    const international = screen.getByRole("group", { name: "International" });
    expect(within(germany).getByRole("checkbox", { name: "tagesschau" })).toBeChecked();
    expect(within(international).getByRole("checkbox", { name: "BBC News" })).not.toBeChecked();

    const tagesschau = within(germany).getByRole("checkbox", { name: "tagesschau" }).parentElement;
    expect(tagesschau).toHaveTextContent("Öffentlich-rechtlich");
    expect(tagesschau).toHaveTextContent("Political leaning: Centre");
    expect(
      screen.getByRole("link", { name: "taz: rating on Media Bias/Fact Check" }),
    ).toHaveAttribute("href", "https://mediabiasfactcheck.com/die-tageszeitung/");
    expect(screen.getByText(/1 outlet · your mix leans centre/)).toBeInTheDocument();
  });

  it("adds and removes outlets in catalogue order", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <NewsSourcePicker onChange={onChange} regionChosen={false} value={["bbc"]} />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "taz" }));
    expect(onChange).toHaveBeenLastCalledWith(["taz", "bbc"]);

    rerender(<NewsSourcePicker onChange={onChange} regionChosen={false} value={["taz", "bbc"]} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "BBC News" }));
    expect(onChange).toHaveBeenLastCalledWith(["taz"]);
  });

  it("applies presets", async () => {
    const onChange = vi.fn();
    render(<NewsSourcePicker onChange={onChange} regionChosen={false} value={["tagesschau"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Public broadcasters" }));
    expect(onChange).toHaveBeenCalledWith(["tagesschau", "zdf", "dlf", "bbc"]);
  });

  it("explains that regional news needs tagesschau", () => {
    render(<NewsSourcePicker onChange={vi.fn()} regionChosen={true} value={["bbc"]} />);
    expect(screen.getByText(/pick it to keep regional stories/)).toBeInTheDocument();
  });
});
