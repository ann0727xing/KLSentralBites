export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Data/blob URLs need unoptimized Next/Image */
export function needsUnoptimizedImage(src: string): boolean {
  return src.startsWith("data:") || src.startsWith("blob:");
}
