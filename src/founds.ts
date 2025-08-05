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
import { foundSchema, photoSchema } from './data-validation';
import { getReporterAccountId, middlewareVerifyReporterJWT } from './auth';

export default function Found(api: Hono<{ Bindings: CloudflareBindings }>) {
  api.post(
    '/found',
    middlewareVerifyReporterJWT(true),
    zValidator('json', foundSchema),
    async (c) => {
      const foundData = c.req.valid('json');
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // Sanitize and validate input data
        const sanitizedData = {
          name: foundData.name?.trim() || null,
          foundLocation: foundData.foundLocation.trim(),
          foundDate: new Date(foundData.foundDate),
          description: foundData.description?.trim() || null,
          age: foundData.age ? Number(foundData.age) : null,
          gender: foundData.gender.trim(),
          contactInfo: foundData.contactInfo?.trim() || null,
          reporterId: reporterId,
          lostId: null, // Initially not linked to any lost person
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
        if (sanitizedData.foundDate > new Date()) {
          return c.json(
            {
              error: 'INVALID_DATE',
              message: 'Found date cannot be in the future',
            },
            400
          );
        }

        const found = await prisma.founds.create({
          data: sanitizedData,
        });

        return c.json(
          {
            message: 'Found person report created successfully',
            report: found,
          },
          201
        );
      } catch (error: any) {
        console.error('Error creating found person report:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to create found person report',
          },
          500
        );
      }
    }
  );

  api.get('/founds', middlewareVerifyReporterJWT(true), async (c) => {
    const prisma = initializePrismaClient(c);
    const reporterId = getReporterAccountId(c);

    try {
      const founds = await prisma.founds.findMany({
        where: { reporterId: reporterId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          foundLocation: true,
          foundDate: true,
          description: true,
          age: true,
          gender: true,
          contactInfo: true,
          createdAt: true,
          updatedAt: true,
          // Exclude photo fields for list view to reduce payload size
        },
      });

      return c.json(founds, 200);
    } catch (error: any) {
      console.error('Error fetching found person reports:', error);
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
    '/found/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const foundId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        const found = await prisma.founds.findFirst({
          where: {
            id: foundId,
            reporterId: reporterId, // Ensure user can only access their own reports
          },
        });

        if (!found) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message:
                'Report not found or you do not have permission to view it',
            },
            404
          );
        }

        return c.json(found, 200);
      } catch (error: any) {
        console.error('Error fetching found person report:', error);
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
    '/found/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const foundId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // First check if the report exists and belongs to the user
        const existingFound = await prisma.founds.findFirst({
          where: {
            id: foundId,
            reporterId: reporterId,
          },
        });

        if (!existingFound) {
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
        const found = await prisma.founds.delete({
          where: { id: foundId },
        });

        // Delete associated photo from R2 storage if it exists
        if (found.photo) {
          try {
            await c.env.FOUND_PHOTOS.delete(found.photo);
          } catch (photoError) {
            console.error('Error deleting photo from R2:', photoError);
            // Don't fail the entire operation if photo deletion fails
          }
        }

        return c.json(
          {
            message: 'Report deleted successfully',
            report: found,
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
        console.error('Error deleting found person report:', error);
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

  api.get('/found/:id/photo', requireNumericParams(['id']), async (c) => {
    const foundId = Number(c.req.param('id'));
    const prisma = initializePrismaClient(c);

    try {
      const found = await prisma.founds.findUnique({
        where: { id: foundId },
      });

      if (!found) {
        return c.json(
          {
            error: ErrorCodes.NOT_FOUND,
            message: 'Report not found',
          },
          404
        );
      }

      if (!found.photo || !found.photoMimeType) {
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
        found.photo,
        found.photoMimeType,
        c.env.FOUND_PHOTOS
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
    '/found/:id/photo',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    zValidator('json', photoSchema),
    async (c) => {
      const { documentB64 } = c.req.valid('json');
      const foundId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      const reporterId = getReporterAccountId(c);

      try {
        // Verify the report exists and belongs to the user
        const found = await prisma.founds.findFirst({
          where: {
            id: foundId,
            reporterId: reporterId,
          },
        });

        if (!found) {
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
        const fileName = `found_${foundId}_${timestamp}_${randomString}.${type.ext}`;

        // Upload to R2 storage
        await c.env.FOUND_PHOTOS.put(fileName, body, {
          httpMetadata: {
            contentType: type.mime,
          },
        });

        // Update database with photo information
        await prisma.founds.update({
          where: { id: foundId },
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
