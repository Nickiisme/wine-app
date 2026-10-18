import { platform } from "./web";

export type PhotoFile = File;
export type DraftPhoto = { id: string; preview: string; file: PhotoFile; preparedFile: Promise<PhotoFile> };

async function optimizePhoto(file: PhotoFile): Promise<PhotoFile> {
  if (!file.type.startsWith("image/")) return file;
  const objectUrl = platform.createPreview(file);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error("无法解析照片")), { once: true });
      image.src = objectUrl;
    });
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1 && file.size <= 1_000_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "wine-photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch { return file; }
  finally { platform.revokePreview(objectUrl); }
}

export function preparePhotos(files: PhotoFile[]): DraftPhoto[] {
  const resolvers: Array<(file: PhotoFile) => void> = [];
  const preparedFiles = files.map(() => new Promise<PhotoFile>((resolve) => resolvers.push(resolve)));
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(3, files.length) }, async () => {
    while (nextIndex < files.length) { const index = nextIndex++; resolvers[index](await optimizePhoto(files[index])); }
  });
  void Promise.all(workers);
  return files.map((file, index) => ({ id: platform.id(), preview: platform.createPreview(file), file, preparedFile: preparedFiles[index] }));
}
