import { describe, expect, it } from "vitest";
import { type PhotoCopy, photoCopyEn } from "@/libs/i18n/photo.en";
import { photoCopyJa } from "@/libs/i18n/photo.ja";

describe("Photo i18n", () => {
	describe("photoCopyEn", () => {
		it("should have correct structure", () => {
			expect(photoCopyEn).toBeDefined();
			expect(photoCopyEn.kiosk).toBeDefined();
			expect(photoCopyEn.kiosk.title).toBe("AI Photo Booth");
			expect(photoCopyEn.kiosk.description).toBeDefined();
		});

		it("should have actions defined", () => {
			expect(photoCopyEn.kiosk.actions).toBeDefined();
			expect(photoCopyEn.kiosk.actions.back).toBe("Back");
			expect(photoCopyEn.kiosk.actions.next).toBe("Next");
		});

		it("should have all statuses defined", () => {
			expect(photoCopyEn.kiosk.statuses).toBeDefined();
			expect(photoCopyEn.kiosk.statuses.capturing).toBe("Capturing");
			expect(photoCopyEn.kiosk.statuses["selecting-theme"]).toBe(
				"Selecting Theme",
			);
			expect(photoCopyEn.kiosk.statuses.generating).toBe("Generating");
			expect(photoCopyEn.kiosk.statuses.completed).toBe("Completed");
			expect(photoCopyEn.kiosk.statuses.failed).toBe("Failed");
			expect(photoCopyEn.kiosk.statuses.expired).toBe("Expired");
		});
	});

	describe("photoCopyJa", () => {
		it("should have correct structure", () => {
			expect(photoCopyJa).toBeDefined();
			expect(photoCopyJa.kiosk).toBeDefined();
			expect(photoCopyJa.kiosk.title).toBe("AIフォトブース");
			expect(photoCopyJa.kiosk.description).toBeDefined();
		});

		it("should have actions defined", () => {
			expect(photoCopyJa.kiosk.actions).toBeDefined();
			expect(photoCopyJa.kiosk.actions.back).toBe("戻る");
			expect(photoCopyJa.kiosk.actions.next).toBe("次へ");
		});

		it("should have all statuses defined", () => {
			expect(photoCopyJa.kiosk.statuses).toBeDefined();
			expect(photoCopyJa.kiosk.statuses.capturing).toBe("撮影中");
			expect(photoCopyJa.kiosk.statuses["selecting-theme"]).toBe(
				"テーマ選択中",
			);
			expect(photoCopyJa.kiosk.statuses.generating).toBe("生成中");
			expect(photoCopyJa.kiosk.statuses.completed).toBe("完了");
			expect(photoCopyJa.kiosk.statuses.failed).toBe("失敗");
			expect(photoCopyJa.kiosk.statuses.expired).toBe("期限切れ");
		});
	});

	describe("type consistency", () => {
		it("should have the same keys in both English and Japanese", () => {
			// Helper function to get all nested keys
			const getKeys = (obj: Record<string, unknown>, prefix = ""): string[] => {
				return Object.keys(obj).flatMap((key) => {
					const fullKey = prefix ? `${prefix}.${key}` : key;
					const value = obj[key];
					if (
						typeof value === "object" &&
						value !== null &&
						!Array.isArray(value)
					) {
						return getKeys(value as Record<string, unknown>, fullKey);
					}
					return [fullKey];
				});
			};

			const enKeys = getKeys(photoCopyEn as Record<string, unknown>).sort();
			const jaKeys = getKeys(photoCopyJa as Record<string, unknown>).sort();

			expect(enKeys).toEqual(jaKeys);
		});

		it("should satisfy PhotoCopy type", () => {
			// Type assertion to ensure both objects satisfy the PhotoCopy type
			const enCopy: PhotoCopy = photoCopyEn;
			const jaCopy: PhotoCopy = photoCopyJa;

			expect(enCopy).toBeDefined();
			expect(jaCopy).toBeDefined();
		});

		it("should have same status keys in both languages", () => {
			const enStatusKeys = Object.keys(photoCopyEn.kiosk.statuses).sort();
			const jaStatusKeys = Object.keys(photoCopyJa.kiosk.statuses).sort();

			expect(enStatusKeys).toEqual(jaStatusKeys);
		});

		it("should have same action keys in both languages", () => {
			const enActionKeys = Object.keys(photoCopyEn.kiosk.actions).sort();
			const jaActionKeys = Object.keys(photoCopyJa.kiosk.actions).sort();

			expect(enActionKeys).toEqual(jaActionKeys);
		});
	});
});
