// Class mergers
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hasPresenceChanged = (
  oldState: Record<string, any>,
  newState: Record<string, any>,
) => {
  const oldKeys = Object.keys(oldState);
  const newKeys = Object.keys(newState);

  // 1. Did someone join or leave? (Fastest check)
  if (oldKeys.length !== newKeys.length) return true;

  // 2. Did someone's specific status or activity change?
  for (const key of newKeys) {
    const oldUser = oldState[key]?.[0];
    const newUser = newState[key]?.[0];

    // Bail out immediately if we spot a difference
    if (
      !oldUser ||
      oldUser.status !== newUser.status ||
      oldUser.activity !== newUser.activity
    ) {
      return true;
    }
  }

  // If we made it here, absolutely nothing changed.
  return false;
};

export const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 256; // Perfect size for avatars
        const scaleSize = MAX_WIDTH / img.width;

        // Calculate new dimensions
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to WebP at 80% quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            // Create a new File object
            const compressedFile = new File([blob], file.name, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/webp',
          0.8,
        );
      };

      img.onerror = (error) => reject(error);
    };

    reader.onerror = (error) => reject(error);
  });
};

// Helper to safely load the image into memory
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

// The heavy lifter
export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  fileName: string = 'avatar.webp',
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context found');
  }

  // Lock the canvas strictly to our 720x720 target resolution
  const TARGET_SIZE = 720;
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;

  // The math: We take the source image (sx, sy, sWidth, sHeight)
  // and map it exactly to the canvas dimensions (dx, dy, dWidth, dHeight)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE,
  );

  // Convert the canvas to a highly optimized WebP file
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        const file = new File([blob], fileName, {
          type: 'image/webp',
          lastModified: Date.now(),
        });
        resolve(file);
      },
      'image/webp',
      0.85, // 85% quality is the sweet spot for file size vs crispness
    );
  });
}
