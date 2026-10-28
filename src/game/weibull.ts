/** Sample wind speed (km/h) from Weibull(scale A, shape k). */
export function sampleWeibullKmh(scaleA: number, shapeK: number): number {
  const u = Math.max(1e-9, Math.min(1 - 1e-9, Math.random()));
  return scaleA * Math.pow(-Math.log(1 - u), 1 / shapeK);
}

export const WIND_WEIBULL_A_KMH = 21;
export const WIND_WEIBULL_K = 3;
/** Bar fill maps 0 … this speed to 0–100% width. */
export const WIND_DISPLAY_MAX_KMH = 48;
