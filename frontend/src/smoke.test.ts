import { describe, expect, it } from "vitest";
import { api } from "./lib/api";

describe("smoke", () => {
  it("api client should be defined", () => {
    expect(api).toBeTruthy();
  });
});




