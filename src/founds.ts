import { CloudflareBindings, ErrorCodes, r2FileDownload, requireNumericParams, success } from './common';
import { Hono } from 'hono';
import { initializePrismaClient } from './common';
import { zValidator } from '@hono/zod-validator';
import { Buffer } from 'buffer';
import { fileTypeFromBuffer } from 'file-type';
import { foundSchema, photoSchema } from './data-validation';
import { getReporterAccountId, middlewareVerifyReporterJWT } from './reporters';

export default function Founds(api: Hono<{ Bindings: CloudflareBindings }>) {
	// Add a found person entry
	api.post('/found', middlewareVerifyReporterJWT(true), zValidator('json', foundSchema), async (c) => {
		const foundData = c.req.valid('json');
		const prisma = initializePrismaClient(c);
		try {
			const found = await prisma.founds.create({
				data: {
					name: foundData.name,
					foundLocation: foundData.foundLocation,
					foundDate: new Date(foundData.foundDate),
					description: foundData.description ?? null,
					age: foundData.age ?? null,
					gender: foundData.gender,
					contactInfo: foundData.contactInfo ?? null,
					reporterId: getReporterAccountId(c),
					lostId: undefined, // Ensure lostId is provided or set to null
				},
			});
			return c.json(found, 201);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get all found persons
	api.get('/founds', middlewareVerifyReporterJWT(true), async (c) => {
		const prisma = initializePrismaClient(c);
		try {
			const founds = await prisma.founds.findMany({
				orderBy: { createdAt: 'desc' },
			});
			return c.json(founds, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get a single found person by ID
	api.get('/found/:id', middlewareVerifyReporterJWT(true), requireNumericParams(['id']), async (c) => {
		const foundId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);
		try {
			const found = await prisma.founds.findUnique({
				where: { id: foundId },
			});
			if (!found) {
				return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
			}
			return c.json(found, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Update a found person entry
	api.put('/found/:id', middlewareVerifyReporterJWT(true), zValidator('json', foundSchema), async (c) => {
		const foundId = Number(c.req.param('id'));
		const foundData = c.req.valid('json');
		const prisma = initializePrismaClient(c);
		try {
			const found = await prisma.founds.update({
				where: { id: foundId },
				data: {
					name: foundData.name,
					foundLocation: foundData.foundLocation,
					foundDate: new Date(foundData.foundDate),
					description: foundData.description ?? null,
					age: foundData.age ?? null,
					gender: foundData.gender,
					contactInfo: foundData.contactInfo ?? null,
				},
			});
			return c.json(found, 200);
		} catch (error: any) {
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Delete a found person entry
	api.delete('/found/:id', middlewareVerifyReporterJWT(true), requireNumericParams(['id']), async (c) => {
		const foundId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);
		try {
			const found = await prisma.founds.delete({
				where: { id: foundId },
			});

			if (found.photo) {
				await c.env.FOUND_PHOTOS.delete(found.photo);
			}

			return c.json(found, 200);
		} catch (error: any) {
			if (error.code === 'P2025') {
				return c.json({ error: 'Found person not found' }, 404);
			}
			return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
		}
	});

	// Get photo of a found person
	api.get('/found/:id/photo', requireNumericParams(['id']), async (c) => {
		const foundId = Number(c.req.param('id'));
		const prisma = initializePrismaClient(c);

		const found = await prisma.founds.findUnique({
			where: { id: foundId },
		});

		if (!found) {
			return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
		}

		if (!found.photo || !found.photoMimeType) {
			return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
		}

		return r2FileDownload(c, found.photo, found.photoMimeType, c.env.FOUND_PHOTOS);
	});

	// Add photo to a found person
	api.post(
		'/found/:id/photo',
		middlewareVerifyReporterJWT(true),
		requireNumericParams(['id']),
		zValidator('json', photoSchema),
		async (c) => {
			const { documentB64 } = c.req.valid('json');
			const foundId = Number(c.req.param('id'));
			const prisma = initializePrismaClient(c);

			const found = await prisma.founds.findUnique({
				where: { id: foundId },
			});

			if (!found) {
				return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
			}

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
			await c.env.FOUND_PHOTOS.put(fileName, body);

			await prisma.founds.update({
				where: { id: foundId },
				data: {
					photo: fileName,
					photoMimeType: type.mime,
				},
			});
			return success(c);
		}
	);
}
