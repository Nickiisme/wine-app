import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from "react";
import { ArrowLeftIcon, BookmarkFilledIcon, CameraIcon, CheckCircledIcon, CheckIcon, ChevronDownIcon, DrawingPinFilledIcon, GlobeIcon, ImageIcon, LayersIcon, Pencil2Icon, PersonIcon, PlusIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { BottomSheet, Carousel, KeyboardInput, KeyboardTextarea, MobileScroll, useKeyboard } from "./mobile";
import { createTastingRecord, listTastingRecords, type TastingRecord } from "./lib/tastingRecords";
import type { WineAccount } from "./lib/cloudbase";
import "./locked-overrides.css";
import "./onboarding.css";

type Screen = "onboarding" | "explore" | "confirm" | "taste" | "success" | "profile" | "records" | "flavor" | "share" | "settings" | "auth";
type ExploreTab = "grapes" | "regions";
type GrapeNode = { name: string; english: string; image: string; side: "left" | "right"; recent?: boolean; locked?: boolean };
type GrapeDetail = { intro: string; taste: string; aromas: string[]; regions: string };
type DraftPhoto = { id: string; preview: string; file: File; preparedFile: Promise<File> };
type WineDraft = { wine: string; year: string; grape: string; country: string; region: string; photos: DraftPhoto[] };
type PickerOption = { value: string; label: string };
const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
const getAccountApi = () => import("./lib/cloudbase");
const grapeDetails: Record<string, GrapeDetail> = {
  赤霞珠: { intro: "经典的深色葡萄品种，骨架感鲜明，也很适合陈年。", taste: "酒体饱满，单宁较高，酸度中高；年轻时有力量，陈年后更柔和。", aromas: ["黑加仑", "黑樱桃", "雪松", "烟草", "薄荷"], regions: "法国波尔多、美国纳帕谷、智利迈坡谷、中国宁夏" },
  梅洛: { intro: "亲切圆润的红葡萄品种，常被初学者认为很好入口。", taste: "酒体中等至饱满，单宁柔和，果味甜美，口感通常比赤霞珠更圆润。", aromas: ["李子", "黑樱桃", "可可", "香草"], regions: "法国波尔多、美国华盛顿州、智利中央谷" },
  黑皮诺: { intro: "以细腻和透明感著称，对气候与风土十分敏感。", taste: "酒体轻至中等，酸度明亮，单宁细致；风格轻盈，却很有层次。", aromas: ["草莓", "红樱桃", "玫瑰", "蘑菇", "湿润泥土"], regions: "法国勃艮第、新西兰中奥塔哥、美国俄勒冈、德国巴登" },
  霞多丽: { intro: "可塑性很强的白葡萄品种，会随气候与酿造方式呈现不同面貌。", taste: "凉爽产区通常清爽高酸；温暖产区更饱满，橡木桶版本会有奶油质感。", aromas: ["柠檬", "青苹果", "桃子", "黄油", "烤面包"], regions: "法国勃艮第与香槟、美国加州、澳大利亚、智利" },
  长相思: { intro: "辨识度很高的芳香型白葡萄，气息清新而直接。", taste: "酒体轻盈，酸度高，入口爽脆；多数风格适合年轻时饮用。", aromas: ["青柠", "百香果", "青草", "接骨木花"], regions: "新西兰马尔堡、法国卢瓦尔河谷与波尔多、智利" },
};

const grapeNodes: GrapeNode[] = [
  { name: "赤霞珠", english: "Cabernet Sauvignon", image: asset("assets/grapes/cabernet.webp"), side: "left" },
  { name: "梅洛", english: "Merlot", image: asset("assets/grapes/merlot.webp"), side: "right" },
  { name: "黑皮诺", english: "Pinot Noir", image: asset("assets/grapes/pinot-noir.webp"), side: "left", recent: true },
  { name: "霞多丽", english: "Chardonnay", image: asset("assets/grapes/chardonnay.webp"), side: "right" },
  { name: "长相思", english: "Sauvignon Blanc", image: asset("assets/grapes/sauvignon-blanc.webp"), side: "left" },
  { name: "雷司令", english: "Riesling", image: asset("assets/grapes/riesling.webp"), side: "right", locked: true },
  { name: "西拉", english: "Syrah", image: asset("assets/grapes/riesling.webp"), side: "left", locked: true },
  { name: "歌海娜", english: "Grenache", image: asset("assets/grapes/riesling.webp"), side: "right", locked: true },
  { name: "桑娇维塞", english: "Sangiovese", image: asset("assets/grapes/riesling.webp"), side: "left", locked: true },
];
const flavors = ["草莓", "樱桃", "花香", "香草", "香料", "烟熏"];
const bilingual = (value: string, english: string): PickerOption => ({ value, label: `${value} · ${english}` });
const grapeOptions: PickerOption[] = [
  bilingual("赤霞珠", "Cabernet Sauvignon"), bilingual("梅洛", "Merlot"), bilingual("黑皮诺", "Pinot Noir"), bilingual("霞多丽", "Chardonnay"),
  bilingual("长相思", "Sauvignon Blanc"), bilingual("雷司令", "Riesling"), bilingual("西拉", "Syrah / Shiraz"), bilingual("歌海娜", "Grenache"),
  bilingual("桑娇维塞", "Sangiovese"), bilingual("丹魄", "Tempranillo"), bilingual("马尔贝克", "Malbec"), bilingual("内比奥罗", "Nebbiolo"),
  bilingual("白诗南", "Chenin Blanc"), bilingual("灰皮诺", "Pinot Gris / Pinot Grigio"), bilingual("琼瑶浆", "Gewürztraminer"), bilingual("维欧尼", "Viognier"),
  bilingual("品丽珠", "Cabernet Franc"), bilingual("佳美", "Gamay"), bilingual("仙粉黛", "Zinfandel / Primitivo"), bilingual("慕合怀特", "Mourvèdre / Monastrell"),
  bilingual("佳美娜", "Carménère"), bilingual("巴贝拉", "Barbera"), bilingual("蒙特普齐亚诺", "Montepulciano"), bilingual("科维纳", "Corvina"),
  bilingual("歌蕾拉", "Glera"), bilingual("阿尔巴利诺", "Albariño"), bilingual("绿维特利纳", "Grüner Veltliner"), bilingual("赛美蓉", "Sémillon"),
  bilingual("麝香", "Muscat / Moscato"), bilingual("皮诺莫尼耶", "Pinot Meunier"), bilingual("国产多瑞加", "Touriga Nacional"), bilingual("阿斯提可", "Assyrtiko"),
  bilingual("富尔民特", "Furmint"), bilingual("马瑟兰", "Marselan"), bilingual("小维多", "Petit Verdot"), bilingual("丹娜", "Tannat"),
];
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
const newDraft = (): WineDraft => ({ wine: "", year: String(new Date().getFullYear()), grape: "黑皮诺", country: "法国", region: "勃艮第", photos: [] });
const ONBOARDING_SEEN_KEY = "wine-atlas:onboarding-seen";

function rememberOnboarding() {
  window.localStorage.setItem(ONBOARDING_SEEN_KEY, "true");
}

function describeFirstTaste(record: TastingRecord) {
  const body = typeof record.bodyLevel === "number" ? record.bodyLevel < 45 ? "偏清爽" : record.bodyLevel > 65 ? "偏浓郁" : "平衡适中" : "";
  const flavors = (record.flavors ?? []).slice(0, 2).join("、");
  const preference = record.preference === "喜欢" ? "你喜欢" : record.preference === "不喜欢" ? "你对" : "你觉得";
  if (body && flavors) return `${preference}这杯${body}、带${flavors}气息的酒。`;
  if (body) return `${preference}这杯${body}的酒。`;
  if (flavors) return `${preference}这杯带${flavors}气息的酒。`;
  return "这是你的第一条口味线索。再记录几杯，我们会逐渐看懂你的偏好。";
}

function suggestNextTaste(record: TastingRecord) {
  const fresh = typeof record.bodyLevel === "number" && record.bodyLevel < 50;
  const floralOrFruit = (record.flavors ?? []).some((flavor) => ["草莓", "樱桃", "花香"].includes(flavor));
  if (record.grape === "霞多丽" || (fresh && floralOrFruit)) return "如果喜欢这杯的清爽果香，下一次可以留意长相思。";
  if (record.grape === "黑皮诺" || fresh) return "下一次可以试试佳美，看看轻盈明亮的风格是否也适合你。";
  if (record.grape === "赤霞珠" || (record.bodyLevel ?? 50) > 65) return "下一次可以试试西拉，继续探索更饱满、有力量的风格。";
  return "下一次可以换一个葡萄品种，看看什么风格更接近你的口味。";
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
  const [screen, setScreen] = useState<Screen>("explore");
  const [tab, setTab] = useState<ExploreTab>("grapes");
  const [recordSheet, setRecordSheet] = useState(false);
  const [recordFilter, setRecordFilter] = useState<string | null>(null);
  const [liked, setLiked] = useState("喜欢");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(["草莓", "花香"]);
  const [tastingNote, setTastingNote] = useState("");
  const [bodyLevel, setBodyLevel] = useState(58);
  const [draft, setDraft] = useState<WineDraft>(newDraft);
  const [records, setRecords] = useState<TastingRecord[]>([]);
  const [recordsLoaded, setRecordsLoaded] = useState(false);
  const [savedRecord, setSavedRecord] = useState<TastingRecord | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);
  const [account, setAccount] = useState<WineAccount | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const noteCameraInput = useRef<HTMLInputElement>(null);
  const noteGalleryInput = useRef<HTMLInputElement>(null);
  const go = (next: Screen) => { keyboard.hide(); setScreen(next); };
  const resetRecord = () => { setDraft((current) => { current.photos.forEach((photo) => URL.revokeObjectURL(photo.preview)); return newDraft(); }); setTastingNote(""); setLiked("喜欢"); setSelectedFlavors(["草莓", "花香"]); setBodyLevel(58); };
  const startManualRecord = () => { setRecordSheet(false); resetRecord(); go("confirm"); };
  const openCamera = () => {
    setRecordSheet(true);
    cameraInput.current?.click();
  };
  const openRecordChoices = () => setRecordSheet(true);
  const openGallery = () => galleryInput.current?.click();
  const useSelectedPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const photo = preparePhotos([file])[0];
    resetRecord();
    setDraft((current) => ({ ...current, wine: "Domaine Belle Rivière", year: "2020", photos: [photo] }));
    setRecordSheet(false);
    go("confirm");
  };
  const addNotePhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    setDraft((current) => {
      const availableSlots = Math.max(0, 9 - current.photos.length);
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
    listTastingRecords()
      .then((cloudRecords) => {
        if (!active) return;
        setRecords(cloudRecords);
        setRecordsLoaded(true);
        if (cloudRecords.length === 0 && window.localStorage.getItem(ONBOARDING_SEEN_KEY) !== "true") setScreen("onboarding");
        setCloudMessage(null);
      })
      .catch(() => {
        if (active) { setRecordsLoaded(true); setCloudMessage("云端记录加载失败，请稍后重试"); }
      });
    getAccountApi()
      .then((accountApi) => accountApi.getCurrentAccount())
      .then((currentAccount) => { if (active) setAccount(currentAccount); })
      .catch(() => { if (active) setAccount(null); });
    return () => { active = false; };
  }, []);

  const refreshAccountData = async (nextAccount: WineAccount) => {
    setAccount(nextAccount);
    setRecords(await listTastingRecords());
    setCloudMessage(null);
  };

  const saveTasting = async () => {
    setSavingRecord(true);
    setCloudMessage(null);
    try {
      const saved = await createTastingRecord({
        grape: draft.grape,
        wine: draft.wine.trim() || `${draft.region}${draft.grape}`,
        year: draft.year,
        country: draft.country,
        region: [draft.country, draft.region].filter(Boolean).join(" · "),
        note: tastingNote,
        photoFiles: await Promise.all(draft.photos.map((photo) => photo.preparedFile)),
        preference: liked,
        flavors: selectedFlavors,
        bodyLevel,
      });
      setRecords((current) => [saved, ...current]);
      setSavedRecord(saved);
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

  return (
    <div className="wine-app">
      {screen === "onboarding" && <OnboardingScreen onRecord={() => { rememberOnboarding(); go("explore"); openRecordChoices(); }} onExplore={() => { rememberOnboarding(); go("explore"); }} />}
      {screen === "explore" && <ExploreScreen tab={tab} records={records} recordsLoaded={recordsLoaded} account={account} onTab={setTab} onRecord={openRecordChoices} onProfile={() => go("profile")} onNotes={(grape) => { setRecordFilter(grape); go("records"); }} />}
      {screen === "confirm" && <ConfirmScreen draft={draft} onChange={setDraft} onBack={() => go("explore")} onNext={() => go("taste")} />}
      {screen === "taste" && <TasteScreen liked={liked} setLiked={setLiked} selectedFlavors={selectedFlavors} toggleFlavor={(flavor) => setSelectedFlavors((current) => current.includes(flavor) ? current.filter((item) => item !== flavor) : [...current, flavor])} note={tastingNote} onNoteChange={setTastingNote} bodyLevel={bodyLevel} onBodyLevel={setBodyLevel} photos={draft.photos} onCamera={() => noteCameraInput.current?.click()} onGallery={() => noteGalleryInput.current?.click()} onRemovePhoto={(id) => setDraft((current) => { const removed = current.photos.find((photo) => photo.id === id); if (removed) URL.revokeObjectURL(removed.preview); return { ...current, photos: current.photos.filter((photo) => photo.id !== id) }; })} onBack={() => go("confirm")} onSave={saveTasting} saving={savingRecord} cloudMessage={cloudMessage} />}
      {screen === "success" && <SuccessScreen record={savedRecord} recordCount={records.length} isGuest={!account || account.isAnonymous} onDone={() => go("explore")} onSync={() => { setAuthMode("register"); go("auth"); }} />}
      {screen === "profile" && <ProfileScreen records={records} account={account} onExplore={() => go("explore")} onRecord={openCamera} onRecords={() => { setRecordFilter(null); go("records"); }} onFlavor={() => go("flavor")} onShare={() => go("share")} onSettings={() => go("settings")} />}
      {screen === "records" && <TastingRecordsScreen grape={recordFilter} records={records} cloudMessage={cloudMessage} onBack={() => go(recordFilter ? "explore" : "profile")} />}
      {screen === "flavor" && <FlavorPreferenceScreen records={records} onBack={() => go("profile")} />}
      {screen === "share" && <ShareAtlasScreen records={records} account={account} onBack={() => go("profile")} />}
      {screen === "settings" && <SettingsScreen account={account} onBack={() => go("profile")} onAuth={(mode) => { setAuthMode(mode); go("auth"); }} onSignedOut={async () => { const guest = await (await getAccountApi()).signOutToGuest(); await refreshAccountData(guest); }} />}
      {screen === "auth" && <AuthScreen initialMode={authMode} onBack={() => go("settings")} onAuthenticated={async (nextAccount) => { await refreshAccountData(nextAccount); go("settings"); }} />}
      <BottomSheet open={recordSheet} onOpenChange={setRecordSheet} title="拍摄酒标" description="对准正面酒标，自动识别酒款信息" snap={0.64}>
        <div className="record-camera-flow">
          <button className="camera-preview" onClick={openCamera} aria-label="拍照并识别酒标"><span className="camera-frame"><CameraIcon /></span><strong>将酒标完整放入框内</strong><small>点击拍摄并开始识别</small><span className="camera-shutter"><CameraIcon /></span></button>
          <div className="record-alternatives"><p>也可以</p><RecordOption icon={<ImageIcon />} title="从相册导入" detail="选择已有的酒标照片" onClick={openGallery} /><RecordOption icon={<Pencil2Icon />} title="手动记录" detail="没有照片也可以继续" onClick={startManualRecord} /></div>
        </div>
      </BottomSheet>
      <input ref={cameraInput} hidden type="file" accept="image/*" capture="environment" onChange={useSelectedPhoto} aria-label="调用后置摄像头拍摄酒标" />
      <input ref={galleryInput} hidden type="file" accept="image/*" onChange={useSelectedPhoto} aria-label="从相册选择酒标照片" />
      <input ref={noteCameraInput} hidden type="file" accept="image/*" capture="environment" onChange={addNotePhotos} aria-label="继续拍摄品鉴照片" />
      <input ref={noteGalleryInput} hidden type="file" accept="image/*" multiple onChange={addNotePhotos} aria-label="继续上传品鉴照片" />
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

function ExploreScreen({ tab, records, recordsLoaded, account, onTab, onRecord, onProfile, onNotes }: { tab: ExploreTab; records: TastingRecord[]; recordsLoaded: boolean; account: WineAccount | null; onTab: (tab: ExploreTab) => void; onRecord: () => void; onProfile: () => void; onNotes: (grape: string) => void }) {
  const [selectedGrape, setSelectedGrape] = useState<GrapeNode | null>(null);
  const [tabsPinned, setTabsPinned] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  const tabsAnchorRef = useRef<HTMLDivElement>(null);
  const detail = selectedGrape ? grapeDetails[selectedGrape.name] : null;
  const stats = getRecordStats(records);
  const selectedCount = selectedGrape ? stats.grapeCounts[selectedGrape.name] ?? 0 : 0;
  const selectedLocked = selectedCount === 0;
  const hasNoRecords = recordsLoaded && stats.recordCount === 0;
  const hasFirstRecord = stats.recordCount === 1;
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
  return <>
    <MobileScroll className={`app-scroll paper-screen ${tab === "regions" ? "region-page" : ""}`}>
      <main ref={contentRef} className={`explore-content ${tab === "regions" ? "region-explore-content" : ""}`}>
        <header className={`welcome ${hasNoRecords ? "empty-welcome" : ""}`}><p className="eyebrow">{greeting}</p><h1>{hasNoRecords ? "每记录一种葡萄，它就会在这里被点亮。" : "你的葡萄酒世界已点亮："}</h1><p className="stats"><strong>{stats.grapeCount}</strong> 个品种 <i>·</i> <strong>{stats.regionCount}</strong> 个产区 <i>·</i> <strong>{stats.recordCount}</strong> 次品鉴</p></header>
        {hasNoRecords && <section className="first-record-card"><span><CameraIcon /></span><div><strong>点亮第一个品种</strong><p>不知道是什么葡萄？拍下酒标，我们帮你填写。</p></div><button onClick={onRecord}>开始记录</button></section>}
        {hasFirstRecord && <section className="first-insight-card"><small>下一杯探索</small><p>{suggestNextTaste(records[0])}</p><button onClick={onRecord}>遇到下一杯时，继续记下来 <span>›</span></button></section>}
        <div ref={tabsAnchorRef}><AtlasTabs tab={tab} onTab={onTab} inactive={tabsPinned} /></div>
        {tab === "grapes" ? <GrapeAtlas records={records} onSelect={setSelectedGrape} /> : <RegionMap records={records} />}
      </main>
    </MobileScroll>
    {tabsPinned && <div className="atlas-tabs-dock"><AtlasTabs tab={tab} onTab={onTab} pinned /></div>}
    <BottomNav active="explore" onExplore={() => onTab(tab)} onRecord={onRecord} onProfile={onProfile} />
    <BottomSheet open={!!selectedGrape} onOpenChange={(open) => { if (!open) setSelectedGrape(null); }} title={selectedGrape?.name ?? "品种介绍"} description={selectedGrape?.english} snap={0.7}>
      {selectedGrape && (selectedLocked ? <div className="grape-detail locked-detail"><span className="detail-question">?</span><h3>{selectedGrape.name}</h3><p>这是一个待探索品种。第一次记录它时，就会在图鉴中点亮。</p></div> : <div className="grape-detail"><div className="grape-detail-hero"><img src={selectedGrape.image} alt={`${selectedGrape.name}葡萄简笔画`} draggable={false} /><div><span className="detail-count">已品鉴 {formatCount(selectedCount)} 次</span><p>{detail?.intro}</p></div></div><section className="detail-section"><small>喝起来</small><p>{detail?.taste}</p></section><section className="detail-section"><small>常见香气</small><div className="aroma-tags">{detail?.aromas.map((aroma) => <span key={aroma}>{aroma}</span>)}</div></section><section className="detail-section"><small>主要产地</small><p>{detail?.regions}</p></section><button className="notes-link" onClick={() => onNotes(selectedGrape.name)}>查看 {selectedCount} 条品酒笔记 <span>›</span></button></div>)}
    </BottomSheet>
  </>;
}

function GrapeAtlas({ records, onSelect }: { records: TastingRecord[]; onSelect: (grape: GrapeNode) => void }) {
  const [pressed, setPressed] = useState<string | null>(null);
  const counts = getRecordStats(records).grapeCounts;
  const latestGrape = records[0]?.grape;
  const choose = (grape: GrapeNode) => { setPressed(grape.name); window.setTimeout(() => { setPressed(null); onSelect(grape); }, 190); };
  return <section className="grape-atlas" aria-label="葡萄品种探索路径"><svg className="path-line" viewBox="0 0 180 940" preserveAspectRatio="none" aria-hidden="true"><path d="M88 4 C158 72 154 150 86 220 S18 365 92 438 S156 580 82 650 S20 794 92 936" /></svg>{grapeNodes.map((grape, index) => { const count = counts[grape.name] ?? 0; const locked = count === 0; const recent = grape.name === latestGrape; return <button key={`${grape.name}-${index}`} onClick={() => choose(grape)} className={`grape-node ${grape.side} ${locked ? "locked" : ""} ${recent ? "recent" : ""} ${pressed === grape.name ? "pressed" : ""}`} aria-label={`${grape.name}${locked ? "，待探索" : `，品鉴过${count}次`}`}><span className="grape-art-wrap"><img src={grape.image} alt="" draggable={false} loading={index < 3 ? "eager" : "lazy"} decoding="async" fetchPriority={index < 2 ? "high" : "auto"} />{!locked && <span className="taste-count">{formatCount(count)}</span>}{recent && <span className="recent-spark">✦</span>}{locked && <span className="locked-mark">?</span>}</span><strong>{grape.name}</strong><small>{locked ? `${grape.english} · 待探索` : grape.english}</small></button>; })}</section>;
}

function formatCount(count: number) { return count > 99 ? "100+" : String(count); }

function getRecordStats(records: TastingRecord[]) {
  const grapeCounts: Record<string, number> = {};
  const regions = new Set<string>();
  const countries = new Set<string>();
  records.forEach((record) => {
    if (record.grape) grapeCounts[record.grape] = (grapeCounts[record.grape] ?? 0) + 1;
    if (record.region) {
      regions.add(record.region);
      countries.add(record.region.split("·")[0].trim());
    }
  });
  return { recordCount: records.length, grapeCount: Object.keys(grapeCounts).length, regionCount: regions.size, grapeCounts, countries };
}

function RegionMap({ records }: { records: TastingRecord[] }) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [mapView, setMapView] = useState({ scale: 1, x: 0, y: 0 });
  const mapViewRef = useRef(mapView);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; scale: number; x: number; y: number; centerX: number; centerY: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const lastTap = useRef(0);
  useEffect(() => { mapViewRef.current = mapView; }, [mapView]);
  const clampView = (scale: number, x: number, y: number) => {
    const limitX = 150 * (scale - 1);
    const limitY = 190 * (scale - 1);
    return { scale, x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
  };
  const zoomMap = (nextScale: number) => {
    const scale = Math.max(1, Math.min(3, nextScale));
    setMapView((current) => clampView(scale, scale === 1 ? 0 : current.x, scale === 1 ? 0 : current.y));
  };
  const handleMapDoubleClick = () => zoomMap(mapViewRef.current.scale > 1 ? 1 : 2);
  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pointerStart.current = { x: event.clientX, y: event.clientY };
    moved.current = false;
    if (pointers.current.size === 2) {
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
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;
      const scale = Math.max(1, Math.min(3, pinchStart.current.scale * distance / Math.max(1, pinchStart.current.distance)));
      setMapView(clampView(scale, pinchStart.current.x + centerX - pinchStart.current.centerX, pinchStart.current.y + centerY - pinchStart.current.centerY));
    } else if (pointers.current.size === 1 && mapViewRef.current.scale > 1) {
      setMapView((current) => clampView(current.scale, current.x + event.clientX - previous.x, current.y + event.clientY - previous.y));
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
  const countryCounts = records.reduce<Record<string, number>>((counts, record) => { const country = record.region.split("·")[0].trim(); if (country) counts[country] = (counts[country] ?? 0) + 1; return counts; }, {});
  const regions = [{ country: "法国", x: "48%", y: "181px" }, { country: "意大利", x: "54%", y: "215px" }, { country: "中国", x: "73%", y: "205px" }, { country: "美国", x: "19%", y: "194px" }, { country: "澳大利亚", x: "74%", y: "270px" }, { country: "新西兰", x: "83%", y: "306px" }].map((region) => ({ ...region, count: countryCounts[region.country] ?? 0 }));
  const countryRegions: Record<string, string[]> = {
    法国: ["香槟", "卢瓦尔河谷", "勃艮第", "波尔多", "罗讷河谷"],
    意大利: ["皮埃蒙特", "威尼托", "托斯卡纳", "西西里"],
    中国: ["宁夏贺兰山东麓", "新疆", "山东蓬莱", "云南香格里拉"],
    美国: ["纳帕谷", "索诺玛", "威拉米特谷"],
    澳大利亚: ["巴罗萨谷", "雅拉谷", "玛格丽特河"],
    新西兰: ["马尔堡", "中奥塔哥", "霍克斯湾"],
  };
  const countryFacts: Record<string, { area: string; output: string; grapes: string }> = {
    法国: { area: "约 79 万公顷", output: "约 46 亿升/年", grapes: "赤霞珠、梅洛、黑皮诺、霞多丽" },
    意大利: { area: "约 72 万公顷", output: "约 49 亿升/年", grapes: "桑娇维塞、内比奥罗、灰皮诺" },
    中国: { area: "约 78 万公顷", output: "约 8 亿升/年", grapes: "赤霞珠、蛇龙珠、马瑟兰、霞多丽" },
    美国: { area: "约 39 万公顷", output: "约 24 亿升/年", grapes: "赤霞珠、霞多丽、黑皮诺、仙粉黛" },
    澳大利亚: { area: "约 15 万公顷", output: "约 12 亿升/年", grapes: "西拉、霞多丽、赤霞珠、雷司令" },
    新西兰: { area: "约 4.2 万公顷", output: "约 3 亿升/年", grapes: "长相思、黑皮诺、霞多丽、灰皮诺" },
  };
  if (selectedCountry) { const facts = countryFacts[selectedCountry]; const visitedRegions = new Set(records.filter((record) => record.region.split("·")[0].trim() === selectedCountry).map((record) => record.region.split("·").slice(1).join("·").trim())); return <section className="region-map region-map-zoomed" aria-label={`${selectedCountry}葡萄酒产区地图`}><header className="region-zoom-header"><button onClick={() => setSelectedCountry(null)} aria-label="返回世界地图"><ArrowLeftIcon /></button><div><strong>{selectedCountry} · 产区地图</strong><small>国家概览与主要产区</small></div></header><div className="country-facts"><div><small>葡萄园面积</small><strong>{facts.area}</strong></div><div><small>葡萄酒年产量</small><strong>{facts.output}</strong></div><p><span>主要品种</span>{facts.grapes}</p></div><div className="region-zoom-canvas">{countryRegions[selectedCountry].map((region, index) => <button className={`region-node region-node-${index + 1}`} key={region}><span>{index + 1}</span><strong>{region}</strong><small>{visitedRegions.has(region) ? "已点亮" : "待继续探索"}</small></button>)}</div><p className="map-note">点按左上角，回到世界地图。</p></section>; }
  return <section className="region-map" aria-label="世界葡萄酒产区地图"><div className="map-heading"><GlobeIcon /><span>我的葡萄酒足迹</span></div><div className={`map-gesture-surface ${mapView.scale > 1 ? "is-zoomed" : ""}`} data-scroll-drag="ignore" onDoubleClick={handleMapDoubleClick} onPointerDown={handleMapPointerDown} onPointerMove={handleMapPointerMove} onPointerUp={handleMapPointerEnd} onPointerCancel={handleMapPointerEnd} onWheel={handleMapWheel} aria-label="可缩放的世界葡萄酒产区地图"><div className="map-transform-layer" style={{ transform: `translate3d(${mapView.x}px, ${mapView.y}px, 0) scale(${mapView.scale})` }}><img className="world-map-art" src={asset("assets/maps/world-wine-map.webp")} alt="世界葡萄酒产区地图" draggable={false} loading="lazy" decoding="async" />{regions.map((region) => <button className="region-pin" style={{ left: region.x, top: region.y }} key={region.country} onClick={() => { if (!moved.current) setSelectedCountry(region.country); }}><span>{region.count}</span>{region.country}</button>)}</div></div>{mapView.scale > 1 && <button className="map-reset" onClick={() => zoomMap(1)} aria-label="还原地图缩放">还原</button>}<p className="map-note">双击或双指捏合缩放 · 放大后拖动查看</p></section>;
}

function ConfirmScreen({ draft, onChange, onBack, onNext }: { draft: WineDraft; onChange: (draft: WineDraft) => void; onBack: () => void; onNext: () => void }) {
  const [picker, setPicker] = useState<"year" | "grape" | "country" | "region" | null>(null);
  const years = Array.from({ length: 61 }, (_, index) => { const value = String(new Date().getFullYear() - index); return { value, label: value }; });
  const update = (value: Partial<WineDraft>) => onChange({ ...draft, ...value });
  const pickerConfig = picker ? {
    year: { title: "选择年份", options: years, value: draft.year, searchable: false, onSelect: (value: string) => update({ year: value }) },
    grape: { title: "选择葡萄品种", options: grapeOptions, value: draft.grape, searchable: true, onSelect: (value: string) => update({ grape: value }) },
    country: { title: "选择国家", options: countryOptions, value: draft.country, searchable: true, onSelect: (value: string) => update({ country: value, region: regionOptionsByCountry[value]?.[0]?.value ?? "" }) },
    region: { title: "选择产区", options: regionOptionsByCountry[draft.country] ?? [], value: draft.region, searchable: true, onSelect: (value: string) => update({ region: value }) },
  }[picker] : null;
  const firstPhoto = draft.photos[0]?.preview;
  const displayValue = (options: PickerOption[], value: string) => options.find((option) => option.value === value)?.label ?? value;
  return <><MobileScroll className="app-scroll paper-screen"><main className="flow-content"><FlowHeader title="确认酒款" onBack={onBack} />{firstPhoto && <div className="label-photo has-photo"><img src={firstPhoto} alt="刚刚拍摄的酒标" /><div><strong>{draft.wine || "待确认酒款"}</strong><span>{displayValue(grapeOptions, draft.grape)} · {draft.year}</span></div><span className="scan-pill"><CheckIcon /> 已识别</span></div>}<p className="helper-copy">{firstPhoto ? "请确认识别结果，点按任意字段即可修改。" : "手动填写酒款信息；只有酒款名称会唤起键盘。"}</p><div className="form-list"><Field label="酒款名称" value={draft.wine} onChange={(wine) => update({ wine })} /><SelectField label="年份" value={draft.year} onClick={() => setPicker("year")} /><SelectField label="葡萄品种" value={displayValue(grapeOptions, draft.grape)} onClick={() => setPicker("grape")} /><SelectField label="国家" value={displayValue(countryOptions, draft.country)} onClick={() => setPicker("country")} /><SelectField label="产区" value={displayValue(regionOptionsByCountry[draft.country] ?? [], draft.region)} onClick={() => setPicker("region")} /></div><button className="primary-action" onClick={onNext}>确认，继续</button></main></MobileScroll>{pickerConfig && <OptionPicker open={!!picker} onOpenChange={(open) => { if (!open) setPicker(null); }} title={pickerConfig.title} options={pickerConfig.options} value={pickerConfig.value} searchable={pickerConfig.searchable} onSelect={(value) => { pickerConfig.onSelect(value); setPicker(null); }} />}</>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="field-row"><span>{label}</span><input value={value} onChange={(event) => onChange(event.currentTarget.value)} placeholder="请输入酒款名称" aria-label={label} /></label>; }

function SelectField({ label, value, onClick }: { label: string; value: string; onClick: () => void }) { return <button className="field-row select-field" onClick={onClick} aria-label={`${label}，当前为${value}`}><span>{label}</span><strong><span>{value}</span><ChevronDownIcon /></strong></button>; }

function OptionPicker({ open, onOpenChange, title, options, value, searchable, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; options: PickerOption[]; value: string; searchable: boolean; onSelect: (value: string) => void }) {
  const [query, setQuery] = useState("");
  useEffect(() => { if (!open) setQuery(""); }, [open]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = options.filter((option) => `${option.value} ${option.label}`.toLowerCase().includes(normalizedQuery));
  return <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={searchable ? "支持中文或英文搜索，常用品项优先" : "选择酒标上的年份"} snap={0.68}><div className="option-picker" tabIndex={0} aria-label={`${title}选项`}>{searchable && <div className="picker-search"><KeyboardInput value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={`搜索${title.replace("选择", "")}`} aria-label={`搜索${title.replace("选择", "")}`} /></div>}<div className="picker-options">{visibleOptions.map((option) => <button className={option.value === value ? "selected" : ""} onClick={() => onSelect(option.value)} key={option.value}><span>{option.label}</span>{option.value === value && <CheckIcon />}</button>)}{visibleOptions.length === 0 && <p className="picker-empty">没有找到相关选项</p>}</div></div></BottomSheet>;
}

function TasteScreen({ liked, setLiked, selectedFlavors, toggleFlavor, note, onNoteChange, bodyLevel, onBodyLevel, photos, onCamera, onGallery, onRemovePhoto, onBack, onSave, saving, cloudMessage }: { liked: string; setLiked: (liked: string) => void; selectedFlavors: string[]; toggleFlavor: (flavor: string) => void; note: string; onNoteChange: (note: string) => void; bodyLevel: number; onBodyLevel: (value: number) => void; photos: DraftPhoto[]; onCamera: () => void; onGallery: () => void; onRemovePhoto: (id: string) => void; onBack: () => void; onSave: () => Promise<void>; saving: boolean; cloudMessage: string | null }) {
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content taste-content"><FlowHeader title="你的感受" onBack={onBack} /><section className="question-block"><h2>你喜欢这杯酒吗？</h2><div className="choice-row">{["不喜欢", "还不错", "喜欢"].map((option) => <button className={liked === option ? "selected" : ""} onClick={() => setLiked(option)} key={option}>{option}</button>)}</div></section><section className="question-block"><h2>喝起来更接近？</h2><div className="range-copy"><span>清爽</span><span>浓郁</span></div><input className="taste-range" type="range" min="0" max="100" value={bodyLevel} onChange={(event) => onBodyLevel(Number(event.currentTarget.value))} aria-label="清爽到浓郁" /></section><section className="question-block"><h2>你感受到了什么？</h2><div className="flavor-grid">{flavors.map((flavor) => <button className={selectedFlavors.includes(flavor) ? "selected" : ""} onClick={() => toggleFlavor(flavor)} key={flavor}>{flavor}</button>)}</div></section><section className="question-block note-block"><div className="note-heading"><h2>想记下什么？ <span>选填</span></h2><small>{note.length}/1000</small></div><KeyboardTextarea value={note} maxLength={1000} rows={5} aria-label="品酒笔记" placeholder="可以写下香气、口感、搭配的食物，或者此刻的心情……" onChange={(event) => { onNoteChange(event.currentTarget.value); event.currentTarget.style.height = "auto"; event.currentTarget.style.height = `${event.currentTarget.scrollHeight + 2}px`; }} /><div className="note-photos">{photos.map((photo, index) => <figure key={photo.id}><img src={photo.preview} alt={`品鉴照片 ${index + 1}`} /><button onClick={() => onRemovePhoto(photo.id)} aria-label={`移除第${index + 1}张照片`}>×</button>{index === 0 && <figcaption>首图</figcaption>}</figure>)}{photos.length < 9 && <button className="add-note-photo" onClick={onCamera}><CameraIcon /><span>继续拍照</span></button>}</div><button className="upload-note-photo" onClick={onGallery}><ImageIcon /> 从相册上传{photos.length > 0 ? "更多照片" : "照片"}</button><small className="photo-help">最多 9 张；酒标识别照片会自动排在第一张。</small></section>{cloudMessage && <p className="helper-copy" role="status">{cloudMessage}</p>}<button className="primary-action" onClick={() => void onSave()} disabled={saving}>{saving ? "正在上传并保存…" : "保存记录"}</button></main></MobileScroll>;
}

function SuccessScreen({ record, recordCount, isGuest, onDone, onSync }: { record: TastingRecord | null; recordCount: number; isGuest: boolean; onDone: () => void; onSync: () => void }) {
  const grape = record?.grape ?? "新的葡萄品种";
  const grapeNode = grapeNodes.find((item) => item.name === grape);
  const firstRecord = recordCount === 1 && record;
  return <MobileScroll className="app-scroll paper-screen"><main className={`success-content ${firstRecord ? "first-success" : ""}`}><span className="success-kicker">{firstRecord ? "第一杯已经收进你的图鉴" : "品鉴记录已保存"}</span>{grapeNode && <img className="success-grape" src={grapeNode.image} alt={`${grape}葡萄插画`} draggable={false} decoding="async" />}<h1>{firstRecord ? `你点亮了「${grape}」` : grape}</h1><p>{grapeNode?.english ?? "新的葡萄品种"}</p>{firstRecord ? <><div className="first-taste-insight"><small>第一条口味线索</small><p>{describeFirstTaste(record)}</p></div><div className="first-badge"><span><CheckCircledIcon /></span><div><small>获得纪念徽章</small><strong>初次举杯</strong></div></div></> : <div className="unlock-summary"><CheckIcon /><span>这次品鉴已经加入你的葡萄酒世界</span></div>}<button className="primary-action" onClick={onDone}>回到我的图鉴</button>{firstRecord && isGuest && <button className="text-action" onClick={onSync}>保存并同步这次记录</button>}</main></MobileScroll>;
}

function ProfileScreen({ records, account, onExplore, onRecord, onRecords, onFlavor, onShare, onSettings }: { records: TastingRecord[]; account: WineAccount | null; onExplore: () => void; onRecord: () => void; onRecords: () => void; onFlavor: () => void; onShare: () => void; onSettings: () => void }) {
  useEffect(() => {
    const resetScroll = window.setTimeout(() => {
      const scroll = document.querySelector<HTMLElement>(".mobile-scroll");
      if (scroll) scroll.scrollTop = 0;
    }, 120);
    return () => window.clearTimeout(resetScroll);
  }, []);
  const badges = [
    { name: "图鉴达人", note: "品种收藏", icon: <StarFilledIcon />, tier: "gold" },
    { name: "产区旅人", note: "世界探索", icon: <GlobeIcon />, tier: "silver" },
    { name: "品鉴新星", note: "持续记录", icon: <BookmarkFilledIcon />, tier: "gold" },
    { name: "红葡萄入门", note: "红葡萄收藏", icon: <LayersIcon />, tier: "silver" },
    { name: "风味发现者", note: "香气探索", icon: <DrawingPinFilledIcon />, tier: "gray" },
    { name: "初次举杯", note: "旅程开始", icon: <CheckCircledIcon />, tier: "gray" },
  ];
  const stats = getRecordStats(records);
  const displayName = account && !account.isAnonymous ? account.name : "葡萄酒探索者";
  return <><MobileScroll className="app-scroll paper-screen"><main className="profile-content"><p className="eyebrow">我的</p><div className="profile-head"><span>{displayName.slice(0, 1).toUpperCase()}</span><div><h1>{displayName}</h1><p>{stats.grapeCount} 个品种 · {stats.regionCount} 个产区 · {stats.recordCount} 次品鉴</p></div></div><section className="badge-section"><div className="section-title"><h2>我的徽章</h2><button>全部 <span>›</span></button></div><Carousel className="badge-carousel" contentClassName="badge-row" ariaLabel="我的徽章，可左右滑动">{badges.map((badge) => <button className={`badge-item ${badge.tier}`} key={badge.name}><span className="badge-coin"><span>{badge.icon}</span></span><strong>{badge.name}</strong><small>{badge.note}</small></button>)}</Carousel></section><section className="footprint-section"><div className="section-title"><h2>我的足迹</h2></div><div className="footprint-row"><button onClick={onRecords} aria-label={`查看${stats.recordCount}条品鉴记录`}><strong>{stats.recordCount}</strong><span>品鉴记录</span></button><button><strong>{stats.grapeCount}</strong><span>葡萄品种</span></button><button><strong>{stats.regionCount}</strong><span>探索产区</span></button></div></section><div className="profile-menu"><button onClick={onFlavor}>我的风味偏好<span>›</span></button><button onClick={onShare}>分享我的图鉴<span>›</span></button><button onClick={onSettings}>设置<span>›</span></button></div></main></MobileScroll><BottomNav active="profile" onExplore={onExplore} onRecord={onRecord} onProfile={() => {}} /></>;
}

function SettingsScreen({ account, onBack, onAuth, onSignedOut }: { account: WineAccount | null; onBack: () => void; onAuth: (mode: "login" | "register") => void; onSignedOut: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registered = Boolean(account && !account.isAnonymous);
  const signOut = async () => {
    setBusy(true);
    setError(null);
    try { await onSignedOut(); } catch (reason) { setError(reason instanceof Error ? reason.message : "退出失败，请稍后重试"); } finally { setBusy(false); }
  };
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content settings-content"><FlowHeader title="设置" onBack={onBack} />{registered ? <><section className="account-card registered"><span className="account-avatar">{account?.name.slice(0, 1).toUpperCase()}</span><div><small>已登录</small><h2>{account?.name}</h2><p>{account?.email}</p></div></section><button className="account-primary" onClick={() => void signOut()} disabled={busy}>{busy ? "正在退出…" : "退出登录"}</button>{error && <p className="auth-message error" role="alert">{error}</p>}<section className="settings-group"><h3>账号与数据</h3><div><span>云端同步</span><strong>已开启</strong></div><div><span>数据归属</span><strong>CloudBase 加密存储</strong></div></section><section className="settings-group"><h3>关于</h3><div><span>隐私说明</span><strong>›</strong></div><div><span>版本</span><strong>初心版 0.1</strong></div></section></> : <section className="guest-auth-choice"><span aria-hidden="true">🍷</span><h2>登录你的葡萄酒图鉴</h2><p>继续保存品鉴记录、徽章与风味偏好</p><div className="guest-auth-actions"><button className="account-primary" onClick={() => onAuth("login")}>登录</button><button className="account-secondary" onClick={() => onAuth("register")}>注册</button></div></section>}</main></MobileScroll>;
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

function TastingRecordsScreen({ grape, records: allRecords, cloudMessage, onBack }: { grape: string | null; records: TastingRecord[]; cloudMessage: string | null; onBack: () => void }) {
  const [viewer, setViewer] = useState<{ photos: string[]; index: number; wine: string } | null>(null);
  const records = grape ? allRecords.filter((record) => record.grape === grape) : allRecords;
  const moveViewer = (direction: number) => setViewer((current) => current ? { ...current, index: (current.index + direction + current.photos.length) % current.photos.length } : null);
  return <><MobileScroll className="app-scroll paper-screen"><main className="flow-content records-content"><FlowHeader title={grape ? `${grape}的品酒笔记` : "我的品鉴记录"} onBack={onBack} />{cloudMessage && <p className="records-summary" role="status">{cloudMessage}</p>}<div className="timeline-year"><strong>{new Date().getFullYear()}</strong><span>{grape ? `${records.length} 条${grape}记录` : `共 ${records.length} 次品鉴`}</span></div><div className="records-timeline">{records.map((record, index) => { const date = splitRecordDate(record.date); const photos = record.photos ?? []; return <article className="timeline-record" key={record.id}><time className="timeline-date" dateTime={record.createdAt}><strong>{date.day}</strong><span>{date.month}</span></time><div className="timeline-dot" aria-hidden="true" /><div className="timeline-content"><div className="timeline-meta"><span>{record.grape}</span><small>{record.region}</small></div>{photos.length > 0 && <div className={`timeline-photo-grid count-${Math.min(photos.length, 3)}`}>{photos.slice(0, 9).map((photo, photoIndex) => <div key={photo}><button className="timeline-photo-button" onClick={() => setViewer({ photos, index: photoIndex, wine: record.wine })} aria-label={`查看${record.wine}第${photoIndex + 1}张照片`}><img className="timeline-photo" src={photo} alt={`${record.wine}品鉴照片 ${photoIndex + 1}`} draggable={false} loading={index < 2 ? "eager" : "lazy"} decoding="async" />{photoIndex === 8 && photos.length > 9 && <span>+{photos.length - 9}</span>}</button></div>)}</div>}<h2>{record.wine}{record.year ? ` · ${record.year}` : ""}</h2><p>{record.note || "这一杯还没有写下品鉴感受。"}</p>{record.flavors && record.flavors.length > 0 && <div className="timeline-flavors">{record.flavors.slice(0, 4).map((flavor) => <span key={flavor}>{flavor}</span>)}</div>}</div></article>; })}</div></main></MobileScroll>{viewer && <div className="photo-viewer" role="dialog" aria-modal="true" aria-label={`${viewer.wine}照片详情`} onClick={() => setViewer(null)}><header><button onClick={() => setViewer(null)} aria-label="关闭照片详情">×</button><span>{viewer.index + 1} / {viewer.photos.length}</span></header><div className="photo-viewer-stage" onClick={(event) => event.stopPropagation()}>{viewer.photos.length > 1 && <button className="photo-viewer-prev" onClick={() => moveViewer(-1)} aria-label="上一张照片">‹</button>}<img src={viewer.photos[viewer.index]} alt={`${viewer.wine}照片详情`} />{viewer.photos.length > 1 && <button className="photo-viewer-next" onClick={() => moveViewer(1)} aria-label="下一张照片">›</button>}</div><footer>{viewer.wine}</footer></div>}</>;
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
  const flavorCounts = records.flatMap((record) => record.flavors ?? []).reduce<Record<string, number>>((counts, flavor) => { counts[flavor] = (counts[flavor] ?? 0) + 1; return counts; }, {});
  const flavorTags = Object.entries(flavorCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, strength: Math.max(1, Math.min(5, count)) }));
  const bodyValues = records.map((record) => record.bodyLevel).filter((value): value is number => typeof value === "number");
  const bodyAverage = bodyValues.length ? Math.round(bodyValues.reduce((sum, value) => sum + value, 0) / bodyValues.length) : 50;
  const preferences = [{ left: "清爽", right: "浓郁", value: bodyAverage }];
  const favoriteGrapes = Object.entries(getRecordStats(records).grapeCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name).join(" · ") || "继续记录后生成";
  const regionCounts = records.reduce<Record<string, number>>((counts, record) => { if (record.region) counts[record.region] = (counts[record.region] ?? 0) + 1; return counts; }, {});
  const favoriteRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([name]) => name.split("·").pop()?.trim() ?? name).join(" · ") || "继续记录后生成";
  const headline = records.length === 0 ? "还没有足够的品鉴记录" : bodyAverage < 45 ? "偏爱清爽轻盈的风格" : bodyAverage > 65 ? "偏爱饱满浓郁的风格" : "偏爱平衡、适中的风格";
  return <MobileScroll className="app-scroll paper-screen"><main className="flow-content flavor-profile"><FlowHeader title="我的风味偏好" onBack={onBack} /><section className="flavor-summary"><small>你的口味画像</small><h2>{headline}</h2><p>{records.length === 0 ? "完成第一条品鉴记录后，这里会自动生成你的口味画像。" : `根据数据库中的 ${records.length} 次品鉴实时计算。`}</p></section><section className="preference-section"><h3>常出现的风味</h3><div className="preference-tags">{flavorTags.length > 0 ? flavorTags.map((tag) => <span className={`strength-${tag.strength}`} key={tag.name}>{tag.name}</span>) : <span>暂无风味数据</span>}</div></section><section className="preference-section"><h3>你偏爱的口感</h3><div className="preference-scales">{preferences.map((item) => <div className="preference-scale" key={item.left}><div><span>{item.left}</span><span>{item.right}</span></div><i><b style={{ left: `${item.value}%` }} /></i></div>)}</div></section><section className="preference-section"><h3>更常喜欢</h3><div className="favorite-list"><div><span>葡萄品种</span><strong>{favoriteGrapes}</strong></div><div><span>产区</span><strong>{favoriteRegions}</strong></div><div><span>风味</span><strong>{flavorTags.slice(0, 3).map((tag) => tag.name).join(" · ") || "继续记录后生成"}</strong></div></div></section><p className="preference-footnote">根据你的 {records.length} 次品鉴记录自动生成，继续记录会让画像更准确。</p></main></MobileScroll>;
}

function FlowHeader({ title, onBack }: { title: string; onBack: () => void }) { return <header className="flow-header"><button onClick={onBack} aria-label="返回"><ArrowLeftIcon /></button><h1>{title}</h1><span /></header>; }

function BottomNav({ active, onExplore, onRecord, onProfile }: { active: "explore" | "profile"; onExplore: () => void; onRecord: () => void; onProfile: () => void }) { return <nav className="bottom-nav" aria-label="主要导航"><button className={active === "explore" ? "active" : ""} onClick={onExplore}><GlobeIcon /><span>探索</span></button><button className="record-button" onClick={onRecord} aria-label="记录一杯"><PlusIcon /></button><button className={active === "profile" ? "active" : ""} onClick={onProfile}><PersonIcon /><span>我的</span></button></nav>; }
