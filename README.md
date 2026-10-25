# Niak Weather Modular Cards 🌤️

**Des cartes météo indépendantes pour les dashboards Home Assistant.**

> **Version 0.1.5-beta.1 — prototype fonctionnel, à tester avec une installation Home Assistant réelle.**
> Ce dépôt n'est **pas** une version officielle de Niak Weather.

Les formats météo **ne remplacent pas l'intégration [Niak Weather](https://github.com/Niakman13/niak-weather-integration)** : elle lit ses données par le WebSocket local `niak_weather/subscribe`. L'intégration Niak Weather officielle doit rester installée et configurée. Aucune modification du dossier `custom_components` n'est nécessaire.

## 20 formats indépendants

| Format YAML | Carte |
|---|---|
| `summary` | Synthèse configurable (En ce moment, Bulletin, Événements) |
| `current` | En ce moment |
| `bulletin` | Bulletin du jour |
| `events` | Événements météo |
| `comfort` | Ressenti |
| `extras` | Pastilles regroupées : soleil, UV, lux, humidité, rosée |
| `solar` | Ensoleillement |
| `uv` | Indice UV |
| `lux` | Luminosité |
| `humidity` | Humidité |
| `dew` | Point de rosée |
| `rain` | Pluie |
| `wind` | Vent |
| `pressure` | Pression |
| `pollen` | Pollens actuels |
| `hours` | Prévisions des 18 prochaines heures |
| `days` | Prévisions des 7 prochains jours |
| `pollen-forecast` | Prévisions de pollens pour demain |
| `air` | Qualité de l'air (bonus) |
| `moon` | Lune — phase, illumination, lever/coucher, âge, distance et prochaines phases |

Chaque carte est disponible dans le sélecteur **Ajouter une carte** sous le nom **Niak Modular · …**. Toutes utilisent le composant `custom:niak-weather-modular-card` et un paramètre `format`.

## Installation HACS — dépôt personnalisé

1. Installer et configurer **Niak Weather** officiel via HACS (catégorie **Intégration**).
2. Dans HACS : ouvrir **Dépôts personnalisés** (menu ⋮), saisir `https://github.com/Jrmysmallstep/niak-weather-modular-card`, sélectionner **Tableau de bord (Dashboard)**, puis valider.
3. Rechercher **Niak Weather Modular Cards**, puis choisir **Télécharger**. Tant qu'aucune release GitHub n'est publiée, HACS utilise la branche `main`.
4. HACS ajoute normalement la ressource automatiquement. Dans le cas contraire, ouvrir **Paramètres → Tableaux de bord → Ressources** et ajouter `/hacsfiles/niak-weather-modular-card/niak-weather-modular-card.js` comme **module JavaScript**.
5. Actualiser Home Assistant, puis utiliser **Ajouter une carte** et choisir un format **Niak Modular · Vent**, **Niak Modular · Pression**, etc.

Les mises à jour ultérieures se feront via HACS. Cette première version est une bêta, à tester avec une installation Home Assistant réelle.

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

## Carte Lune indépendante — Lunar Phase

Depuis **0.1.5-beta.1**, le format `moon` ajoute une carte inspirée de la disposition de [Lunar Phase Card](https://github.com/ngocjohn/lunar-phase-card), dans le style de Niak Weather Modular Cards (fonds `glass`, `theme`, `transparent`, grille responsive, thème HA). L'illustration de lune est générée localement en SVG ; aucun téléchargement d'image et aucun calcul astronomique supplémentaire.

**Pré-requis pour ce format uniquement :** installer l'intégration [Lunar Phase de ngocjohn](https://github.com/ngocjohn/lunar-phase) dans Home Assistant. Le module sélectionne automatiquement son capteur « Phase de la lune » à partir de ses attributs, ou accepte `moon_entity` explicite. La carte Lune ne nécessite **pas** l'intégration Niak Weather et n'utilise **pas** son WebSocket.

```yaml
type: custom:niak-weather-modular-card
format: moon
background_mode: glass
moon_position: left
show_title: true
show_source: false
show_date: false
show_chart: true
show_stats: true
show_details: true
```

`moon_position: right` place le disque de lune à droite. `moon_southern_hemisphere: true` inverse son orientation. `moon_entity: sensor.votre_capteur_de_phase` force un capteur précis, utile si plusieurs emplacements Lunar Phase sont configurés. Dans l'éditeur visuel, les entités Lunar Phase reconnues apparaissent dans la liste.

La version initiale reprend la disposition générale (disque lunaire + informations et dates) **sans chercher à reproduire les photos, les graphiques d'horizon ou le calendrier interactif** de la carte originale. Sources originales sous licence MIT, crédit à Viet Ngoc (ngocjohn).

## Cartes de mesures complémentaires

La version **0.1.5-beta.1** ajoute une carte `extras` qui reprend les cinq pastilles de Niak Weather sans conteneur « Aujourd'hui ». Les formats `solar`, `uv`, `lux`, `humidity` et `dew` affichent chaque mesure séparément.

```yaml
type: custom:niak-weather-modular-card
format: extras
background_mode: transparent
show_title: false
extras_blocks:
  - solar
  - uv
  - lux
  - humidity
  - dew
```

Pour afficher uniquement humidité et rosée, conserver seulement `humidity` et `dew` dans `extras_blocks`. Un éditeur visuel permet les mêmes choix. Les autres pastilles (dont certaines espèces de pollens) peuvent être incluses avec la catégorie `other`. Les valeurs affichées sont uniquement celles fournies par Niak Weather, avec leurs icônes, couleurs et liens vers les entités.

## Carte Ressenti indépendante

Depuis **0.1.5-beta.1**, le format `comfort` reprend l'affichage de Niak Weather : valeur de ressenti, libellé, facteurs, bouton d'information et **jauge colorée de −5 °C à 45 °C** avec les deux repères du thermomètre (lorsque disponible) et du ressenti.

```yaml
type: custom:niak-weather-modular-card
format: comfort
background_mode: glass
show_title: true
show_source: true
show_chart: true
show_details: true
```

La jauge suit `show_chart`, le bouton d'explication suit `show_details`. Les autres réglages restent indépendants. L'intégration officielle fournit directement les valeurs de température mesurée et de ressenti.

## Affichage et défilement de la carte Événements

Depuis **0.1.2-beta.1**, la carte **Événements** reprend les variables graphiques attendues par la frise Niak officielle (couleurs, pastilles, typographie, transparence). Son titre utilise le libellé discret « ÉVÉNEMENTS ».

La frise native n'est plus détruite puis recréée à chaque réception météo : elle conserve ainsi son **défilement automatique (un événement toutes les 4,5 secondes)**. Le même principe s'applique au bloc Événements de la carte Synthèse, avec mise à jour des autres blocs sans supprimer la frise.

**Comportement volontaire de Niak Weather :** sur ordinateur, le défilement se met en pause au survol ou au focus de la frise, et repart lorsque le pointeur sort. Pour vérifier l'animation, déplacer le curseur en dehors de la carte. En l'absence du composant `niak-frise` officiel, le rendu de secours reste une liste statique.

## Fond de carte et thèmes Home Assistant

Depuis **0.1.1-beta.1**, trois rendus sont proposés dans l’éditeur visuel, rubrique **Fond de la carte** :

- **Verre dépoli** (`glass`, par défaut) : fond partiellement transparent, adapté aux couleurs principales du thème Home Assistant avec un léger flou.
- **Thème Home Assistant** (`theme`) : respecte le fond de carte du thème (`--ha-card-background` ou `--card-background-color`), sans flou. Si le thème définit un fond sombre, il reste sombre.
- **Transparent** (`transparent`) : aucun fond coloré ni flou ; le contenu prend visuellement place sur le fond du dashboard.

Exemple YAML pour une carte Vent totalement transparente :

```yaml
type: custom:niak-weather-modular-card
format: wind
background_mode: transparent
show_source: false
```

Sur une tablette peu puissante, le mode `theme` ou `transparent` est recommandé car il évite le filtre de flou. Les cartes existantes adoptent le verre dépoli si `background_mode` n'a pas été défini.

## Options générales

| Option | Défaut | Description |
|---|---|---|
| `format` | `wind` | Une des 13 cartes |
| `background_mode` | `glass` | Fond `glass` (verre dépoli), `theme` (thème HA) ou `transparent` |
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