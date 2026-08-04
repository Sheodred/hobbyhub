export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: "USER" | "ADMIN";
}

export interface AuthResponse {
  accessToken: string;
  expiresInSeconds: number;
  user: UserResponse;
}
