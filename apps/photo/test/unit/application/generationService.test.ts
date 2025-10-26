import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOptions } from "@/application/generationService";
import type { GenerationOption } from "@/domain/generationOption";

/**
 * T204 [P] [FOUND] Unit Test (Generation Options)
 *
 * GenerationServiceのテスト。Firestoreリポジトリをモック。
 * generationService.getOptions() を呼び出す。
 * モックが返したGenerationOptionの配列が、typeId（location, outfit...）ごとにグループ化されたオブジェクトとして返ることをアサート。
 */

// Mock the Firestore repository
vi.mock("@/infra/firebase/generationOptionRepository", () => ({
  fetchAllOptions: vi.fn(),
}));

describe("GenerationService - getOptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should group GenerationOptions by typeId", async () => {
    // Arrange: Mock repository to return sample data
    const { fetchAllOptions } = await import(
      "@/infra/firebase/generationOptionRepository"
    );
    const mockOptions: GenerationOption[] = [
      {
        id: "location-1",
        typeId: "location",
        value: "beach",
        displayName: "Beach",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      {
        id: "location-2",
        typeId: "location",
        value: "mountain",
        displayName: "Mountain",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      {
        id: "outfit-1",
        typeId: "outfit",
        value: "casual",
        displayName: "Casual",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      {
        id: "outfit-2",
        typeId: "outfit",
        value: "formal",
        displayName: "Formal",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      {
        id: "style-1",
        typeId: "style",
        value: "vibrant",
        displayName: "Vibrant",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];

    vi.mocked(fetchAllOptions).mockResolvedValue(mockOptions);

    // Act: Call getOptions
    const result = await getOptions();

    // Assert: Verify grouping by typeId
    expect(result).toEqual({
      location: [
        {
          id: "location-1",
          typeId: "location",
          value: "beach",
          displayName: "Beach",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
        {
          id: "location-2",
          typeId: "location",
          value: "mountain",
          displayName: "Mountain",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
      ],
      outfit: [
        {
          id: "outfit-1",
          typeId: "outfit",
          value: "casual",
          displayName: "Casual",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
        {
          id: "outfit-2",
          typeId: "outfit",
          value: "formal",
          displayName: "Formal",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
      ],
      style: [
        {
          id: "style-1",
          typeId: "style",
          value: "vibrant",
          displayName: "Vibrant",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
      ],
    });

    // Verify repository was called
    expect(fetchAllOptions).toHaveBeenCalledOnce();
  });

  it("should return empty object when no options exist", async () => {
    // Arrange: Mock repository to return empty array
    const { fetchAllOptions } = await import(
      "@/infra/firebase/generationOptionRepository"
    );
    vi.mocked(fetchAllOptions).mockResolvedValue([]);

    // Act
    const result = await getOptions();

    // Assert
    expect(result).toEqual({});
    expect(fetchAllOptions).toHaveBeenCalledOnce();
  });

  it("should handle options with single typeId", async () => {
    // Arrange: Mock repository with only one typeId
    const { fetchAllOptions } = await import(
      "@/infra/firebase/generationOptionRepository"
    );
    const mockOptions: GenerationOption[] = [
      {
        id: "pose-1",
        typeId: "pose",
        value: "standing",
        displayName: "Standing",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
      {
        id: "pose-2",
        typeId: "pose",
        value: "sitting",
        displayName: "Sitting",
        imageUrl: null,
        imagePath: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      },
    ];

    vi.mocked(fetchAllOptions).mockResolvedValue(mockOptions);

    // Act
    const result = await getOptions();

    // Assert
    expect(result).toEqual({
      pose: [
        {
          id: "pose-1",
          typeId: "pose",
          value: "standing",
          displayName: "Standing",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
        {
          id: "pose-2",
          typeId: "pose",
          value: "sitting",
          displayName: "Sitting",
          imageUrl: null,
          imagePath: null,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
      ],
    });
  });
});
