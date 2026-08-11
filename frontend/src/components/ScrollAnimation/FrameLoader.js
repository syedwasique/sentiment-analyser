/**
 * FrameLoader.js - Dynamic Frame Path Generator & Image Preloader
 * MindPulse Scroll-Driven Canvas Animation
 */

export const TOTAL_FRAMES = 192;

/**
 * Dynamically generates an array of frame image URLs.
 * Matches /frames/frame_0001.png -> /frames/frame_0192.png
 * @param {number} totalFrames 
 * @param {string} folderPath 
 * @param {string} prefix 
 * @param {string} extension 
 * @returns {string[]}
 */
export function generateFramePaths(
  totalFrames = TOTAL_FRAMES,
  folderPath = '/frames',
  prefix = 'frame_',
  extension = 'png'
) {
  const paths = [];
  for (let i = 1; i <= totalFrames; i++) {
    const paddedIndex = String(i).padStart(4, '0');
    paths.push(`${folderPath}/${prefix}${paddedIndex}.${extension}`);
  }
  return paths;
}

/**
 * Preloads all frames into HTML Image objects via Promise.all
 * Tracks real-time loading progress.
 * @param {string[]} framePaths 
 * @param {function(number, number, number): void} onProgress 
 * @returns {Promise<HTMLImageElement[]>}
 */
export function preloadFrames(framePaths, onProgress) {
  let loadedCount = 0;
  const totalCount = framePaths.length;

  const promises = framePaths.map((src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;

      img.onload = () => {
        loadedCount++;
        if (onProgress) {
          const pct = Math.round((loadedCount / totalCount) * 100);
          onProgress(loadedCount, totalCount, pct);
        }
        resolve(img);
      };

      img.onerror = () => {
        // Fallback gracefully on missing frame so loading doesn't hang
        console.warn(`[FrameLoader] Could not load frame: ${src}`);
        loadedCount++;
        if (onProgress) {
          const pct = Math.round((loadedCount / totalCount) * 100);
          onProgress(loadedCount, totalCount, pct);
        }
        resolve(img);
      };
    });
  });

  return Promise.all(promises);
}
