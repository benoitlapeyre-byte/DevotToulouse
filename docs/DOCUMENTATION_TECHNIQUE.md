# Documentation technique — Pilotage Agence Toulouse

## 1. Objet

Tableau de bord de pilotage opérationnel de l'agence Devoteam Toulouse : collaborateurs (Talent), managers (Talent Manager), workspaces, affectations aux leads Salesforce, capacité, TACE, inoccupés et suivi des congés.
Toutes les données proviennent d'exports Excel fournis par l'utilisateur. Il n'y a **aucune connexion Salesforce**, aucune base de données et aucune donnée financière affichée.

## 2. Stack

| Élément | Choix |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR), Vite 7 |
| Routage | TanStack Router, fichiers dans `src/routes` |
| Styles | Tailwind CSS v4 (`src/styles.css`, tokens sémantiques), composants shadcn/ui |
| Graphiques | recharts |
| Tableur | SheetJS `xlsx` (chargé dynamiquement, côté navigateur) |
| Notifications | sonner |
| Hébergement | Edge (Cloudflare Workers) |

## 3. Arborescence

```text
src/
  routes/
    __root.tsx        Shell HTML, polices, Toaster
    index.tsx         Page principale : filtres, KPIs, sections
    conges.tsx        Page « Suivi des congés »
  components/
    AppNav.tsx        Navigation latérale anthracite
    DataFileBar.tsx   Import / export .xlsx, réinitialisation, option équipe Delivery
    Staffing.tsx      Contrôle des affectations leads
    Idle.tsx          Collaborateurs inoccupés du mois
    Tace.tsx          Vision TACE, KPIs FTE, mouvements d'effectif, workdays()
    TalentCard.tsx    Fiche collaborateur (modal)
  lib/
    dataset.ts        Store des affectations, import/export, capOne, capacity()
    conges.ts         Store des soldes de congés, import
  data/
    agence.json       Export intégré (lignes Raw)
    dates.json        Dates d'entrée / sortie par collaborateur
    conges.json       Soldes CP intégrés
```

## 4. Modèle de données

### 4.1 Ligne d'affectation (`Raw`, 13 champs)

| Index | Champ | Colonne Excel |
| --- | --- | --- |
| 0 | Workspace | Talent Workspace |
| 1 | Collaborateur | Talent Talent |
| 2 | Manager | Talent Manager |
| 3 | Mois (Jan…Dec) | Occupation Time Month |
| 4 | Lead | Dossier Name (`-` = sans lead) |
| 5 | Statut | Task Status (IN_PROGRESS / REQUEST) |
| 6 | Revenu | conservé, jamais affiché |
| 7 | Assigned FTE | Assigned FTE |
| 8 | Capacité brute | Gross capacity FTE |
| 9 | Absence (maladie) | Absence FTE |
| 10 | Management | [Busy] Management FTE |
| 11 | Formation | Training FTE |
| 12 | Congés | Leave FTE |

`dates.json` : `{ "Nom": [entry | null, exit | null] }` au format ISO.

### 4.2 Store

`src/lib/dataset.ts` expose un store externe (`useSyncExternalStore`) :
- `useDataset()` → `{ raw, dates, source }` filtré selon l'option Delivery.
- `setDataset`, `restoreDataset`, `resetDataset` ; persistance `localStorage` (clé versionnée `agence-dataset-vN`).
- `useIncludeDelivery` / `setIncludeDelivery` (clé `agence-include-delivery`).

`src/lib/conges.ts` suit le même principe (clé `agence-conges-v1`).

## 5. Règles métier

- **Exclusion** : workspace « FR - Innovative Tech (DAP) » retiré partout ; préfixe « FR - » masqué.
- **Plafond `capOne`** : par collaborateur et par mois, Assigned FTE total ≤ 1 (réparti au prorata entre ses leads) et capacité brute ≤ 1. Appliqué à l'export intégré et à chaque import.
- **Capacité brute** : valeur du fichier strictement conservée (zéros inclus). Si la colonne est absente : jours ouvrés lun–ven entre entrée et sortie (`capacity()`), sinon somme des FTE.
- **Présents ≥ 1 jour** : au moins un jour ouvré entre dates d'entrée et de sortie ; les « hors effectif » sont exclus des compteurs.
- **Statut septembre** : tout REQUEST de septembre est traité comme IN_PROGRESS.
- **Affectations** : Mission (IN_PROGRESS), Lead à confirmer (REQUEST), Affecté sans lead (dossier `-`, violet), Intermission (aucune affectation).
- **Option équipe management Delivery** : décochée, retire Rodolphe Levesque, ses collaborateurs et Alexis Balazuc/Baldazuc.

### Formules

| Indicateur | Formule |
| --- | --- |
| Net Capacity FTE | Capacité brute − Congés |
| TACE | Assigned FTE / Net Capacity FTE |
| Capacité FTE OWN | Capacité brute − Maladie − Management − Formation |
| FTE inoccupés | Capacité brute − Assigned − Maladie − Congés − Management − Formation |
| Équivalent jours | FTE × jours ouvrés du mois (lun–ven, année 2026) |

Mouvements d'effectif : entrées / sorties calculées sur les dates, année 2026 uniquement.

## 6. Import / export

- **Import** (`importSpreadsheet`) : `.xlsx` uniquement, première feuille. Ligne d'en-tête détectée par la colonne « Talent Talent ». Colonnes reconnues par nom normalisé (correspondance exacte puis partielle).
  - Obligatoires : Talent Workspace, Talent Talent, Talent Manager, Occupation Time Month, Assigned FTE.
  - Optionnelles : Dossier Name, Task Status, Gross capacity FTE, Absence FTE, Leave FTE, [Busy] Management FTE, Training FTE, Talent Entry date, Talent Exit date.
- **Export** (`exportSpreadsheet`) : `Agence_Toulouse_export_AAAA-MM-JJ.xlsx`, feuille « Affectations », filtre automatique, sans revenu.
- **Congés** (`importLeaves`) : export Workday, colonnes « Worker », « Plan », « Current Balance » (+ Accrued, Carryover at risk, Expiration) ; plans « … N » et « … N-1 ».

## 7. Charte graphique

Direction « Devoteam opérationnel » : surfaces claires, navigation anthracite, accent rouge sémantique `oklch(0.62 0.24 24)`, polices Inter + IBM Plex Mono. Couleurs exclusivement via tokens de `src/styles.css` (jamais de couleurs codées en dur). Formation en violet `oklch(0.55 0.22 295)`.

## 8. Développement

```sh
bun install
bun run dev        # http://localhost:8080
bunx tsgo --noEmit # vérification des types
bun run build
```

Mise à jour de l'export intégré : remplacer `src/data/agence.json` / `dates.json`, puis incrémenter la clé `KEY` de `dataset.ts` pour invalider les données mémorisées des navigateurs.

## 9. Limites connues

- Année de calcul des jours ouvrés figée à 2026 (`YEAR` dans `dataset.ts`).
- Jours fériés non déduits des jours ouvrés.
- Données stockées dans le navigateur de chaque utilisateur (pas de partage entre postes).
- Mai et juin : aucune charge management dans l'export source.
