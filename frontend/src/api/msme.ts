import api from "./client";
import type { MSMEProfile, MSMECreate, HealthScore, ScoringComparison, NTCOutput, PaginatedProfiles, GSTRecord, EPFORecord, TransactionRecord } from "@/types";

export async function listProfiles(params: {
  page?: number;
  page_size?: number;
  search?: string;
  industry?: string;
  sort_by?: string;
  sort_dir?: string;
  is_ntc?: boolean;
}): Promise<PaginatedProfiles> {
  const res = await api.get("/msme", { params });
  return res.data;
}

export async function listIndustries(): Promise<Array<{ industry: string; count: number }>> {
  const res = await api.get("/msme/industries");
  return res.data;
}

export async function createProfile(data: MSMECreate): Promise<MSMEProfile> {
  const res = await api.post("/msme/", data);
  return res.data;
}

export async function getProfile(id: string): Promise<MSMEProfile> {
  const res = await api.get(`/msme/${id}`);
  return res.data;
}

export async function updateProfile(id: string, data: Partial<MSMECreate>): Promise<MSMEProfile> {
  const res = await api.put(`/msme/${id}`, data);
  return res.data;
}

export async function deleteProfile(id: string): Promise<void> {
  await api.delete(`/msme/${id}`);
}

export async function computeScore(msmeId: string): Promise<HealthScore> {
  const res = await api.post(`/score/${msmeId}/compute`);
  return res.data;
}

export async function getScore(msmeId: string): Promise<HealthScore> {
  const res = await api.get(`/score/${msmeId}`);
  return res.data;
}

export async function getScoringComparison(msmeId: string): Promise<ScoringComparison> {
  const res = await api.get(`/msme/${msmeId}/comparison`);
  return res.data;
}

export async function ntcOnboard(params: {
  business_name: string;
  phone: string;
  gstin?: string;
  industry?: string;
}): Promise<NTCOutput> {
  const res = await api.post("/msme/ntc/onboard", null, { params });
  return res.data;
}

export async function uliCreditReport(msmeId: string): Promise<any> {
  const res = await api.post(`/integrations/uli/credit-report?msme_id=${msmeId}`);
  return res.data;
}

export async function ocenLoanRequest(msmeId: string): Promise<any> {
  const res = await api.post(`/integrations/ocen/loan-request?msme_id=${msmeId}`);
  return res.data;
}

export async function aaConsentRequest(msmeId: string): Promise<any> {
  const res = await api.post(`/integrations/aa-consent/request?msme_id=${msmeId}`);
  return res.data;
}

export async function aaConsentApprove(consentId: string): Promise<any> {
  const res = await api.post(`/integrations/aa-consent/${consentId}/approve`);
  return res.data;
}

export async function aaConsentPull(consentId: string): Promise<any> {
  const res = await api.post(`/integrations/aa-consent/${consentId}/pull`);
  return res.data;
}

export async function aaConsentStatus(consentId: string): Promise<any> {
  const res = await api.get(`/integrations/aa-consent/${consentId}`);
  return res.data;
}

export async function createGstRecord(profileId: string, data: Omit<GSTRecord, "id" | "profile_id">): Promise<GSTRecord> {
  const res = await api.post(`/msme/${profileId}/gst`, data);
  return res.data;
}

export async function listGstRecords(profileId: string): Promise<GSTRecord[]> {
  const res = await api.get(`/msme/${profileId}/gst`);
  return res.data;
}

export async function createEpfoRecord(profileId: string, data: Omit<EPFORecord, "id" | "profile_id" | "compliance_score">): Promise<EPFORecord> {
  const res = await api.post(`/msme/${profileId}/epfo`, data);
  return res.data;
}

export async function listEpfoRecords(profileId: string): Promise<EPFORecord[]> {
  const res = await api.get(`/msme/${profileId}/epfo`);
  return res.data;
}

export async function createTransactionRecord(profileId: string, data: Omit<TransactionRecord, "id" | "profile_id">): Promise<TransactionRecord> {
  const res = await api.post(`/msme/${profileId}/transactions`, data);
  return res.data;
}

export async function listTransactionRecords(profileId: string): Promise<TransactionRecord[]> {
  const res = await api.get(`/msme/${profileId}/transactions`);
  return res.data;
}
