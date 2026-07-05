import { Request, Response, NextFunction } from 'express';
import { KENYA_COUNTY_CENTROIDS } from '../data/kenyaCountyCentroids.js';
import { ValidateGpsQuery } from '../schemas/validateGps.query.schema.js';

const VALID_RADIUS_KM = 60;
const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestCounty(lat: number, lng: number): { county: string; distanceKm: number } {
  let nearest = KENYA_COUNTY_CENTROIDS[0];
  let nearestDistance = Infinity;
  for (const centroid of KENYA_COUNTY_CENTROIDS) {
    const distance = haversineDistanceKm(lat, lng, centroid.lat, centroid.lng);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = centroid;
    }
  }
  return { county: nearest.county, distanceKm: nearestDistance };
}

export function validateGps(req: Request, res: Response, _next: NextFunction): void {
  const { lat, lng, county } = req.query as unknown as ValidateGpsQuery;

  const declaredCentroid = KENYA_COUNTY_CENTROIDS.find(
    (c) => c.county.toLowerCase() === county.toLowerCase(),
  );

  if (!declaredCentroid) {
    res.status(400).json({
      error_code: 'UNKNOWN_COUNTY',
      message_key: 'error.validation.unknown_county',
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const distanceKm = haversineDistanceKm(lat, lng, declaredCentroid.lat, declaredCentroid.lng);
  const valid = distanceKm <= VALID_RADIUS_KM;
  const nearest = findNearestCounty(lat, lng);

  res.json({
    data: {
      valid,
      distanceKm: Math.round(distanceKm * 10) / 10,
      nearestCounty: valid ? undefined : nearest.county,
    },
  });
}
