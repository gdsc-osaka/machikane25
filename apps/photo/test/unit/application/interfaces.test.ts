import type { Buffer } from "node:buffer";
import { describe, expectTypeOf, it } from "vitest";
import type {
	IAuthService,
	IBoothService,
	IGenerationService,
	IPhotoService,
} from "@/application/interfaces";
import type { GroupedGenerationOptions } from "@/domain/generationOption";

describe("application interfaces typing", () => {
	it("defines booth service contract", () => {
		expectTypeOf<IBoothService["createSession"]>().parameters.toEqualTypeOf<
			[string]
		>();
		expectTypeOf<IBoothService["startGeneration"]>().parameters.toEqualTypeOf<
			[string, string, string[]]
		>();
		expectTypeOf<IBoothService["startGeneration"]>().returns.toEqualTypeOf<
			Promise<string>
		>();
	});

	it("defines photo service contract", () => {
		expectTypeOf<IPhotoService["uploadUserPhoto"]>().parameters.toEqualTypeOf<
			[string, Buffer]
		>();
		expectTypeOf<IPhotoService["uploadUserPhoto"]>().returns.toEqualTypeOf<
			Promise<string>
		>();
		expectTypeOf<IPhotoService["getGeneratedPhoto"]>().returns.toEqualTypeOf<
			Promise<{ id: string; imageUrl: string } | null>
		>();
	});

	it("defines generation service contract", () => {
		expectTypeOf<IGenerationService["getOptions"]>().returns.toEqualTypeOf<
			Promise<GroupedGenerationOptions>
		>();
		expectTypeOf<
			IGenerationService["generatePhoto"]
		>().parameters.toEqualTypeOf<[string, string[]]>();
		expectTypeOf<IGenerationService["generatePhoto"]>().returns.toEqualTypeOf<
			Promise<{ photoId: string; imageUrl: string }>
		>();
	});

	it("defines auth service contract", () => {
		expectTypeOf<IAuthService["validateAdminToken"]>().parameters.toEqualTypeOf<
			[string]
		>();
		expectTypeOf<IAuthService["validateAdminToken"]>().returns.toEqualTypeOf<
			Promise<boolean>
		>();
		expectTypeOf<IAuthService["createCustomToken"]>().returns.toEqualTypeOf<
			Promise<string>
		>();
		expectTypeOf<IAuthService["verifyAdminRole"]>().parameters.toEqualTypeOf<
			[string]
		>();
		expectTypeOf<IAuthService["verifyAdminRole"]>().returns.toEqualTypeOf<
			Promise<boolean>
		>();
	});
});
