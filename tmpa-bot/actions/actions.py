# actions/actions.py
from typing import Any, Dict, List, Text
import re, unicodedata
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet

# ------------ Small utils ------------
def _normalize(s: Text) -> Text:
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = re.sub(r"\s+", " ", s)  # collapse spaces
    return s

def _token_hit(text: Text, *groups: List[str]) -> bool:
    """every group must contribute at least one substring hit in text"""
    for g in groups:
        if not any(tok in text for tok in g):
            return False
    return True

# ------------ Flows ------------
FLOW_STEPS: Dict[Text, List[Text]] = {
    "supplier_registration": [
        "utter_sr_step_1","utter_sr_step_2","utter_sr_step_3",
        "utter_sr_step_4","utter_sr_step_5","utter_sr_step_6","utter_sr_step_7",
    ],
    "forgot_password": [
        "utter_fp_step_1","utter_fp_step_2","utter_fp_step_3","utter_fp_step_4",
    ],
    "work_confirmation": [
        "utter_wc_step_1","utter_wc_step_2","utter_wc_step_3","utter_wc_step_4",
    ],
    "invoice_creation": [
        "utter_inv_step_1","utter_inv_step_2","utter_inv_step_3",
        "utter_inv_step_4","utter_inv_step_5","utter_inv_step_6",
    ],
}

def _send_step(
    dispatcher: CollectingDispatcher, tracker: Tracker, flow_id: Text, step_index: int, lang: Text
) -> List[Dict]:
    steps = FLOW_STEPS.get(flow_id, [])
    if not steps:
        dispatcher.utter_message(text="Flow not configured.")
        return []
    step_index = max(0, min(step_index, len(steps) - 1))
    events: List[Dict] = [
        SlotSet("lang", lang),
        SlotSet("active_flow", flow_id),
        SlotSet("step_index", step_index),
    ]
    dispatcher.utter_message(response=steps[step_index])
    dispatcher.utter_message(json_message={"step_index": step_index, "total_steps": len(steps)})
    return events

# ------------ Router ------------
class ActionRouteISupplier(Action):
    def name(self) -> Text:
        return "action_route_isupplier"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]):
        raw = tracker.latest_message.get("text") or ""
        t = _normalize(raw)
        intent = (tracker.latest_message.get("intent") or {}).get("name") or ""
        lang = tracker.get_slot("lang") or "EN"

        # DEBUG breadcrumbs in action-server logs
        print(f"[router] intent={intent} text='{t}'")

        # ====== Deterministic Quick-FAQ ======
        # Anything about viewing invoices / their status / pending list
        invoice_triggers = [
            "invoice details","invoice detail","invoice status","invoices status","view invoices",
            "pending invoices","invoices","my invoices","invoices history","invoices list",
            "voir factures","consulter mes factures","liste des factures","statut des factures",
            "etat des factures","factures en attente","details facture","details factures",
            "afficher mes factures","ou voir les factures","ou voir mes factures",
        ]
        # Anything about payments / payment status
        payment_triggers = [
            "payment status","view payments","show payments","see payments","payments","my payments",
            "statut paiement","statut de paiement","voir paiements","afficher mes paiements",
            "ou voir les paiements","suivi paiement","suivi des paiements","reglement","reglements",
        ]
        # Invoice holds / on hold
        holds_triggers = [
            "invoice holds","resolve invoice holds","on hold",
            "facture bloque","facture bloquee","facture en attente",
            "blocages facture","lever le hold","resoudre blocages facture",
        ]

        # 1) Hard substring triggers (accent/case insensitive thanks to _normalize)
        if any(k in t for k in invoice_triggers):
            print("[router] match: invoices_status (substring)")
            dispatcher.utter_message(response="utter_faq/invoices_status")
            return []
        if any(k in t for k in payment_triggers):
            print("[router] match: payment_status (substring)")
            dispatcher.utter_message(response="utter_faq/payment_status")
            return []
        if any(k in t for k in holds_triggers):
            print("[router] match: invoice_holds (substring)")
            dispatcher.utter_message(response="utter_faq/invoice_holds")
            return []

        # 2) Token logic fallbacks (very permissive)
        if _token_hit(t, ["facture","factures","invoice","invoices"], ["statut","status","detail","details","en attente","pending"]):
            print("[router] match: invoices_status (token)")
            dispatcher.utter_message(response="utter_faq/invoices_status")
            return []
        if _token_hit(t, ["paiement","paiements","payment","payments"], ["statut","status","voir","show","suivi","see"]):
            print("[router] match: payment_status (token)")
            dispatcher.utter_message(response="utter_faq/payment_status")
            return []

        # 3) If NLU sent us here with a flow-ish intent, still try to rescue by intent name
        #    (Some older training sets misclassify these into facturation_details.step_1)
        if intent in {"facturation_details.step_1"}:
            if any(word in t for word in ["payment","paiement","paiements"]):
                print("[router] rescue: intent=facturation_details.step_1 => payment_status")
                dispatcher.utter_message(response="utter_faq/payment_status")
                return []
            if any(word in t for word in ["invoice","invoices","facture","factures","pending","en attente","statut","status","details","detail"]):
                print("[router] rescue: intent=facturation_details.step_1 => invoices_status")
                dispatcher.utter_message(response="utter_faq/invoices_status")
                return []

        # ====== Standard guided flows (cards) ======
        if any(k in t for k in ["referencement","inscrire","devenir fournisseur","supplier registration","register"]):
            return _send_step(dispatcher, tracker, "supplier_registration", 0, lang)
        if any(k in t for k in ["mot de passe","mot de passe oublie","forgot password","reset password","login help"]):
            return _send_step(dispatcher, tracker, "forgot_password", 0, lang)
        if any(k in t for k in ["confirmation travaux","confirmation de travaux","work confirmation"]):
            return _send_step(dispatcher, tracker, "work_confirmation", 0, lang)
        if any(k in t for k in ["creer facture","créer facture","create invoice","submit invoice"]):
            return _send_step(dispatcher, tracker, "invoice_creation", 0, lang)

        dispatcher.utter_message(text="I didn’t recognize the request. Try a quick action on the left.")
        return []

class ActionNextStep(Action):
    def name(self) -> Text:
        return "action_next_step"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]):
        flow_id = tracker.get_slot("active_flow")
        if not flow_id:
            dispatcher.utter_message(text="No active flow.")
            return []
        step_index = int(tracker.get_slot("step_index") or 0)
        lang = tracker.get_slot("lang") or "EN"
        steps = FLOW_STEPS.get(flow_id, [])
        if not steps:
            dispatcher.utter_message(text="Flow not configured.")
            return []
        if step_index >= len(steps) - 1:
            dispatcher.utter_message(response="utter_done_end")
            dispatcher.utter_message(json_message={"step_index": step_index,"total_steps": len(steps),"completed": True})
            return []
        nxt = min(step_index + 1, len(steps) - 1)
        return _send_step(dispatcher, tracker, flow_id, nxt, lang)

class ActionBackStep(Action):
    def name(self) -> Text:
        return "action_back_step"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]):
        flow_id = tracker.get_slot("active_flow")
        if not flow_id:
            dispatcher.utter_message(text="No active flow.")
            return []
        step_index = int(tracker.get_slot("step_index") or 0)
        lang = tracker.get_slot("lang") or "EN"
        prv = max(step_index - 1, 0)
        return _send_step(dispatcher, tracker, flow_id, prv, lang)

class ActionResetFlow(Action):
    def name(self) -> Text:
        return "action_reset_flow"

    def run(self, dispatcher: CollectingDispatcher, tracker: Tracker, domain: Dict[Text, Any]):
        return [SlotSet("active_flow", None), SlotSet("step_index", 0)]
