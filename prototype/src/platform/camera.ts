import { platform } from "./web";
import type { PhotoFile } from "./photos";

export async function requestCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("当前浏览器不支持内嵌相机，请使用系统相机或相册。");
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
}

export async function attachCamera(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  await video.play();
}

export function stopCamera(stream: MediaStream | null, video: HTMLVideoElement | null) {
  stream?.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
}

export function captureCamera(video: HTMLVideoElement): Promise<{ file: PhotoFile; url: string } | null> {
  if (!video.videoWidth || !video.videoHeight) return Promise.resolve(null);
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext("2d")?.drawImage(video, 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ? {
    file: new File([blob], `wine-label-${Date.now()}.jpg`, { type: "image/jpeg" }),
    url: platform.createPreview(blob),
  } : null), "image/jpeg", 0.92));
}

export function cameraErrorMessage(error: unknown) {
  return error instanceof DOMException && error.name === "NotAllowedError"
    ? "未获得相机权限。可以在浏览器设置中允许，或使用系统相机、相册。"
    : error instanceof Error ? error.message : "相机暂不可用，请使用系统相机或相册。";
}
