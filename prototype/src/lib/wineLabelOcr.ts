import { platform } from "../platform/web";
import type { PhotoFile } from "../platform/photos";
export type WineLabelRecognition = {
  rawText: string[];
  wine: string;
  year: string;
  grape: string;
  country: string;
  region: string;
  confidence: number;
};

type WineLabelFunctionResult =
  | ({ ok: true } & WineLabelRecognition)
  | { ok: false; error?: { code?: string; message?: string } };

export async function recognizeWineLabel(file: PhotoFile): Promise<WineLabelRecognition> {
  const { cloudbaseApp, ensureCloudbaseUser } = await import("./cloudbase");
  await ensureCloudbaseUser();
  const imageBase64 = await platform.readBase64(file);
  const response = await cloudbaseApp.callFunction({
    name: "recognizeWineLabel",
    data: { imageBase64 },
    parse: true,
  });

  if (response.code) throw new Error(response.message || `云函数调用失败：${response.code}`);
  const result = (typeof response.result === "string" ? JSON.parse(response.result) : response.result) as WineLabelFunctionResult | undefined;
  if (!result) throw new Error("酒标识别未返回结果");
  if (!result.ok) throw new Error(result.error?.message || "酒标识别失败");
  return result;
}
