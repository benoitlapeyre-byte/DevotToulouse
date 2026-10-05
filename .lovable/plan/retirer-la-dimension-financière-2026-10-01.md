# Retirer la dimension financière

## Résultat attendu
Le tableau de bord devient une vision exclusivement opérationnelle des collaborateurs, capacités, affectations et leads.

## Modifications
- Retirer les indicateurs de revenu, confirmé financier et pipeline financier.
- Supprimer les graphiques de revenu par mois, workspace et client.
- Remplacer la synthèse principale par des indicateurs d'effectifs et de dossiers utiles au pilotage.
- Retirer les montants des tableaux et des fiches collaborateurs.
- Conserver les statuts des leads « En mission » et « Lead à confirmer », car ils décrivent l'affectation et non la finance.
- Conserver le TACE, les capacités FTE, les dates d'entrée/sortie et le contrôle des affectations.
- Importer le nouvel export et distinguer, pour chaque collaborateur et chaque mois, les FTE d'absence et de management.
- Ajouter des repères et filtres « Absence » et « Management » dans la vision collaborateurs, ainsi que le détail dans chaque fiche.
- Mettre à jour les titres et descriptions de la page pour ne plus mentionner le revenu.

## Vérification
- Vérifier qu'aucun montant en euros ni libellé financier n'est visible.
- Vérifier l'affichage de la page principale et d'une fiche collaborateur.
- Confirmer que les filtres, le TACE, les repères absence/management et l'ouverture des fiches fonctionnent toujours.

## Détails techniques
Les données financières pourront rester présentes dans le fichier source importé, mais elles ne seront ni agrégées ni affichées dans l'interface. Les deux nouvelles colonnes de l'export, « Absence FTE » et « [Busy] Management FTE », alimenteront les repères opérationnels.
