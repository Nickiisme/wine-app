"use strict";

const tencentcloud = require("tencentcloud-sdk-nodejs-ocr");

const { Client: OcrClient } = tencentcloud.ocr.v20181119;
const MAX_BASE64_LENGTH = 4_500_000;

const GRAPES = [
  ["赤霞珠", /cabernet\s+sauvignon|赤霞珠/i],
  ["梅洛", /\bmerlot\b|梅洛/i],
  ["黑皮诺", /pinot\s+noir|黑皮诺/i],
  ["霞多丽", /chardonnay|霞多丽/i],
  ["长相思", /sauvignon\s+blanc|长相思/i],
  ["雷司令", /riesling|雷司令/i],
  ["西拉", /\bsyrah\b|\bshiraz\b|西拉/i],
  ["歌海娜", /grenache|garnacha|歌海娜/i],
  ["桑娇维塞", /sangiovese|桑娇维塞/i],
  ["丹魄", /tempranillo|丹魄/i],
  ["马尔贝克", /malbec|马尔贝克/i],
  ["内比奥罗", /nebbiolo|内比奥罗/i],
  ["白诗南", /chenin\s+blanc|白诗南/i],
  ["灰皮诺", /pinot\s+(gris|grigio)|灰皮诺/i],
  ["佳美", /\bgamay\b|佳美/i],
  ["仙粉黛", /zinfandel|primitivo|仙粉黛/i],
  ["佳美娜", /carm[eé]n[eè]re|佳美娜/i],
  ["马瑟兰", /marselan|马瑟兰/i],
];

const PLACES = [
  ["法国", "波尔多", /bordeaux|波尔多/i],
  ["法国", "勃艮第", /bourgogne|burgundy|勃艮第/i],
  ["法国", "香槟", /champagne|香槟/i],
  ["法国", "罗讷河谷", /rh[oô]ne|罗讷/i],
  ["法国", "卢瓦尔河谷", /loire|卢瓦尔/i],
  ["意大利", "托斯卡纳", /toscana|tuscany|托斯卡纳/i],
  ["意大利", "皮埃蒙特", /piemonte|piedmont|皮埃蒙特/i],
  ["意大利", "威尼托", /veneto|威尼托/i],
  ["西班牙", "里奥哈", /rioja|里奥哈/i],
  ["西班牙", "杜埃罗河岸", /ribera\s+del\s+duero|杜埃罗/i],
  ["美国", "纳帕谷", /napa\s+valley|纳帕/i],
  ["美国", "索诺玛", /sonoma|索诺玛/i],
  ["澳大利亚", "巴罗萨谷", /barossa|巴罗萨/i],
  ["新西兰", "马尔堡", /marlborough|马尔堡/i],
  ["智利", "迈坡谷", /maipo|迈坡/i],
  ["阿根廷", "门多萨", /mendoza|门多萨/i],
  ["南非", "斯泰伦博斯", /stellenbosch|斯泰伦博斯/i],
  ["中国", "宁夏贺兰山东麓", /宁夏|贺兰山|ningxia/i],
];

const COUNTRIES = [
  ["法国", /\bfrance\b|produit\s+de\s+france|法国/i],
  ["意大利", /\bitaly\b|italia|意大利/i],
  ["西班牙", /\bspain\b|espa[nñ]a|西班牙/i],
  ["德国", /\bgermany\b|deutschland|德国/i],
  ["葡萄牙", /\bportugal\b|葡萄牙/i],
  ["美国", /\busa\b|united\s+states|california|美国/i],
  ["澳大利亚", /australia|澳大利亚/i],
  ["新西兰", /new\s+zealand|新西兰/i],
  ["智利", /\bchile\b|智利/i],
  ["阿根廷", /argentina|阿根廷/i],
  ["南非", /south\s+africa|南非/i],
  ["中国", /\bchina\b|中国/i],
];

function firstMatch(text, entries) {
  return entries.find((entry) => entry[1].test(text))?.[0] || "";
}

function pickWineName(detections, excludedText) {
  const excluded = /\b(19|20)\d{2}\b|alc\.?|%\s*vol|appellation|mis(e|es)\s+en\s+bouteille|product\s+of|produce\s+of|葡萄酒|酒精度|原产国/i;
  const candidates = detections
    .map((item, index) => ({
      text: String(item.DetectedText || "").trim(),
      confidence: Number(item.Confidence || 0),
      size: Number(item.ItemPolygon?.Height || 0) * Number(item.ItemPolygon?.Width || 0),
      index,
    }))
    .filter((item) => item.text.length >= 3 && /[A-Za-z\u4e00-\u9fff]/.test(item.text))
    .filter((item) => !excluded.test(item.text) && !excludedText.test(item.text));
  candidates.sort((a, b) => b.size - a.size || b.confidence - a.confidence || a.index - b.index);
  return candidates[0]?.text || "";
}

function extractWineInfo(detections) {
  const rawText = detections.map((item) => String(item.DetectedText || "").trim()).filter(Boolean);
  const text = rawText.join("\n");
  const currentYear = new Date().getUTCFullYear() + 1;
  const years = [...text.matchAll(/\b(19\d{2}|20\d{2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((year) => year >= 1900 && year <= currentYear);
  const place = PLACES.find((entry) => entry[2].test(text));
  const grape = firstMatch(text, GRAPES);
  const country = place?.[0] || firstMatch(text, COUNTRIES);
  const region = place?.[1] || "";
  const exclusionPatterns = [...GRAPES.map((entry) => entry[1]), ...PLACES.map((entry) => entry[2]), ...COUNTRIES.map((entry) => entry[1])];
  const excludedText = new RegExp(exclusionPatterns.map((pattern) => pattern.source).join("|"), "i");
  const confidences = detections.map((item) => Number(item.Confidence || 0)).filter((value) => value > 0);
  const confidence = confidences.length
    ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length) / 100
    : 0;

  return {
    rawText,
    wine: pickWineName(detections, excludedText),
    year: years[0] ? String(years[0]) : "",
    grape,
    country,
    region,
    confidence,
  };
}

function credentialsFrom(context) {
  const dedicatedSecretId = process.env.WINE_OCR_SECRET_ID;
  const dedicatedSecretKey = process.env.WINE_OCR_SECRET_KEY;
  if (dedicatedSecretId && dedicatedSecretKey) {
    return { secretId: dedicatedSecretId, secretKey: dedicatedSecretKey };
  }

  const secretId = context?.TENCENTCLOUD_SECRETID || process.env.TENCENTCLOUD_SECRETID;
  const secretKey = context?.TENCENTCLOUD_SECRETKEY || process.env.TENCENTCLOUD_SECRETKEY;
  const token = context?.TENCENTCLOUD_SESSIONTOKEN || process.env.TENCENTCLOUD_SESSIONTOKEN;
  if (!secretId || !secretKey) {
    throw new Error("云函数没有可用的 OCR 凭证，请配置运行角色或 WINE_OCR_SECRET_ID/WINE_OCR_SECRET_KEY");
  }
  return { secretId, secretKey, token };
}

exports.main = async (event, context) => {
  try {
    const imageBase64 = String(event?.imageBase64 || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    if (!imageBase64) throw new Error("缺少酒标图片");
    if (imageBase64.length > MAX_BASE64_LENGTH) throw new Error("图片过大，请压缩后重试");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) throw new Error("图片数据格式不正确");

    const client = new OcrClient({
      credential: credentialsFrom(context),
      region: "ap-guangzhou",
      profile: { httpProfile: { endpoint: "ocr.tencentcloudapi.com", reqTimeout: 20 } },
    });
    const response = await client.GeneralAccurateOCR({
      ImageBase64: imageBase64,
      IsWords: false,
    });
    return { ok: true, ...extractWineInfo(response.TextDetections || []) };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: String(error?.code || "OCR_CALL_FAILED"),
        message: String(error?.message || "OCR 调用失败"),
      },
    };
  }
};
