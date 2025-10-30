import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { createAddFishFromPhoto } from "./application/add-fish-from-photo.js";
import { createListFish } from "./application/list-fish.js";
import { buildConfig } from "./config/env.js";
import { getFirebaseServices } from "./config/firebase.js";
import { createGetFishHandler } from "./controller/http/get-fish.handler.js";
import { registerRoutes } from "./controller/http/routes.js";
import { createUploadPhotoHandler } from "./controller/http/upload-photo.handler.js";
import type { ControllerEnv } from "./controller/types.js";
import { createLogger } from "./infra/logging/cloud-logger.js";
import { createFirestoreFishRepository } from "./infra/repositories/firestore-fish-repo.js";
import { createStoragePhotoStore } from "./infra/repositories/storage-photo-store.js";
import { createImageProcessor } from "./infra/services/image-processor.js";

const STORAGE_BUCKET_SUFFIX = ".appspot.com";
const IMAGE_BLUR_SIGMA = 12;
const IMAGE_SAMPLE_SIZE = 32;

export const config = buildConfig();
export const firebaseServices = getFirebaseServices(config);
export const logger = createLogger({ config });

const fishRepository = createFirestoreFishRepository({
	firestore: firebaseServices.firestore,
	converter: firebaseServices.converters.fish,
});

const photoStorage = createStoragePhotoStore({
	storage: firebaseServices.storage,
	bucketName: `${config.firebaseProjectId}${STORAGE_BUCKET_SUFFIX}`,
});

const imageProcessor = createImageProcessor({
	blurSigma: IMAGE_BLUR_SIGMA,
	colorSampleSize: IMAGE_SAMPLE_SIZE,
});

const addFishFromPhoto = createAddFishFromPhoto({
	repo: fishRepository,
	storage: photoStorage,
	imageProcessor,
	config,
	logger,
});

const listFish = createListFish({
	repo: fishRepository,
	config,
	logger,
});

const uploadPhotoHandler = createUploadPhotoHandler({
	addFishFromPhoto,
	logger,
	config,
});

const getFishHandler = createGetFishHandler({
	listFish,
	logger,
});

const app = new Hono<ControllerEnv>();

registerRoutes(app, {
	config,
	logger,
	handlers: {
		uploadPhoto: uploadPhotoHandler,
		getFish: getFishHandler,
	},
});

app.get("/", (c) => {
	logger.info("healthcheck", { path: "/" });
	return c.text("ok");
});

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		logger.info("server-started", { port: info.port });
	},
);
