# Guide d’utilisation — Assistant i‑Supplier (TMPA)

Ce guide explique, pas à pas, comment utiliser **l’assistant i‑Supplier** côté utilisateur et comment l’exploiter/maintenir côté technique (front‑end, back‑end Rasa, sécurité). Il couvre aussi le dépannage courant et l’extension de nouvelles fonctionnalités, **sans impacter ce qui fonctionne déjà**.

---

## 1) Présentation rapide

- **But** : aider les fournisseurs à interagir avec le portail **Oracle EBS i‑Supplier** (référencement, confirmations de travaux, facturation, suivi paiements/BC, etc.) via un **chat assisté** et des **Actions rapides**.
- **Langues** : **FR / EN** (bascule instantanée).
- **Voix** : dictée vocale (micro) via **Web Speech API** (navigateur).
- **Captures** : chaque étape clé peut afficher une **capture d’écran** cohérente.
- **Suivi** : barre de progression / “Étape X/Y” dans le panneau de droite.
- **Sessions** : un identifiant de session persiste dans **localStorage** côté navigateur (`tmpa.sessionId`).

**Pile technique :**
- **Front** : React + Vite + Tailwind, `lucide-react`, `framer-motion`.
- **Back** : Rasa Open Source **3.x** (NLU + Rules), serveur d’actions Python (`rasa_sdk`).
- **Canal** : REST (`/webhooks/rest/webhook`).

---

## 2) Démarrage rapide (développeur)

### 2.1 Prérequis
- Node 18+ et npm/pnpm/yarn
- Python 3.8–3.10 (selon Rasa installé), `pip`, `venv`
- Rasa 3.x et `rasa_sdk`
- Navigateurs modernes (Chrome/Edge/Firefox); le micro est plus stable sur Chromium.

### 2.2 Back‑end Rasa

```bash
# 1) Activer l’environnement Python
python -m venv rasa_env
./rasa_env/Scripts/activate   # Windows
# source rasa_env/bin/activate  # macOS/Linux

# 2) Installer les dépendances (adapter si besoin)
pip install rasa==3.* rasa-sdk==3.*

# 3) Valider & entraîner
rasa data validate
rasa train

# 4) Lancer les serveurs (deux fenêtres)
rasa run --enable-api --cors "*" --port 5005
rasa run actions --port 5055 -vv
```
**Important :** laissez **5055** libre (une seule instance du serveur d’actions).

### 2.3 Front‑end (Vite + React)
Créez un fichier `.env` à la racine du front :
```env
VITE_RASA_URL=http://localhost:5005
VITE_DEFAULT_LANG=EN
```
Puis :
```bash
npm install
npm run dev
# Ouvrir l’URL affichée par Vite (ex: http://localhost:5173)
```

---

## 3) Utilisation (utilisateur final)

### 3.1 Actions rapides (colonne de gauche)
- **Cliquez** sur :  
  - Supplier Registration  
  - Work Confirmation  
  - Create Invoice (with PO)  
  - View Invoices / Status  
  - View Payments  
  - Resolve Invoice Holds  
  - Assistance / Forgot Password
- Le chat envoie un **déclencheur** (EN/FR) à Rasa et **affiche la première étape**.
- Le **panneau droit** montre la **progression** (pourcent + Étape X/Y).

### 3.2 Navigation dans le flux
- Boutons **Prev / Next** en bas du chat **ou** envoyez “**suivant** / **précédent**” (“next/previous” en EN).
- La dernière étape affiche **“Flow completed / Fin du parcours”**.

### 3.3 Bascule de langue
- Icône **🌐** (topbar) → passe **FR/EN** instantanément.
- Le déclencheur envoyé à Rasa est ajusté (mots‑clés FR/EN).

### 3.4 Captures d’écran
- Quand une étape contient une image, cliquez **“View screenshot / Voir la capture”** → ouverture en modal.

### 3.5 Joindre des fichiers
- Icône **📎** → sélectionnez un fichier.  
- Le fichier est encodé en **base64** et envoyé à Rasa dans `metadata.attachment` pour traitement serveur (validation business, archivage, etc.).

### 3.6 Saisie vocale (micro)
- Icône **🎙️** → autorisez le micro. Parlez **clairement**.
- Le navigateur (Web Speech API) transcrit en texte et **envoie automatiquement au chat** à la fin de la dictée.  
- La langue de reconnaissance s’aligne sur la langue de l’UI (ex. `fr-FR` / `en-US`).

### 3.7 Session (panneau droit)
- **Copy** : copie l’ID de session (pratique pour support/traçabilité).
- **Reset** : génère un **nouvel ID** et redémarre le contexte côté client.

---

## 4) Scénarios couverts

### 4.1 Parcours guidés (multi‑étapes)
- **Référencement fournisseur (7 étapes)** : informations légales, catégories, documents, RIB, revue, soumission.
- **Mot de passe oublié (4)** : lien d’aide, identifiant/email, mail de reset, nouveau mot de passe.
- **Confirmation de travaux (4)** : créer, quantités/période, validation, soumission.
- **Créer une facture (6)** : entête, association BC, lignes, pièces jointes, taxes, soumission.

### 4.2 FAQ (réponses rapides)
- **View Invoices / Status** (*invoice details, pending invoices, voir factures…*)  
- **View Payments** (*payment status, show payments, voir paiements…*)  
- **Resolve Invoice Holds** (*bloquée / en attente / hold…*)  
- Accès/connexion, navigateurs, changement de langue, consultation/accusé des BC, soumission de facture, pièces jointes, notifications, etc.

> **Notes techniques** : ces FAQ utilisent des **retrieval intents** (`faq/...`) et des réponses `utter_faq/...` dans `domain.yml`. Côté règles, on évite l’action `respond_faq` (non utilisée) et on laisse **`action_route_isupplier`** router/standardiser les cas ambigus.

---

## 5) Dépannage (utilisateur & support)

### 5.1 Erreurs courantes côté utilisateur
- **“I didn’t recognize the request”** : utilisez une **Action rapide** ou exprimez la demande en **mots‑clés ciblés** (“invoice details”, “statut paiement”…).  
- **Le micro ne fonctionne pas** : vérifiez les **autorisations** navigateur, utilisez **Chrome/Edge**, désactivez d’éventuelles extensions bloquantes.
- **Pas de réponse** : Rasa peut être à l’arrêt ou inaccessible (réseau/pare‑feu). Contactez le support interne.
- **Capture non visible** : recharger la page ; si persistant, vérifier que la réponse Rasa contient bien `image`.

### 5.2 Erreurs typiques côté Rasa
- **Port 5055 déjà utilisé** : un autre serveur d’actions tourne. Fermer l’instance ou changer de port.  
- **`No registered action found for name 'respond_faq'`** : ne pas appeler `respond_faq` (supprimé). Utiliser les `utter_faq/...` ou router via `action_route_isupplier`.
- **`Contradicting rules`** : éviter les règles qui **concurrencent** la même prédiction. Garder **une règle FAQ** claire **ou** router via l’action custom, pas les deux.  
- **`slot_was_set` non supporté** dans `domain.yml` Rasa 3 : utiliser le format conditionnel **`condition: - type: slot / name: lang / value: "FR"`**.  
- **Conflits NLU** : un exemple ne doit pas être labellisé **avec deux intents**. Nettoyer les doublons/variantes.

---

## 6) Administration & maintenance

### 6.1 Ajouter un **nouveau flux guidé**
1. **`domain.yml`** → créer les **utterances** : `utter_myflow_step_1..N` (+ variantes FR/EN avec `condition` sur `lang`).  
2. **`actions/actions.py`**  
   - Dans `FLOW_STEPS`, ajouter la liste des étapes (`utter_myflow_step_X`).  
   - Dans `ActionRouteISupplier.rasaTriggerFor` (front : `App.tsx`) ou le routeur back `action_route_isupplier`, définir les **mots‑clés** FR/EN d’entrée.  
3. **Front (`App.tsx`)**  
   - Ajouter l’item d’**Action rapide** dans `flows` + l’étiquette.  
   - Le `startFlow()` enverra automatiquement le **déclencheur** à Rasa.  
4. **`rules.yml`** : la règle générique **“route isupplier flows”** pointe déjà sur `action_route_isupplier`.  
5. **Entraîner & tester** : `rasa data validate && rasa train` puis tests manuels.

### 6.2 Ajouter une **nouvelle FAQ**
1. **`data/nlu.yml`** : `- intent: faq/ma_nouvelle_faq` + **exemples riches** (EN/FR).  
2. **`domain.yml`** : `utter_faq/ma_nouvelle_faq` (avec conditions de langue si besoin).  
3. **Pas de nouvelle règle spécifique** (on **garde une règle FAQ** simple, et/ou on laisse le routeur reconnaître les mots‑clés).  
4. **Entraîner & tester**.

### 6.3 Captures & pièces jointes
- Stockez les assets côté front ou servez‑les via un CDN interne.  
- Renseignez l’URL `image` dans les `utter_*` pour les étapes concernées.  
- Les pièces jointes envoyées par l’utilisateur arrivent encodées **base64** (champ `metadata.attachment`) : traitez‑les côté action serveur si nécessaire.

---

## 7) Sécurité (pratiques recommandées)

- **HTTPS partout** : placez Nginx/Traefik devant Rasa et le front avec **TLS**.  
- **CORS** : restreindre à l’origin du front en production (éviter `*`).  
- **RASA_TOKEN** : activez un **token** (canal REST) et envoyez‑le dans l’en‑tête côté front si configuré.  
- **Logs** : ne journalisez pas de **données sensibles** (PII, RIB) en clair.  
- **Pièces jointes** : limitez la **taille** et le **type** (PDF/JPG/PNG), scannez si nécessaire.  
- **Session** : l’ID est stocké dans **`localStorage`** uniquement côté client. Purge possible via **Reset**.  
- **Rate‑limit** : côté reverse‑proxy pour éviter l’abus.  
- **Politique navigateur** : CSP stricte, `X-Content-Type-Options`, `Referrer-Policy`, etc.

---

## 8) Déploiement (aperçu)

- **Rasa Core** : `:5005` (REST), **Actions** : `:5055`.  
- **Reverse‑proxy** (Nginx) :  
  - Route `/api/rasa` → `http://rasa:5005`  
  - Route `/api/actions` → `http://actions:5055`  
  - Forcer HTTPS, ajouter **CORS** ciblé, **rate‑limit**.  
- **Front** : build Vite `npm run build` puis servir (Nginx ou service static).  
- **Variables d’env.** : `VITE_RASA_URL` (front), `RASA_TOKEN` (back), etc.  
- **Observabilité** : journaux Rasa + reverse‑proxy, tableau de bord (Grafana/Prometheus) si besoin.

---

## 9) Tests & qualité

- **Checklist manuelle** :  
  - Chaque Action rapide déclenche le **bon flux** (étape 1 + progression).  
  - Les boutons **Prev/Next** modifient l’étape **sans recharger**.  
  - **FAQ** (Invoices/Payments/Holds, etc.) répondent correctement en FR/EN.  
  - **Micro** : dictée en FR/EN, envoi automatique du texte reconnu.  
  - **Pièces jointes** : message d’upload + arrivée des métadonnées.  
  - **Session** : Copy/Reset → ID mis à jour côté UI et pris en compte par Rasa.

- **Dépôts** : utilisez des **snapshots** de config (domain/nlu/rules) après chaque lot de corrections validé (ex. “V2 stable”).

---

## 10) FAQ interne (dev)

**Q. Où est stockée la session ?**  
**R.** Dans `localStorage` navigateur sous la clé `tmpa.sessionId`. Rasa se contente d’utiliser l’identifiant pour conserver le contexte de dialogue côté NLU/policy.

**Q. Comment sont gérées les conditions de langue dans `domain.yml` ?**  
**R.** Par bloc `condition` :
```yaml
responses:
  utter_sr_step_1:
    - condition:
        - type: slot
          name: lang
          value: "FR"
      text: "…FR…"
    - condition:
        - type: slot
          name: lang
          value: "EN"
      text: "…EN…"
```
Le slot `lang` est mis à jour par l’action routeur.

**Q. Faut‑il `respond_faq` ?**  
**R.** Non. Nous utilisons **`utter_faq/...`** directement (retrieval intent) et le **routeur** pour les raccourcis/ambiguïtés, ce qui évite les contradictions de règles.

**Q. Comment ajouter un bouton mic custom ?**  
**R.** Il existe déjà dans `App.tsx` : bascule `voice` + Web Speech API. Adapter si besoin (ex. mode **continu**, multi‑phrases, interimResults).

---

## 11) Annexes (points clés du code)

- **Front**
  - `App.tsx` :
    - `sendToRasa()` → POST REST Rasa + timeout + gestion erreurs.  
    - `Chat` : messages, progression (parsing “Step X/Y”), mic, pièces jointes, screenshot modal.  
    - `Sidebar` : Actions rapides → `startFlow()` → envoi du déclencheur.  
    - `RightSidebar` : progression + session (Copy/Reset).
  - **Env** : `VITE_RASA_URL`, `VITE_DEFAULT_LANG`.

- **Back Rasa**
  - `actions/actions.py` :
    - `FLOW_STEPS` (mapping **flux → utterances**).  
    - `action_route_isupplier` (router des mots‑clés → flux/faq).  
    - `action_next_step` / `action_back_step` / `action_reset_flow`.  
  - `domain.yml` : intents, slots (`lang`, `active_flow`, `step_index`), responses **FR/EN** (avec `condition`).  
  - `data/rules.yml` : règles **simples & non contradictoires** (welcome, flows → routeur, next/back/stop, faq générique).  
  - `data/nlu.yml` : intents (flows + `faq/...`), **sans conflits** (chaque exemple n’a **qu’un seul** intent).

---

## 12) Conclusion

Cette base fournit un **assistant robuste** (guidage pas à pas + FAQ métier, micro, captures, suivi, bilingue) et **facile à faire évoluer** :  
- Ajoutez des flux/FAQ sans casser l’existant.  
- Gardez des règles **simples** et centralisez le **routing** dans l’action Python.  
- Sécurisez via **HTTPS, CORS, token, logs sobres**, et limitez les pièces jointes.

Pour toute extension (ex. lecture temps réel des statuts depuis EBS/i‑Supplier, webhook entrants, SSO), vous pouvez brancher des **actions custom** supplémentaires et/ou un **API gateway** interne.
