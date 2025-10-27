import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadedPhotoMetadata } from "@/application/photoService";

const saveMock = vi.fn(() => Promise.resolve());
const deleteMock = vi.fn(() => Promise.resolve());

vi.mock("@/lib/firebase/admin", () => ({
  getAdminStorage: () => ({
    bucket: () => ({
      name: "photo-test.appspot.com",
      file: () => ({
        save: saveMock,
        delete: deleteMock,
      }),
    }),
  }),
}));

const createUploadedPhotoMock = vi.fn(() => Promise.resolve());
const fetchUploadedPhotosMock = vi.fn(() => Promise.resolve([] as UploadedPhotoMetadata[]));
const deleteUploadedPhotoByDocumentPathMock = vi.fn(() => Promise.resolve());
const queryUploadedPhotosByPhotoIdMock = vi.fn();

vi.mock("@/infra/firebase/photoRepository", () => ({
  createUploadedPhoto: createUploadedPhotoMock,
  fetchUploadedPhotos: fetchUploadedPhotosMock,
  deleteUploadedPhotoByDocumentPath: deleteUploadedPhotoByDocumentPathMock,
  queryUploadedPhotosByPhotoId: queryUploadedPhotosByPhotoIdMock,
}));

const createSampleFile = (bytes: number[]) => {
  const file = new File([new Uint8Array(bytes)], "sample.png", {
    type: "image/png",
  });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new Uint8Array(bytes).buffer),
  });
  return file;
};

const expectMetadataShape = (metadata: UploadedPhotoMetadata) => {
  expect(metadata.photoId).toMatch(/^[0-9a-hjkmnp-tv-z]{26}$/);
  expect(metadata.imagePath.startsWith("photos/")).toBe(true);
  expect(metadata.imagePath.endsWith("/photo.png")).toBe(true);
  expect(metadata.imageUrl.startsWith("https://storage.googleapis.com/")).toBe(true);
};

describe("PhotoService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploadUserPhoto stores image and metadata", async () => {
    const { uploadUserPhoto } = await import("@/application/photoService");

    const file = createSampleFile([1, 2, 3]);

    const result = await uploadUserPhoto("booth-1", file);

    expect(saveMock).toHaveBeenCalledWith(expect.any(Buffer), expect.objectContaining({
      contentType: "image/png",
    }));

    expect(createUploadedPhotoMock).toHaveBeenCalledTimes(1);
    const [payload] = createUploadedPhotoMock.mock.calls[0] as [UploadedPhotoMetadata];
    expect(payload.boothId).toBe("booth-1");
    expect(payload.imagePath.startsWith("photos/")).toBe(true);
    expect(payload.imageUrl.startsWith("https://storage.googleapis.com/")).toBe(true);

    expectMetadataShape(result);
  });

  it("uploadCapturedPhoto reuses upload logic", async () => {
    const { uploadCapturedPhoto } = await import("@/application/photoService");

    const file = createSampleFile([4, 5, 6]);

    const result = await uploadCapturedPhoto("booth-2", file);

    expect(saveMock).toHaveBeenCalled();
    expect(createUploadedPhotoMock).toHaveBeenCalledTimes(1);
    const [payload] = createUploadedPhotoMock.mock.calls[0] as [UploadedPhotoMetadata];
    expect(payload.boothId).toBe("booth-2");
    expectMetadataShape(result);
  });

  it("getUploadedPhotos returns stored documents", async () => {
    fetchUploadedPhotosMock.mockResolvedValueOnce([
      {
        boothId: "booth-3",
        photoId: "photo-1",
        imagePath: "photos/photo-1/photo.png",
        imageUrl: "https://example.com/photo-1.png",
        createdAt: new Date(),
      },
      {
        boothId: "booth-3",
        photoId: "photo-2",
        imagePath: "photos/photo-2/photo.png",
        imageUrl: "https://example.com/photo-2.png",
        createdAt: new Date(),
      },
    ]);

    const { getUploadedPhotos } = await import("@/application/photoService");

    const result = await getUploadedPhotos("booth-3");

    expect(fetchUploadedPhotosMock).toHaveBeenCalledWith("booth-3");
    expect(result).toEqual([
      {
        photoId: "photo-1",
        imagePath: "photos/photo-1/photo.png",
        imageUrl: "https://example.com/photo-1.png",
      },
      {
        photoId: "photo-2",
        imagePath: "photos/photo-2/photo.png",
        imageUrl: "https://example.com/photo-2.png",
      },
    ]);
  });

  it("deleteUsedPhoto removes Firestore doc and storage file", async () => {
    const getMock = vi.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            imagePath: "photos/photo-99/photo.png",
          }),
          ref: {
            path: "booths/booth-3/uploadedPhotos/photo-99",
          },
        },
      ],
    });

    queryUploadedPhotosByPhotoIdMock.mockReturnValueOnce({ get: getMock });

    const { deleteUsedPhoto } = await import("@/application/photoService");

    await deleteUsedPhoto("photo-99");

    expect(queryUploadedPhotosByPhotoIdMock).toHaveBeenCalledWith("photo-99");
    expect(deleteUploadedPhotoByDocumentPathMock).toHaveBeenCalledWith(
      "booths/booth-3/uploadedPhotos/photo-99",
    );
    expect(deleteMock).toHaveBeenCalledWith();
  });
});
