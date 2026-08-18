// =========================================
// KV Projects ERP
// Face Descriptor Distance Utility
// =========================================
//
// Pure-math Euclidean distance between two 128-length face
// descriptors. No image processing happens here — face detection
// and descriptor extraction both run in the browser (face-api.js).
// This just compares the numbers the browser already computed,
// the same way getDistanceInMeters() compares two GPS points.
// =========================================

const FACE_DESCRIPTOR_LENGTH = 128;

/**
 * Returns the Euclidean distance between two face descriptors, or
 * null if either isn't a valid 128-length numeric array. Lower
 * distance = more similar faces. face-api.js's own docs suggest
 * ~0.6 as a loose match and ~0.4 as a confident one; this project
 * uses 0.5 (see FACE_MATCH_THRESHOLD in attendanceController.js).
 */
const getEuclideanDistance = (descriptorA, descriptorB) => {
  if (
    !Array.isArray(descriptorA) ||
    !Array.isArray(descriptorB) ||
    descriptorA.length !== FACE_DESCRIPTOR_LENGTH ||
    descriptorB.length !== FACE_DESCRIPTOR_LENGTH
  ) {
    return null;
  }

  let sumOfSquares = 0;

  for (let i = 0; i < descriptorA.length; i += 1) {
    const diff = descriptorA[i] - descriptorB[i];
    sumOfSquares += diff * diff;
  }

  return Math.sqrt(sumOfSquares);
};

const isValidDescriptor = (descriptor) =>
  Array.isArray(descriptor) &&
  descriptor.length === FACE_DESCRIPTOR_LENGTH &&
  descriptor.every((n) => typeof n === "number" && Number.isFinite(n));

module.exports = {
  getEuclideanDistance,
  isValidDescriptor,
  FACE_DESCRIPTOR_LENGTH,
};
