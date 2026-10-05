# Import et export Excel (.xlsx)

## Objectif
Rendre explicite et fiable l’échange des données du tableau de bord au format Excel `.xlsx`.

## Modifications
- Limiter le sélecteur d’import aux fichiers `.xlsx` et refuser clairement les autres formats.
- Conserver l’import des colonnes métier existantes et le message de confirmation du nombre de lignes chargées.
- Exporter les données courantes dans un classeur `.xlsx` réimportable, avec les colonnes d’affectation, capacité, absence, congés, management, formation et dates d’entrée/sortie.
- Clarifier les libellés des boutons pour afficher directement le format `.xlsx`.
- Vérifier l’import puis l’export dans l’interface, ainsi que l’absence d’erreur de compilation.

## Détail technique
Le traitement reste effectué localement dans le navigateur avec la bibliothèque Excel déjà installée ; aucune donnée n’est envoyée vers un service externe.
