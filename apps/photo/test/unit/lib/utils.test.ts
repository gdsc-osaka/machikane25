import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn utility", () => {
	it("merges conditional class names using tailwind merge rules", () => {
		const result = cn("p-4", "text-center", ["p-6", { hidden: false }], {
			"items-center": true,
		});

		expect(result).toBe("text-center p-6 items-center");
	});
});
