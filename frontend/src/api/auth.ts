import api from "./client";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

export interface AuthOutResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export async function login(payload: LoginPayload): Promise<AuthOutResponse> {
  const res = await api.post("/auth/login", payload);
  return res.data;
}

export async function register(payload: RegisterPayload): Promise<AuthOutResponse> {
  const res = await api.post("/auth/register", payload);
  return res.data;
}

export async function getMe(): Promise<UserResponse> {
  const res = await api.get("/auth/me");
  return res.data;
}

export interface UpdateProfilePayload {
  email?: string;
  full_name?: string;
}

export interface UpdatePasswordPayload {
  current_password?: string;
  new_password?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UserResponse> {
  const res = await api.put("/auth/profile", payload);
  return res.data;
}

export async function updatePassword(payload: UpdatePasswordPayload): Promise<{ message: string }> {
  const res = await api.put("/auth/password", payload);
  return res.data;
}
