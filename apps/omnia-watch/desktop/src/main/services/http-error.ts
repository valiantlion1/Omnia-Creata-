export async function readHttpErrorMessage(response: Response, fallback: string) {
  try {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error;
      }

      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message;
      }
    }

    const text = await response.text();
    if (text.trim().length > 0) {
      return text.trim();
    }
  } catch {
    return fallback;
  }

  return fallback;
}
