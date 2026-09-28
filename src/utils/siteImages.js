/**
 * Marketing photos in public/images/site come in several widths, as WebP
 * (e.g. hero-yoga-640.webp, -1280, -1920). This builds src + srcSet so the
 * browser downloads only the size the layout needs.
 *
 * @param {string} name   file stem, e.g. "hero-yoga"
 * @param {number[]} widths available widths, smallest first
 */
export function siteImage(name, widths) {
  const url = (w) => `/images/site/${name}-${w}.webp`;
  return {
    src: url(widths[widths.length - 1]),
    srcSet: widths.map((w) => `${url(w)} ${w}w`).join(", "),
  };
}

export const HERO_WIDTHS = [640, 1280, 1920];
export const TILE_WIDTHS = [480, 960];
export const BAND_WIDTHS = [800, 1600];
