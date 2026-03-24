export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const round = (v: number, d = 100) => Math.round(v * d) / d;
