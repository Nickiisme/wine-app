import { platform } from "../platform/web";
import type { RecordMode } from "./tastingRecords";

export type RecordAnalyticsEvent = "record_save_clicked" | "record_save_succeeded" | "record_feedback_viewed";
export type RecordAnalyticsProperties = {
  record_mode: RecordMode;
  input_method: "camera" | "gallery" | "manual";
  has_photo: boolean;
  has_wine_name: boolean;
  has_confirmed_scan: boolean;
  has_preference: boolean;
  has_body: boolean;
  flavor_count: number;
  has_note: boolean;
  feedback_type: "collection" | "personal" | "knowledge";
};

export function trackRecordEvent(event: RecordAnalyticsEvent, properties: RecordAnalyticsProperties) {
  // Deliberately excludes note text, photos, labels, and all other personal content.
  platform.emitAnalytics(event, properties);
}
