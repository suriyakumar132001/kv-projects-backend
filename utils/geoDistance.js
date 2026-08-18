// =========================================
// KV Projects ERP
// GPS Distance Utility
// =========================================
//
// Pure-math Haversine distance between two lat/lng points, returned
// in meters. Used to check a check-in's reported coordinates
// against a Site's registered coordinates (see verifyLocation() in
// attendanceController.js). No external geolocation API involved —
// this only compares numbers the browser's Geolocation API and the
// Site record already have.
// =========================================

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

/**
 * Returns the great-circle distance between two coordinates, in
 * meters. All four arguments must be numbers (already validated by
 * the caller — see verifyLocation()).
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
};

module.exports = { getDistanceInMeters };
