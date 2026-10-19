import { platform } from "../platform/web";
import { createCellarRequestRunner } from "./cellarRequests";

export const runCellarRequest = createCellarRequestRunner(platform.storage,
  import.meta.env.VITE_CLOUDBASE_ENV_ID || "wine-app-d6grgbodge1334980");
