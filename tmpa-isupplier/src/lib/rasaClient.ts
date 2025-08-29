// src/lib/rasaClient.ts
export type RasaBotMsg = {
  text?: string;
  image?: string;
  buttons?: { title: string; payload: string }[];
  custom?: any; // we use this for step metadata (json_message) etc.
};

const BASE =
  import.meta.env.VITE_RASA_URL?.replace(/\/$/, "") || "http://localhost:5005";

export async function sendMessageToRasa(
  message: string,
  sender = "web-user"
): Promise<RasaBotMsg[]> {
  const res = await fetch(`${BASE}/webhooks/rest/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, message }),
  });
  if (!res.ok) throw new Error(`Rasa ${res.status}`);
  const data = (await res.json()) as RasaBotMsg[];
  return data;
}

