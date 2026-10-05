# Pilotage Agence Toulouse

Tableau de bord de pilotage opérationnel de l'agence Devoteam Toulouse : collaborateurs, managers, workspaces, affectations aux leads Salesforce, capacité, TACE et congés.

## Fonctionnalités

- **Filtres** : workspace, manager, statut, mois (12 mois 2026, appliqué à toute la page).
- **Contrôle des affectations leads** : mission, lead à confirmer, affecté sans lead, intermission.
- **Collaborateurs inoccupés** du mois avec capacité restante.
- **Vision TACE** : capacité brute, capacité FTE OWN, congés, net capacity, absence, inoccupés, management, formation, Assigned FTE, TACE, équivalents en jours, mouvements d'effectif.
- **Fiches collaborateurs** détaillées.
- **Suivi des congés** (page dédiée) : soldes CP N et N-1, jours à risque.
- **Import / export Excel .xlsx** et option d'inclusion de l'équipe management Delivery.

## Démarrage

```sh
bun install
bun run dev
```

Application disponible sur http://localhost:8080.

## Données

Aucune connexion Salesforce : les données viennent des exports Excel importés via la barre « Source des données » (et « Mettre à jour » sur la page congés). Les imports sont mémorisés dans le navigateur ; « Réinitialiser » rétablit l'export intégré.

## Stack

TanStack Start (React 19), Vite 7, Tailwind CSS v4, shadcn/ui, recharts, SheetJS.

## Documentation

Voir [docs/DOCUMENTATION_TECHNIQUE.md](docs/DOCUMENTATION_TECHNIQUE.md) : architecture, modèle de données, règles métier, formules, format des fichiers.
