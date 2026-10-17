import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from "react";
import { ArrowLeftIcon, BookmarkFilledIcon, CameraIcon, CheckCircledIcon, CheckIcon, ChevronDownIcon, DrawingPinFilledIcon, GlobeIcon, ImageIcon, LayersIcon, Pencil2Icon, PersonIcon, PlusIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard, useKeyboardInsets } from "./mobile";
import { buildKnowledgeFeedback, buildSaveFeedback, canSaveRecord, createTastingRecord, getFeedbackEvidence, listTastingRecords, type RecordFieldMetadata, type TastingRecord } from "./lib/tastingRecords";
import { filterTastingRecords, summarizeGrapes, summarizeRegions, type RecordFilter } from "./lib/footprintSummaries";
import { trackRecordEvent, type RecordAnalyticsProperties } from "./lib/analytics";
import { consumeCellarEntry, createCellarEntry, listCellarEntries, listCellarMovements, updateCellarEntry, type CellarEntry, type CellarInput, type CellarMovement } from "./lib/cellar";
import { recognizeWineLabel } from "./lib/wineLabelOcr";
import { MapCountryLayers } from "./MapCountryLayers";
import { aggregateMapRecords, EXTRA_COUNTRIES, MAP_ZOOM, placeMapLabels, WORLD_COUNTRIES } from "./lib/mapLayers";
import { CORE_GRAPES, GRAPE_CHAPTERS, SPECIAL_GRAPES, canonicalGrapeName, firstNewSpecialDiscovery, grapeCounts as countGrapes, recommendedGrapes, recordGrapeNames, specialDiscoveries } from "./lib/grapeCatalog";
import { CellarConsumeScreen, CellarDetailScreen, CellarListScreen, CellarPurchaseScreen, type PurchaseDraft } from "./CellarScreens";
import type { WineAccount } from "./lib/cloudbase";
import "./locked-overrides.css";
import "./onboarding.css";
import { localDate, tastingDate, tastingTime, tastingLabel, validateTastingDate } from "./lib/tastingDates";
import { TastingDatePicker } from "./TastingDatePicker";
import { RecordEditor } from "./RecordEditor";
import { softDeleteTastingRecord } from "./lib/tastingRecords";

type Screen = "activity" | "onboarding" | "explore" | "allGrapes" | "confirm" | "taste" | "success" | "profile" | "records" | "grapeSummary" | "regionSummary" | "flavor" | "share" | "settings" | "auth" | "cellar" | "cellarConfirm" | "cellarPurchase" | "cellarDetail" | "cellarConsume";
type ExploreTab = "grapes" | "regions";
type DraftPhoto = { id: string; preview: string; file: File; preparedFile: Promise<File> };
type WineDraft = { wine: string; year: string; grapes: string[]; country: string; region: string; winery: string; photos: DraftPhoto[]; fieldMetadata: RecordFieldMetadata };
type PickerOption = { value: string; label: string };
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const getAccountApi = () => import("./lib/cloudbase");

type InputMethod = "camera" | "gallery" | "manual";
type LabelScanState = "idle" | "scanning" | "success" | "error";

function getRecordAnalyticsProperties(record: TastingRecord, inputMethod: InputMethod): RecordAnalyticsProperties {
  const evidence = getFeedbackEvidence(record);
  const grapeName = record.grapes?.find((grape) => grape && grape !== "不确定") || record.grape.split("、").find((grape) => grape && grape !== "不确定") || "";
  const hasKnowledge = Boolean(CORE_GRAPES.find((grape) => grape.chinese_name === canonicalGrapeName(grapeName))?.aromas.length);
  return {
    record_mode: evidence.mode,
    input_method: inputMethod,
    has_photo: Boolean(record.photos?.length),
    has_wine_name: Boolean(record.wine.trim() && record.wine !== "未命名酒款"),
    has_confirmed_scan: Object.values(record.fieldMetadata ?? {}).some((metadata) => metadata?.source === "label_scan" && metadata.confirmed === true),
    has_preference: Boolean(evidence.confirmedPreference),
    has_body: evidence.confirmedBodyLevel !== undefined,
    flavor_count: evidence.confirmedFlavors.length,
    has_note: evidence.hasUserNote,
    feedback_type: evidence.mode === "tasting" ? "personal" : hasKnowledge ? "knowledge" : "collection",
  };
}

const flavors = ["草莓", "樱桃", "花香", "香草", "香料", "烟熏"];
const bodyChoices = [
  { label: "轻盈", value: 20 },
  { label: "偏轻盈", value: 38 },
  { label: "适中", value: 52 },
  { label: "偏饱满", value: 70 },
  { label: "饱满", value: 88 },
];
const bilingual = (value: string, english: string): PickerOption => ({ value, label: `${value} · ${english}` });
const grapeOptions: PickerOption[] = [...CORE_GRAPES, ...SPECIAL_GRAPES].map((grape) => bilingual(grape.chinese_name, grape.english_name));
const countryOptions: PickerOption[] = [
  bilingual("法国", "France"), bilingual("意大利", "Italy"), bilingual("西班牙", "Spain"), bilingual("德国", "Germany"), bilingual("葡萄牙", "Portugal"),
  bilingual("美国", "United States"), bilingual("澳大利亚", "Australia"), bilingual("新西兰", "New Zealand"), bilingual("智利", "Chile"), bilingual("阿根廷", "Argentina"),
  bilingual("南非", "South Africa"), bilingual("中国", "China"), bilingual("奥地利", "Austria"), bilingual("匈牙利", "Hungary"), bilingual("希腊", "Greece"),
  bilingual("加拿大", "Canada"), bilingual("格鲁吉亚", "Georgia"), bilingual("日本", "Japan"), bilingual("乌拉圭", "Uruguay"),
];
const regionOptionsByCountry: Record<string, PickerOption[]> = {
  法国: [bilingual("勃艮第", "Burgundy"), bilingual("波尔多", "Bordeaux"), bilingual("香槟", "Champagne"), bilingual("卢瓦尔河谷", "Loire Valley"), bilingual("罗讷河谷", "Rhône Valley"), bilingual("阿尔萨斯", "Alsace"), bilingual("普罗旺斯", "Provence"), bilingual("朗格多克-鲁西永", "Languedoc-Roussillon"), bilingual("博若莱", "Beaujolais"), bilingual("汝拉", "Jura")],
  意大利: [bilingual("托斯卡纳", "Tuscany"), bilingual("皮埃蒙特", "Piedmont"), bilingual("威尼托", "Veneto"), bilingual("西西里", "Sicily"), bilingual("弗留利", "Friuli"), bilingual("特伦蒂诺-上阿迪杰", "Trentino-Alto Adige"), bilingual("艾米利亚-罗马涅", "Emilia-Romagna"), bilingual("普利亚", "Puglia"), bilingual("坎帕尼亚", "Campania"), bilingual("撒丁岛", "Sardinia")],
  西班牙: [bilingual("里奥哈", "Rioja"), bilingual("杜埃罗河岸", "Ribera del Duero"), bilingual("普里奥拉托", "Priorat"), bilingual("佩内德斯", "Penedès"), bilingual("下海湾", "Rías Baixas"), bilingual("卢埃达", "Rueda"), bilingual("赫雷斯", "Jerez"), bilingual("托罗", "Toro"), bilingual("比埃尔索", "Bierzo"), bilingual("拉曼恰", "La Mancha")],
  德国: [bilingual("摩泽尔", "Mosel"), bilingual("莱茵高", "Rheingau"), bilingual("法尔兹", "Pfalz"), bilingual("莱茵黑森", "Rheinhessen"), bilingual("巴登", "Baden"), bilingual("纳赫", "Nahe"), bilingual("弗兰肯", "Franken"), bilingual("阿尔", "Ahr")],
  葡萄牙: [bilingual("杜罗河谷", "Douro"), bilingual("绿酒产区", "Vinho Verde"), bilingual("阿连特茹", "Alentejo"), bilingual("杜奥", "Dão"), bilingual("百拉达", "Bairrada"), bilingual("马德拉", "Madeira"), bilingual("塞图巴尔", "Setúbal")],
  美国: [bilingual("纳帕谷", "Napa Valley"), bilingual("索诺玛", "Sonoma"), bilingual("威拉米特谷", "Willamette Valley"), bilingual("圣巴巴拉", "Santa Barbara"), bilingual("帕索罗布尔斯", "Paso Robles"), bilingual("哥伦比亚谷", "Columbia Valley"), bilingual("手指湖", "Finger Lakes"), bilingual("门多西诺", "Mendocino")],
  澳大利亚: [bilingual("巴罗萨谷", "Barossa Valley"), bilingual("雅拉谷", "Yarra Valley"), bilingual("玛格丽特河", "Margaret River"), bilingual("猎人谷", "Hunter Valley"), bilingual("麦克拉伦谷", "McLaren Vale"), bilingual("库纳瓦拉", "Coonawarra"), bilingual("阿德莱德山区", "Adelaide Hills"), bilingual("克莱尔谷", "Clare Valley"), bilingual("伊顿谷", "Eden Valley"), bilingual("塔斯马尼亚", "Tasmania")],
  新西兰: [bilingual("马尔堡", "Marlborough"), bilingual("中奥塔哥", "Central Otago"), bilingual("霍克斯湾", "Hawke's Bay"), bilingual("马丁堡", "Martinborough"), bilingual("纳尔逊", "Nelson"), bilingual("坎特伯雷", "Canterbury"), bilingual("吉斯本", "Gisborne"), bilingual("奥克兰", "Auckland")],
  智利: [bilingual("迈坡谷", "Maipo Valley"), bilingual("空加瓜谷", "Colchagua Valley"), bilingual("卡萨布兰卡谷", "Casablanca Valley"), bilingual("阿空加瓜谷", "Aconcagua Valley"), bilingual("利马里谷", "Limarí Valley"), bilingual("库里科谷", "Curicó Valley"), bilingual("伊塔塔谷", "Itata Valley"), bilingual("比奥比奥谷", "Bío Bío Valley")],
  阿根廷: [bilingual("门多萨", "Mendoza"), bilingual("优克谷", "Uco Valley"), bilingual("萨尔塔", "Salta"), bilingual("卡法亚特", "Cafayate"), bilingual("巴塔哥尼亚", "Patagonia"), bilingual("圣胡安", "San Juan")],
  南非: [bilingual("斯泰伦博斯", "Stellenbosch"), bilingual("斯沃特兰", "Swartland"), bilingual("帕尔", "Paarl"), bilingual("康斯坦蒂亚", "Constantia"), bilingual("沃克湾", "Walker Bay"), bilingual("罗伯森", "Robertson"), bilingual("黑地", "Elgin")],
  中国: [bilingual("宁夏贺兰山东麓", "Ningxia Helan Mountain East Foothills"), bilingual("新疆", "Xinjiang"), bilingual("山东蓬莱", "Penglai, Shandong"), bilingual("云南香格里拉", "Shangri-La, Yunnan"), bilingual("河北怀来", "Huailai, Hebei"), bilingual("甘肃河西走廊", "Hexi Corridor, Gansu"), bilingual("北京房山", "Fangshan, Beijing")],
  奥地利: [bilingual("瓦豪", "Wachau"), bilingual("坎普谷", "Kamptal"), bilingual("克雷姆斯谷", "Kremstal"), bilingual("布尔根兰", "Burgenland"), bilingual("葡萄酒区", "Weinviertel"), bilingual("施蒂里亚", "Styria")],
  匈牙利: [bilingual("托卡伊", "Tokaj"), bilingual("埃格尔", "Eger"), bilingual("维拉尼", "Villány"), bilingual("绍姆洛", "Somló"), bilingual("巴拉顿", "Balaton")],
  希腊: [bilingual("圣托里尼", "Santorini"), bilingual("尼米亚", "Nemea"), bilingual("纳乌萨", "Naoussa"), bilingual("克里特", "Crete"), bilingual("曼蒂尼亚", "Mantinia")],
  加拿大: [bilingual("奥肯那根谷", "Okanagan Valley"), bilingual("尼亚加拉半岛", "Niagara Peninsula"), bilingual("爱德华王子县", "Prince Edward County"), bilingual("安纳波利斯谷", "Annapolis Valley")],
  格鲁吉亚: [bilingual("卡赫季", "Kakheti"), bilingual("卡尔特利", "Kartli"), bilingual("伊梅列季", "Imereti"), bilingual("拉恰", "Racha")],
  日本: [bilingual("山梨", "Yamanashi"), bilingual("长野", "Nagano"), bilingual("北海道", "Hokkaido"), bilingual("山形", "Yamagata")],
  乌拉圭: [bilingual("卡内洛内斯", "Canelones"), bilingual("蒙得维的亚", "Montevideo"), bilingual("马尔多纳多", "Maldonado"), bilingual("科洛尼亚", "Colonia")],
};
const newDraft = (): WineDraft => ({ wine: "", year: "", grapes: [], country: "", region: "", winery: "", photos: [], fieldMetadata: {} });
const todayLocal = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const newPurchaseDraft = (): PurchaseDraft => ({ purchaseDate: todayLocal(), purchasePrice: "", currency: "CNY", quantity: "1", purchaseChannel: "", storageLocation: "", notes: "" });
const ONBOARDING_SEEN_KEY = "wine-atlas:onboarding-seen";

function rememberOnboarding() {
  window.localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}

function suggestNextTaste(record: TastingRecord) {
  const first = recordGrapeNames(record)[0];
  const next = recommendedGrapes([record])[0];
  return next ? `记录了${first || "这一杯"}，下一次可以探索${next.chinese_name}，比较两种葡萄的风格。` : "下一次可以探索另一种葡萄，比较不同品种的风格。";
}

async function optimizePhoto(file: File) {
  if (!file.type.startsWith("image/")) return file;
  const objectUrl = URL.createObjectURL(file);
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
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function preparePhotos(files: File[]) {
  const resolvers: Array<(file: File) => void> = [];
  const preparedFiles = files.map(() => new Promise<File>((resolve) => resolvers.push(resolve)));
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(3, files.length) }, async () => {
    while (nextIndex < files.length) {
      const index = nextIndex++;
      resolvers[index](await optimizePhoto(files[index]));
    }
  });
  void Promise.all(workers);
  return files.map((file, index) => ({ id: crypto.randomUUID(), preview: URL.createObjectURL(file), file, preparedFile: preparedFiles[index] }));
}

function keepEditorAboveKeyboard(editor: HTMLElement) {
  const scroll = editor.closest<HTMLElement>(".mobile-scroll");
  if (!scroll) return;
  const scrollBounds = scroll.getBoundingClientRect();
  const editorBounds = editor.getBoundingClientRect();
  const margin = 20;
  const visibleTop = scrollBounds.top + margin;
  const visibleBottom = scrollBounds.bottom - margin;
  let nextScrollTop = scroll.scrollTop;

  if (editorBounds.bottom > visibleBottom) {
    nextScrollTop += editorBounds.bottom - visibleBottom;
  } else if (editorBounds.top < visibleTop) {
    nextScrollTop -= visibleTop - editorBounds.top;
  }

  const maxScrollTop = Math.max(0, scroll.scrollHeight - scroll.clientHeight);
  const clamped = Math.max(0, Math.min(maxScrollTop, nextScrollTop));
  if (Math.abs(clamped - scroll.scrollTop) > 1) {
    scroll.scrollTo({ top: clamped, behavior: "smooth" });
  }
}

export default function Prototype() {
  const keyboard = useKeyboard();
  useEffect(() => {
    const firstBadge = new Image();
    firstBadge.src = asset("assets/badges/first-glass.png");
  }, []);
  const [screen, setScreen] = useState<Screen>("explore");
  const [dismissedExplorePrompt, setDismissedExplorePrompt] = useState<"empty" | "first" | null>(null);
  const [tab, setTab] = useState<ExploreTab>("grapes");
  const [recordSheet, setRecordSheet] = useState(false);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>(null);
  const [recordsOrigin, setRecordsOrigin] = useState<Screen>("profile");
  const [liked, setLiked] = useState<string | null>(null);
  const [tastedOn, setTastedOn] = useState(localDate);
  const [editingRecord, setEditingRecord] = useState<TastingRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TastingRecord | null>(null);
  const deletingRecord = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [tastingNote, setTastingNote] = useState("");
  const [bodyLevel, setBodyLevel] = useState<number | null>(null);
  const [draft, setDraft] = useState<WineDraft>(newDraft);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [savedRecord, setSavedRecord] = useState<TastingRecord | null>(null);
  const [newSpecialDiscovery, setNewSpecialDiscovery] = useState<{ name: string; first: boolean } | null>(null);
  const [newBadgeAward, setNewBadgeAward] = useState<BadgeDefinition | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [account, setAccount] = useState<WineAccount | null>(null);
  const accountRefreshVersion = useRef(0);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [inputMethod, setInputMethod] = useState<InputMethod>("manual");
  const [labelScanState, setLabelScanState] = useState<LabelScanState>("idle");
  const [labelScanMessage, setLabelScanMessage] = useState<string | null>(null);
  const [recordPurpose, setRecordPurpose] = useState<"tasting" | "cellar">("tasting");
  const [cellarEntries, setCellarEntries] = useState<CellarEntry[]>([]);
  const [cellarLoaded, setCellarLoaded] = useState(false);
  const [cellarError, setCellarError] = useState<string | null>(null);
  const [cellarActionError, setCellarActionError] = useState<string | null>(null);
  const [cellarBusy, setCellarBusy] = useState(false);
  const [cellarEntryId, setCellarEntryId] = useState<string | null>(null);
  const [editingCellarId, setEditingCellarId] = useState<string | null>(null);
  const [tastingCellarId, setTastingCellarId] = useState<string | null>(null);
  const [cellarMovements, setCellarMovements] = useState<CellarMovement[]>([]);
  const [cellarOpenSheet, setCellarOpenSheet] = useState(false);
  const [consumeMode, setConsumeMode] = useState<"mark" | "tasting">("mark");
  const [consumeDate, setConsumeDate] = useState(todayLocal);
  const [consumeQuantity, setConsumeQuantity] = useState("1");
  const [purchaseDraft, setPurchaseDraft] = useState<PurchaseDraft>(newPurchaseDraft);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const noteCameraInput = useRef<HTMLInputElement>(null);
  const noteGalleryInput = useRef<HTMLInputElement>(null);
  const selectedCellar = cellarEntries.find((entry) => entry.id === cellarEntryId) ?? null;
  const editingCellar = cellarEntries.find((entry) => entry.id === editingCellarId) ?? null;
  const tastingCellar = cellarEntries.find((entry) => entry.id === tastingCellarId) ?? null;
  const go = (next: Screen) => { keyboard.hide(); setScreen(next); };
  const openRecords = (filter: RecordFilter, origin: Screen) => { setRecordFilter(filter); setRecordsOrigin(origin); go("records"); };
  const resetRecord = () => { setTastedOn(localDate()); setDraft((current) => { current.photos.forEach((photo) => URL.revokeObjectURL(photo.preview)); return newDraft(); }); setTastingNote(""); setLiked(null); setSelectedFlavors([]); setBodyLevel(null); setTastingCellarId(null); setLabelScanState("idle"); setLabelScanMessage(null); };
  const startManualRecord = () => { setInputMethod("manual"); setRecordSheet(false); resetRecord(); go(recordPurpose === "cellar" ? "cellarConfirm" : "confirm"); };
  const openCamera = () => {
    setRecordPurpose("tasting");
    setInputMethod("camera");
    setRecordSheet(true);
    cameraInput.current?.click();
  };
  const openRecordChoices = () => { setRecordPurpose("tasting"); setRecordSheet(true); };
  const openCellarChoices = () => { setRecordPurpose("cellar"); setTastingCellarId(null); setEditingCellarId(null); setCellarActionError(null); setPurchaseDraft(newPurchaseDraft()); setRecordSheet(true); };
  const openGallery = () => { setInputMethod("gallery"); galleryInput.current?.click(); };
  const useSelectedPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const photo = preparePhotos([file])[0];
    const purpose = recordPurpose;
    resetRecord();
    setDraft({ ...newDraft(), photos: [photo] });
    setLabelScanState("scanning");
    setLabelScanMessage("正在识别酒标，请稍候……");
    setRecordSheet(false);
    go(purpose === "cellar" ? "cellarConfirm" : "confirm");
    try {
      const result = await recognizeWineLabel(await photo.preparedFile);
      const grapes = result.grape ? [result.grape] : [];
      const fieldMetadata: RecordFieldMetadata = {};
      if (result.wine) fieldMetadata.wine = { source: "label_scan", confirmed: false };
      if (result.year) fieldMetadata.year = { source: "label_scan", confirmed: false };
      if (grapes.length) fieldMetadata.grapes = { source: "label_scan", confirmed: false };
      if (result.country) fieldMetadata.country = { source: "label_scan", confirmed: false };
      if (result.region) fieldMetadata.region = { source: "label_scan", confirmed: false };
      setDraft((current) => ({
        ...current,
        wine: result.wine,
        year: result.year,
        grapes,
        country: result.country,
        region: result.region,
        fieldMetadata,
      }));
      setLabelScanState("success");
      setLabelScanMessage(result.rawText.length ? `已识别酒标，置信度 ${Math.round(result.confidence * 100)}%。请确认后继续。` : "未识别到清晰文字，可以手动填写。" );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "酒标识别失败";
      setLabelScanState("error");
      setLabelScanMessage(`识别失败：${detail}。你仍可以手动填写。`);
    }
  };
  const addNotePhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    setDraft((current) => {
      const availableSlots = Math.max(0, 9 - current.photos.length - (tastingCellar?.photoIds.length ?? 0));
      if (availableSlots === 0) return current;
      const nextPhotos = preparePhotos(files.slice(0, availableSlots));
      return { ...current, photos: [...current.photos, ...nextPhotos] };
    });
  };

  useEffect(() => {
    const timers = new Set<number>();
    const scheduleVisibilityCheck = (target: EventTarget | null, afterKeyboardTransition: boolean) => {
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => keepEditorAboveKeyboard(target)));
      if (afterKeyboardTransition) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          keepEditorAboveKeyboard(target);
        }, 300);
        timers.add(timer);
      }
    };
    const onFocus = (event: FocusEvent) => scheduleVisibilityCheck(event.target, true);
    const onInput = (event: Event) => scheduleVisibilityCheck(event.target, false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("input", onInput);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("input", onInput);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    let active = true;
    const version = accountRefreshVersion.current;
    const isCurrent = () => active && version === accountRefreshVersion.current;
    listTastingRecords()
      .then((cloudRecords) => {
        if (!isCurrent()) return;
        setRecords(cloudRecords);
        setRecordsLoaded(true);
        if (cloudRecords.length === 0 && window.localStorage.getItem(ONBOARDING_SEEN_KEY) !== "true") setScreen("onboarding");
        setCloudMessage(null);
      })
      .catch(() => {
        if (isCurrent()) { setRecordsLoaded(true); setCloudMessage("云端记录加载失败，请稍后重试"); }
      });
    getAccountApi()
      .then((accountApi) => accountApi.getCurrentAccount())
      .then((currentAccount) => { if (isCurrent()) setAccount(currentAccount); })
      .catch(() => { if (isCurrent()) setAccount(null); });
    listCellarEntries()
      .then((entries) => { if (isCurrent()) { setCellarEntries(entries); setCellarLoaded(true); setCellarError(null); } })
      .catch((error) => { if (isCurrent()) { setCellarLoaded(true); setCellarError(error instanceof Error ? error.message : "藏酒加载失败"); } });
    return () => { active = false; };
  }, []);

  const refreshCellar = async () => {
    try {
      setCellarEntries(await listCellarEntries());
      setCellarLoaded(true);
      setCellarError(null);
    } catch (error) {
      setCellarLoaded(true);
      setCellarError(error instanceof Error ? error.message : "藏酒加载失败");
      throw error;
    }
  };

  const refreshAccountData = async (nextAccount: WineAccount) => {
    const version = ++accountRefreshVersion.current;
    setAccount(nextAccount);
    setEditingRecord(null);
    setDeleteTarget(null);
    setRecords([]);
    setCellarEntries([]);
    setCellarMovements([]);
    setRecordsLoaded(false);
    setCellarLoaded(false);
    setCloudMessage(null);
    setCellarError(null);
    const [tastings, cellar] = await Promise.allSettled([listTastingRecords(), listCellarEntries()]);
    if (version !== accountRefreshVersion.current) return;
    if (tastings.status === "fulfilled") setRecords(tastings.value);
    else setCloudMessage("品鉴记录暂时加载失败，请稍后重试");
    if (cellar.status === "fulfilled") setCellarEntries(cellar.value);
    else setCellarError("藏酒暂时加载失败，请稍后重试");
    setRecordsLoaded(true);
    setCellarLoaded(true);
  };

  const openCellarDetail = (id: string) => {
    setCellarEntryId(id);
    setCellarMovements([]);
    setCellarActionError(null);
    go("cellarDetail");
    void listCellarMovements(id).then(setCellarMovements).catch(() => {});
  };

  const editCellar = (entry: CellarEntry) => {
    setTastingCellarId(null);
    setEditingCellarId(entry.id);
    setDraft({ ...newDraft(), wine: entry.wineName, year: entry.vintage, grapes: entry.grapes, country: entry.country, region: entry.region, winery: entry.winery });
    setPurchaseDraft({ purchaseDate: entry.purchaseDate.slice(0, 10), purchasePrice: entry.purchasePrice === null ? "" : String(entry.purchasePrice), currency: entry.currency, quantity: String(entry.quantityPurchased), purchaseChannel: entry.purchaseChannel, storageLocation: entry.storageLocation, notes: entry.notes });
    setCellarActionError(null);
    go("cellarConfirm");
  };

  const saveCellar = async () => {
    const quantity = Number(purchaseDraft.quantity);
    const price = purchaseDraft.purchasePrice.trim() === "" ? null : Number(purchaseDraft.purchasePrice);
    if (!draft.wine.trim() && draft.photos.length === 0 && !editingCellar?.photoIds.length && !draft.grapes.length && !draft.country && !draft.region) { setCellarActionError("至少添加一张照片或填写酒款信息。"); return; }
    if (!purchaseDraft.purchaseDate) { setCellarActionError("请选择购买日期。"); return; }
    if (!editingCellar && (!Number.isInteger(quantity) || quantity < 1)) { setCellarActionError("购买数量至少为 1 瓶。"); return; }
    if (price !== null && (!Number.isFinite(price) || price < 0)) { setCellarActionError("请输入有效的购买价格。"); return; }
    setCellarBusy(true);
    setCellarActionError(null);
    const input: CellarInput = { wineName: draft.wine, vintage: draft.year, grapes: draft.grapes, country: draft.country, region: draft.region, winery: draft.winery, purchaseDate: purchaseDraft.purchaseDate, purchasePrice: price, currency: purchaseDraft.currency, quantityPurchased: editingCellar?.quantityPurchased ?? quantity, purchaseChannel: purchaseDraft.purchaseChannel, storageLocation: purchaseDraft.storageLocation, notes: purchaseDraft.notes };
    try {
      input.photoFiles = await Promise.all(draft.photos.map((photo) => photo.preparedFile));
      const saved = editingCellar ? await updateCellarEntry(editingCellar, input) : await createCellarEntry(input);
      setCellarEntries((current) => editingCellar ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setCellarEntryId(saved.id);
      setEditingCellarId(null);
      draft.photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      setDraft(newDraft());
      openCellarDetail(saved.id);
    } catch (error) {
      setCellarActionError(error instanceof Error ? error.message : "藏酒保存失败，请稍后重试");
    } finally { setCellarBusy(false); }
  };

  const beginConsumption = (mode: "mark" | "tasting") => {
    setCellarOpenSheet(false);
    setConsumeMode(mode);
    setConsumeDate(todayLocal());
    setConsumeQuantity("1");
    setCellarActionError(null);
    go("cellarConsume");
  };

  const submitConsumption = async () => {
    if (!selectedCellar) return;
    const quantity = Number(consumeQuantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > selectedCellar.quantityRemaining) { setCellarActionError(`请选择 1–${selectedCellar.quantityRemaining} 瓶的实际饮用数量。`); return; }
    if (!consumeDate) { setCellarActionError("请选择饮用日期。"); return; }
    try { validateTastingDate(consumeDate); } catch (error) { setCellarActionError((error as Error).message); return; }
    if (consumeMode === "tasting") {
      resetRecord();
      setDraft({ ...newDraft(), wine: selectedCellar.wineName, year: selectedCellar.vintage, grapes: selectedCellar.grapes, country: selectedCellar.country, region: selectedCellar.region, winery: selectedCellar.winery, fieldMetadata: {
        wine: selectedCellar.wineName ? { source: "user_selected", confirmed: true } : undefined,
        year: selectedCellar.vintage ? { source: "user_selected", confirmed: true } : undefined,
        grapes: selectedCellar.grapes.length ? { source: "user_selected", confirmed: true } : undefined,
        country: selectedCellar.country ? { source: "user_selected", confirmed: true } : undefined,
        region: selectedCellar.region ? { source: "user_selected", confirmed: true } : undefined,
      } });
      setTastingCellarId(selectedCellar.id);
      setTastedOn(consumeDate);
      setInputMethod("manual");
      go("taste");
      return;
    }
    setCellarBusy(true);
    setCellarActionError(null);
    try {
      await consumeCellarEntry(selectedCellar.id, quantity, consumeDate);
      setCellarEntries((current) => current.map((entry) => entry.id === selectedCellar.id ? { ...entry, quantityRemaining: Math.max(0, entry.quantityRemaining - quantity) } : entry));
      await refreshCellar().catch(() => {});
      setCellarMovements(await listCellarMovements(selectedCellar.id).catch(() => []));
      go("cellarDetail");
    } catch (error) {
      setCellarActionError(error instanceof Error ? error.message : "保存饮用记录失败");
    } finally { setCellarBusy(false); }
  };

  const pendingRecord = (): TastingRecord => ({
    id: "pending",
    grape: draft.grapes.join("、"),
    grapes: draft.grapes,
    wine: draft.wine.trim(),
    year: draft.year || undefined,
    country: draft.country || undefined,
    region: [draft.country, draft.region].filter(Boolean).join(" · "),
    date: "",
    note: tastingNote,
    photos: [...(tastingCellar?.photos ?? []), ...draft.photos.map((photo) => photo.preview)],
    preference: liked ?? undefined,
    flavors: selectedFlavors,
    bodyLevel: bodyLevel ?? undefined,
    fieldMetadata: {
      ...draft.fieldMetadata,
      preference: liked ? { source: "user_selected", confirmed: true } : undefined,
      flavors: selectedFlavors.length ? { source: "user_selected", confirmed: true } : undefined,
      bodyLevel: bodyLevel !== null ? { source: "user_selected", confirmed: true } : undefined,
    },
  });

  const recordCanBeSaved = canSaveRecord({ wine: draft.wine, grapes: draft.grapes, country: draft.country, region: draft.region, photoCount: draft.photos.length + (tastingCellar?.photoIds.length ?? 0), preference: liked, bodyLevel, flavors: selectedFlavors, note: tastingNote });

  const saveTasting = async () => {
    if (!recordCanBeSaved || savingRecord) return;
    try { validateTastingDate(tastedOn); } catch (error) { setCloudMessage((error as Error).message); return; }
    const previewRecord = pendingRecord();
    trackRecordEvent("record_save_clicked", getRecordAnalyticsProperties(previewRecord, inputMethod));
    setSavingRecord(true);
    setCloudMessage(null);
    try {
      const saved = await createTastingRecord({
        grape: draft.grapes.join("、"),
        grapes: draft.grapes,
        wine: draft.wine.trim() || [draft.region, draft.grapes.join("、")].filter(Boolean).join(" ") || "未命名酒款",
        year: draft.year || undefined,
        country: draft.country || undefined,
        region: [draft.country, draft.region].filter(Boolean).join(" · "),
        note: tastingNote,
        photoFiles: await Promise.all(draft.photos.map((photo) => photo.preparedFile)),
        existingPhotoIds: tastingCellar?.photoIds,
        cellarEntryId: tastingCellar?.id,
        cellarQuantity: tastingCellar ? Number(consumeQuantity) : undefined,
        tastedOn,
        preference: liked ?? undefined,
        flavors: selectedFlavors,
        bodyLevel: bodyLevel ?? undefined,
        fieldMetadata: {
          ...draft.fieldMetadata,
          preference: liked ? { source: "user_selected", confirmed: true } : undefined,
          flavors: selectedFlavors.length ? { source: "user_selected", confirmed: true } : undefined,
          bodyLevel: bodyLevel !== null ? { source: "user_selected", confirmed: true } : undefined,
        },
      });
      setNewSpecialDiscovery(firstNewSpecialDiscovery(saved, records));
      setNewBadgeAward(getNewBadgeAward(records, saved, cellarEntries.reduce((sum, entry) => sum + entry.quantityPurchased, 0)));
      setRecords((current) => [saved, ...current]);
      setSavedRecord(saved);
      if (tastingCellar) {
        setCellarEntries((current) => current.map((entry) => entry.id === tastingCellar.id ? { ...entry, quantityRemaining: Math.max(0, entry.quantityRemaining - Number(consumeQuantity)) } : entry));
        await refreshCellar().catch(() => {});
        setCellarMovements(await listCellarMovements(tastingCellar.id).catch(() => []));
      }
      trackRecordEvent("record_save_succeeded", getRecordAnalyticsProperties(saved, inputMethod));
      draft.photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
      go("success");
    } catch (error) {
      console.error("CloudBase tasting record save failed", error);
      const detail = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "未知错误";
      setCloudMessage(`保存失败：${detail}`);
    } finally {
      setSavingRecord(false);
    }
  };

  const deleteTasting = async () => {
    if (!deleteTarget || deletingRecord.current) return;
    const target = deleteTarget;
    const version = accountRefreshVersion.current;
    deletingRecord.current = true;
    setDeletingId(target.id);
    setDeleteTarget(null);
    setRecords(current => current.filter(record => record.id !== target.id));
    try { await softDeleteTastingRecord(target.id); }
    catch (error) {
      if (version === accountRefreshVersion.current) {
        setRecords(current => current.some(record => record.id === target.id) ? current : [...current, target]);
        setCloudMessage(`删除失败，记录已恢复：${error instanceof Error ? error.message : "请稍后重试"}`);
      }
    } finally { deletingRecord.current = false; setDeletingId(null); }
  };

  return (
    <div className="wine-app">
      {screen === "onboarding" && <OnboardingScreen onRecord={() => { rememberOnboarding(); go("explore"); openRecordChoices(); }} onExplore={() => { rememberOnboarding(); go("explore"); }} />}
      {screen === "explore" && <ExploreScreen tab={tab} records={records} recordsLoaded={recordsLoaded} account={account} dismissedPrompt={dismissedExplorePrompt} onDismissPrompt={setDismissedExplorePrompt} onTab={setTab} onRecord={openRecordChoices} onProfile={() => go("profile")} onAllGrapes={() => go("allGrapes")} onRegionNotes={(country, region) => openRecords({ kind: "region", country, region }, "explore")} onNotes={(grape) => openRecords({ kind: "grape", grape }, "explore")} />}
      {screen === "allGrapes" && <AllGrapesScreen records={records} onBack={() => go("explore")} onNotes={(grape) => openRecords({ kind: "grape", grape }, "allGrapes")} />}
      {screen === "confirm" && <ConfirmScreen draft={draft} scanState={labelScanState} scanMessage={labelScanMessage} onChange={setDraft} onBack={() => go("explore")} onNext={() => go("taste")} />}
      {screen === "taste" && <TasteScreen tastedOn={tastedOn} onTastedOn={setTastedOn} liked={liked} setLiked={setLiked} selectedFlavors={selectedFlavors} toggleFlavor={(flavor) => setSelectedFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])} note={tastingNote} onNoteChange={setTastingNote} bodyLevel={bodyLevel} onBodyLevel={setBodyLevel} photos={draft.photos} existingPhotos={tastingCellar?.photos ?? []} cellarSummary={tastingCellar ? `${tastingCellar.wineName || "未命名藏酒"} · 本次 ${consumeQuantity} 瓶` : null} onCamera={() => noteCameraInput.current?.click()} onGallery={() => noteGalleryInput.current?.click()} onRemovePhoto={(id) => setDraft((current) => { const removed = current.photos.find((photo) => photo.id === id); if (removed) URL.revokeObjectURL(removed.preview); return { ...current, photos: current.photos.filter((photo) => photo.id !== id) }; })} onBack={() => go(tastingCellarId ? "cellarConsume" : "confirm")} onSave={saveTasting} canSave={recordCanBeSaved} saving={savingRecord} cloudMessage={cloudMessage} />}
      {screen === "success" && <SuccessScreen record={savedRecord} recordCount={records.length} firstTaste={Boolean(savedRecord && getFeedbackEvidence(savedRecord).mode === "tasting" && records.filter((record) => getFeedbackEvidence(record).mode === "tasting").length === 1)} specialDiscovery={newSpecialDiscovery} badgeAward={newBadgeAward} inputMethod={inputMethod} isGuest={!account || account.isAnonymous} onDone={() => go(tastingCellarId ? "cellarDetail" : "explore")} onSync={() => { setAuthMode("register"); go("auth"); }} />}
      {screen === "profile" && <ProfileScreen records={records} cellarEntries={cellarEntries} cellarLoaded={cellarLoaded} cellarError={cellarError} account={account} onExplore={() => go("explore")} onRecord={openCamera} onRecords={() => openRecords(null, "profile")} onGrapes={() => go("grapeSummary")} onRegions={() => go("regionSummary")} onCellar={() => { go("cellar"); void refreshCellar().catch(() => {}); }} onActivity={() => go("activity")} onFlavor={() => go("flavor")} onShare={() => go("share")} onSettings={() => go("settings")} />}
      {screen === "cellar" && <CellarListScreen entries={cellarEntries} loading={!cellarLoaded} error={cellarError} onBack={() => go("profile")} onAdd={openCellarChoices} onOpen={openCellarDetail} />}
      {screen === "cellarConfirm" && <CellarConfirmScreen draft={draft} onChange={setDraft} existingPhoto={editingCellar?.photos[0]} editing={Boolean(editingCellar)} onBack={() => go(editingCellar ? "cellarDetail" : "cellar")} onNext={() => { setCellarActionError(null); go("cellarPurchase"); }} onAddPhoto={() => noteGalleryInput.current?.click()} />}
      {screen === "cellarPurchase" && <CellarPurchaseScreen wineName={draft.wine} photo={editingCellar?.photos[0] || draft.photos[0]?.preview} draft={purchaseDraft} onChange={setPurchaseDraft} onBack={() => go("cellarConfirm")} onSave={() => void saveCellar()} saving={cellarBusy} error={cellarActionError} editing={Boolean(editingCellar)} remaining={editingCellar?.quantityRemaining} />}
      {screen === "cellarDetail" && selectedCellar && <CellarDetailScreen entry={selectedCellar} movements={cellarMovements} onBack={() => go("cellar")} onOpen={() => setCellarOpenSheet(true)} onEdit={() => editCellar(selectedCellar)} />}
      {screen === "cellarConsume" && selectedCellar && <CellarConsumeScreen entry={selectedCellar} mode={consumeMode} date={consumeDate} quantity={consumeQuantity} onDate={setConsumeDate} onQuantity={setConsumeQuantity} onBack={() => go("cellarDetail")} onSubmit={() => void submitConsumption()} saving={cellarBusy} error={cellarActionError} />}
      {screen === "grapeSummary" && <GrapeSummaryScreen records={records} onBack={() => go("profile")} onSelect={(grape) => openRecords({ kind: "grape", grape }, "grapeSummary")} />}
      {screen === "regionSummary" && <RegionSummaryScreen records={records} onBack={() => go("profile")} onSelect={(country, region) => openRecords({ kind: "region", country, region }, "regionSummary")} />}
      {screen === "records" && <TastingRecordsScreen onEdit={record => { keyboard.hide(); setEditingRecord(record); }} onDelete={record => { keyboard.hide(); setDeleteTarget(record); }} deletingId={deletingId} filter={recordFilter} records={records} cloudMessage={cloudMessage} onBack={() => go(recordsOrigin)} />}
      {screen === "activity" && <DrinkingActivityScreen records={records} loaded={recordsLoaded} error={cloudMessage} onBack={() => go("profile")} />}
      {screen === "flavor" && <FlavorPreferenceScreen records={records} onBack={() => go("profile")} />}
      {screen === "share" && <ShareAtlasScreen records={records} account={account} onBack={() => go("profile")} />}
      {screen === "settings" && <SettingsScreen account={account} syncMessage={account?.syncWarning || cloudMessage || cellarError} syncing={!recordsLoaded || !cellarLoaded} onBack={() => go("profile")} onAuth={(mode) => { setAuthMode(mode); go("auth"); }} onSignedOut={async () => { const guest = await (await getAccountApi()).signOutToGuest(); await refreshAccountData(guest); }} />}
      {screen === "auth" && <AuthScreen initialMode={authMode} onBack={() => go("settings")} onAuthenticated={async (nextAccount) => { void refreshAccountData(nextAccount); go("settings"); }} />}
      <BottomSheet open={recordSheet} onOpenChange={setRecordSheet} title="拍摄酒标" description={recordPurpose === "cellar" ? "拍摄或导入酒标，再确认酒款资料" : "对准正面酒标，自动识别酒款信息"} snap={0.64}>
        <div className="record-camera-flow">
          <button className="camera-preview" onClick={recordPurpose === "cellar" ? () => cameraInput.current?.click() : openCamera} aria-label="拍摄酒标"><span className="camera-frame"><CameraIcon /></span><strong>将酒标完整放入框内</strong><small>{recordPurpose === "cellar" ? "点击拍摄并确认酒款" : "点击拍摄并开始识别"}</small><span className="camera-shutter"><CameraIcon /></span></button>
          <div className="record-alternatives"><p>也可以</p><RecordOption icon={<ImageIcon />} title="从相册导入" detail="选择已有的酒标照片" onClick={openGallery} /><RecordOption icon={<Pencil2Icon />} title="手动记录" detail="没有照片也可以继续" onClick={startManualRecord} /></div>
        </div>
      </BottomSheet>
      <BottomSheet open={cellarOpenSheet} onOpenChange={setCellarOpenSheet} title="开一瓶" description="想为这次举杯留下什么？" snap={0.42}><div className="record-alternatives"><RecordOption icon={<CheckCircledIcon />} title="只标记已饮用" detail="记录日期和数量，更新库存" onClick={() => beginConsumption("mark")} /><RecordOption icon={<Pencil2Icon />} title="记录这次品鉴" detail="写下感受，并同步更新足迹" onClick={() => beginConsumption("tasting")} /></div></BottomSheet>
      <input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={useSelectedPhoto} aria-label="调用后置摄像头拍摄酒标" />
      <input ref={galleryInput} hidden type="file" accept="image/*" onChange={useSelectedPhoto} aria-label="从相册选择酒标照片" />
      <input ref={noteCameraInput} hidden type="file" accept="image/*" capture="environment" onChange={addNotePhotos} aria-label="继续拍摄品鉴照片" />
      <input ref={noteGalleryInput} hidden type="file" accept="image/*" multiple onChange={addNotePhotos} aria-label="继续上传品鉴照片" />
      {editingRecord && <RecordEditor key={editingRecord.id} record={editingRecord} onClose={() => setEditingRecord(null)} onSaved={saved => { setRecords(current => current.map(record => record.id === saved.id ? saved : record)); setEditingRecord(null); }} />}
      <BottomSheet open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }} title="删除这条品鉴记录？" snap={0.45}>
        <p>删除后，这条品鉴记录、照片和相关徽章进度可能会同步变化，确定删除吗？</p>
        <p>记录保留30天恢复窗口。藏酒库存不会自动恢复。</p>
        <button className="primary-action" onClick={() => void deleteTasting()}>删除记录</button>
        <button className="text-action" onClick={() => setDeleteTarget(null)}>取消</button>
      </BottomSheet>
    </div>
  );
}

function RecordOption({ icon, title, detail, primary, onClick }: { icon: ReactNode; title: string; detail: string; primary?: boolean; onClick: () => void }) {
  return <button className={`record-option ${primary ? "primary" : ""}`} onClick={onClick}>{icon}<span><strong>{title}</strong><small>{detail}</small></span></button>;
}

function OnboardingScreen({ onRecord, onExplore }: { onRecord: () => void; onExplore: () => void }) {
  return <MobileScroll className="app-scroll paper-screen"><main className="onboarding-content"><div className="onboarding-art" aria-hidden="true"><img src={asset("assets/grapes/pinot-noir.webp")} alt="" draggable={false} /><span>✦</span></div><div className="onboarding-copy"><small>我的葡萄酒图鉴</small><h1>记录每一杯，<br />慢慢找到真正适合你的味道</h1><p>不需要懂专业术语，从“喜不喜欢”开始就好。</p></div><div className="onboarding-actions"><button className="primary-action" onClick={onRecord}>记录我正在喝的酒</button><button className="text-action" onClick={onExplore}>先看看葡萄图鉴</button></div></main></MobileScroll>;
}

function AtlasTabs({ tab, onTab, pinned = false, inactive = false }: { tab: ExploreTab; onTab: (tab: ExploreTab) => void; pinned?: boolean; inactive?: boolean }) {
  return <div className={`atlas-tabs ${pinned ? "atlas-tabs-pinned" : ""}`} role="tablist" aria-label={pinned ? "图鉴视图，已置顶" : "图鉴视图"} aria-hidden={inactive || undefined}><button role="tab" aria-selected={tab === "grapes"} tabIndex={inactive ? -1 : undefined} className={tab === "grapes" ? "active" : ""} onClick={() => onTab("grapes")}>品种图鉴</button><button role="tab" aria-selected={tab === "regions"} tabIndex={inactive ? -1 : undefined} className={tab === "regions" ? "active" : ""} onClick={() => onTab("regions")}>产区地图</button></div>;
}

function ExploreScreen({ tab, records, recordsLoaded, account, dismissedPrompt, onDismissPrompt, onTab, onRecord, onProfile, onAllGrapes, onRegionNotes, onNotes }: { tab: ExploreTab; records: TastingRecord[]; recordsLoaded: boolean; account: WineAccount | null; dismissedPrompt: "empty" | "first" | null; onDismissPrompt: (kind: "empty" | "first") => void; onTab: (tab: ExploreTab) => void; onRecord: () => void; onProfile: () => void; onAllGrapes: () => void; onRegionNotes: (country: string, region: string) => void; onNotes: (grape: string) => void }) {
  const [selectedGrape, setSelectedGrape] = useState<string | null>(null);
  const [tabsPinned, setTabsPinned] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const tabsAnchorRef = useRef<HTMLDivElement>(null);
  const [regionViewport, setRegionViewport] = useState({ height: 0, collapse: 0 });
  const stats = getRecordStats(records);
  const hasNoRecords = recordsLoaded && stats.recordCount === 0;
  const hasFirstRecord = stats.recordCount === 1;
  const promptKind = hasNoRecords ? "empty" : hasFirstRecord ? "first" : null;
  const promptOpen = promptKind !== null && dismissedPrompt !== promptKind;
  const greeting = hasNoRecords ? "你的葡萄酒世界，从第一杯开始" : hasFirstRecord ? "你的葡萄酒世界已经点亮" : account && !account.isAnonymous ? `晚上好，${account.name} 🍷` : "晚上好 🍷";
  useEffect(() => {
    const scroll = contentRef.current?.closest(".mobile-scroll");
    const anchor = tabsAnchorRef.current;
    if (!(scroll instanceof HTMLElement) || !anchor) return;
    const updatePinned = () => setTabsPinned(scroll.scrollTop >= anchor.offsetTop);
    scroll.addEventListener("scroll", updatePinned, { passive: true });
    const frame = window.requestAnimationFrame(updatePinned);
    return () => { scroll.removeEventListener("scroll", updatePinned); window.cancelAnimationFrame(frame); };
  }, [tab, recordsLoaded, records.length]);
  useEffect(() => {
    if (tab !== "regions") return;
    const content = contentRef.current;
    const scroll = content?.closest<HTMLElement>(".mobile-scroll");
    const anchor = tabsAnchorRef.current;
    if (!content || !scroll || !anchor) return;
    const measure = () => setRegionViewport({ height: scroll.clientHeight, collapse: anchor.offsetTop });
    const observer = new ResizeObserver(measure);
    observer.observe(scroll);
    observer.observe(anchor);
    measure();
    return () => observer.disconnect();
  }, [tab, recordsLoaded, records.length]);
  return <>
    <MobileScroll className={`app-scroll paper-screen ${tab === "regions" ? "region-page" : ""}`}>
      <main ref={contentRef} className={`explore-content ${tab === "regions" ? "region-explore-content" : ""}`} style={tab === "regions" && regionViewport.height ? { "--region-viewport-height": `${regionViewport.height}px`, "--region-collapse-distance": `${regionViewport.collapse}px` } as CSSProperties : undefined}>
        <header className={`welcome ${hasNoRecords ? "empty-welcome" : ""}`}><p className="eyebrow">{greeting}</p><h1>{hasNoRecords ? "每记录一种葡萄，它就会在这里被点亮。" : "你的葡萄酒世界已点亮："}</h1><p className="stats"><strong>{stats.grapeCount}</strong> 个品种 <i>·</i> <strong>{stats.regionCount}</strong> 个产区 <i>·</i> <strong>{stats.recordCount}</strong> 次品鉴</p></header>
        <div ref={tabsAnchorRef}><AtlasTabs tab={tab} onTab={onTab} inactive={tabsPinned} /></div>
        {tab === "grapes" ? <GrapeAtlas records={records} onSelect={setSelectedGrape} onAll={onAllGrapes} /> : <RegionMap records={records} onRecords={onRegionNotes} />}
      </main>
    </MobileScroll>
    {tabsPinned && <div className="atlas-tabs-dock"><AtlasTabs tab={tab} onTab={onTab} pinned /></div>}
    <BottomNav active="explore" onExplore={() => onTab(tab)} onRecord={onRecord} onProfile={onProfile} />
    <BottomSheet open={promptOpen} onOpenChange={(open) => { if (!open && promptKind) onDismissPrompt(promptKind); }} title={promptKind === "empty" ? "点亮第一个品种" : "下一杯探索"} description={promptKind === "empty" ? "从一杯酒开始，慢慢建立属于你的葡萄图鉴" : "根据你的第一条品鉴记录，为你准备了一点灵感"} snap={0.4}>
      {promptKind && <div className="explore-prompt"><span className="explore-prompt-icon">{promptKind === "empty" ? <CameraIcon /> : "✦"}</span><p>{promptKind === "empty" ? "不知道是什么葡萄也没关系。拍下酒标，我们会帮你填写品种与产区。" : suggestNextTaste(records[0])}</p><button className="primary-action" onClick={() => { onDismissPrompt(promptKind); onRecord(); }}>{promptKind === "empty" ? "开始记录" : "遇到下一杯时，继续记下来"}</button><button className="text-action" onClick={() => onDismissPrompt(promptKind)}>稍后再说</button></div>}
    </BottomSheet>
    <GrapeDetailSheet name={selectedGrape} records={records} onClose={() => setSelectedGrape(null)} onNotes={onNotes} onCompare={setSelectedGrape} />
  </>;
}

function GrapeIllustration({ name, image, locked = false }: { name: string; image?: string; locked?: boolean }) {
  return image && !locked ? <img src={asset(image)} alt="" draggable={false} loading="lazy" decoding="async" /> : <svg className="grape-line-art" viewBox="0 0 60 72" aria-hidden="true"><path d="M30 10c2 9 1 14-1 18M29 12c-6-6-13-5-16-2 4 7 10 9 17 7M31 13c6-7 13-6 17-2-4 7-11 9-17 7" /><circle cx="24" cy="27" r="6" /><circle cx="36" cy="27" r="6" /><circle cx="19" cy="39" r="6" /><circle cx="30" cy="39" r="6" /><circle cx="41" cy="39" r="6" /><circle cx="25" cy="51" r="6" /><circle cx="36" cy="51" r="6" /><circle cx="30" cy="62" r="6" /><title>{name}</title></svg>;
}

function GrapeDetailSheet({ name, records, onClose, onNotes, onCompare }: { name: string | null; records: TastingRecord[]; onClose: () => void; onNotes: (grape: string) => void; onCompare: (grape: string) => void }) {
  const core = CORE_GRAPES.find((grape) => grape.chinese_name === name);
  const special = SPECIAL_GRAPES.find((grape) => grape.chinese_name === name);
  const count = name ? countGrapes(records)[name] ?? 0 : 0;
  return <BottomSheet open={!!name} onOpenChange={(open) => { if (!open) onClose(); }} title={name ?? "品种介绍"} description={core?.english_name ?? special?.english_name} snap={0.82}>
    {name && <div className="grape-detail">{core ? <><div className="grape-detail-hero"><GrapeIllustration name={name} image={core.image} locked={!count} /><div><span className="detail-count">已品鉴 {formatCount(count)} 次</span><p>{core.beginner_summary}</p></div></div><div className="grape-detail-facts"><div><small>酒体</small><strong>{core.body}</strong></div><div><small>酸度</small><strong>{core.acidity}</strong></div>{core.color === "red" && <div><small>单宁</small><strong>{core.tannin}</strong></div>}</div><section className="detail-section"><small>常见风味</small><div className="aroma-tags">{core.aromas.map((aroma) => <span key={aroma}>{aroma}</span>)}</div></section><section className="detail-section"><small>主要产区</small><p>{core.major_regions.join("、")}</p></section><section className="detail-section"><small>可以继续探索</small><div className="grape-comparisons">{core.comparison_grapes.map((other) => <button key={other} onClick={() => onCompare(other)}>可以比较 {other} ›</button>)}</div></section></> : <><div className="grape-detail-hero"><GrapeIllustration name={name} image={special?.image} /><div><span className="detail-count">特别发现 · 已记录 {formatCount(count)} 次</span><p>更多品种资料正在完善</p></div></div></>}{count > 0 && <button className="notes-link" onClick={() => onNotes(name)}>查看 {count} 条品酒笔记 <span>›</span></button>}</div>}
  </BottomSheet>;
}

const HOME_GRAPE_ORDER = ["赤霞珠", "梅洛", "黑皮诺", "霞多丽", "长相思", "雷司令", "西拉", "歌海娜", "桑娇维塞"];

function GrapeAtlas({ records, onSelect, onAll }: { records: TastingRecord[]; onSelect: (grape: string) => void; onAll: () => void }) {
  const [pressed, setPressed] = useState<string | null>(null);
  const counts = countGrapes(records);
  const latestGrape = records[0] ? recordGrapeNames(records[0])[0] : undefined;
  const coreNames = CORE_GRAPES.map((grape) => grape.chinese_name);
  const names = [...HOME_GRAPE_ORDER, ...coreNames.filter((name) => !HOME_GRAPE_ORDER.includes(name)), ...specialDiscoveries(records)];
  const atlasHeight = Math.max(1040, names.length * 113 + 24);
  const pathHeight = Math.max(940, atlasHeight - 100);
  const choose = (name: string) => { setPressed(name); window.setTimeout(() => { setPressed(null); onSelect(name); }, 190); };
  const renderNode = (name: string, index: number) => {
    const core = CORE_GRAPES.find((grape) => grape.chinese_name === name);
    const special = SPECIAL_GRAPES.find((grape) => grape.chinese_name === name);
    const locked = !counts[name];
    const recent = latestGrape === name;
    return <button key={name} onClick={() => choose(name)} className={`grape-node ${index % 2 ? "right" : "left"} ${locked ? "locked" : ""} ${recent ? "recent" : ""} ${pressed === name ? "pressed" : ""}`} aria-label={`${name}${locked ? "，待探索" : `，品鉴过${counts[name]}次`}`}><span className="grape-art-wrap"><GrapeIllustration name={name} image={core?.image ?? special?.image} locked={locked} />{!locked && <span className="taste-count">{formatCount(counts[name])}</span>}{recent && <span className="recent-spark">✦</span>}{locked && <span className="locked-mark">?</span>}</span><strong>{name}</strong><small>{special ? "特别发现" : core?.english_name}{locked ? " · 待探索" : ""}</small></button>;
  };
  return <section className="grape-atlas" style={{ minHeight: atlasHeight }} aria-label="葡萄品种探索路径"><svg className="path-line" style={{ height: pathHeight }} viewBox="0 0 180 940" preserveAspectRatio="none" aria-hidden="true"><path d="M88 4 C158 72 154 150 86 220 S18 365 92 438 S156 580 82 650 S20 794 92 936" /></svg>{names.map(renderNode)}<button className="all-grapes-link atlas-path-link" onClick={onAll}>查看全部品种 <span>24 种核心葡萄 ›</span></button></section>;
}

function AllGrapesScreen({ records, onBack, onNotes }: { records: TastingRecord[]; onBack: () => void; onNotes: (grape: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const counts = countGrapes(records);
  const discoveries = specialDiscoveries(records);
  return <><MobileScroll className="app-scroll paper-screen"><main className="flow-content all-grapes-content"><FlowHeader title="全部品种" onBack={onBack} /><p className="footprint-summary-intro">24 个核心品种，慢慢点亮自己的葡萄酒世界。</p>{GRAPE_CHAPTERS.map((chapter) => <section className="all-grapes-chapter" key={chapter.id}><h2>{chapter.title}</h2><div className="all-grapes-list">{CORE_GRAPES.filter((grape) => grape.categories.includes(chapter.id)).map((grape) => <button key={grape.id} onClick={() => setSelected(grape.chinese_name)}><span className="all-grapes-art"><GrapeIllustration name={grape.chinese_name} image={grape.image} locked={!counts[grape.chinese_name]} /></span><span className="all-grapes-name"><strong>{grape.chinese_name}</strong><small>{grape.english_name}</small></span><span className="all-grapes-count">{counts[grape.chinese_name] ? `${formatCount(counts[grape.chinese_name])} 次` : "待探索"}</span><span aria-hidden="true">›</span></button>)}</div></section>)}{discoveries.length > 0 && <section className="all-grapes-chapter"><h2>我的特别发现</h2><div className="all-grapes-list">{discoveries.map((name) => <button key={name} onClick={() => setSelected(name)}><span className="all-grapes-art"><GrapeIllustration name={name} /></span><span className="all-grapes-name"><strong>{name}</strong><small>{SPECIAL_GRAPES.find((grape) => grape.chinese_name === name)?.english_name}</small></span><span className="all-grapes-count">{formatCount(counts[name])} 次</span><span aria-hidden="true">›</span></button>)}</div></section>}</main></MobileScroll><GrapeDetailSheet name={selected} records={records} onClose={() => setSelected(null)} onNotes={onNotes} onCompare={setSelected} /></>;
}

function formatCount(count: number) { return count > 99 ? "100+" : String(count); }

function getRecordStats(records: TastingRecord[]) {
  const grapeCounts = countGrapes(records);
  const regions = new Set<string>();
  const countries = new Set<string>();
  records.forEach((record) => {
    if (record.region) {
      regions.add(record.region);
      countries.add(record.region.split("·")[0].trim());
    }
  });
  return { recordCount: records.length, grapeCount: Object.keys(grapeCounts).length, regionCount: regions.size, grapeCounts, countries };
}

function RegionMap({ records, onRecords }: { records: TastingRecord[]; onRecords: (country: string, region: string) => void }) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [mapView, setMapView] = useState({ scale: 1, x: 0, y: 0 });
  const mapViewRef = useRef(mapView);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surfaceSize, setSurfaceSize] = useState({ width: 349, height: 560 });
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const mapFrame = useRef(0);
  const aggregates = useMemo(() => aggregateMapRecords(records), [records]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const observer = new ResizeObserver(([entry]) => setSurfaceSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(surface);
    return () => observer.disconnect();
  }, [selectedCountry]);
  useEffect(() => () => cancelAnimationFrame(mapFrame.current), []);
  const updateMapView = (view: typeof mapView) => {
    mapViewRef.current = view;
    if (!mapFrame.current) mapFrame.current = requestAnimationFrame(() => { mapFrame.current = 0; setMapView(mapViewRef.current); });
  };
  const clampView = (scale: number, x: number, y: number) => {
    const limitX = 150 * (scale - 1);
    const limitY = 190 * (scale - 1);
    return { scale, x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  };
  const zoomMap = (nextScale: number) => {
    const scale = Math.max(1, Math.min(3, nextScale));
    const current = mapViewRef.current;
    updateMapView(clampView(scale, scale === 1 ? 0 : current.x, scale === 1 ? 0 : current.y));
  };
  const handleMapDoubleClick = () => zoomMap(mapViewRef.current.scale > 1 ? 1 : 2);
  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerStart.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    if (pointers.current.size === 2) {
      event.stopPropagation();
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: mapViewRef.current.scale, x: mapViewRef.current.x, y: mapViewRef.current.y, centerX: (a.x + b.x) / 2, centerY: (a.y + b.y) / 2 };
    }
  };
  const handleMapPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerStart.current && Math.hypot(event.clientX - pointerStart.current.x, event.clientY - pointerStart.current.y) > 7) moved.current = true;
    if (pointers.current.size === 2 && pinchStart.current) {
      event.stopPropagation();
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;
      const scale = Math.max(1, Math.min(3, pinchStart.current.scale * distance / Math.max(1, pinchStart.current.distance)));
      updateMapView(clampView(scale, pinchStart.current.x + centerX - pinchStart.current.centerX, pinchStart.current.y + centerY - pinchStart.current.centerY));
    } else if (pointers.current.size === 1 && mapViewRef.current.scale > 1) {
      const current = mapViewRef.current;
      updateMapView(clampView(current.scale, current.x + event.clientX - previous.x, current.y + event.clientY - previous.y));
    }
  };
  const handleMapPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinchStart.current = null;
    if (event.pointerType === "touch" && !moved.current) {
      const now = Date.now();
      if (now - lastTap.current < 320) { handleMapDoubleClick(); lastTap.current = 0; } else lastTap.current = now;
    }
  };
  const handleMapWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomMap(mapViewRef.current.scale - event.deltaY * 0.01);
  };
  const countryCounts = useMemo(() => records.reduce<Record<string, number>>((counts, record) => { const country = record.region.split("·")[0].trim(); if (country) counts[country] = (counts[country] ?? 0) + 1; return counts; }, {}), [records]);
  const regions = WORLD_COUNTRIES.map((region) => ({ ...region, count: countryCounts[region.country] ?? 0 }));
  const expanded = mapView.scale >= MAP_ZOOM.countries;
  const extraCountries = useMemo(() => {
    const known = EXTRA_COUNTRIES.filter((country) => (aggregates.get(country.country)?.count ?? 0) > 0 || mapView.scale >= country.zoom);
    const unknown = [...aggregates.keys()].filter((name) => !WORLD_COUNTRIES.some((country) => country.country === name) && !EXTRA_COUNTRIES.some((country) => country.country === name));
    return [...known.map((country) => ({ ...country, count: aggregates.get(country.country)?.count ?? 0 })), ...unknown.map((country) => ({ country, x: null, y: null, zoom: MAP_ZOOM.countries, count: aggregates.get(country)!.count }))].sort((a, b) => b.count - a.count);
  }, [aggregates, mapView.scale]);
  const extraLabels = useMemo(() => {
    if (!expanded) return { visible: [], hidden: [] };
    const project = (x: number, y: number) => ({ x: surfaceSize.width / 2 + (surfaceSize.width * x / 100 - surfaceSize.width / 2) * mapView.scale + mapView.x, y: surfaceSize.height / 2 + (y - surfaceSize.height / 2) * mapView.scale + mapView.y });
    const reserved = regions.map((country) => ({ id: country.country, name: country.country, count: country.count, priority: 0, ...project(parseFloat(country.x), parseFloat(country.y)), width: country.country.length * 12 + 36, height: 30 }));
    return placeMapLabels(extraCountries.filter((country) => country.x !== null && country.y !== null).map((country) => ({ id: country.country, name: country.country, count: country.count, priority: country.count ? 4 : 1, ...project(country.x!, country.y!) })), surfaceSize.width, surfaceSize.height, reserved);
  }, [expanded, extraCountries, mapView, surfaceSize, records]);
  const countryFacts: Record<string, { area: string; output: string; grapes: string }> = {
    法国: { area: "约 79 万公顷", output: "约 46 亿升/年", grapes: "赤霞珠、梅洛、黑皮诺、霞多丽" },
    意大利: { area: "约 72 万公顷", output: "约 49 亿升/年", grapes: "桑娇维塞、内比奥罗、灰皮诺" },
    中国: { area: "约 78 万公顷", output: "约 8 亿升/年", grapes: "赤霞珠、蛇龙珠、马瑟兰、霞多丽" },
    美国: { area: "约 39 万公顷", output: "约 24 亿升/年", grapes: "赤霞珠、霞多丽、黑皮诺、仙粉黛" },
    澳大利亚: { area: "约 15 万公顷", output: "约 12 亿升/年", grapes: "西拉、霞多丽、赤霞珠、雷司令" },
    新西兰: { area: "约 4.2 万公顷", output: "约 3 亿升/年", grapes: "长相思、黑皮诺、霞多丽、灰皮诺" },
  };
  if (selectedCountry) return <MapCountryLayers key={selectedCountry} country={selectedCountry} records={records} facts={countryFacts[selectedCountry]} selectedRegion={selectedRegion} onRegion={setSelectedRegion} onBack={() => { zoomMap(1); setSelectedRegion(null); setSelectedCountry(null); }} onRecords={onRecords} />;
  return <><section className="region-map" aria-label="世界葡萄酒产区地图"><div className="map-heading"><GlobeIcon /><span>我的葡萄酒足迹</span></div><div ref={surfaceRef} className={`map-gesture-surface ${mapView.scale > 1 ? "is-zoomed" : ""}`} data-scroll-drag={mapView.scale > 1 ? "ignore" : undefined} onDoubleClick={handleMapDoubleClick} onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onPointerCancel={handleMapPointerEnd} onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId); pinchStart.current = null; }} onWheel={handleMapWheel} aria-label="可缩放的世界葡萄酒产区地图"><div className="map-transform-layer" style={{ transform: `translate3d(${mapView.x}px, ${mapView.y}px, 0) scale(${mapView.scale})` }}><img className="world-map-art" src={asset("assets/maps/world-wine-map.webp")} alt="世界葡萄酒产区地图" draggable={false} loading="lazy" decoding="async" />{regions.map((region) => <button className="region-pin" style={{ left: region.x, top: region.y, transform: `scale(${1 / mapView.scale}) translate(-50%, -50%)` }} key={region.country} onClick={() => { if (!moved.current) setSelectedCountry(region.country); }}><span>{region.count}</span>{region.country}</button>)}</div>{expanded && <div className="map-extra-labels">{extraLabels.visible.map((label) => <button key={label.id} className={`map-extra-pin ${label.count ? "is-lit" : ""}`} style={{ left: label.x, top: label.y, width: label.width }} onPointerDown={(event) => { event.stopPropagation(); moved.current = false; }} onClick={() => { if (!moved.current) setSelectedCountry(label.name); }}><span>{label.count}</span>{label.name}</button>)}</div>}</div>{expanded && <button className="map-more-countries" onClick={() => setCountryPickerOpen(true)}>更多国家 · {extraCountries.length}</button>}{mapView.scale > 1 && <button className="map-reset" onClick={() => zoomMap(1)} aria-label="还原地图缩放">还原</button>}</section><BottomSheet open={expanded && countryPickerOpen} onOpenChange={setCountryPickerOpen} title="继续探索葡萄酒国家" description="有记录的国家优先展示" snap={0.7}><div className="map-country-choices">{extraCountries.map((country) => <button key={country.country} onClick={() => { setCountryPickerOpen(false); setSelectedCountry(country.country); }}><strong>{country.country}</strong><span>{country.count} 次 · {country.count ? "已点亮" : "待探索"}</span></button>)}</div></BottomSheet></>;
}

function ConfirmScreen({ draft, scanState, scanMessage, onChange, onBack, onNext }: { draft: WineDraft; scanState: LabelScanState; scanMessage: string | null; onChange: (draft: WineDraft) => void; onBack: () => void; onNext: () => void }) {
  const [picker, setPicker] = useState<"year" | "grape" | "country" | "region" | null>(null);
  const years = [{ value: "NV", label: "无年份 NV" }, { value: "不确定", label: "不确定" }, ...Array.from({ length: 61 }, (_, index) => { const value = String(new Date().getFullYear() - index); return { value, label: value }; })];
  const update = (value: Partial<WineDraft>) => onChange({ ...draft, ...value });
  const selectField = (key: "year" | "country" | "region", value: string, extra: Partial<WineDraft> = {}) => update({ ...extra, [key]: value, fieldMetadata: { ...draft.fieldMetadata, [key]: { source: "user_selected", confirmed: true } } });
  const pickerConfig = picker ? {
    year: { title: "选择年份", options: years, value: draft.year, searchable: false, onSelect: (value: string) => selectField("year", value) },
    grape: null,
    country: { title: "选择国家", options: countryOptions, value: draft.country, searchable: true, onSelect: (value: string) => update({ country: value, region: "", fieldMetadata: { ...draft.fieldMetadata, country: { source: "user_selected", confirmed: true }, region: undefined } }) },
    region: { title: "选择产区", options: regionOptionsByCountry[draft.country] ?? [], value: draft.region, searchable: true, onSelect: (value: string) => selectField("region", value) },
  }[picker] : null;
  const firstPhoto = draft.photos[0]?.preview;
  const displayValue = (options: PickerOption[], value: string) => options.find((option) => option.value === value)?.label ?? value;
  const unconfirmed = Object.values(draft.fieldMetadata).some((meta) => meta?.confirmed === false);
  const confirmScanned = () => onChange({ ...draft, fieldMetadata: Object.fromEntries(Object.entries(draft.fieldMetadata).map(([key, meta]) => [key, meta ? { ...meta, confirmed: true } : meta])) });
  const sourceNote = (key: keyof RecordFieldMetadata) => draft.fieldMetadata[key]?.confirmed === false ? "酒标识别 · 待确认" : undefined;
  const helper = scanMessage || (firstPhoto ? "酒标识别内容会先标为待确认，确认后才用于你的口味画像。" : null);
  return <><div className="record-header-dock"><FlowHeader title="确认酒款" onBack={onBack} /></div><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content">{firstPhoto && <div className="label-photo has-photo"><img src={firstPhoto} alt="刚刚拍摄的酒标" /><div><strong>{draft.wine || (scanState === "scanning" ? "正在识别酒标" : "待确认酒款")}</strong><span>{draft.grapes.map((value) => displayValue(grapeOptions, value)).join("、") || "葡萄品种未填写"}{draft.year ? ` · ${draft.year}` : ""}</span></div><span className="scan-pill">{scanState === "scanning" ? "识别中" : scanState === "error" ? "可手动填写" : "识别结果"}</span></div>}{helper && <p className={`helper-copy scan-status-${scanState}`} role="status">{helper}</p>}<div className="form-list"><Field label="酒款名称" value={draft.wine} onChange={(wine) => update({ wine, fieldMetadata: { ...draft.fieldMetadata, wine: { source: "user_selected", confirmed: true } } })} /><SelectField label="年份" value={draft.year ? displayValue(years, draft.year) : "未填写"} note={sourceNote("year")} empty={!draft.year} onClick={() => setPicker("year")} /><SelectField label="葡萄品种" value={draft.grapes.length ? draft.grapes.map((value) => displayValue(grapeOptions, value)).join("、") : "未填写"} note={sourceNote("grapes")} empty={!draft.grapes.length} onClick={() => setPicker("grape")} /><SelectField label="国家" value={draft.country ? displayValue(countryOptions, draft.country) : "未填写"} note={sourceNote("country")} empty={!draft.country} onClick={() => setPicker("country")} /><SelectField label="产区" value={draft.region ? displayValue(regionOptionsByCountry[draft.country] ?? [], draft.region) : "未填写"} note={sourceNote("region")} empty={!draft.region} onClick={() => setPicker("region")} /></div>{unconfirmed && <button className="confirm-scan-action" onClick={confirmScanned}><CheckIcon />确认以上酒标识别结果</button>}<button className="primary-action" disabled={scanState === "scanning"} onClick={onNext}>{scanState === "scanning" ? "正在识别酒标…" : "继续写品酒感受"}</button></main></MobileScroll>{picker === "grape" && <MultiOptionPicker open onOpenChange={(open) => { if (!open) setPicker(null); }} title="选择葡萄品种" options={[{ value: "不确定", label: "不确定" }, ...grapeOptions]} values={draft.grapes} onDone={(grapes) => { update({ grapes, fieldMetadata: { ...draft.fieldMetadata, grapes: { source: "user_selected", confirmed: true } } }); setPicker(null); }} />}{pickerConfig && <OptionPicker open={!!picker} onOpenChange={(open) => { if (!open) setPicker(null); }} title={pickerConfig.title} options={pickerConfig.options} value={pickerConfig.value} searchable={pickerConfig.searchable} onSelect={(value) => { pickerConfig.onSelect(value); setPicker(null); }} />}</>;
}

function CellarConfirmScreen({ draft, onChange, onBack, onNext, onAddPhoto, existingPhoto, editing }: { draft: WineDraft; onChange: (draft: WineDraft) => void; onBack: () => void; onNext: () => void; onAddPhoto: () => void; existingPhoto?: string; editing: boolean }) {
  const [picker, setPicker] = useState<"year" | "grape" | "country" | "region" | null>(null);
  const years = [{ value: "NV", label: "无年份 NV" }, { value: "不确定", label: "不确定" }, ...Array.from({ length: 61 }, (_, index) => { const year = String(new Date().getFullYear() - index); return { value: year, label: year }; })];
  const photo = existingPhoto || draft.photos[0]?.preview;
  const label = (options: PickerOption[], value: string) => options.find((item) => item.value === value)?.label ?? value;
  const update = (changes: Partial<WineDraft>) => onChange({ ...draft, ...changes });
  const selected = (field: "year" | "region", value: string) => update({ [field]: value, fieldMetadata: { ...draft.fieldMetadata, [field]: { source: "user_selected", confirmed: true } } });
  const options = picker ? {
    year: { title: "选择年份", options: years, value: draft.year, searchable: false, onSelect: (value: string) => selected("year", value) },
    grape: null,
    country: { title: "选择国家", options: countryOptions, value: draft.country, searchable: true, onSelect: (country: string) => update({ country, region: "", fieldMetadata: { ...draft.fieldMetadata, country: { source: "user_selected", confirmed: true }, region: undefined } }) },
    region: { title: "选择产区", options: regionOptionsByCountry[draft.country] ?? [], value: draft.region, searchable: true, onSelect: (value: string) => selected("region", value) },
  }[picker] : null;
  return <><div className="record-header-dock"><FlowHeader title="确认藏酒酒款" onBack={onBack} /></div><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content cellar-confirm-content">
    {photo && <div className="label-photo has-photo"><img src={photo} alt="藏酒酒标" /><div><strong>{draft.wine || "待确认酒款"}</strong><span>{draft.grapes.join("、") || "葡萄品种未填写"}</span></div></div>}
    <button className="cellar-add-photo" onClick={onAddPhoto}><ImageIcon />{photo ? "补充照片" : "添加酒标照片"}</button>
    <div className="form-list"><label className="field-row"><span>酒款名称</span><KeyboardInput value={draft.wine} onChange={(event) => update({ wine: event.currentTarget.value, fieldMetadata: { ...draft.fieldMetadata, wine: { source: "user_selected", confirmed: true } } })} placeholder="未填写" aria-label="酒款名称" /></label><SelectField label="年份" value={draft.year ? label(years, draft.year) : "未填写"} empty={!draft.year} onClick={() => setPicker("year")} /><SelectField label="葡萄品种" value={draft.grapes.length ? draft.grapes.map((value) => label(grapeOptions, value)).join("、") : "未填写"} empty={!draft.grapes.length} onClick={() => setPicker("grape")} /><SelectField label="国家" value={draft.country ? label(countryOptions, draft.country) : "未填写"} empty={!draft.country} onClick={() => setPicker("country")} /><SelectField label="产区" value={draft.region ? label(regionOptionsByCountry[draft.country] ?? [], draft.region) : "未填写"} empty={!draft.region} onClick={() => setPicker("region")} /><label className="field-row"><span>酒庄或品牌</span><KeyboardInput value={draft.winery} onChange={(event) => update({ winery: event.currentTarget.value })} placeholder="未填写" aria-label="酒庄或品牌" /></label></div>
    <button className="primary-action" onClick={onNext}>{editing ? "继续编辑购买信息" : "继续记录购买信息"}</button>
  </main></MobileScroll>{picker === "grape" && <MultiOptionPicker open onOpenChange={(open) => { if (!open) setPicker(null); }} title="选择葡萄品种" options={[{ value: "不确定", label: "不确定" }, { value: "混酿", label: "混酿 · Blend" }, ...grapeOptions]} values={draft.grapes} onDone={(grapes) => { update({ grapes, fieldMetadata: { ...draft.fieldMetadata, grapes: { source: "user_selected", confirmed: true } } }); setPicker(null); }} />}{options && <OptionPicker open onOpenChange={(open) => { if (!open) setPicker(null); }} title={options.title} options={options.options} value={options.value} searchable={options.searchable} onSelect={(value) => { options.onSelect(value); setPicker(null); }} />}</>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><KeyboardInput value={value} onChange={(event) => onChange(event.currentTarget.value)} placeholder="请输入酒款名称" aria-label={label} /></label>; }

function SelectField({ label, value, note, empty, onClick }: { label: string; value: string; note?: string; empty?: boolean; onClick: () => void }) { const keyboard = useKeyboard(); return <button className={`field-row select-field ${empty ? "empty" : ""}`} onClick={() => { keyboard.hide(); onClick(); }} aria-label={`${label}，当前为${value}`}><span>{label}</span><strong><span>{value}{note && <small>{note}</small>}</span><ChevronDownIcon /></strong></button>; }

function MultiOptionPicker({ open, onOpenChange, title, options, values, onDone }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; options: PickerOption[]; values: string[]; onDone: (values: string[]) => void }) {
  const keyboard = useKeyboard();
  const [selected, setSelected] = useState(values);
  const [query, setQuery] = useState("");
  useEffect(() => { if (open) { setSelected(values); setQuery(""); } }, [open, values]);
  const visibleOptions = options.filter((option) => `${option.value} ${option.label}`.toLowerCase().includes(query.trim().toLowerCase()));
  const toggle = (value: string) => { setSelected((current) => value === "不确定" ? (current.includes(value) ? [] : [value]) : (current.includes(value) ? current.filter((item) => item !== value) : [...current.filter((item) => item !== "不确定"), value])); keyboard.hide(); };
  return <BottomSheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) keyboard.hide(); onOpenChange(nextOpen); }} title={title} description="可多选；支持中文或英文搜索" snap={0.76}><div className="option-picker multi-picker" style={{ "--picker-keyboard-height": `${keyboard.height}px` } as CSSProperties} tabIndex={0} aria-label="葡萄品种选项"><div className="picker-search"><PickerSearchInput value={query} onChange={setQuery} placeholder="搜索葡萄品种" /></div><div className="picker-options">{visibleOptions.map((option) => <button className={selected.includes(option.value) ? "selected" : ""} onClick={() => toggle(option.value)} key={option.value}><span>{option.label}</span>{selected.includes(option.value) && <CheckIcon />}</button>)}</div><button className="picker-done" onClick={() => { keyboard.hide(); onDone(selected); }}>完成{selected.length ? `（已选 ${selected.length}）` : ""}</button></div></BottomSheet>;
}

function PickerSearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const keyboard = useKeyboard();
  const keyboardRef = useRef(keyboard);
  keyboardRef.current = keyboard;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let expandedHeight = viewport.height;
    let nativeKeyboardWasOpen = false;
    const syncKeyboard = () => {
      expandedHeight = Math.max(expandedHeight, viewport.height);
      if (viewport.height < expandedHeight - 120) nativeKeyboardWasOpen = true;
      else if (nativeKeyboardWasOpen && viewport.height > expandedHeight - 60) {
        nativeKeyboardWasOpen = false;
        keyboardRef.current.hide();
      }
    };
    viewport.addEventListener("resize", syncKeyboard);
    return () => viewport.removeEventListener("resize", syncKeyboard);
  }, []);

  return <KeyboardInput value={value} onChange={(event) => onChange(event.currentTarget.value)} placeholder={placeholder} aria-label={placeholder} />;
}

function OptionPicker({ open, onOpenChange, title, options, value, searchable, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; options: PickerOption[]; value: string; searchable: boolean; onSelect: (value: string) => void }) {
  const keyboard = useKeyboard();
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = options.filter((option) => `${option.value} ${option.label}`.toLowerCase().includes(normalizedQuery));
  return <BottomSheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) keyboard.hide(); onOpenChange(nextOpen); }} title={title} description={searchable ? "支持中文或英文搜索，常用品项优先" : "选择酒标上的年份"} snap={0.68}><div className="option-picker" style={{ "--picker-keyboard-height": `${keyboard.height}px` } as CSSProperties} tabIndex={0} aria-label={`${title}选项`}>{searchable && <div className="picker-search"><PickerSearchInput value={query} onChange={setQuery} placeholder={`搜索${title.replace("选择", "")}`} /></div>}<div className="picker-options">{visibleOptions.map((option) => <button className={option.value === value ? "selected" : ""} onClick={() => { keyboard.hide(); onSelect(option.value); }} key={option.value}><span>{option.label}</span>{option.value === value && <CheckIcon />}</button>)}{visibleOptions.length === 0 && <p className="picker-empty">没有找到相关选项</p>}</div></div></BottomSheet>;
}

function TasteScreen({ tastedOn, onTastedOn, liked, setLiked, selectedFlavors, toggleFlavor, note, onNoteChange, bodyLevel, onBodyLevel, photos, existingPhotos, cellarSummary, onCamera, onGallery, onRemovePhoto, onBack, onSave, canSave, saving, cloudMessage }: { tastedOn: string; onTastedOn: (value: string) => void; liked: string | null; setLiked: (liked: string | null) => void; selectedFlavors: string[]; toggleFlavor: (flavor: string) => void; note: string; onNoteChange: (note: string) => void; bodyLevel: number | null; onBodyLevel: (value: number | null) => void; photos: DraftPhoto[]; existingPhotos: string[]; cellarSummary: string | null; onCamera: () => void; onGallery: () => void; onRemovePhoto: (id: string) => void; onBack: () => void; onSave: () => Promise<void>; canSave: boolean; saving: boolean; cloudMessage: string | null }) {
  const { bottomInset } = useKeyboardInsets();
  const [saveInset, setSaveInset] = useState(0);
  useEffect(() => {
    const updateSaveInset = () => {
      const previewKeyboard = document.querySelector<HTMLElement>(".keyboard-dock");
      if (previewKeyboard && window.getComputedStyle(previewKeyboard).display !== "none") {
        setSaveInset(bottomInset);
        return;
      }
      // The published app hides the preview keyboard. Follow the actual visible
      // viewport so a stale preview-keyboard inset cannot lift the save button.
      const app = document.querySelector<HTMLElement>(".wine-app");
      const viewport = window.visualViewport;
      const visibleBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight);
      const obscured = Math.max(0, (app?.getBoundingClientRect().bottom ?? visibleBottom) - visibleBottom);
      setSaveInset(obscured >= 80 ? Math.round(obscured) : 0);
    };
    updateSaveInset();
    window.visualViewport?.addEventListener("resize", updateSaveInset);
    window.visualViewport?.addEventListener("scroll", updateSaveInset);
    window.addEventListener("resize", updateSaveInset);
    return () => {
      window.visualViewport?.removeEventListener("resize", updateSaveInset);
      window.visualViewport?.removeEventListener("scroll", updateSaveInset);
      window.removeEventListener("resize", updateSaveInset);
    };
  }, [bottomInset]);
  const selectedBody = bodyChoices.find((choice) => choice.value === bodyLevel);
  return <><div className="record-header-dock"><FlowHeader title="你的感受" onBack={onBack} /></div><MobileScroll className="app-scroll paper-screen"><main className="flow-content record-flow-content taste-content">
    <TastingDatePicker value={tastedOn} onChange={onTastedOn} />
    {cellarSummary && <div className="cellar-taste-summary">来自我的藏酒 · {cellarSummary}</div>}
    <section className="question-block"><div className="question-title"><h2>你喜欢这杯酒吗？</h2><span>{liked ?? "未评价"}</span></div>
      <div className="choice-row taste-choice-row">{["不喜欢", "还不错", "喜欢"].map((option) => <button aria-pressed={liked === option} className={liked === option ? "selected" : ""} onClick={() => setLiked(liked === option ? null : option)} key={option}>{option}</button>)}</div>
    </section>
    <section className="question-block"><div className="question-title"><h2>喝起来更接近？</h2><span>{selectedBody?.label ?? "未评价"}</span></div>
      <div className="body-choice-row" role="group" aria-label="酒体感受">{bodyChoices.map((choice) => <button key={choice.value} aria-pressed={bodyLevel === choice.value} className={bodyLevel === choice.value ? "selected" : ""} onClick={() => onBodyLevel(bodyLevel === choice.value ? null : choice.value)}>{choice.label}</button>)}</div>
      <div className="body-choice-scale" aria-hidden="true"><span>清爽</span><span>浓郁</span></div>
    </section>
    <section className="question-block"><div className="question-title"><h2>你感受到了什么？</h2><span>{selectedFlavors.length ? `已选 ${selectedFlavors.length}` : "未选择"}</span></div>
      <div className="flavor-grid taste-flavor-grid">{flavors.map((flavor) => <button aria-pressed={selectedFlavors.includes(flavor)} className={selectedFlavors.includes(flavor) ? "selected" : ""} onClick={() => toggleFlavor(flavor)} key={flavor}>{flavor}</button>)}</div>
    </section>
    <section className="question-block note-block"><div className="note-heading"><h2>想记下什么？ <span>选填</span></h2><small>{note.length}/1000</small></div>
      <KeyboardTextarea value={note} maxLength={1000} rows={5} aria-label="品酒笔记" placeholder="可以写下香气、口感、搭配的食物，或者此刻的心情……" onChange={(event) => { onNoteChange(event.currentTarget.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight + 2}px`; }} />
      <div className="note-photos">{existingPhotos.map((photo, index) => <figure key={photo}><img src={photo} alt={`藏酒照片 ${index + 1}`} />{index === 0 && <figcaption>首图</figcaption>}</figure>)}{photos.map((photo, index) => <figure key={photo.id}><img src={photo.preview} alt={`品鉴照片 ${index + 1}`} /><button onClick={() => onRemovePhoto(photo.id)} aria-label={`移除第${index + 1}张照片`}>×</button>{index === 0 && existingPhotos.length === 0 && <figcaption>首图</figcaption>}</figure>)}{photos.length + existingPhotos.length < 9 && <button className="add-note-photo" onClick={onCamera}><CameraIcon /><span>继续拍照</span></button>}</div>
      <button className="upload-note-photo" onClick={onGallery}><ImageIcon /> 从相册上传{photos.length > 0 ? "更多照片" : "照片"}</button><small className="photo-help">最多 9 张；酒标识别照片会自动排在第一张。</small>
    </section>
  </main></MobileScroll><div className="taste-save-bar" style={{ bottom: saveInset }}>
    {!canSave && <p className="save-requirement" role="status">至少添加一张照片、酒款信息或品鉴感受。</p>}{cloudMessage && <p className="helper-copy" role="status">{cloudMessage}</p>}
    <button className="primary-action" onClick={() => void onSave()} disabled={saving || !canSave}>{saving ? "正在上传并保存…" : "保存记录"}</button>
  </div></>;
}

type BadgeDefinition = { name: string; description: string; image: string; progress: number; target: number; earnedAt?: string; state?: "earned" | "in-progress" | "locked" };

function SuccessScreen({ record, recordCount, firstTaste, specialDiscovery, badgeAward, inputMethod, isGuest, onDone, onSync }: { record: TastingRecord | null; recordCount: number; firstTaste: boolean; specialDiscovery: { name: string; first: boolean } | null; badgeAward: BadgeDefinition | null; inputMethod: InputMethod; isGuest: boolean; onDone: () => void; onSync: () => void }) {
  const trackedRecord = useRef<string | null>(null);
  const grape = record ? recordGrapeNames(record)[0] ?? "" : "";
  const grapeNode = CORE_GRAPES.find((item) => item.chinese_name === grape);
  const feedback = record ? buildSaveFeedback(record) : null;
  const evidence = record ? getFeedbackEvidence(record) : null;
  const knowledge = grapeNode ? buildKnowledgeFeedback(grapeNode.chinese_name, grapeNode.aromas) : null;
  const firstRecord = recordCount === 1;
  const [rewardStage, setRewardStage] = useState<"insight" | "badge" | null>(() => badgeAward ? "badge" : firstTaste && evidence?.mode === "tasting" ? "insight" : null);
  const rewardButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (record && trackedRecord.current !== record.id) {
      trackedRecord.current = record.id;
      trackRecordEvent("record_feedback_viewed", getRecordAnalyticsProperties(record, inputMethod));
    }
  }, [record?.id, inputMethod]);
  useEffect(() => { rewardButton.current?.focus(); }, [rewardStage]);
  if (!record || !feedback || !evidence) return null;
  const kicker = firstRecord ? "第一杯已经收进你的图鉴" : evidence.mode === "tasting" ? "你的品鉴已记录" : "这杯酒已经收进你的图鉴";
  return <>
    <div className="success-underlay" inert={rewardStage !== null} aria-hidden={rewardStage !== null}>
    <MobileScroll className="app-scroll paper-screen"><main className={`success-content ${firstRecord ? "first-success" : ""}`}>
      <span className="success-kicker">{kicker}</span>
      {grapeNode?.image && <img className="success-grape" src={asset(grapeNode.image)} alt={`${grape}葡萄插画`} draggable={false} decoding="async" />}
      {specialDiscovery && <div className="special-discovery-notice"><small>特别发现 ✦</small><h2>新发现：{specialDiscovery.name}</h2><p>{specialDiscovery.first ? "这是你图鉴中的第一个特色品种。" : "已加入你的特别发现图鉴。"}</p></div>}
      {grape ? <><h1>{evidence.mode === "quick_save" ? `你点亮了「${grape}」` : grape}</h1><p>{grapeNode?.english_name ?? SPECIAL_GRAPES.find((item) => item.chinese_name === canonicalGrapeName(grape))?.english_name ?? "葡萄品种已记录"}</p></> : <h1>记录已保存</h1>}
      {(firstRecord || !firstTaste) && <div className={`first-taste-insight ${feedback.type}`}><small>{feedback.type === "personal" ? "你的真实感受" : "第一杯已收藏"}</small><p>{feedback.description}</p></div>}
      {knowledge && <div className="knowledge-insight"><small>{knowledge.title}</small><p>{knowledge.description}</p></div>}
      <button className="primary-action" onClick={onDone}>回到我的图鉴</button>
      {firstRecord && isGuest && <button className="text-action" onClick={onSync}>保存并同步这次记录</button>}
    </main></MobileScroll>
    </div>
    {rewardStage && <div className={`reward-overlay ${rewardStage}`}>
      {rewardStage === "badge" && <div className="reward-confetti" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <i key={index} />)}</div>}
      <section key={rewardStage} className="reward-popup" role="dialog" aria-modal="true" aria-labelledby="reward-title" aria-describedby="reward-description">
        {rewardStage === "insight" ? <>
          <div className="reward-emblem insight-emblem" aria-hidden="true"><StarFilledIcon /></div>
          <small className="reward-eyebrow">第一条真实感受</small>
          <h2 id="reward-title">记录你的口味线索</h2>
          <p id="reward-description">{feedback.description}</p>
          <button ref={rewardButton} className="primary-action" onClick={() => setRewardStage(firstRecord ? "badge" : null)}>{firstRecord ? "继续领取徽章" : "继续探索"}</button>
        </> : <>
          <img className="reward-badge-art" src={asset(`assets/badges/${badgeAward?.image ?? "first-glass.png"}`)} alt="" width="132" height="132" fetchPriority="high" decoding="async" />
          <small className="reward-eyebrow">葡萄酒图鉴 · 新徽章</small>
          <h2 id="reward-title">获得纪念徽章</h2>
          <strong className="reward-badge-name">{badgeAward?.name ?? "初次举杯"}</strong>
          <p id="reward-description">{badgeAward?.description ?? "第一杯已经收进你的葡萄酒世界。去「我的」看看新徽章吧！"}</p>
          <button ref={rewardButton} className="primary-action" onClick={() => setRewardStage(null)}>收下徽章</button>
        </>}
      </section>
    </div>}
  </>;
}

function getProfileBadges(records: TastingRecord[], cellarCount = 0, cellarEarnedAt?: string): BadgeDefinition[] {
  records = records.filter(record => !record.deletedAt);
  const chronological = records.filter(record => !record.deletedAt).sort((a, b) => tastingTime(a) - tastingTime(b) || a.id.localeCompare(b.id));
  const confirmedGrapes = new Set<string>();
  const confirmedCountries = new Set<string>();
  const confirmedRegions = new Set<string>();
  const confirmedFlavors = new Set<string>();
  const qualification = (test: (record: TastingRecord) => boolean) => { const matched = chronological.find(test); return matched ? tastingDate(matched) || undefined : undefined; };
  for (const record of chronological) {
    if (record.fieldMetadata?.grapes?.confirmed && record.fieldMetadata.grapes.source !== "default") recordGrapeNames(record).forEach((grape) => confirmedGrapes.add(grape));
    if (record.fieldMetadata?.country?.confirmed && record.fieldMetadata.country.source !== "default" && record.country) confirmedCountries.add(record.country);
    if (record.fieldMetadata?.region?.confirmed && record.fieldMetadata.region.source !== "default" && record.region) confirmedRegions.add(record.region);
    if (record.fieldMetadata?.flavors?.confirmed && record.fieldMetadata.flavors.source === "user_selected") (record.flavors ?? []).forEach((flavor) => confirmedFlavors.add(flavor));
  }
  const firstTaste = qualification((record) => getFeedbackEvidence(record).mode === "tasting");
  const countAt = (target: number, values: (record: TastingRecord) => string[]) => { const seen = new Set<string>(); return qualification((record) => { values(record).forEach((value) => seen.add(value)); return seen.size >= target; }); };
  const progress = (target: number, values: Set<string>) => Math.min(values.size, target);
  const text = (record: TastingRecord) => `${record.wine} ${record.grape} ${(record.grapes ?? []).join(" ")} ${record.note}`.toLowerCase();
  const hasText = (record: TastingRecord, words: string[]) => words.some((word) => text(record).includes(word));
  const special = (test: (record: TastingRecord) => boolean) => qualification(test);
  const blendAt = special((record) => (record.grapes ?? []).length > 1 || hasText(record, ["混酿", "blend"]));
  const sparklingAt = special((record) => hasText(record, ["起泡", "香槟", "sparkling", "champagne", "prosecco"]));
  const sweetAt = special((record) => hasText(record, ["甜酒", "甜型", "贵腐", "冰酒", "晚收", "sweet", "icewine"]));
  const fortifiedAt = special((record) => hasText(record, ["波特", "雪莉", "加强", "port", "sherry"]));
  const heritageAt = special((record) => recordGrapeNames(record).some((name) => SPECIAL_GRAPES.some((grape) => grape.chinese_name === name)));
  const oldWorld = new Set(["法国", "意大利", "西班牙", "德国", "葡萄牙", "奥地利", "希腊", "匈牙利", "格鲁吉亚"]);
  const newWorld = new Set(["美国", "智利", "阿根廷", "澳大利亚", "新西兰", "南非", "中国", "加拿大", "乌拉圭"]);
  const oldNewAt = qualification((record) => { const grapes = recordGrapeNames(record); return grapes.some((grape) => chronological.some((other) => other !== record && tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && oldWorld.has(record.country ?? "") && newWorld.has(other.country ?? ""))) || grapes.some((grape) => chronological.some((other) => other !== record && tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && newWorld.has(record.country ?? "") && oldWorld.has(other.country ?? ""))); });
  const terroirAt = qualification((record) => recordGrapeNames(record).some((grape) => new Set(chronological.filter((other) => tastingTime(other) <= tastingTime(record) && recordGrapeNames(other).includes(grape) && other.region).map((other) => other.region)).size >= 3));
  const chinaAt = qualification((record) => new Set(chronological.filter((item) => tastingDate(item) && tastingDate(record) && (tastingDate(item) <= tastingDate(record)) && item.country === "中国" && item.region).map((item) => item.region)).size >= 3);
  const definitions: BadgeDefinition[] = [
    { name: "初次举杯", description: "保存第一杯", image: "first-glass.png", progress: Math.min(records.length, 1), target: 1, earnedAt: chronological[0] ? tastingDate(chronological[0]) : undefined },
    { name: "品鉴初识", description: "写下首次真实感受", image: "first-review.png", progress: firstTaste ? 1 : 0, target: 1, earnedAt: firstTaste },
    { name: "品种探索", description: "记录 3 种已确认葡萄", image: "three-grapes.png", progress: progress(3, confirmedGrapes), target: 3, earnedAt: countAt(3, (record) => recordGrapeNames(record)) },
    { name: "产地旅人", description: "记录 3 个已确认国家", image: "three-countries.png", progress: progress(3, confirmedCountries), target: 3, earnedAt: countAt(3, (record) => record.fieldMetadata?.country?.confirmed && record.country ? [record.country] : []) },
    { name: "记录达人", description: "完成 10 条品鉴记录", image: "first-tasting-v2.png", progress: Math.min(records.length, 10), target: 10, earnedAt: chronological[9] ? tastingDate(chronological[9]) : undefined },
    { name: "品种收藏家", description: "探索 12 种核心葡萄", image: "variety-explorer.png", progress: progress(12, confirmedGrapes), target: 12, earnedAt: countAt(12, (record) => recordGrapeNames(record)) },
    { name: "产区漫游者", description: "探索 8 个葡萄酒产区", image: "region-explorer.png", progress: progress(8, confirmedRegions), target: 8, earnedAt: countAt(8, (record) => record.fieldMetadata?.region?.confirmed && record.region ? [record.region] : []) },
    { name: "风味入门", description: "记录 3 类真实风味", image: "flavor-notes.png", progress: progress(3, confirmedFlavors), target: 3, earnedAt: countAt(3, (record) => record.fieldMetadata?.flavors?.confirmed && record.flavors ? record.flavors : []) },
    { name: "我的酒窖", description: "收藏第一瓶藏酒", image: "cellar-keeper.png", progress: Math.min(cellarCount, 1), target: 1, earnedAt: cellarCount ? cellarEarnedAt : undefined },
    { name: "混酿初体验", description: "首次记录混酿葡萄酒", image: "discovery-blend.png", progress: blendAt ? 1 : 0, target: 1, earnedAt: blendAt },
    { name: "气泡时刻", description: "首次记录起泡酒", image: "discovery-sparkling.png", progress: sparklingAt ? 1 : 0, target: 1, earnedAt: sparklingAt },
    { name: "甜蜜发现", description: "首次记录甜酒", image: "discovery-sweet.png", progress: sweetAt ? 1 : 0, target: 1, earnedAt: sweetAt },
    { name: "加强之味", description: "首次记录波特、雪莉等加强酒", image: "discovery-fortified.png", progress: fortifiedAt ? 1 : 0, target: 1, earnedAt: fortifiedAt },
    { name: "古老品种", description: "记录一个特别品种", image: "discovery-heritage-grape.png", progress: heritageAt ? 1 : 0, target: 1, earnedAt: heritageAt },
    { name: "新旧世界", description: "同一品种探索新旧世界", image: "discovery-old-new-world.png", progress: oldNewAt ? 1 : 0, target: 1, earnedAt: oldNewAt },
    { name: "同品种不同风土", description: "同一品种探索 3 个产区", image: "discovery-terroir.png", progress: terroirAt ? 1 : 0, target: 1, earnedAt: terroirAt },
    { name: "中国风土", description: "探索 3 个中国葡萄酒产区", image: "discovery-china-terroir.png", progress: chinaAt ? 1 : 0, target: 1, earnedAt: chinaAt },
  ];
  return definitions.map((badge) => ({ ...badge, state: badge.earnedAt ? "earned" : badge.progress > 0 ? "in-progress" : "locked" }));
}

function getNewBadgeAward(records: TastingRecord[], saved: TastingRecord, cellarCount: number) {
  const before = new Set(getProfileBadges(records, cellarCount).filter((badge) => badge.state === "earned").map((badge) => badge.name));
  return getProfileBadges([...records, saved], cellarCount).find((badge) => badge.state === "earned" && !before.has(badge.name)) ?? null;
}

function ProfileScreen({ records, cellarEntries, cellarLoaded, cellarError, account, onExplore, onRecord, onRecords, onGrapes, onRegions, onCellar, onActivity, onFlavor, onShare, onSettings }: { records: TastingRecord[]; cellarEntries: CellarEntry[]; cellarLoaded: boolean; cellarError: string | null; account: WineAccount | null; onExplore: () => void; onRecord: () => void; onRecords: () => void; onGrapes: () => void; onRegions: () => void; onCellar: () => void; onActivity: () => void; onFlavor: () => void; onShare: () => void; onSettings: () => void }) {
  useEffect(() => {
    const resetScroll = window.setTimeout(() => {
      const scroll = document.querySelector<HTMLElement>(".mobile-scroll");
      if (scroll) scroll.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(resetScroll);
  }, []);
  const stats = getRecordStats(records);
  const storedBottles = cellarEntries.reduce((sum, entry) => sum + entry.quantityRemaining, 0);
  const consumedBottles = cellarEntries.reduce((sum, entry) => sum + entry.quantityPurchased - entry.quantityRemaining, 0);
  const badges = getProfileBadges(records, cellarEntries.reduce((sum, entry) => sum + entry.quantityPurchased, 0), cellarEntries.map(entry => entry.createdAt).filter(Boolean).sort()[0]);
  const cellarSubtitle = cellarError ? "藏酒暂不可用 · 点击查看" : cellarLoaded ? `${storedBottles} 瓶在藏 · ${consumedBottles} 瓶已饮用` : "正在读取藏酒…";
  const displayName = account && !account.isAnonymous ? account.name : "葡萄酒探索者";
  return <><MobileScroll className="app-scroll paper-screen"><main className="profile-content"><p className="eyebrow">我的</p><div className="profile-head"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><h1>{displayName}</h1><p>{stats.grapeCount} 个品种 · {stats.regionCount} 个产区 · {stats.recordCount} 次品鉴</p></div></div><section className="badge-section"><div className="section-title"><h2>我的徽章</h2><span className="badge-count">已获得 {badges.filter((badge) => badge.state === "earned").length}/{badges.length}</span></div><Carousel className="badge-carousel" contentClassName="badge-row" ariaLabel="我的徽章，可左右滑动">{badges.map((badge, index) => <div className={`badge-item ${badge.state}`} key={badge.name} aria-label={`${badge.name}，${badge.state === "earned" ? "已获得" : badge.description}`}><img className="badge-medal" src={asset(`assets/badges/${badge.image}`)} alt="" draggable={false} loading={index < 3 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" /><strong>{badge.name}</strong><small>{badge.state === "earned" ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "numeric", day: "numeric" }).format(new Date(badge.earnedAt!.length === 10 ? `${badge.earnedAt}T12:00:00` : badge.earnedAt!)) : badge.state === "in-progress" ? `${badge.description} · ${badge.progress}/${badge.target}` : badge.description}</small></div>)}</Carousel></section><section className="footprint-section"><div className="section-title"><h2>我的足迹</h2></div><div className="footprint-row"><button onClick={onRecords} aria-label={`查看${stats.recordCount}条品鉴记录`}><strong>{stats.recordCount}</strong><span>品鉴记录</span></button><button onClick={onGrapes} aria-label={`查看喝过的${stats.grapeCount}个葡萄品种`}><strong>{stats.grapeCount}</strong><span>葡萄品种</span></button><button onClick={onRegions} aria-label={`查看探索过的${stats.regionCount}个产区`}><strong>{stats.regionCount}</strong><span>探索产区</span></button></div></section><div className="profile-menu"><button onClick={onActivity}>饮酒足迹<span className="profile-menu-trailing"><small>饮酒频率与记录</small><span aria-hidden="true">›</span></span></button><button onClick={onCellar}>我的藏酒<span className="profile-menu-trailing"><small>{cellarSubtitle}</small><span aria-hidden="true">›</span></span></button><button onClick={onFlavor}>我的风味偏好<span>›</span></button><button onClick={onShare}>分享我的图鉴<span>›</span></button><button onClick={onSettings}>设置<span>›</span></button></div></main></MobileScroll><BottomNav active="profile" onExplore={onExplore} onRecord={onRecord} onProfile={() => {}} /></>;
}

function GrapeSummaryScreen({ records, onBack, onSelect }: { records: TastingRecord[]; onBack: () => void; onSelect: (grape: string) => void }) {
  const summaries = summarizeGrapes(records);
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content footprint-summary-content"><FlowHeader title="我喝过的葡萄品种" onBack={onBack} /><p className="footprint-summary-intro">每个品种，都是你喝过的一段小发现。</p>{summaries.length ? <div className="grape-summary-list">{summaries.map((summary) => {
    const option = grapeOptions.find((item) => item.value === summary.name);
    const illustrationPath = CORE_GRAPES.find((item) => item.chinese_name === canonicalGrapeName(summary.name))?.image;
    const illustration = illustrationPath ? asset(illustrationPath) : undefined;
    return <button className="grape-summary-card" key={summary.name} onClick={() => onSelect(summary.name)} aria-label={`查看${summary.name}的${summary.count}条品鉴记录`}>{illustration ? <img src={illustration} alt={`${summary.name}葡萄插画`} loading="lazy" decoding="async" /> : <svg className="grape-summary-generic" viewBox="0 0 60 72" role="img" aria-label={`${summary.name}葡萄简笔画`}><path d="M30 10c2 9 1 14-1 18M29 12c-6-6-13-5-16-2 4 7 10 9 17 7M31 13c6-7 13-6 17-2-4 7-11 9-17 7" /><circle cx="24" cy="27" r="6" /><circle cx="36" cy="27" r="6" /><circle cx="19" cy="39" r="6" /><circle cx="30" cy="39" r="6" /><circle cx="41" cy="39" r="6" /><circle cx="25" cy="51" r="6" /><circle cx="36" cy="51" r="6" /><circle cx="30" cy="62" r="6" /></svg>}<span className="grape-summary-copy"><strong>{summary.name}<small>{option?.label.split(" · ").slice(1).join(" · ")}</small></strong><span>品鉴 {summary.count} 次 · 喜欢 {summary.likedCount} 次</span><span>最近品鉴：{summary.recentDate}</span><em>{summary.flavors.length ? `常出现：${summary.flavors.join("、")}` : "还没有记录风味感受"}</em></span><span className="summary-chevron" aria-hidden="true">›</span></button>;
  })}</div> : <p className="footprint-empty">还没有点亮葡萄品种。记录一杯后，它会出现在这里。</p>}</main></MobileScroll>;
}

function RegionSummaryScreen({ records, onBack, onSelect }: { records: TastingRecord[]; onBack: () => void; onSelect: (country: string, region: string) => void }) {
  const countries = summarizeRegions(records);
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content footprint-summary-content"><FlowHeader title="我探索过的产区" onBack={onBack} /><p className="footprint-summary-intro">按国家看看，你的葡萄酒足迹到了哪里。</p>{countries.length ? <div className="country-summary-list">{countries.map((group) => <section className="country-summary-group" key={group.country}><header><GlobeIcon /><h2>{group.country}</h2><span>{group.count} 次品鉴</span></header><div>{group.regions.map((region) => <button className="region-summary-row" key={region.name} onClick={() => onSelect(group.country, region.name)} aria-label={`查看${group.country}${region.name || "未填写产区"}的${region.count}条品鉴记录`}><span className="region-summary-main"><strong>{region.name || "未填写产区"}</strong><small>{region.count} 次品鉴 · 喜欢 {region.likedCount} 次</small><small>主要葡萄：{region.grapes.join("、") || "未填写"}</small><small>最近品鉴：{region.recentDate}</small></span><span className="summary-chevron" aria-hidden="true">›</span></button>)}</div></section>)}</div> : <p className="footprint-empty">还没有记录国家或产区。下一杯可以留意酒标上的产地。</p>}</main></MobileScroll>;
}

function SettingsScreen({ account, syncMessage, syncing, onBack, onAuth, onSignedOut }: { account: WineAccount | null; syncMessage: string | null | undefined; syncing: boolean; onBack: () => void; onAuth: (mode: "login" | "register") => void; onSignedOut: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registered = Boolean(account && !account.isAnonymous);
  const signOut = async () => {
    setBusy(true);
    setError(null);
    try { await onSignedOut(); } catch (reason) { setError(reason instanceof Error ? reason.message : "退出失败，请稍后重试"); } finally { setBusy(false); }
  };
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content settings-content"><FlowHeader title="设置" onBack={onBack} />{registered ? <><section className="account-card registered"><span className="account-avatar">{account?.name.slice(0, 1).toUpperCase()}</span><div><small>已登录</small><h2>{account?.name}</h2><p>{account?.email}</p></div></section>{syncMessage && <p className="auth-message" role="status">{syncMessage}</p>}<button className="account-primary" onClick={() => void signOut()} disabled={busy}>{busy ? "正在退出…" : "退出登录"}</button>{error && <p className="auth-message error" role="alert">{error}</p>}<section className="settings-group"><h3>账号与数据</h3><div><span>云端同步</span><strong>{syncing ? "正在同步…" : syncMessage ? "部分数据待同步" : "已开启"}</strong></div><div><span>数据归属</span><strong>CloudBase 加密存储</strong></div></section><section className="settings-group"><h3>关于</h3><div><span>隐私说明</span><strong>›</strong></div><div><span>版本</span><strong>初心版 0.1</strong></div></section></> : <section className="guest-auth-choice"><span aria-hidden="true">🍷</span><h2>登录你的葡萄酒图鉴</h2><p>继续保存品鉴记录、徽章与风味偏好</p><div className="guest-auth-actions"><button className="account-primary" onClick={() => onAuth("login")}>登录</button><button className="account-secondary" onClick={() => onAuth("register")}>注册</button></div></section>}</main></MobileScroll>;
}

function AuthScreen({ initialMode, onBack, onAuthenticated }: { initialMode: "login" | "register"; onBack: () => void; onAuthenticated: (account: WineAccount) => Promise<void> }) {
  const keyboard = useKeyboard();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loginMethod, setLoginMethod] = useState<"password" | "otp">("password");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const verifyEmail = useRef<((code: string) => Promise<WineAccount>) | null>(null);
  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const resetFeedback = () => { setMessage(null); setError(null); };
  const switchMode = (next: "login" | "register") => { setMode(next); setStep("form"); setCode(""); resetFeedback(); };
  useEffect(() => {
    if (!message && !error) return;
    const timer = window.setTimeout(() => document.querySelector(".auth-message")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 280);
    return () => window.clearTimeout(timer);
  }, [message, error]);
  const submit = async () => {
    keyboard.hide();
    resetFeedback();
    if (!validEmail) { setError("请输入有效的邮箱地址"); return; }
    if ((mode === "register" || loginMethod === "password") && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) { setError("密码需为 8–32 位，并同时包含字母和数字"); return; }
    if (mode === "register" && nickname.trim().length < 2) { setError("昵称至少需要 2 个字符"); return; }
    if (mode === "register" && nickname.trim().length > 48) { setError("昵称最多为 48 个字符"); return; }
    setBusy(true);
    try {
      if (mode === "login" && loginMethod === "password") {
        await onAuthenticated(await (await getAccountApi()).signInWithEmail(email, password));
      } else {
        const accountApi = await getAccountApi();
        verifyEmail.current = mode === "register" ? await accountApi.beginEmailRegistration(email, password, nickname) : await accountApi.beginEmailOtpLogin(email);
        setStep("verify");
        setMessage(`验证码已发送至 ${email.trim()}`);
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "操作失败，请稍后重试"); } finally { setBusy(false); }
  };
  const verify = async () => {
    keyboard.hide();
    if (!/^\d{4,8}$/.test(code.trim()) || !verifyEmail.current) { setError("请输入邮件中的验证码"); return; }
    setBusy(true); resetFeedback();
    try { await onAuthenticated(await verifyEmail.current(code)); } catch (reason) { setError(reason instanceof Error ? reason.message : "验证失败，请稍后重试"); } finally { setBusy(false); }
  };
  const resetPassword = async () => {
    keyboard.hide();
    resetFeedback();
    if (!validEmail) { setError("请先输入需要找回的邮箱"); return; }
    setBusy(true);
    try { await (await getAccountApi()).sendPasswordReset(email); setMessage("重置密码邮件已发送，请前往邮箱查看"); } catch (reason) { setError(reason instanceof Error ? reason.message : "发送失败，请稍后重试"); } finally { setBusy(false); }
  };
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content auth-content"><FlowHeader title="账号" onBack={onBack} /><div className="auth-heading"><span>🍷</span><h1>{step === "verify" ? "查收你的邮箱" : "保存每一次举杯"}</h1><p>{step === "verify" ? "输入邮件中的验证码，完成身份验证" : "登录后，你的品鉴记录、徽章和风味偏好会安全同步"}</p></div>{step === "form" ? <><div className="auth-tabs" role="tablist"><button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button><button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button></div>{mode === "login" && <div className="login-method"><button className={loginMethod === "password" ? "active" : ""} onClick={() => { setLoginMethod("password"); resetFeedback(); }}>密码登录</button><button className={loginMethod === "otp" ? "active" : ""} onClick={() => { setLoginMethod("otp"); resetFeedback(); }}>验证码登录</button></div>}<div className="auth-fields">{mode === "register" && <label><span>昵称</span><KeyboardInput value={nickname} minLength={2} maxLength={48} onChange={(event) => setNickname(event.currentTarget.value)} placeholder="2–48 个字符" autoComplete="nickname" /></label>}<label><span>邮箱</span><KeyboardInput type="email" value={email} onChange={(event) => setEmail(event.currentTarget.value)} placeholder="name@example.com" autoComplete="email" /></label>{(mode === "register" || loginMethod === "password") && <label><span>密码</span><KeyboardInput type="password" value={password} maxLength={32} onChange={(event) => setPassword(event.currentTarget.value)} placeholder="至少 8 位，包含字母和数字" autoComplete={mode === "register" ? "new-password" : "current-password"} /></label>}</div>{mode === "login" && loginMethod === "password" && <button className="forgot-link" onClick={() => void resetPassword()}>忘记密码？</button>}<button className="account-primary" onClick={() => void submit()} disabled={busy}>{busy ? "请稍候…" : mode === "register" ? "发送验证码并注册" : loginMethod === "otp" ? "发送登录验证码" : "登录"}</button></> : <><div className="verify-code"><KeyboardInput inputMode="numeric" value={code} maxLength={8} onChange={(event) => setCode(event.currentTarget.value.replace(/\D/g, ""))} placeholder="输入验证码" aria-label="邮箱验证码" /></div><button className="account-primary" onClick={() => void verify()} disabled={busy}>{busy ? "正在验证…" : mode === "register" ? "完成注册" : "完成登录"}</button><button className="auth-back-link" onClick={() => { setStep("form"); setCode(""); resetFeedback(); }}>返回修改邮箱</button></>}{message && <p className="auth-message success" role="status">{message}</p>}{error && <p className="auth-message error" role="alert">{error}</p>}<p className="auth-terms">继续即表示你同意用户协议与隐私政策。账号认证由 CloudBase 安全处理。</p></main></MobileScroll>;
}

function TastingRecordsScreen({ onEdit, onDelete, deletingId, filter, records: allRecords, cloudMessage, onBack }: { onEdit: (record: TastingRecord) => void; onDelete: (record: TastingRecord) => void; deletingId: string | null; filter: RecordFilter; records: TastingRecord[]; cloudMessage: string | null; onBack: () => void }) {
  const [viewer, setViewer] = useState<{ photos: string[]; index: number; wine: string } | null>(null);
  const records = filterTastingRecords(allRecords, filter);
  const title = filter?.kind === "grape" ? `${filter.grape}的品鉴记录` : filter?.kind === "region" ? `${filter.region || filter.country}的品鉴记录` : "我的品鉴记录";
  const moveViewer = (direction: number) => setViewer((current) => current ? { ...current, index: (current.index + direction + current.photos.length) % current.photos.length } : null);
  return <><MobileScroll className="app-scroll paper-screen"><main className="flow-content records-content"><FlowHeader title={title} onBack={onBack} />{cloudMessage && <p className="records-summary" role="status">{cloudMessage}</p>}<div className="timeline-year"><strong>时间线</strong><span>共 {records.length} 次品鉴</span></div>{records.length ? <div className="records-timeline">{records.map((record, index) => { const date = splitRecordDate(record.date); const photos = record.photos ?? []; const confirmedFlavors = getFeedbackEvidence(record).confirmedFlavors; return <article className="timeline-record" key={record.id}><time className="timeline-date" dateTime={tastingDate(record)}><strong>{date.day}</strong><span>{date.month}</span></time><div className="timeline-dot" aria-hidden="true" /><div className="timeline-content"><p>{tastingLabel(record)}</p><div className="record-actions"><button disabled={!!deletingId} onClick={() => onEdit(record)}>编辑记录</button><button disabled={!!deletingId} onClick={() => onDelete(record)}>删除记录</button></div><div className="timeline-meta"><span>{record.grape}</span><small>{record.region}</small></div>{photos.length > 0 && <div className={`timeline-photo-grid count-${Math.min(photos.length, 3)}`}>{photos.slice(0, 9).map((photo, photoIndex) => <div key={photo}><button className="timeline-photo-button" onClick={() => setViewer({ photos, index: photoIndex, wine: record.wine })} aria-label={`查看${record.wine}第${photoIndex + 1}张照片`}><img className="timeline-photo" src={photo} alt={`${record.wine}品鉴照片 ${photoIndex + 1}`} draggable={false} loading={index < 2 ? "eager" : "lazy"} decoding="async" />{photoIndex === 8 && photos.length > 9 && <span>+{photos.length - 9}</span>}</button></div>)}</div>}<h2>{record.wine}{record.year ? ` · ${record.year}` : ""}</h2><p>{record.note || "这一杯还没有写下品鉴感受。"}</p>{confirmedFlavors.length > 0 && <div className="timeline-flavors">{confirmedFlavors.slice(0, 4).map((flavor) => <span key={flavor}>{flavor}</span>)}</div>}</div></article>; })}</div> : <p className="footprint-empty">这里还没有品鉴记录。</p>}</main></MobileScroll>{viewer && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={`${viewer.wine}照片详情`} onClick={() => setViewer(null)}><header><button onClick={() => setViewer(null)} aria-label="关闭照片详情">×</button><span>{viewer.index + 1} / {viewer.photos.length}</span></header><div className="photo-viewer-stage" onClick={(event) => event.stopPropagation()}>{viewer.photos.length > 1 && <button className="photo-viewer-prev" onClick={() => moveViewer(-1)} aria-label="上一张照片">‹</button>}<img src={viewer.photos[viewer.index]} alt={`${viewer.wine}照片详情`} />{viewer.photos.length > 1 && <button className="photo-viewer-next" onClick={() => moveViewer(1)} aria-label="下一张照片">›</button>}</div><footer>{viewer.wine}</footer></div>}</>;
}

function ShareAtlasScreen({ records, account, onBack }: { records: TastingRecord[]; account: WineAccount | null; onBack: () => void }) {
  const [shared, setShared] = useState(false);
  const stats = getRecordStats(records);
  const photos = records.flatMap((record) => record.photos ?? []).slice(0, 9);
  const displayName = account && !account.isAnonymous ? account.name : "葡萄酒探索者";
  const share = async () => {
    const text = `${displayName} 的葡萄酒图鉴：已点亮 ${stats.grapeCount} 个品种、${stats.regionCount} 个产区，完成 ${stats.recordCount} 次品鉴。`;
    try {
      if (navigator.share) await navigator.share({ title: "我的葡萄酒图鉴", text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setShared(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  };
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content share-content"><FlowHeader title="分享我的图鉴" onBack={onBack} /><section className="share-card"><small>{displayName} 的葡萄酒世界</small><h2>每一杯，都让图鉴更完整</h2><p><strong>{stats.grapeCount}</strong> 个品种 · <strong>{stats.regionCount}</strong> 个产区 · <strong>{stats.recordCount}</strong> 次品鉴</p>{photos.length > 0 ? <div className="share-photo-grid">{photos.map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`我的品鉴照片 ${index + 1}`} draggable={false} />)}</div> : <div className="share-empty"><CameraIcon /><span>记录并保存照片后，会自动出现在这里</span></div>}<footer>我的葡萄酒图鉴 · 初心版</footer></section><button className="primary-action" onClick={() => void share()}>{shared ? "已准备好分享" : "分享给朋友"}</button><p className="share-tip">分享卡片只展示你真实保存过的照片，缩略图统一为 1:1。</p></main></MobileScroll>;
}

function splitRecordDate(value: string) {
  const match = value.match(/(\d{1,2})\D+(\d{1,2})/);
  return match ? { month: `${match[1]}月`, day: match[2].padStart(2, "0") } : { month: "品鉴", day: value };
}

function FlavorPreferenceScreen({ records, onBack }: { records: TastingRecord[]; onBack: () => void }) {
  const confirmed = (record: TastingRecord, key: keyof RecordFieldMetadata) => record.fieldMetadata?.[key]?.confirmed === true;
  const flavorCounts = records.flatMap((record) => getFeedbackEvidence(record).confirmedFlavors).reduce<Record<string, number>>((counts, flavor) => { counts[flavor] = (counts[flavor] ?? 0) + 1; return counts; }, {});
  const flavorTags = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, strength: Math.max(1, Math.min(5, count)) }));
  const bodyValues = records.map((record) => getFeedbackEvidence(record).confirmedBodyLevel).filter((value): value is number => typeof value === "number");
  const bodyAverage = bodyValues.length ? Math.round(bodyValues.reduce((sum, value) => sum + value, 0) / bodyValues.length) : 50;
  const preferences = [{ left: "清爽", right: "浓郁", value: bodyAverage }];
  const likedRecords = records.filter((record) => getFeedbackEvidence(record).confirmedPreference === "喜欢");
  const grapeCounts = likedRecords.filter((record) => confirmed(record, "grapes")).flatMap((record) => record.grapes ?? (record.grape ? record.grape.split("、") : [])).filter((grape) => grape && grape !== "不确定").reduce<Record<string, number>>((counts, grape) => { counts[grape] = (counts[grape] ?? 0) + 1; return counts; }, {});
  const favoriteGrapes = Object.entries(grapeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(" · ") || "继续记录后生成";
  const regionCounts = likedRecords.filter((record) => confirmed(record, "region")).reduce<Record<string, number>>((counts, record) => { if (record.region) counts[record.region] = (counts[record.region] ?? 0) + 1; return counts; }, {});
  const favoriteRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name.split("·").pop()?.trim() ?? name).join(" · ") || "继续记录后生成";
  const confirmedRecords = records.filter((record) => getFeedbackEvidence(record).mode === "tasting");
  const headline = confirmedRecords.length === 0 ? "还没有足够的已确认数据" : bodyValues.length === 0 ? "继续记录，慢慢看见你的偏好" : bodyAverage < 45 ? "偏爱清爽轻盈的风格" : bodyAverage > 65 ? "偏爱饱满浓郁的风格" : "偏爱平衡、适中的风格";
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content flavor-profile"><FlowHeader title="我的风味偏好" onBack={onBack} /><section className="flavor-summary"><small>你的口味画像</small><h2>{headline}</h2><p>{confirmedRecords.length === 0 ? "只有你亲自确认过的信息，才会用于生成口味画像。" : `根据 ${confirmedRecords.length} 次品鉴中的已确认信息实时计算。`}</p></section><section className="preference-section"><h3>常出现的风味</h3><div className="preference-tags">{flavorTags.length > 0 ? flavorTags.map((tag) => <span className={`strength-${tag.strength}`} key={tag.name}>{tag.name}</span>) : <span>暂无已确认风味</span>}</div></section><section className="preference-section"><h3>你偏爱的口感</h3>{bodyValues.length ? <div className="preference-scales">{preferences.map((item) => <div className="preference-scale" key={item.left}><div><span>{item.left}</span><span>{item.right}</span></div><i><b style={{ left: `${item.value}%` }} /></i></div>)}</div> : <p className="preference-empty">暂无已确认酒体评价</p>}</section><section className="preference-section"><h3>更常喜欢</h3><div className="favorite-list"><div><span>葡萄品种</span><strong>{favoriteGrapes}</strong></div><div><span>产区</span><strong>{favoriteRegions}</strong></div><div><span>风味</span><strong>{flavorTags.slice(0, 3).map((tag) => tag.name).join(" · ") || "继续记录后生成"}</strong></div></div></section><p className="preference-footnote">未确认的酒标识别或推断结果不会参与计算。</p></main></MobileScroll>;
}


function DrinkingActivityScreen({ records, loaded, error, onBack }: { records: TastingRecord[]; loaded: boolean; error: string | null; onBack: () => void }) {
  const [range, setRange] = useState<30 | 84 | 365>(30);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dated = records.flatMap(record => {
    const timestamp = tastingDate(record);
    if (!timestamp) return [];
    const date = new Date(`${timestamp}T00:00:00`);
    return record.deletedAt || Number.isNaN(date.getTime()) || timestamp > localDate() ? [] : [{ record, date, key: dayKey(date) }];
  });
  const unavailable = !loaded || Boolean(error?.includes("加载失败") && !records.length);
  const days = new Set(dated.map(item => item.key));
  const thisMonth = dated.filter(item => item.date.getFullYear() === today.getFullYear() && item.date.getMonth() === today.getMonth());
  const latest = dated.reduce<Date | null>((value, item) => !value || item.date > value ? item.date : value, null);
  const elapsed = latest ? Math.round((today.getTime() - new Date(latest.getFullYear(), latest.getMonth(), latest.getDate()).getTime()) / 86400000) : null;
  const start = new Date(today); start.setDate(start.getDate() - range + 1);
  const buckets = Array.from({ length: range === 30 ? 6 : 12 }, (_, index) => {
    const from = new Date(start); from.setDate(from.getDate() + Math.floor(index * range / (range === 30 ? 6 : 12)));
    const until = new Date(start); until.setDate(until.getDate() + Math.floor((index + 1) * range / (range === 30 ? 6 : 12)));
    return { label: `${from.getMonth() + 1}/${from.getDate()}`, value: new Set(dated.filter(item => item.date >= from && item.date < until).map(item => item.key)).size };
  });
  const maximum = Math.max(1, ...buckets.map(item => item.value));
  const points = buckets.map((item, index) => ({ x: 32 + index * 268 / (buckets.length - 1), y: 142 - item.value / maximum * 110 }));
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (month.getDay() + 6) % 7;
  const currentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const shown = dated.filter(item => selected ? item.key === selected : item.date.getFullYear() === month.getFullYear() && item.date.getMonth() === month.getMonth()).sort((a, b) => b.date.getTime() - a.date.getTime());
  const shiftMonth = (step: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1)); setSelected(null); };
  return <><div className="activity-header"><FlowHeader title="饮酒足迹" onBack={onBack} /></div><MobileScroll className="app-scroll paper-screen"><main className="activity-content">
    <p className="eyebrow">每一杯，都有迹可循</p><h2 className="activity-title">回看你的饮酒节奏</h2><p className="activity-copy">来自你保存的品鉴记录</p>
    {!loaded ? <p role="status">正在加载记录…</p> : error ? <p role="status" className="activity-copy">{error}</p> : null}
    <section className="activity-stats" aria-label="本月概览">{[[new Set(thisMonth.map(item => item.key)).size, "本月饮酒天数"], [thisMonth.length, "本月品鉴记录"], [days.size, "累计饮酒天数"], [elapsed === null ? "—" : elapsed, "距上次饮酒 / 天"]].map(([value, label]) => <div key={label}><strong>{unavailable ? "—" : value}</strong><span>{label}</span></div>)}</section>
    <section className="activity-card"><h3>饮酒频率</h3><div className="activity-tabs" aria-label="统计时段">{([30, 84, 365] as const).map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{value === 30 ? "近30天" : value === 84 ? "近12周" : "近一年"}</button>)}</div><p className="activity-copy">每个时段有记录的天数 · 单位：天</p>
    {!unavailable && <svg className="activity-chart" viewBox="0 0 320 175" role="img" aria-label={buckets.map(item => `${item.label}起：${item.value}天`).join("；")}>
      {[0, 0.5, 1].map(ratio => <g key={ratio}><line x1="32" x2="300" y1={142 - ratio * 110} y2={142 - ratio * 110} stroke="#e9e3db" strokeDasharray="3 4" /><text x="22" y={146 - ratio * 110} textAnchor="end">{Number((maximum * ratio).toFixed(1))}</text></g>)}
      <polygon points={`32,142 ${points.map(point => `${point.x},${point.y}`).join(" ")} 300,142`} fill="rgba(126,42,61,.07)" /><polyline points={points.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke="var(--wine)" strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((point, index) => <g key={index}><circle cx={point.x} cy={point.y} r="3" fill="var(--wine)" />{(index === 0 || index === buckets.length - 1 || index === Math.floor(buckets.length / 2)) && <text x={point.x} y="167" textAnchor="middle">{buckets[index].label}</text>}</g>)}
    </svg>}{unavailable ? <p className="activity-copy">{loaded ? "记录暂时无法加载，请稍后重试。" : "正在读取你的品鉴记录…"}</p> : !days.size && <p className="activity-copy">记录第一杯后，这里会出现你的饮酒节奏。</p>}</section>
    <section className="activity-card"><div className="activity-month"><button onClick={() => shiftMonth(-1)} aria-label="上个月">‹</button><h3>{month.getFullYear()}年{month.getMonth() + 1}月</h3><button disabled={currentMonth} onClick={() => shiftMonth(1)} aria-label="下个月">›</button></div><div className="activity-calendar">{["一", "二", "三", "四", "五", "六", "日"].map(day => <span key={day}>{day}</span>)}{Array.from({ length: offset }, (_, index) => <i key={`blank-${index}`} />)}{Array.from({ length: monthEnd }, (_, index) => { const date = new Date(month.getFullYear(), month.getMonth(), index + 1); const key = dayKey(date); return <button key={key} disabled={date > today} aria-pressed={selected === key} aria-label={`${key}，${days.has(key) ? "有品鉴记录" : "无记录"}`} className={`${days.has(key) ? "has-record" : ""} ${selected === key ? "selected" : ""}`} onClick={() => setSelected(selected === key ? null : key)}>{index + 1}<i /></button>; })}</div><p className="activity-copy">酒红圆点表示当天有记录 · 点击日期回看</p></section>
    <section className="activity-recent"><div className="section-title"><h2>{selected ? `${Number(selected.slice(5, 7))}月${Number(selected.slice(8))}日的记录` : "本月记录"}</h2>{selected && <button onClick={() => setSelected(null)}>查看整月</button>}</div>{shown.length ? shown.map(({ record, key }) => <article key={record.id}>{record.photos?.[0] && <img src={record.photos[0]} alt="品鉴照片" />}<div><time>{key}</time><h3>{record.wine || "未命名酒款"}{record.year ? ` · ${record.year}` : ""}</h3><p>{record.note || [record.grape, record.region].filter(Boolean).join(" · ") || "这一杯还没有写下品鉴感受。"}</p></div></article>) : <p className="activity-copy">{unavailable ? "记录暂未加载完成。" : selected ? "这一天还没有品鉴记录。" : "这个月还没有品鉴记录。"}</p>}</section><p className="activity-footnote">同一天的多条品鉴只计为一个饮酒日。未记录的日期不代表未饮酒；未填写饮用量时，不推算摄入量。{records.length > dated.length ? `有 ${records.length - dated.length} 条记录缺少有效日期，暂未计入。` : ""}</p>
  </main></MobileScroll></>;
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="flow-header"><button onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><h1>{title}</h1><span /></header>; }

function BottomNav({ active, onExplore, onRecord, onProfile }: { active: "explore" | "profile"; onExplore: () => void; onRecord: () => void; onProfile: () => void }) { return <nav className="bottom-nav" aria-label="主要导航"><button className={active === "explore" ? "active" : ""} onClick={onExplore}><GlobeIcon /><span>探索</span></button><button className="record-button" onClick={onRecord} aria-label="记录一杯"><PlusIcon /></button><button className={active === "profile" ? "active" : ""} onClick={onProfile}><PersonIcon /><span>我的</span></button></nav>; }
