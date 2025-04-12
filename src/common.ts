import { Context, MiddlewareHandler } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export function initializePrismaClient(c: Context) {
	const prisma = new PrismaClient({
		datasourceUrl: c.env.DATABASE_URL,
	}).$extends(withAccelerate());
	return prisma;
}

export type CloudflareBindings = {
	JWT_SECRET_KEY: string;
	LOST_PHOTOS: R2Bucket;
	FOUND_PHOTOS: R2Bucket;
};

export function success(c: Context, status: number = 200) {
	return c.json({ success: true }, status == 200 ? 200 : 201);
}

export const reporterSelect = {
	id: true,
	name: true,
	email: true,
	createdAt: true,
	updatedAt: true,
};

export const ErrorCodes = {
	NOT_FOUND: 'not_found',
	ALREADY_USED: 'already_used',
	EMAIL_ALREADY_USED: 'email_already_used',
	PHONE_ALREADY_USED: 'phone_already_used',
	INTERNAL_SERVER_ERROR: 'internal_server_error',
	UNAUTHORIZED: 'unauthorized',
	INVALID_CREDENTIALS: 'invalid_credentials',
	INVALID_FILE_TYPE: 'invalid_file_type',
	EMAIL_FORMAT_NOT_SUPPORTED: 'email_format_not_supported',
	INVALID_PHONE_NUMBER: 'invalid_phone_number',
	INVALID_VERIFICATION_NUMBER: 'invalid_verification_number',
	EMAIL_NOT_VERIFIED: 'email_not_verified',
	FILE_TOO_LARGE: 'file_too_large',
};

export function requireNumericParams(names: string[]): MiddlewareHandler {
	const result: any = {};
	for (const name of names) {
		result[name] = z.coerce.number().min(1);
	}
	return zValidator('param', z.object(result));
}

// Taken from https://developers.cloudflare.com/r2/api/workers/demo-worker/
export function parseRange(encoded: string | null): undefined | { offset: number; end: number; length: number } {
	if (encoded === null) {
		return;
	}

	const parts = encoded.split('bytes=')[1]?.split('-') ?? [];

	if (parts.length !== 2) {
		throw new Error(ErrorCodes.INVALID_FILE_TYPE + ' Not supported to skip specifying the beginning/ending byte at this time');
	}

	return {
		offset: Number(parts[0]),
		end: Number(parts[1]),
		length: Number(parts[1]) + 1 - Number(parts[0]),
	};
}

export async function r2FileDownload(
	c: Context<{
		Bindings: CloudflareBindings;
	}>,
	key: string,
	mimeType: string,
	bucket: R2Bucket,
	immutable = true
): Promise<Response> {
	// Get the document body from R2, with range support
	const range = parseRange(c.req.raw.headers.get('range') ?? null);
	const obj = await bucket.get(key, {
		range,
		onlyIf: c.req.raw.headers,
	});
	if (!obj) {
		console.error(`R2 file not found for ${key}`);
		return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
	}

	// Prepare return headers
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set('etag', obj.httpEtag);
	headers.set('content-type', mimeType);
	if (range) {
		headers.set('content-range', `bytes ${range.offset}-${range.end}/${obj.size}`);
	}

	if (immutable) {
		// Resource will never change, so we can cache it for a long time
		headers.set('cache-control', 'public, max-age=31536000, immutable');
		headers.set('expires', new Date(Date.now() + 31536000000).toUTCString());
	}

	// Detect if there are something in the body
	const objBody = obj as R2ObjectBody;
	if (objBody.body) {
		return new Response(objBody.body, {
			headers,
			status: range ? 206 : 200,
		});
	} else {
		return new Response(undefined, {
			headers,
			status: 304,
		});
	}
}

export async function convertR2FileToBase64(
	c: Context<{
		Bindings: CloudflareBindings;
	}>,
	key: string,
	mimeType: string,
	bucket: R2Bucket
): Promise<string | null> {
	try {
		// Call r2FileDownload to get the file
		const response = await r2FileDownload(c, key, mimeType, bucket);

		// Check if the response body is available
		if (!response.ok) {
			console.error('Error fetching file.');
			return null;
		}

		// Convert the response body to an ArrayBuffer
		const arrayBuffer = await response.arrayBuffer();

		// Convert ArrayBuffer to Base64
		const base64String = arrayBufferToBase64(arrayBuffer);

		return base64String;
	} catch (error) {
		console.error('Error in convertR2FileToBase64:', error);
		return null;
	}
}

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
	// Create a Uint8Array from the ArrayBuffer
	const uint8Array = new Uint8Array(arrayBuffer);

	// Convert each byte to a character and encode as Base64
	let binary = '';
	uint8Array.forEach((byte) => {
		binary += String.fromCharCode(byte);
	});
	return btoa(binary); // `btoa` is available in Cloudflare Workers for Base64 encoding
}

export async function compareFaces(c: Context, imageBase64_1: any, imageBase64_2: any): Promise<any> {
	const url = 'https://api-us.faceplusplus.com/facepp/v3/compare';

	const formData = new URLSearchParams();
	formData.append('api_key', c.env.FACE_PLUS_PLUS_KEY);
	formData.append('api_secret', c.env.FACE_PLUS_PLUS_SECRET);
	formData.append('image_base64_1', imageBase64_1);
	formData.append('image_base64_2', imageBase64_2);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: formData.toString(),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! Status: ${response.status}`);
		}

		return await response.json();
	} catch (error) {
		console.error('Error comparing faces:', error);
		throw error;
	}
}
