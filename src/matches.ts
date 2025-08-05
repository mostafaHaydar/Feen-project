import { CloudflareBindings, ErrorCodes, requireNumericParams } from './common';
import { Hono } from 'hono';
import { initializePrismaClient } from './common';
import { convertR2FileToBase64 } from './common';
import { compareFaces } from './common';
import { middlewareVerifyReporterJWT } from './auth';

export default function Matche(api: Hono<{ Bindings: CloudflareBindings }>) {
  api.get(
    '/lost-matches/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const lostId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      try {
        // first retrieve the lost person
        const lost = await prisma.losts.findUnique({
          where: { id: lostId },
        });
        if (!lost) {
          return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
        }

        // retrieve the potential matches from the database , keep just the closest matches
        const potentialMatches = await prisma.founds.findMany({
          where: {
            gender: lost.gender,
            age: {
              gte: lost.age ? lost.age - 3 : undefined,
              lte: lost.age ? lost.age + 3 : undefined,
            },
            foundDate: {
              gte: lost.lastSeenDate || undefined,
            },
          },
        });

        let matchesByFacialRecognition = [];
        // if the lost person has a photo, compare it with the photos of the potential matches
        if (lost.photo && lost.photoMimeType) {
          // the compare faces function requires the images to be in base64 format
          // convert the lost person's photo to base64
          const lostImageBase64 = await convertR2FileToBase64(
            c,
            lost.photo,
            lost.photoMimeType,
            c.env.LOST_PHOTOS
          );
          // loop through the potential matches and compare the lost person's photo with each match's photo
          if (potentialMatches.length > 0) {
            for (let i = 0; i < potentialMatches.length; i++) {
              const element = potentialMatches[i];
              if (element.photo && element.photoMimeType) {
                const elementImageBase64 = await convertR2FileToBase64(
                  c,
                  element.photo,
                  element.photoMimeType,
                  c.env.FOUND_PHOTOS
                );
                if (lostImageBase64 != null && elementImageBase64 != null) {
                  const facialRecognition = await compareFaces(
                    c,
                    lostImageBase64,
                    elementImageBase64
                  );
                  console.log(facialRecognition);
                  // if the confidence level is above 80%, consider the match as a potential match
                  if (facialRecognition.confidence > 70) {
                    matchesByFacialRecognition.push({
                      ...element,
                      facialRecognition: facialRecognition,
                    });
                    if (facialRecognition.confidence > 90) {
                      // that mean we have a match ,is not necessary to continue
                      break;
                    }
                  }
                } else {
                  continue;
                }
              } else {
                continue;
              }
            }
          }
        }
        return c.json({ lost, matches: matchesByFacialRecognition }, 200);
      } catch (error: any) {
        return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
      }
    }
  );

  api.get(
    '/found-matches/:id',
    middlewareVerifyReporterJWT(true),
    requireNumericParams(['id']),
    async (c) => {
      const foundId = Number(c.req.param('id'));
      const prisma = initializePrismaClient(c);
      try {
        // first retrieve the found person
        const found = await prisma.founds.findUnique({
          where: { id: foundId },
        });
        if (!found) {
          return c.json({ error: ErrorCodes.NOT_FOUND }, 404);
        }

        // retrieve the potential matches from the database , keep just the closest matches
        const potentialMatches = await prisma.losts.findMany({
          where: {
            gender: found.gender,
            age: {
              gte: found.age ? found.age - 3 : undefined,
              lte: found.age ? found.age + 3 : undefined,
            },
            lastSeenDate: {
              lte: found.foundDate || undefined,
            },
          },
        });

        let matchesByFacialRecognition = [];
        // if the lost person has a photo, compare it with the photos of the potential matches
        if (found.photo && found.photoMimeType) {
          // the compare faces function requires the images to be in base64 format
          // convert the found person's photo to base64
          const foundImageBase64 = await convertR2FileToBase64(
            c,
            found.photo,
            found.photoMimeType,
            c.env.FOUND_PHOTOS
          );
          // loop through the potential matches and compare the lost person's photo with each match's photo
          if (potentialMatches.length > 0) {
            for (let i = 0; i < potentialMatches.length; i++) {
              const element = potentialMatches[i];
              if (element.photo && element.photoMimeType) {
                const elementImageBase64 = await convertR2FileToBase64(
                  c,
                  element.photo,
                  element.photoMimeType,
                  c.env.LOST_PHOTOS
                );
                if (foundImageBase64 != null && elementImageBase64 != null) {
                  const facialRecognition = await compareFaces(
                    c,
                    foundImageBase64,
                    elementImageBase64
                  );
                  // if the confidence level is above 90%, consider the match as a potential match
                  if (facialRecognition.confidence > 70) {
                    matchesByFacialRecognition.push({
                      ...element,
                      facialRecognition: facialRecognition,
                    });
                    if (facialRecognition.confidence > 90) {
                      // that mean we have a match ,is not necessary to continue
                      break;
                    }
                  }
                } else {
                  continue;
                }
              } else {
                continue;
              }
            }
          }
        }
        return c.json({ found, matches: matchesByFacialRecognition }, 200);
      } catch (error: any) {
        return c.json({ error: ErrorCodes.INTERNAL_SERVER_ERROR }, 500);
      }
    }
  );
}
