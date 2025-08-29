import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Globe,
  HelpCircle,
  Settings,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Mic,
  Send,
  Bot,
  MessageSquare,
  FileSignature,
  Receipt,
  Paperclip,
  Image as ImageIcon,
  X,
  CheckCircle2,
  MousePointer2,
  Keyboard,
  FilePlus2,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { motion } from "framer-motion";

const asset = (p: string) =>
  `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;


type TSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: (e: any) => void;
  onerror: (e: any) => void;
  onend: () => void;
};
declare global {
  interface Window {
    webkitSpeechRecognition?: { new (): TSpeechRecognition };
    SpeechRecognition?: { new (): TSpeechRecognition };
  }
}

/* =========================================================
   Tanger Med – iSupplier Assistant (Rasa-wired, refined)
   - Functional fixes only (layout/size unchanged)
   - Help/Settings/Profile modals working
   - Quick Actions push to chat + call Rasa
   - Sidebar session block removed
   - Prev/Next from chat now work and show user bubble
   - Follow-up % clamped and updated via "Step X/Y"
   - "Thinking…" loader while awaiting Rasa
   - Voice input (Web Speech API) FR/EN
   ========================================================= */

type Lang = "EN" | "FR";
type IconType = React.ComponentType<{ size?: number; className?: string }>;
type RasaReply = { text?: string; image?: string; custom?: any };



const RASA_URL = ((import.meta as any)?.env?.VITE_RASA_URL ?? "http://localhost:5005").replace(/\/$/, "");
const TOKEN = (import.meta as any)?.env?.VITE_RASA_TOKEN ?? "";
const RASA_WEBHOOK = RASA_URL + "/webhooks/rest/webhook" + (TOKEN ? `?token=${encodeURIComponent(TOKEN)}` : "");


const brand = {
  blue: "#0B5AC2",
  blueSoft: "#E8F0FF",
};

function getOrCreateSessionId(): string {
  const k = "tmpa.sessionId";
  let id = localStorage.getItem(k);
  if (!id) { id = newSessionId(); localStorage.setItem(k, id); }
  return id;
}
function newSessionId(): string {
  if (crypto?.randomUUID) return crypto.randomUUID();             // modern browsers
  const a = new Uint8Array(16); crypto.getRandomValues(a);        // fallback
  return [...a].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sendToRasa(args: { message: string; metadata?: Record<string, any> }) {
  const { message, metadata = {} } = args;
  const sender = localStorage.getItem("tmpa.sessionId") || getOrCreateSessionId();
  const body = { sender, message, metadata };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(RASA_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Rasa ${res.status}`);
    return (await res.json()) as RasaReply[];
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- Flows (sidebar) ---------- */
type Flow = { id: string; label: string; priority: "primary" | "secondary" };
const flows: Record<string, Flow> = {
  supplierRegistration: {
    id: "supplierRegistration",
    label: "Supplier Registration",
    priority: "primary",
  },
  forgotPassword: {
    id: "forgotPassword",
    label: "Assistance / Forgot Password",
    priority: "secondary",
  },
  workConfirmation: {
    id: "workConfirmation",
    label: "Work Confirmation",
    priority: "primary",
  },
  invoiceCreation: {
    id: "invoiceCreation",
    label: "Create Invoice (with PO)",
    priority: "primary",
  },
  viewInvoices: {
    id: "viewInvoices",
    label: "View Invoices / Status",
    priority: "secondary",
  },
  viewPayments: {
    id: "viewPayments",
    label: "View Payments",
    priority: "secondary",
  },
  resolveHolds: {
    id: "resolveHolds",
    label: "Resolve Invoice Holds",
    priority: "secondary",
  },
};

function rasaTriggerFor(flowId: string, lang: Lang) {
  const fr = lang === "FR";
  switch (flowId) {
    case "supplierRegistration":
      return fr ? "référencement fournisseur" : "supplier registration";
    case "forgotPassword":
      return fr ? "mot de passe oublié" : "reset password";
    case "workConfirmation":
      return fr ? "confirmation travaux" : "work confirmation";
    case "invoiceCreation":
      return fr ? "créer facture" : "create invoice";
    case "viewInvoices":
      return fr ? "détails facture" : "invoice details";
    case "viewPayments":
      return fr ? "statut paiement" : "payment status";
    case "resolveHolds":
      return fr ? "factures en attente" : "pending invoices";
    default:
      return fr ? "aide" : "help";
  }
}

/* ---------- UI primitives ---------- */
const PillButton: React.FC<{
  label: string;
  Icon?: IconType;
  variant?: "primary" | "secondary";
  onClick: () => void;
  title?: string;
}> = ({ label, Icon, variant = "primary", onClick, title }) => {
  const style =
    variant === "primary"
      ? "bg-[var(--brand-blue)] text-white shadow hover:shadow-md"
      : "bg-[var(--blue-soft)] text-[var(--brand-blue)] border border-blue-200 hover:shadow";
  return (
    <button
      title={title}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-[13px] transition ${style}`}
    >
      {Icon ? <Icon size={16} /> : null}
      {label && <span>{label}</span>}
    </button>
  );
};

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50">
    <div
      className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="relative mx-auto my-6 w-[92vw] max-w-3xl rounded-2xl bg-white shadow-xl border ring-1 ring-blue-100">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm font-semibold text-gray-700">{title}</div>
        <button onClick={onClose} className="p-1.5 rounded-lg border hover:bg-gray-50">
          <X size={16} />
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  </div>
);

/* ---------- Header ---------- */
const Topbar: React.FC<{
  lang: Lang;
  setLang: (l: Lang) => void;
  onHelp: () => void;
  onSettings: () => void;
  onProfile: () => void;
}> = ({ lang, setLang, onHelp, onSettings, onProfile }) => (
  <div className="h-16 bg-white/90 backdrop-blur rounded-2xl shadow-lg ring-1 ring-blue-100 px-4 sm:px-6 flex items-center relative">
    {/* LEFT: bigger logo */}
    <div className="flex items-center gap-3">
      <img
        src="public/tm-logo.png"
        alt="Tanger Med Port Authority"
        className="h-12 sm:h-14 w-auto object-contain"
      />
    </div>

    {/* CENTER: title */}
    <div className="absolute inset-x-0 flex items-center justify-center px-28 pointer-events-none">
      <h1
        className="
          font-inter font-semibold
          text-neutral-900
          text-[14px] sm:text-[15px] md:text-[17px]
          leading-[1.1] tracking-wide text-center whitespace-nowrap
        "
        style={{ letterSpacing: "0.02em" }}
      >
        Oracle EBS Assistant – Tanger Med i-Supplier Portal
      </h1>
    </div>

    {/* RIGHT: controls */}
    <div className="ml-auto flex items-center gap-2">
      <button
        onClick={() => setLang(lang === "EN" ? "FR" : "EN")}
        className="p-2 rounded-xl border hover:bg-gray-50"
        title="Language"
      >
        <Globe size={18} />
      </button>
      <button
        onClick={onHelp}
        className="p-2 rounded-xl border hover:bg-gray-50"
        title="Help"
      >
        <HelpCircle size={18} />
      </button>
      <button
        onClick={onSettings}
        className="p-2 rounded-xl border hover:bg-gray-50"
        title="Settings"
      >
        <Settings size={18} />
      </button>
      <button
        onClick={onProfile}
        className="p-2 rounded-xl border hover:bg-gray-50"
        title="Profile"
      >
        <UserCircle2 size={18} />
      </button>
    </div>
  </div>
);

/* ---------- Sidebar (Left) ---------- */
const Sidebar: React.FC<{
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onStartFlow: (id: string) => void;
  lang: Lang;
  onExit: () => void;
}> = ({ collapsed, setCollapsed, onStartFlow, lang, onExit }) => {
  const t = (en: string, fr: string) => (lang === "EN" ? en : fr);
  const groups = [
    {
      title: t("ACCESS & SUPPORT", "ACCÈS & AIDE"),
      items: ["supplierRegistration", "forgotPassword"],
    },
    { title: t("WORK", "TRAVAUX"), items: ["workConfirmation"] },
    {
      title: t("FINANCE", "FINANCES"),
      items: ["invoiceCreation", "viewInvoices", "viewPayments", "resolveHolds"],
    },
  ];

  return (
    <div
      className={`bg-white/95 ring-1 ring-blue-100 shadow-xl h-full min-h-0 rounded-3xl p-3 flex flex-col relative transition-all ${
        collapsed ? "w-16" : "w-[260px]"
      }`}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 bg-white border rounded-full p-1 shadow hover:shadow-md"
        aria-label="Collapse sidebar"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Top label */}
      {!collapsed && (
        <div className="mb-3">
          <div className="text-[12px] font-semibold text-gray-600">
            Quick actions
          </div>
          <div className="mt-2 h-px bg-gray-200" />
        </div>
      )}

      <div className="space-y-3 overflow-hidden">
        {groups.map((g, gi) => (
          <div key={gi}>
            {!collapsed && (
              <div className="text-[11px] font-semibold text-gray-500 mb-2">
                {g.title}
              </div>
            )}
            <div
              className={`flex ${
                collapsed ? "flex-col items-center" : "flex-col"
              } gap-2`}
            >
              {g.items.map((id) => {
                const f = flows[id];
                const Icon: IconType =
                  f.priority === "primary" ? FileSignature : Receipt;
                return (
                  <PillButton
                    key={id}
                    label={collapsed ? "" : f.label}
                    Icon={Icon}
                    variant={f.priority}
                    title={f.label}
                    onClick={() => onStartFlow(id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Removed the old "SESSION" block here as requested */}

      <div className="mt-auto">
        <button
          onClick={onExit}
          className={`w-full mt-3 ${
            collapsed ? "px-2 py-2" : "px-3 py-3"
          } rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow hover:shadow-md text-sm`}
        >
          {t("EXIT FLOW", "QUITTER LE FLUX")}
        </button>
      </div>
    </div>
  );
};

/* ---------- Right Sidebar (progress + session) ---------- */
const VerticalProgress: React.FC<{ value?: number }> = ({ value = 0 }) => {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="h-40 w-4 rounded-full bg-gray-200 relative overflow-hidden border">
      <div
        className="absolute bottom-0 left-0 right-0 bg-[var(--brand-blue)]"
        style={{ height: `${safe}%` }}
      />
    </div>
  );
};

const RightSidebar: React.FC<{
  lang: Lang;
  flowTitle?: string;
  activeStep: number;
  totalSteps: number;
  sessionIdForUi: string;
  onCopySession: (sid: string) => void;
  onResetSession: () => void;
}> = ({
  lang,
  flowTitle,
  activeStep,
  totalSteps,
  sessionIdForUi,
  onCopySession,
  onResetSession,
}) => {
  const t = (en: string, fr: string) => (lang === "EN" ? en : fr);

  const pct = useMemo(() => {
    if (totalSteps > 0)
      return Math.min(100, Math.round(((activeStep + 1) / totalSteps) * 100));
    return 0;
  }, [activeStep, totalSteps]);

  const shortSid = useMemo(() => {
    if (!sessionIdForUi) return "";
    return sessionIdForUi.length > 10
      ? `${sessionIdForUi.slice(0, 5)}…${sessionIdForUi.slice(-4)}`
      : sessionIdForUi;
  }, [sessionIdForUi]);

  return (
    <div className="w-[300px] h-full min-h-0 shrink-0 bg-white/95 rounded-3xl p-3 space-y-3 ring-1 ring-blue-100 shadow-xl flex flex-col">
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-2">
          {t("Follow-up", "Suivi")}
        </div>
        <div className="flex items-end gap-3">
          <VerticalProgress value={pct} />
          <div>
            <div className="text-xl font-bold">{pct}%</div>
            <div className="text-xs text-gray-500">
              {totalSteps > 0
                ? `${t("Step", "Étape")} ${activeStep + 1}/${totalSteps}`
                : t("No active workflow", "Aucun workflow actif")}
            </div>
          </div>
        </div>
        {flowTitle && (
          <div className="mt-2 text-xs text-gray-600">
            <span className="font-semibold">{t("Flow:", "Parcours :")}</span>{" "}
            {flowTitle}
          </div>
        )}
      </div>

      {/* Session block */}
      <div className="pt-2 border-t">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          {t("Session", "Session")}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-700 select-all">
            {shortSid}
          </div>
          <button
            onClick={() => onCopySession(sessionIdForUi)}
            className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50"
          >
            {t("Copy", "Copier")}
          </button>
          <button
            onClick={onResetSession}
            className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50"
          >
            {t("Reset", "Réinitialiser")}
          </button>
        </div>
      </div>

      <div className="pt-2 border-t">
        <div className="text-sm font-semibold text-gray-700 mb-2">
          {t("Alerts", "Alertes")}
        </div>
        <ul className="space-y-2 text-xs text-gray-700">
          <li>• {t("Invoice on hold – VAT mismatch", "Facture en attente – incohérence TVA")}</li>
          <li>• {t("2 POs await acknowledgment", "2 BC en attente d'accusé")}</li>
        </ul>
      </div>
    </div>
  );
};

/* ---------- Helpers ---------- */
function parseHeaderGetMeta(text: string): { title?: string; step?: number; total?: number } {
  const dashIdx = text.indexOf("—");
  const suffix = dashIdx >= 0 ? text.slice(dashIdx) : text;
  const m = suffix.match(/(?:Step|Étape)\s+(\d+)\s*\/\s*(\d+)/i);
  if (!m) return {};
  const step = Math.max(0, parseInt(m[1], 10) - 1);
  const total = Math.max(1, parseInt(m[2], 10));
  let title: string | undefined;
  if (dashIdx >= 0) title = text.slice(0, dashIdx).replace(/^[^\wÀ-ÿ]+/, "").trim();
  return { title, step, total };
}

function extractChips(text: string, lang: Lang): Array<{ icon: IconType; label: string }> {
  const list: Array<{ icon: IconType; label: string }> = [];
  const add = (icon: IconType, label: string) => list.push({ icon, label });
  const t = (en: string, fr: string) => (lang === "EN" ? en : fr);
  const lc = text.toLowerCase();

  if (lc.includes("cliquer") || lc.includes("click")) add(MousePointer2, t("Click", "Cliquer"));
  if (lc.includes("saisir") || lc.includes("enter")) add(Keyboard, t("Enter", "Saisir"));
  if (lc.includes("sélectionner") || lc.includes("select")) add(CheckCircle2, t("Select", "Sélectionner"));
  if (lc.includes("joindre") || lc.includes("attach")) add(UploadCloud, t("Attach", "Joindre"));
  if (lc.includes("suivant") || lc.includes("next")) add(ArrowRight, t("Next", "Suivant"));
  if (lc.includes("soumettre") || lc.includes("submit")) add(FilePlus2, t("Submit", "Soumettre"));
  return list;
}

/* ---------- Chat (exposes sendExternal to parent) ---------- */
type ChatMsg = { from: "assistant" | "user"; text?: string; image?: string; stepIndex?: number };

type ChatHandle = {
  sendExternal: (message: string) => Promise<void>;
};

const Chat = forwardRef<ChatHandle, {
  lang: Lang;
  setActiveStep: (s: number) => void;
  setFlowTitle: (t?: string) => void;
  setTotalSteps: (n: number) => void;
  totalStepsForUi: number;
}>(({ lang, setActiveStep, setFlowTitle, setTotalSteps, totalStepsForUi }, ref) => {
  const t = (en: string, fr: string) => (lang === "EN" ? en : fr);
  const [input, setInput] = useState("");
  const [voice, setVoice] = useState(false);
  const [interim, setInterim] = useState("");           // texte intérimaire micro
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      from: "assistant",
      text: t(
        "Hello! I'm your Tanger Med supplier assistant. Choose an action from the left to begin.",
        "Bonjour ! Choisissez une action à gauche pour commencer."
      ),
    },
  ]);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ref du moteur de reconnaissance
  const recRef = useRef<TSpeechRecognition | null>(null);

  // scroll container
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking]);

  function addAssistantText(text: string) {
    setMessages((m) => [...m, { from: "assistant", text }]);
  }

  async function talkToRasa(utter: string, attachment?: { name: string; type: string; size: number; data: string }) {
    try {
      setThinking(true);
      const replies = await sendToRasa({ message: utter, metadata: { lang, attachment } });
      for (const r of replies) {
        if (r.text) {
          const meta = parseHeaderGetMeta(r.text);
          if (meta.title) setFlowTitle(meta.title);
          if (typeof meta.total === "number" && !Number.isNaN(meta.total)) setTotalSteps(meta.total);
          if (typeof meta.step === "number" && !Number.isNaN(meta.step)) setActiveStep(meta.step);
          addAssistantText(r.text);
        }
        if (r.image) {
          setMessages((m) => [
            ...m,
            {
              from: "assistant",
              text: t("A screenshot is available for this step.", "Une capture est disponible pour cette étape."),
              image: r.image,
            },
          ]);
        }
        if (r.custom && typeof r.custom.step_index === "number") setActiveStep(r.custom.step_index);
      }
    } catch {
      addAssistantText(t("Backend error. Please ensure Rasa is running.", "Erreur serveur. Assurez-vous que Rasa est démarré."));
    } finally {
      setThinking(false);
    }
  }

  async function sendLocal(text: string) {
    if (!text.trim()) return;
    const clean = text.trim();
    setMessages((m) => [...m, { from: "user", text: clean }]);
    setInput("");
    await talkToRasa(clean);
  }

  // expose to parent: used by Quick Actions
  useImperativeHandle(ref, () => ({
    sendExternal: async (message: string) => {
      await sendLocal(message);
    },
  }));

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1] || "";
      setMessages((m) => [...m, { from: "user", text: `${t("Uploaded file", "Fichier téléchargé")}: ${file.name}` }]);
      await talkToRasa(t("file attached", "fichier joint"), {
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      });
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  /* ------------ Voice: start/stop & bindings ------------- */
  function startMic(): boolean {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      addAssistantText(
        t(
          "Your browser doesn't support voice recognition. Please try Chrome desktop.",
          "Votre navigateur ne supporte pas la reconnaissance vocale. Essayez Chrome sur ordinateur."
        )
      );
      return false;
    }
    try {
      const rec = new Ctor();
      rec.lang = lang === "FR" ? "fr-FR" : "en-US";
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const transcript = (res[0]?.transcript || "").trim();
          if (!transcript) continue;

          if (res.isFinal) {
            setInterim("");
            // envoi comme si l'utilisateur avait tapé
            sendLocal(transcript);
          } else {
            setInterim(transcript);
            setInput(transcript);
          }
        }
      };

      rec.onerror = () => {
        setVoice(false);
      };
      rec.onend = () => {
        setVoice(false);
      };

      recRef.current = rec as TSpeechRecognition;
      rec.start();
      return true;
    } catch {
      setVoice(false);
      return false;
    }
  }

  function stopMic() {
    const rec = recRef.current as TSpeechRecognition | null;
    try {
      rec?.stop();
    } catch {
      /* noop */
    }
    recRef.current = null;
    setInterim("");
  }

  useEffect(() => {
    if (voice) {
      const ok = startMic();
      if (!ok) setVoice(false);
      return () => stopMic();
    } else {
      stopMic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, lang]);

  const bgStyle: React.CSSProperties = {
    background: "linear-gradient(180deg, rgba(232,240,255,0.45) 0%, rgba(245,247,251,1) 40%)",
  };

  return (
    <div className="flex flex-col h-full min-h-0 w-full rounded-3xl overflow-hidden ring-1 ring-blue-100 bg-white/95 shadow-xl">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b bg-white/80 backdrop-blur">
        <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white ring-1 ring-blue-200 grid place-items-center overflow-hidden">
  <img src="/chat_bot_logo.png" alt="TMPA" className="w-7 h-7 object-contain" />
</div>

          <div>
            <div className="font-semibold text-gray-800 text-sm">{t("Assistant", "Assistant")}</div>
            <div className="text-[11px] text-gray-500">{t("Online – Ready to assist", "En ligne – Prêt à aider")}</div>
          </div>
        </div>
      </div>

      {/* Messages (scrollable) */}
      <div ref={listRef} className="flex-1 min-h-0 px-3 sm:px-4 py-3 space-y-3 overflow-y-auto" style={bgStyle}>
        {messages.map((m, i) => {
          const isAssistant = m.from === "assistant";
          const chips = isAssistant && m.text ? extractChips(m.text, lang) : [];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-fit max-w-[80%] p-4 rounded-3xl ${
                isAssistant
                  ? "bg-blue-50/70 ring-1 ring-blue-100 border border-blue-200"
                  : "bg-white ring-1 ring-gray-200 border border-gray-200"
              } ${!isAssistant ? "ml-auto" : ""} shadow-lg`}
            >
              <div className={`text-[11px] mb-1 text-gray-500 flex items-center gap-1 ${!isAssistant ? "justify-end" : ""}`}>
                {isAssistant ? <Bot size={12} /> : <MessageSquare size={12} />}
                {isAssistant ? (lang === "EN" ? "Assistant" : "Assistant") : (lang === "EN" ? "You" : "Vous")}
              </div>

              {m.text && (
                <div className={`text-[14px] text-gray-900 leading-6 whitespace-pre-wrap break-words ${!isAssistant ? "text-right" : ""}`}>
                  {m.text}
                </div>
              )}

              {/* chips (actions) */}
              {chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chips.map((c, idx) => {
                    const ChipIcon = c.icon;
                    return (
                      <span key={idx} className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-white border">
                        <ChipIcon size={12} /> {c.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Optional screenshot button */}
              {m.image && (
                <div className="mt-3">
                  <button
                    onClick={() => setImageModal(m.image!)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:shadow text-sm"
                  >
                    <ImageIcon size={16} /> {lang === "EN" ? "View screenshot" : "Voir la capture"}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Thinking indicator */}
        {thinking && 
          <div className="w-fit max-w-[80%] p-3 rounded-2xl bg-blue-50/70 ring-1 ring-blue-100 border border-blue-200 shadow ml-0">
            <div className="text-[11px] mb-1 text-gray-500 flex items-center gap-1">
              <Bot size={12} /> {lang === "EN" ? "Assistant" : "Assistant"}
            </div>
            <div className="text-[14px] text-gray-900 leading-6">
              {lang === "EN" ? "Thinking…" : "Réflexion…"}
            </div>
          </div>
        }
      </div>

      {/* Mini step controls (sticky inside chat bottom) */}
      {totalStepsForUi > 0 && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="w-full rounded-2xl border bg-white shadow-sm p-2 flex items-center gap-2 justify-end">
            <button
              onClick={() => sendLocal(lang === "FR" ? "précédent" : "previous")}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm"
              type="button"
            >
              {lang === "EN" ? "Prev" : "Précédent"}
            </button>
            <button
              onClick={() => sendLocal(lang === "FR" ? "suivant" : "next")}
              className="px-3 py-1.5 rounded-xl border hover:bg-gray-50 text-sm"
              type="button"
            >
              {lang === "EN" ? "Next" : "Suivant"}
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 sm:p-4 bg-white border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendLocal(input);
          }}
          className="flex items-center gap-2"
        >
          <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
          <button
            type="button"
            className="p-3 rounded-2xl bg-white border shadow-sm hover:shadow"
            title={t("Attach", "Joindre")}
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip size={18} className="text-gray-700" />
          </button>

          <div className="flex-1 rounded-2xl bg-gray-50 border shadow-inner px-3 sm:px-4 py-2 flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("Type your message…", "Écrivez votre message…")}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {/* petit indicateur d’écoute */}
            {voice && (
              <span className="text-[11px] mr-2 px-2 py-1 rounded-full border bg-white">
                {interim ? (lang === "FR" ? "Dictée…" : "Listening…") : (lang === "FR" ? "Écoute" : "Listening")}
              </span>
            )}
            <button
              type="button"
              onClick={() => setVoice((v) => !v)}
              className={`ml-2 p-2 rounded-xl border ${voice ? "bg-blue-50 border-blue-200" : "bg-white"} hover:shadow`}
              title={t("Voice", "Voix")}
            >
              <Mic size={16} className={voice ? "text-blue-600" : "text-gray-700"} />
            </button>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-2xl text-white shadow bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-md inline-flex items-center gap-2"
          >
            <Send size={16} /> {t("Send", "Envoyer")}
          </button>
        </form>
      </div>

      {/* Screenshot modal */}
      {imageModal && (
        <Modal title={t("Screenshot", "Capture d'écran")} onClose={() => setImageModal(null)}>
          <div className="p-2 md:p-4">
            <img src={imageModal} alt="screenshot" className="w-full h-auto rounded-b-2xl" />
          </div>
        </Modal>
      )}
    </div>
  );
});
Chat.displayName = "Chat";

/* ---------- App wrapper ---------- */
export default function TMPAEnhancedPortal() {
  const defaultLang = ((import.meta as any)?.env?.VITE_DEFAULT_LANG as Lang) || "EN";
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [collapsed, setCollapsed] = useState(false);

  // progress metadata parsed from Rasa header
  const [flowTitle, setFlowTitle] = useState<string | undefined>(undefined);
  const [activeStep, setActiveStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  // Session id for UI
  const [sid, setSid] = useState<string>(getOrCreateSessionId());

  // Help / Settings / Profile modals
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Ref to call Chat from sidebar quick actions
  const chatRef = useRef<{ sendExternal: (message: string) => Promise<void> } | null>(null);

  function handleCopySession(id: string) {
    try {
      navigator.clipboard.writeText(id);
    } catch {
      /* noop */
    }
  }
  function handleResetSession() {
    const newId = newSessionId();
    localStorage.setItem("tmpa.sessionId", newId);
    setSid(newId);
  }

  async function startFlow(flowId: string) {
    const trigger = rasaTriggerFor(flowId, lang);
    await chatRef.current?.sendExternal(trigger);
  }

  async function exitFlow() {
    await chatRef.current?.sendExternal("stop");
    // UI will naturally reset as the bot answers; we keep layout unchanged.
  }

  return (
    <div
      className="h-screen w-full overflow-hidden p-2 sm:p-4"
      style={{
        background:
          "linear-gradient(135deg, #032859 0%, #0B5AC2 45%, #3B82F6 100%)",
      }}
    >
      <style>{`:root{ --brand-blue:${brand.blue}; --blue-soft:${brand.blueSoft}; } body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}`}</style>

      <div className="max-w-7xl h-full mx-auto flex flex-col gap-3">
        <Topbar
          lang={lang}
          setLang={setLang}
          onHelp={() => setShowHelp(true)}
          onSettings={() => setShowSettings(true)}
          onProfile={() => setShowProfile(true)}
        />

        {/* Fill remaining height; only chat scrolls */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-3 flex-1 min-h-0 overflow-hidden">
          <Sidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onStartFlow={startFlow}
            lang={lang}
            onExit={exitFlow}
          />
          <Chat
            ref={chatRef}
            lang={lang}
            setActiveStep={setActiveStep}
            setFlowTitle={setFlowTitle}
            setTotalSteps={setTotalSteps}
            totalStepsForUi={totalSteps}
          />
          <RightSidebar
            lang={lang}
            flowTitle={flowTitle}
            activeStep={activeStep}
            totalSteps={totalSteps}
            sessionIdForUi={sid}
            onCopySession={handleCopySession}
            onResetSession={handleResetSession}
          />
        </div>
      </div>

      {/* Help / Settings / Profile Modals */}
      {showHelp && (
        <Modal title={lang === "EN" ? "Help" : "Aide"} onClose={() => setShowHelp(false)}>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              {lang === "EN"
                ? "Use the Quick actions on the left to start guided workflows (Supplier Registration, Work Confirmation, Invoicing…). Type your questions in the chat."
                : "Utilisez les Actions rapides à gauche pour démarrer des parcours guidés (Référencement fournisseur, Confirmation de travaux, Facturation…). Écrivez vos questions dans le chat."}
            </p>
            <p>
              {lang === "EN"
                ? "Say 'next' / 'previous' to navigate steps. Attach files with the paperclip."
                : "Dites 'suivant' / 'précédent' pour naviguer. Joignez des fichiers avec l’icône trombone."}
            </p>
          </div>
        </Modal>
      )}

      {showSettings && (
        <Modal title={lang === "EN" ? "Settings" : "Paramètres"} onClose={() => setShowSettings(false)}>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>{lang === "EN" ? "Language" : "Langue"}</span>
              <button
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                onClick={() => setLang(lang === "EN" ? "FR" : "EN")}
              >
                {lang}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span>{lang === "EN" ? "Reset session" : "Réinitialiser la session"}</span>
              <button
                className="px-3 py-1.5 rounded-lg border hover:bg-gray-50"
                onClick={() => {
                  const id = newSessionId();
                  localStorage.setItem("tmpa.sessionId", id);
                  setSid(id);
                }}
              >
                {lang === "EN" ? "Reset" : "Réinitialiser"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showProfile && (
        <Modal title={lang === "EN" ? "Profile" : "Profil"} onClose={() => setShowProfile(false)}>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <UserCircle2 />{" "}
              <span className="font-medium">
                {lang === "EN" ? "Supplier user" : "Utilisateur fournisseur"}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {lang === "EN"
                ? "Your chat session ID is shown in the right panel."
                : "Votre ID de session de chat s’affiche dans le panneau de droite."}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
