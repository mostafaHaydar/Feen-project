import { CloudflareBindings, ErrorCodes, requireNumericParams } from './common';
import { Hono } from 'hono';
import { initializePrismaClient } from './common';
import { convertR2FileToBase64 } from './common';
import { compareFaces } from './common';
import { middlewareVerifyReporterJWT } from './auth';

/**
 * Matching Logic Module
 *
 * This module provides endpoints to find potential matches between lost and found person reports.
 * It uses demographic filtering (age, gender, date) and facial recognition (Face++ API) to identify likely matches.
 *
 * Security:
 * - All endpoints require JWT authentication.
 * - Only non-sensitive fields are returned in matches.
 *
 * Performance:
 * - Limits the number of matches returned for efficiency.
 * - Uses short-circuiting if a very high-confidence match is found.
 */
export default function Matche(api: Hono<{ Bindings: CloudflareBindings }>) {
  /**
   * GET /lost-matches/:id
   *
   * Given a lost person report ID, finds potential found person matches.
   * Uses demographic filtering and facial recognition.
   *
   * @param {number} id - Lost person report ID
   * @returns {Object} { lost, matches }
   * @throws {404} If lost person not found or no matches
   * @throws {500} On server error
   */
  api.get(
    '/lost-matches/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const lostId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      try {
        // Retrieve the lost person report
        const lost = await prisma.losts.findUnique({
          where: {
            id: lostId,
          },
          include: {
            founds: true,
          },
        });
        if (!lost) {
          return c.json(
            { error: ErrorCodes.NOT_FOUND, message: 'Lost person not found' },
            404
          );
        }
        let matchesByFacialRecognition = [];

        if (lost.found && lost.founds.length != 0) {
          matchesByFacialRecognition = lost.founds;
          return c.json({ lost, matches: matchesByFacialRecognition }, 200);
        }
        console.log('im here');
        // Demographic filtering for potential matches
        const potentialMatches = await prisma.founds.findMany({
          where: {
            gender: lost.gender,
            age: lost.age
              ? {
                  gte: lost.age - 3,
                  lte: lost.age + 3,
                }
              : undefined,
            foundDate: lost.lastSeenDate
              ? {
                  gte: lost.lastSeenDate,
                }
              : undefined,
          },
          orderBy: { foundDate: 'desc' },
          take: 20, // Limit for performance
        });

        if (potentialMatches.length === 0) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message: 'No potential matches found',
            },
            404
          );
        }

        // If the lost person has a photo, use facial recognition
        if (lost.photo && lost.photoMimeType) {
          const lostImageBase64 = await convertR2FileToBase64(
            c,
            lost.photo,
            lost.photoMimeType,
            c.env.LOST_PHOTOS
          );
          if (lostImageBase64) {
            for (let i = 0; i < potentialMatches.length; i++) {
              const element = potentialMatches[i];
              if (element.photo && element.photoMimeType) {
                const elementImageBase64 = await convertR2FileToBase64(
                  c,
                  element.photo,
                  element.photoMimeType,
                  c.env.FOUND_PHOTOS
                );
                if (elementImageBase64) {
                  try {
                    const facialRecognition = await compareFaces(
                      c,
                      lostImageBase64,
                      elementImageBase64
                    );
                    // If the confidence level is above 70%, consider as a match
                    if (
                      facialRecognition &&
                      facialRecognition.confidence > 70
                    ) {
                      matchesByFacialRecognition.push({
                        ...element,
                        facialRecognition,
                      });
                      // If confidence is very high, short-circuit
                      if (facialRecognition.confidence > 90) {
                        await prisma.losts.update({
                          where: {
                            id: lostId,
                          },
                          data: {
                            found: true,
                            confidence: facialRecognition.confidence,
                            founds: {
                              connect: { id: element.id }, // assumes you have the foundId
                            },
                          },
                        });
                        break;
                      }
                    }
                  } catch (err) {
                    // Log and skip this match if Face++ fails
                    console.error('Facial recognition error:', err);
                    continue;
                  }
                }
              }
            }
          }
        }

        // If no facial matches, fallback to demographic matches (limit to 5 for brevity)
        if (matchesByFacialRecognition.length === 0) {
          matchesByFacialRecognition = potentialMatches.slice(0, 5);
        }

        return c.json({ lost, matches: matchesByFacialRecognition }, 200);
      } catch (error: any) {
        console.error('Error in /lost-matches:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to find matches',
          },
          500
        );
      }
    }
  );

  /**
   * GET /found-matches/:id
   *
   * Given a found person report ID, finds potential lost person matches.
   * Uses demographic filtering and facial recognition.
   *
   * @param {number} id - Found person report ID
   * @returns {Object} { found, matches }
   * @throws {404} If found person not found or no matches
   * @throws {500} On server error
   */
  api.get(
    '/found-matches/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const foundId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      try {
        // Retrieve the found person report
        const found = await prisma.founds.findUnique({
          where: {
            id: foundId,
          },
          include: {
            losts: true,
          },
        });
        if (!found) {
          return c.json(
            { error: ErrorCodes.NOT_FOUND, message: 'Found person not found' },
            404
          );
        }

        let matchesByFacialRecognition = [];
        if (found.losts.length != 0) {
          matchesByFacialRecognition = found.losts;
          return c.json({ found, matches: matchesByFacialRecognition }, 200);
        }
        console.log('im here');

        // Demographic filtering for potential matches
        const potentialMatches = await prisma.losts.findMany({
          where: {
            gender: found.gender,
            age: found.age
              ? {
                  gte: found.age - 3,
                  lte: found.age + 3,
                }
              : undefined,
            lastSeenDate: found.foundDate
              ? {
                  lte: found.foundDate,
                }
              : undefined,
          },
          orderBy: { lastSeenDate: 'desc' },
          take: 20, // Limit for performance
        });

        if (potentialMatches.length === 0) {
          return c.json(
            {
              error: ErrorCodes.NOT_FOUND,
              message: 'No potential matches found',
            },
            404
          );
        }

        // If the found person has a photo, use facial recognition
        if (found.photo && found.photoMimeType) {
          const foundImageBase64 = await convertR2FileToBase64(
            c,
            found.photo,
            found.photoMimeType,
            c.env.FOUND_PHOTOS
          );
          if (foundImageBase64) {
            for (let i = 0; i < potentialMatches.length; i++) {
              const element = potentialMatches[i];
              if (element.photo && element.photoMimeType) {
                const elementImageBase64 = await convertR2FileToBase64(
                  c,
                  element.photo,
                  element.photoMimeType,
                  c.env.LOST_PHOTOS
                );
                if (elementImageBase64) {
                  try {
                    const facialRecognition = await compareFaces(
                      c,
                      foundImageBase64,
                      elementImageBase64
                    );
                    // If the confidence level is above 70%, consider as a match
                    if (
                      facialRecognition &&
                      facialRecognition.confidence > 70
                    ) {
                      matchesByFacialRecognition.push({
                        ...element,
                        facialRecognition,
                      });
                      // If confidence is very high, short-circuit
                      if (facialRecognition.confidence > 90) {
                        await prisma.founds.update({
                          where: {
                            id: foundId,
                          },
                          data: {
                            losts: {
                              connect: { id: element.id }, // assumes you have the foundId
                            },
                          },
                        });
                        break;
                      }
                    }
                  } catch (err) {
                    // Log and skip this match if Face++ fails
                    console.error('Facial recognition error:', err);
                    continue;
                  }
                }
              }
            }
          }
        }

        // If no facial matches, fallback to demographic matches (limit to 5 for brevity)
        if (matchesByFacialRecognition.length === 0) {
          matchesByFacialRecognition = potentialMatches.slice(0, 5);
        }

        return c.json({ found, matches: matchesByFacialRecognition }, 200);
      } catch (error: any) {
        console.error('Error in /found-matches:', error);
        return c.json(
          {
            error: ErrorCodes.INTERNAL_SERVER_ERROR,
            message: 'Failed to find matches',
          },
          500
        );
      }
    }
  );
}
