import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AxiosError } from "axios";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);
}

export function formatPercent(n: number) {
  return `${n.toFixed(1)}%`;
}

export function getApiError(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string | Array<{ msg?: string; loc?: string[] }> }>;
  const data = axiosErr?.response?.data;
  if (!data) return "Something went wrong";
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) return data.detail.map((d) => d.msg || "Invalid value").join("; ");
  return "Something went wrong";
}

export function getFieldErrors(err: unknown): Record<string, string> {
  const axiosErr = err as AxiosError<{ detail?: Array<{ loc?: string[]; msg?: string }> }>;
  const detail = axiosErr?.response?.data?.detail;
  if (!Array.isArray(detail)) return {};
  const map: Record<string, string> = {};
  for (const d of detail) {
    const field = d.loc?.[d.loc.length - 1];
    if (field && d.msg) map[field] = d.msg;
  }
  return map;
}
