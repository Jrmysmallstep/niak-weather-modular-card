# Niak Weather Modular Cards 🌤️

**Des cartes météo indépendantes pour les dashboards Home Assistant.**

> **Version 0.1.0-beta.1 — prototype fonctionnel, à tester avec une installation Home Assistant réelle.**
> Ce dépôt n'est **pas** une version officielle de Niak Weather.

Cette carte **ne remplace pas l'intégration [Niak Weather](https://github.com/Niakman13/niak-weather-integration)** : elle lit ses données par le WebSocket local `niak_weather/subscribe`. L'intégration Niak Weather officielle doit rester installée et configurée. Aucune modification du dossier `custom_components` n'est nécessaire.

## 13 formats indépendants

| Format YAML | Carte |
|---|---|
| `summary` | Synthèse configurable (En ce moment, Bulletin, Événements) |
| `current` | En ce moment |
| `bulletin` | Bulletin du jour |
| `events` | Événements météo |
| `comfort` | Ressenti |
| `rain` | Pluie |
| `wind` | Vent |
| `pressure` | Pression |
| `pollen` | Pollens actuels |
| `hours` | Prévisions des 18 prochaines heures |
| `days` | Prévisions des 7 prochains jours |
| `pollen-forecast` | Prévisions de pollens pour demain |
| `air` | Qualité de l'air (bonus) |

Chaque carte est disponible dans le sélecteur **Ajouter une carte** sous le nom **Niak Modular · …**. Toutes utilisent le composant `custom:niak-weather-modular-card` et un paramètre `format`.

## Installation HACS — dépôt personnalisé

1. Installer et configurer **Niak Weather** officiel via HACS (**Intégration**).
2. Publier le contenu de ce projet dans un **dépôt GitHub public**, par exemple `Jrmysmallstep/niak-weather-modular-card`. Le dépôt doit contenir `hacs.json`, `README.md` et `dist/niak-weather-modular-card.js` (respecter cette arborescence : ne pas déposer uniquement le ZIP).
3. Dans HACS : `⋮` → **Dépôts personnalisés**, saisir l'URL du dépôt GitHub, choisir **Tableau de bord (Dashboard)** et valider.
4. Chercher **Niak Weather Modular Cards** dans HACS, puis **Télécharger**.
5. Si HACS ne le fait pas automatiquement, ajouter dans **Paramètres → Tableaux de bord → Ressources** :

   ```text
   /hacsfiles/niak-weather-modular-card/niak-weather-modular-card.js
   ```

   Type : **module JavaScript**.
6. Recharger le navigateur / vider le cache du frontend si nécessaire. Dans l'éditeur de dashboard : **Ajouter une carte**, puis choisir **Niak Modular · Vent**, **Niak Modular · Pression**, etc.

Les mises à jour ultérieures se font via HACS après publication de nouvelles versions dans ce dépôt.

### Installation manuelle (sans HACS)

Copier `dist/niak-weather-modular-card.js` dans `/config/www/niak-weather-modular-card.js`, puis ajouter la ressource `/local/niak-weather-modular-card.js` comme **module JavaScript** dans Home Assistant.

## Exemples YAML

### Vent uniquement, sans source ni encadrement de section

```yaml
type: custom:niak-weather-modular-card
format: wind
show_title: true
show_source: false
show_chart: true
show_stats: true
```

### Pression

```yaml
type: custom:niak-weather-modular-card
format: pressure
show_source: false
```

### Synthèse dégroupée et réorganisable

```yaml
type: custom:niak-weather-modular-card
format: summary
blocks:
  - current
  - bulletin
  - events
show_title: false
show_date: false
show_source: false
```

### Prévisions pollens

```yaml
type: custom:niak-weather-modular-card
format: pollen-forecast
show_details: true
```

### Un lieu spécifique (plusieurs lieux dans Niak Weather)

```yaml
type: custom:niak-weather-modular-card
format: rain
entry_id: "identifiant_de_l_entree_niak"
```

L'identifiant est sélectionnable via l'éditeur visuel si plusieurs lieux sont configurés.

## Options générales

| Option | Défaut | Description |
|---|---|---|
| `format` | `wind` | Une des 13 cartes |
| `entry_id` | automatique si un seul lieu | Sélection du lieu dans Niak Weather |
| `show_title` | `true` | Afficher le titre des cartes / blocs |
| `show_source` | `true` | Afficher le badge « Station locale », etc. |
| `show_date` | `true` | Date dans la synthèse et la carte « En ce moment » |
| `show_chart` | `true` | Graphiques disponibles (Vent, Pression, Pluie, Heures) |
| `show_stats` | `true` | Statistiques disponibles |
| `show_details` | `true` | Détails du bulletin, des pollens ou du ressenti |
| `show_border` | `true` | Bordure et arrondis du `ha-card` |
| `show_animations` | `true` | Ciel Niak animé sur « En ce moment » s'il est déjà chargé par la carte officielle |
| `blocks` | `[current, bulletin, events]` | Blocs de `summary`, dans cet ordre |

Toutes les cartes présentent un **éditeur visuel**. Les options qui ne concernent pas le format sélectionné sont ignorées.

## Fonctionnement, limites et compatibilité

- **La météo reste locale à Home Assistant** : abonnement WebSocket sur `niak_weather/subscribe`, sans service cloud ajouté par la carte.
- Le format des données lu est celui de la version **`VIEW_VERSION = 1`** de Niak Weather. La carte affiche une erreur si le contrat change.
- Les capteurs, prévisions et historiques proviennent **uniquement** des valeurs renvoyées par Niak Weather, sans génération de données manquantes.
- La frise Niak officielle (`niak-frise`) est réutilisée **lorsqu'elle est chargée** ; une liste d'événements de secours est présentée sinon. Le ciel animé officiel (`niak-weather-sky`) est également utilisé lorsqu'il est disponible.
- La carte conserve les interactions avec la boîte d'informations des entités Home Assistant, quand le serveur fournit l'identifiant de l'entité.
- Les vues ont été validées avec des **données synthétiques** et la syntaxe JavaScript ; elles nécessitent encore des essais sur Home Assistant réel, sur tablette/mobile, avec plusieurs sources et thèmes.
- Le rendu de cette version est **inspiré** de la présentation de Niak Weather : il n'est pas encore une copie pixel par pixel de la carte d'origine.
- Pour voir des pollens de demain, la source Niak Weather doit réellement fournir ces données. Certaines sources ne publient aucun indice exploitable.

## Développement

Projet sans dépendances npm. `src/niak-weather-modular-card.js` est la source éditable ; `dist/niak-weather-modular-card.js` doit rester identique pour l'installation HACS.

```bash
npm test
npm run build
```

La commande build copie la source vers `dist`. Pas de compilation et pas d'accès Internet nécessaires.

## Crédits et licence

Concept et intégration d'origine : **[Niak Weather par Niakman13](https://github.com/Niakman13/niak-weather-integration)**, sous licence **MIT**. Carte modulaire communautaire indépendante, inspirée de ses composants, de son contrat WebSocket et de sa présentation. La présente contribution conserve les mentions de licence d'origine. Aucune affiliation ou approbation officielle n'est revendiquée.

Licence MIT : voir [LICENSE](LICENSE).