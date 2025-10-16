import { expect, test } from "vitest";
import Home from "../page";

test("Home component is defined", () => {
	expect(typeof Home).toBe("function");
});
