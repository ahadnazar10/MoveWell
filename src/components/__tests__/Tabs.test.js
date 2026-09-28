import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabList, Tab, TabPanel } from "../Tabs.js";

function Example() {
  // Panels deliberately before the tab list and out of order: matching is by value.
  return (
    <Tabs defaultValue="a">
      <TabPanel value="c">Panel C</TabPanel>
      <div>
        <TabList label="Example">
          <Tab value="a">A</Tab>
          <Tab value="b">B</Tab>
          <Tab value="c">C</Tab>
        </TabList>
      </div>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
    </Tabs>
  );
}

describe("Tabs", () => {
  it("links each tab to its panel and shows only the selected one", () => {
    render(<Example />);
    const tabA = screen.getByRole("tab", { name: "A" });
    expect(tabA).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Panel A");
    expect(panel).toHaveAttribute("aria-labelledby", tabA.id);
    expect(tabA).toHaveAttribute("aria-controls", panel.id);
  });

  it("keeps only the selected tab in the Tab order", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("tab", { name: "A" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves with the arrow keys, wrapping at both ends", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("tab", { name: "A" }).focus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "B" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel B");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "A" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "C" })).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel C");
  });

  it("jumps to the first and last tab with Home and End", async () => {
    const user = userEvent.setup();
    render(<Example />);
    screen.getByRole("tab", { name: "A" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("selects on click", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("tab", { name: "C" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel C");
  });
});
