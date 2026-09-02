const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("miltomy_token") || localStorage.getItem("Miltomy_token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers
  };

  if (token) {
    (headers as any)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `API request failed: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData.message) errorMsg = errData.message;
    } catch (e) {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}
