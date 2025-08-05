import {
  CloudflareBindings,
  ErrorCodes,
  r2FileDownload,
  requireNumericParams,
  success,
} from './common';
import { Hono } from 'hono';
import { initializePrismaClient } from './common';
import { zValidator } from '@hono/zod-validator';
import { Buffer } from 'buffer';
import { fileTypeFromBuffer } from 'file-type';
import { lostSchema, photoSchema } from './data-validation';
import { getReporterAccountId, middlewareVerifyReporterJWT } from './auth';

export default function Lost(api: Hono<{ Bindings: CloudflareBindings }>) {
  api.post(
    '/lost',
    middlewareVerifyReporterJWT(true),
    zValidator('json', lostSchema),
    async (c) => {
      const lostData = c.req.valid('json'); // Use validated data from Zod
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // Sanitize and validate input data
        const sanitizedData = {
          name: lostData.name.trim(),
          location: lostData.location.trim(),
          lastSeenLocation: lostData.lastSeenLocation.trim(),
          lastSeenDate: new Date(lostData.lastSeenDate),
          age: lostData.age ? Number(lostData.age) : null,
          gender: lostData.gender.trim(),
          contactInfo: lostData.contactInfo?.trim() || null,
          disease: lostData.disease?.trim() || null,
          mentalHealth: lostData.mentalHealth?.trim() || null,
          found: lostData.found || false,
          reporterId: reporterId,
        };

        // Validate age if provided
        if (
          sanitizedData.age !== null &&
          (sanitizedData.age < 0 || sanitizedData.age > 120)
        ) {
          return c.json(
            {
              error: 'INVALID_AGE',
              message: 'Age must be between 0 and 120',
            },
            400
          );
        }

        // Validate date is not in the future
        if (sanitizedData.lastSeenDate > new Date()) {
          return c.json(
            {
              error: 'INVALID_DATE',
              message: 'Last seen date cannot be in the future',
            },
            400
          );
        }

        const lost = await prisma.losts.create({
          data: sanitizedData,
        });

        return c.json(
          {
            message: 'Missing person report created successfully',
            report: lost,
          },
          201
        );
      } catch (error: any) {
        console.error('Error creating lost person report:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to create missing person report',
          },
          500
        );
      }
    }
  );

  api.get('/losts', middlewareVerifyReporterJWT(true), async (c) => {
    const prisma = initializePrismaClient(c);
    const reporterId = getReporterAccountId(c);

    try {
      const losts = await prisma.losts.findMany({
        where: { reporterId: reporterId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          location: true,
          lastSeenLocation: true,
          lastSeenDate: true,
          age: true,
          gender: true,
          contactInfo: true,
          disease: true,
          mentalHealth: true,
          found: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return c.json(losts, 200);
    } catch (error: any) {
      console.error('Error fetching lost person reports:', error);
      return c.json(
        {
          error: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve reports',
        },
        500
      );
    }
  });

  api.get(
    '/lost/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const lostId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        const lost = await prisma.losts.findFirst({
          where: {
            id: lostId,
            reporterId: reporterId, // Ensure user can only access their own reports
          },
        });

        if (!lost) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message:
                'Report not found or you do not have permission to view it',
            },
            404
          );
        }

        return c.json(lost, 200);
      } catch (error: any) {
        console.error('Error fetching lost person report:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to retrieve report',
          },
          500
        );
      }
    }
  );

  api.delete(
    '/lost/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const lostId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // First check if the report exists and belongs to the user
        const existingLost = await prisma.losts.findFirst({
          where: {
            id: lostId,
            reporterId: reporterId,
          },
        });

        if (!existingLost) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message:
                'Report not found or you do not have permission to delete it',
            },
            404
          );
        }

        // Delete the report from database
        const lost = await prisma.losts.delete({
          where: { id: lostId },
        });

        // Delete associated photo from R2 storage if it exists
        if (lost.photo) {
          try {
            await c.env.LOST_PHOTOS.delete(lost.photo);
          } catch (photoError) {
            console.error('Error deleting photo from R2:', photoError);
            // Don't fail the entire operation if photo deletion fails
          }
        }

        return c.json(
          {
            message: 'Report deleted successfully',
            report: lost,
          },
          200
        );
      } catch (error: any) {
        if (error.code === 'P2025') {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message: 'Report not found',
            },
            404
          );
        }
        console.error('Error deleting lost person report:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to delete report',
          },
          500
        );
      }
    }
  );

  api.get('/lost/:id/photo', requireNumericParams(['id']), async (c) => {
    const lostId = Number(c.req.param('id'));
    const prisma = initializePrismaClient(c);

    try {
      const lost = await prisma.losts.findUnique({
        where: { id: lostId },
      });

      if (!lost) {
        return c.json(
          {
            error: ErrorCodes.NOT_FOUND,
            message: 'Report not found',
          },
          404
        );
      }

      if (!lost.photo || !lost.photoMimeType) {
        return c.json(
          {
            error: ErrorCodes.NOT_FOUND,
            message: 'No photo available for this report',
          },
          404
        );
      }

      // Serve the photo from R2 storage
      return r2FileDownload(
        c,
        lost.photo,
        lost.photoMimeType,
        c.env.LOST_PHOTOS
      );
    } catch (error: any) {
      console.error('Error retrieving photo:', error);
      return c.json(
        {
          error: ErrorCodes.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve photo',
        },
        500
      );
    }
  });

  api.post(
    '/lost/:id/photo',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    zValidator('json', photoSchema),
    async (c) => {
      const { documentB64 } = c.req.valid('json');
      const lostId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // Verify the report exists and belongs to the user
        const lost = await prisma.losts.findFirst({
          where: {
            id: lostId,
            reporterId: reporterId,
          },
        });

        if (!lost) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message:
                'Report not found or you do not have permission to upload photos',
            },
            404
          );
        }

        // Decode base64 image data
        const body = Buffer.from(documentB64, 'base64');

        // Validate file size (2MB limit for Face++ API)
        const maxSize = 2 * 1024 * 1024; // 2MB in bytes
        if (body.length > maxSize) {
          return c.json(
            {
              error: ErrorCodes.FILE_TOO_LARGE,
              message: 'File size must be less than 2MB',
            },
            400
          );
        }

        // Validate file type using magic bytes
        const type = await fileTypeFromBuffer(body);
        const allowedTypes = ['image/jpeg', 'image/png'];

        if (!type || !allowedTypes.includes(type.mime)) {
          return c.json(
            {
              error: ErrorCodes.INVALID_FILE_TYPE,
              message: 'Only JPEG and PNG images are supported',
            },
            400
          );
        }

        // Generate unique filename for security
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileName = `lost_${lostId}_${timestamp}_${randomString}.${type.ext}`;

        // Upload to R2 storage
        await c.env.LOST_PHOTOS.put(fileName, body, {
          httpMetadata: {
            contentType: type.mime,
          },
        });

        // Update database with photo information
        await prisma.losts.update({
          where: { id: lostId },
          data: {
            photo: fileName,
            photoMimeType: type.mime,
          },
        });

        return c.json(
          {
            message: 'Photo uploaded successfully',
            fileName: fileName,
            mimeType: type.mime,
            size: body.length,
          },
          200
        );
      } catch (error: any) {
        console.error('Error uploading photo:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to upload photo',
          },
          500
        );
      }
    }
  );
}
