# TMPA i‑Supplier Assistant

A production‑ready chatbot UI wired to **Rasa 3.x** for the **Oracle E‑Business Suite (EBS) iSupplier Portal**.  
Supports **guided workflows**, **FAQ retrieval**, **file attachments**, **screenshots**, **voice dictation**, and **bi‑lingual FR/EN** responses — with a hardened session model and pluggable security controls.

---

## TL;DR

- **Frontend**: Vite + React + Tailwind + Framer Motion + lucide-react icons.  
- **Backend (NLP)**: Rasa 3.x (RulePolicy + DIET + ResponseSelector).  
- **Flows**: Supplier Registration, Forgot Password, Work Confirmation, Create Invoice; plus Finance quick actions (View invoices / payments / holds).  
- **FAQ**: Retrieval intent (`faq/...`) with unified routing and responses in `domain.yml`.  
- **Speech**: Browser Web Speech API for push‑to‑talk dictation.  
- **Security**: Local session ID, CSRF‑safe fetch, attachment size/type guard, CORS/IP allowlist, token hooks.

---

## 1) Architecture Overview

```
┌──────────────────────────┐        REST /webhooks/rest/webhook        ┌────────────────────────┐
│  React (Vite) Frontend   │  ───────────────────────────────────────▶ │  Rasa Server (3.x)     │
│  - Chat UI + QuickActions│                                          │  - NLU / Policies      │
│  - Voice (Web Speech API)│   ◀───────────────────────────────────────│  - Actions Server      │
│  - File attachments      │             JSON Responses                │  - Custom actions.py   │
└───────────┬──────────────┘                                          └─────────┬──────────────┘
            │                  Static assets (screenshots)                       │
            │  /screenshots/... (served by UI)                                   │
            ▼                                                                    ▼
   Local Session (localStorage)                                        Oracle EBS iSupplier
   - sessionId per browser tab                                          (human flow target)
```

### Key contracts

- **RASA_URL**: `VITE_RASA_URL` env injected into the UI (defaults to `http://localhost:5005`).  
- **Webhook**: `POST /webhooks/rest/webhook` (sender, message, metadata).  
- **Rasa Reply**: `[{ text?: string; image?: string; custom?: any }]`  
  - `text` may contain “Step X/Y” — the UI parses it to update the right‑panel progress.  
  - `image` is an absolute or relative URL (UI shows a “View screenshot” button).  
  - `custom.step_index` optionally controls progress from server side.

---

## 2) Frontend (src/App.tsx)

- **Chat**: single file component with animated bubbles, chips for micro‑actions (Click / Enter / Select / Attach / Submit).
- **Quick actions** (left sidebar): call `chatRef.sendExternal()` with natural phrases that the router action recognizes.
- **Right sidebar**: visual progress (percent), flow title, session id controls (copy / reset).
- **Attachments**: read as Base64 and sent in `metadata.attachment` (name/type/size/data) — ready for server‑side validation or upload brokering.
- **Voice**: toggled Mic button uses **Web Speech API**; dictation is inserted into the input and sent on stop.

### Important constants

- `RASA_URL` and `RASA_WEBHOOK` are derived from `VITE_RASA_URL`.  
- `getOrCreateSessionId()` stores **`tmpa.sessionId`** in `localStorage` (per‑browser persistence).  
- `rasaTriggerFor(flowId, lang)` maps quick‑action tiles to natural utterances in FR/EN.

### UX behaviors

- The UI shows a **“Thinking…”** bubble until Rasa replies.  
- When a message includes “Step X/Y”, the UI updates the right progress and clamps the bar to 0‑100%.  
- Prev/Next mini controls send “previous/next” (EN) or “précédent/suivant” (FR) which your router maps to `action_back_step` / `action_next_step`.

---

## 3) Rasa Backend (3.x)

### Domain (`domain.yml`)

- **Intents**: navigation, flows, quick‑action finance intents, and retrieval **FAQ** intents (`faq/...`).  
- **Slots**: `lang` (text), `active_flow` (text), `step_index` (float).  
- **Responses**: `utter_sr_step_*`, `utter_fp_step_*`, `utter_wc_step_*`, `utter_inv_step_*`, `utter_faq/*`, `utter_cancelled`, `utter_done_end`, `utter_welcome`.  
- **Actions**:  
  - `action_route_isupplier` – routes user input to flows or FAQ cards.  
  - `action_next_step` / `action_back_step` – guided navigation.  
  - `action_reset_flow` – reset slots, UI shows “cancelled”.

### Actions (`actions/actions.py`)

- `FLOW_STEPS` maps named flows to `utter_*` keys.  
- `_send_step()` sets `lang`, `active_flow`, `step_index`, utters the step, and emits `{ step_index, total_steps }` JSON for the UI.  
- **Finance quick actions**: “View invoices / status”, “View payments”, “Resolve invoice holds” are **handled deterministically** in the router by matching keywords (FR/EN) and uttering the corresponding `utter_faq/*` card.  
- Robust defaults: unknown text ⇒ “I didn’t recognize the request. Try a quick action on the left.”

### Rules (`data/rules.yml`)

- Route any flow intent to `action_route_isupplier`.  
- Map `ask_next_step`/`deny`/`stop` to next/back/reset.  
- **FAQ**: we removed `respond_faq` custom action. Instead, **let Rasa directly utter** with retrieval:  
  ```yaml
  - rule: answer FAQ
    steps:
      - intent: faq
      - action: utter_faq
  ```
  > `utter_faq` is the built‑in retrieval dispatcher (Rasa will emit the specific `utter_faq/<subintent>`).  
  This avoids contradictions between rules and removes the earlier “No registered action found for 'respond_faq'” errors.

### NLU (`data/nlu.yml`)

- Clean training data: removed duplicate labels, ensured all quick‑action phrases live **only** under their intended intents.  
- Added **synonyms**, **regex** (PO/Invoice numbers), and **lookups** to stabilize vocabulary.

---

## 4) Intent packs (current)

- **Flows**
  - `supplier_registration` (7 steps)
  - `forgot_password` (4 steps)
  - `work_confirmation` (4 steps)
  - `invoice_creation` (6 steps)
- **Finance quick actions**
  - `faq/invoices_status` (View invoices / details / pending)
  - `faq/payment_status` (View payments / payment status)
  - `faq/invoice_holds` (Resolve invoice holds)
- **General FAQ**
  - `faq/isupplier_overview`, `faq/portal_access`, `faq/browser_support`, `faq/language_switch`, `faq/po_lookup`, `faq/po_ack`, `faq/invoice_submission`, `faq/attachments`, `faq/notifications`

> All FAQ answers are bilingual with `condition: slot(lang)` in the domain responses.

---

## 5) Media & Screenshots

- The UI renders a “View screenshot” button when `image` is present in Rasa’s reply.  
- Place images under `public/screenshots/...` (or any static path the UI can serve).  
- Example: `image: /screenshots/supplier-registration/step1.webp`.

---

## 6) Voice (Web Speech API)

- Mic button toggles `webkitSpeechRecognition` if available.  
- Dictation language follows the UI `lang` (FR/EN).  
- Partial results coalesce; final transcript is appended to the input and sent automatically when dictation stops.  
- Graceful degradation: if the API is missing, the UI shows a hint to try Chrome/Edge.

> This is client‑only voice **dictation** (no server streaming). It keeps the backend unchanged.

---

## 7) Session Management

- Each browser gets a **local session id** in `localStorage` under **`tmpa.sessionId`**.  
- The id is **sent with every Rasa call** as `sender` — Rasa uses it to keep tracker state per user.  
- The UI exposes copy/reset controls; reset will generate a new id and start a fresh conversation.  
- Server side, the session is stored in Rasa trackers (in memory or your chosen tracker store).

**What it is not**: This is not authentication. If you need identity, add an auth layer (SAML/OIDC) and exchange a **JWT** or session cookie with the UI. See security below.

---

## 8) Security Architecture

### Transport & CORS
- Serve UI over **HTTPS**; host Rasa behind TLS or reverse‑proxy with TLS termination.
- Restrict **CORS** on Rasa to the UI origin(s).  
- Optional: **IP allowlist** for the Rasa endpoint.

### Authentication / Authorization (optional but recommended)
- Frontend obtains an **ID token** (OIDC), stores it in memory (not localStorage), and sends it as `Authorization: Bearer <jwt>` to an API gateway.
- Gateway validates JWT (issuer, audience, exp), enforces rate limits, and forwards to Rasa on an internal network.
- In Rasa, a custom HTTP channel can validate a signed header / JWT claims (roles, vendor id) and **set `slot{vendor_id}`** for downstream logic.

### Attachment safety
- Enforce **max size** (e.g., 10 MB) and **type allowlist** (PDF/PNG/JPG).  
- Server must re‑scan files (AV) before storing/forwarding. The current POC only **previews** images provided by the server.

### Session hardening
- Random session ids (current) + **short TTL** on server trackers.  
- Optional: bind session id to a user claim (when auth is added).

### Attack surface (summary)

| Vector                 | Current mitigation                                   | Next step                                  |
|------------------------|------------------------------------------------------|--------------------------------------------|
| Cross‑site scripting   | Pure React, no `dangerouslySetInnerHTML`             | CSP headers, sanitize any server HTML      |
| CSRF                   | `POST` with JSON to configured origin                | SameSite cookies if you add real auth      |
| Token theft            | No token stored in localStorage                      | Keep JWT in memory; refresh via backend    |
| Injection to Rasa      | Text only; server validates; Rules restrict actions  | Add intent‑level allowlists per role       |
| File uploads           | Client type/size guard                               | AV scanning + quarantine in backend        |

---

## 9) Local Development

### Prereqs
- Node 18+, Python 3.9+, Rasa 3.x, npm.

### Frontend
```bash
# .env
VITE_RASA_URL=http://localhost:5005

# install & run
npm
npm dev
# or: npm i && npm run dev
```

### Rasa
```bash
# create & activate venv (example)
python -m venv rasa_env
source rasa_env/bin/activate   # Windows: .\rasa_env\Scripts\activate

# install
pip install -U rasa==3.* rasa-sdk==3.*

# train
rasa train

# run servers (two terminals)
rasa run --enable-api --cors "http://localhost:5173"
rasa run actions --port 5055
```

> If port 5055 is busy, kill the process or change the actions port and the `endpoints.yml` accordingly.

---

## 10) Environment Variables

| Name             | Where        | Default                    | Description                                  |
|------------------|-------------|-----------------------------|----------------------------------------------|
| `VITE_RASA_URL`  | Frontend    | `http://localhost:5005`     | Base URL of Rasa server REST channel         |
| `VITE_DEFAULT_LANG` | Frontend | `EN`                        | UI default language                          |

---

## 11) Deployment

- **Frontend**: build with `npm build` and deploy static bundle behind HTTPS (Nginx, CDN).  
- **Rasa**: containerize Rasa & actions; deploy behind an API gateway (TLS, auth, WAF).  
- **Static screenshots**: serve from the same host as the UI or a private CDN with signed URLs.

### Zero‑downtime rollout
- Pre‑warm a new Rasa model, then swap symlink/route.  
- Maintain the same action server version as the domain for compatibility.

---

## 12) Maintenance & Observability

- **Logs**: enable Rasa debug logs in staging; ship to ELK/Datadog in prod.  
- **Analytics**: track quick‑action clicks, FAQ hits, and fallback rate (anonymous).  
- **Health checks**: `/status` for UI, Rasa REST channel, and actions endpoint.  
- **Data**: purge trackers on a schedule (GDPR).

---



## 13) References

- Oracle EBS iSupplier Guides:  
  - R12: https://docs.oracle.com/cd/E18727_01/doc.121/e13414/toc.htm  
  - 12.2: https://docs.oracle.com/cd/E26401_01/doc.122/e48971/toc.htm
- Rasa 3.x Docs: https://rasa.com/docs/
- Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API
"# TMPA_supplier_Assistant" 
