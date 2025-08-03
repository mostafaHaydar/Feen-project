import { CloudflareBindings, ErrorCodes, r2FileDownload, requireNumericParams, success } from './common';
import { Hono } from 'hono';
import { initializePrismaClient } from './common';
import { zValidator } from '@hono/zod-validator';
import { Buffer } from 'buffer';
import { fileTypeFromBuffer } from 'file-type';
import { lostSchema, photoSchema } from './data-validation';
import { getReporterAccountId, middlewareVerifyReporterJWT } from './reporters';
export default function Lost(api: Hono<{ Bindings: CloudflareBindings }>) {
	// Add a lost person entry
	api.post('/lost', middlewareVerifyReporterJWT(true), zValidator('json', lostSchema), async (c) => {
		const lostData = c.req.valid('json');
		const prisma = initializePrismaClient(c);
		try {
			('');
			const lost = await prisma.losts.create({
				data: {
					name: lostData.name,
					location: lostData.location,
					lastSeenLocation: lostData.lastSeenLocation,
					lastSeenDate: new Date(lostData.lastSeenDate),
					age: Number(lostData.age ?? null),
					gender: lostData.gender,
					contactInfo: lostData.contactInfo ?? null,
					disease: lostData.disease ?? null,
					mentalHealth: lostData.mentalHealth ?? null,
					found: lostData.found,
					reporterId: getReporterAccountId(c),
				},
			});
			return c.json(lost, 201);
		} catch (error: any) {
			console.log(error);
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get all lost persons
	api.get('/losts', middlewareVerifyReporterJWT(true), async (c) => {
		const prisma = initializePrismaClient(c);
		try {
			const losts = await prisma.losts.findMany({
				orderBy: { createdAt: 'desc' },
			});
			return c.json(losts, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get a single lost person by ID
	api.get('/lost/:id', middlewareVerifyReporterJWT(true), requireNumericParams(['id']), async (c) => {
		const lostId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);
		try {
			const lost = await prisma.losts.findUnique({
				where: { id: lostId },
			});
			if (!lost) {
				return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
			}
			return c.json(lost, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Update a lost person entry
	api.put('/lost/:id', middlewareVerifyReporterJWT(true), zValidator('json', lostSchema), async (c) => {
		const lostId = Number(c.req.param('id'));
		const lostData = c.req.valid('json');
		const prisma = initializePrismaClient(c);
		try {
			const lost = await prisma.losts.update({
				where: { id: lostId },
				data: {
					name: lostData.name,
					location: lostData.location,
					lastSeenLocation: lostData.lastSeenLocation,
					lastSeenDate: new Date(lostData.lastSeenDate),
					age: lostData.age ?? null,
					gender: lostData.gender,
					contactInfo: lostData.contactInfo ?? null,
					disease: lostData.disease ?? null,
					mentalHealth: lostData.mentalHealth ?? null,
					found: lostData.found,
				},
			});
			return c.json(lost, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Delete a lost person entry
	api.delete('/lost/:id', middlewareVerifyReporterJWT(true), requireNumericParams(['id']), async (c) => {
		const lostId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);
		try {
			const lost = await prisma.losts.delete({
				where: { id: lostId },
			});

			if (lost.photo) {
				await c.env.LOST_PHOTOS.delete(lost.photo);
			}

			return c.json(lost, 200);
		} catch (error: any) {
			if (error.code === 'P2025') {
				return c.json({ error: 'Lost person not found' }, 404);
			}
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get photo of a lost person
	api.get('/lost/:id/photo', requireNumericParams(['id']), async (c) => {
		const lostId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);

		const lost = await prisma.losts.findUnique({
			where: { id: lostId },
		});

		if (!lost) {
			return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
		}

		if (!lost.photo || !lost.photoMimeType) {
			return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
		}

		return r2FileDownload(c, lost.photo, lost.photoMimeType, c.env.LOST_PHOTOS);
	});

	// Add photo to a lost person
	api.post(
		'/lost/:id/photo',
		middlewareVerifyReporterJWT(true),
		requireNumericParams(['id']),
		zValidator('json', photoSchema),
		async (c) => {
			const { documentB64 } = c.req.valid('json');
			const lostId = Number(c.req.param('id'));
			const prisma = initializePrismaClient(c);

			const lost = await prisma.losts.findUnique({
				where: { id: lostId },
			});

			if (!lost) {
				return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
			}

			// when working with face++ we need to check some requirements , like the image size and type
			const body = Buffer.from(documentB64, 'base64');

			// Check if the image size is less than 2MB
			if (body.length > 2 * 1024 * 1024) {
				return c.json({ error: ErrorCodes.FILE_TOO_LARGE }, 400);
			}

			const type = await fileTypeFromBuffer(body);

			if (!type || !['image/jpeg', 'image/png'].includes(type.mime)) {
				return c.json({ error: ErrorCodes.INVALID_FILE_TYPE }, 400);
			}

			const fileName = `${Math.random().toString(36).substring(2, 15)}.${type.ext}`;
			await c.env.LOST_PHOTOS.put(fileName, body);

			await prisma.losts.update({
				where: { id: lostId },
				data: {
					photo: fileName,
					photoMimeType: type.mime,
				},
			});
			return success(c);
		}
	);
}
