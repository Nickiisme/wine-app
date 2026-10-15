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

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = String(reader.result || "");
      const separator = result.indexOf(",");
      if (separator < 0) {
        reject(new Error("无法读取酒标照片"));
        return;
      }
      resolve(result.slice(separator + 1));
    }, { once: true });
    reader.addEventListener("error", () => reject(new Error("无法读取酒标照片")), { once: true });
    reader.readAsDataURL(file);
  });
}

export async function recognizeWineLabel(file: File): Promise<WineLabelRecognition> {
  const { cloudbaseApp, ensureCloudbaseUser } = await import("./cloudbase");
  await ensureCloudbaseUser();
  const imageBase64 = await fileToBase64(file);
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
