import { describe, it, expect } from "vitest";
import profileReducer, { setGoal, clearGoal, replaceGoal } from "../profileSlice.js";

describe("profileSlice (Fitness Goal Profile)", () => {
  it("starts with no goal", () => {
    expect(profileReducer(undefined, { type: "unknown" })).toEqual({ goal: null });
  });

  it("sets and clears a goal", () => {
    let state = profileReducer(undefined, setGoal("running"));
    expect(state.goal).toBe("running");
    state = profileReducer(state, setGoal("yoga"));
    expect(state.goal).toBe("yoga");
    state = profileReducer(state, clearGoal());
    expect(state.goal).toBeNull();
  });

  it("ignores values that are not a MoveWell goal", () => {
    const state = profileReducer({ goal: "gym" }, setGoal("swimming"));
    expect(state.goal).toBeNull();
    expect(profileReducer({ goal: "gym" }, replaceGoal({ bad: true })).goal).toBeNull();
  });
});
