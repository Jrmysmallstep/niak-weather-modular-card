# Niak Weather Modular Cards 🌤️

**Des cartes météo indépendantes pour les dashboards Home Assistant.**

> **Version 0.2.7-beta.1 — prototype fonctionnel, à tester avec une installation Home Assistant réelle.**
> Ce dépôt n'est **pas** une version officielle de Niak Weather.

Les formats météo **ne remplacent pas l'intégration [Niak Weather](https://github.com/Niakman13/niak-weather-integration)** : elle lit ses données par le WebSocket local `niak_weather/subscribe`. L'intégration Niak Weather officielle doit rester installée et configurée. Aucune modification du dossier `custom_components` n'est nécessaire.

## 17 formats dans le sélecteur

| Format YAML | Carte |
|---|---|
| `full` | Carte Niak Weather officielle complète, personnalisable, avec Lune facultative |
| `overview` | Synthèse / En ce moment : météo, températures, bulletin et événements |
| `bulletin` | Bulletin du jour |
| `events` | Événements météo |
| `comfort` | Ressenti |
| `extras` | Indicateurs configurables (soleil, UV, lux, humidité, rosée) |
| `rain` | Pluie |
| `wind` | Vent |
| `pressure` | Pression |
| `pollen` | Pollens actuels |
| `hours` | Prévisions des 18 prochaines heures |
| `days` | Prévisions des 7 prochains jours |
| `pollen-forecast` | Prévisions de pollens pour demain |
| `air` | Air extérieur complet, indice et polluants personnalisables |
| `moon` | Lune — phase, illumination, lever/coucher, âge, distance et prochaines phases |
| `sun-home` | Soleil & Ensoleillement : Solar Mask, horaires, durée et variation |
| `radars` | Deux radars de pluie avec URL libres, côte à côte, superposés ou par onglets |

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

### Présentation compacte Soleil + Air / Pollens — 0.2.7-beta.1

La carte **Soleil & Ensoleillement** adopte par défaut un rendu compact de type Pluie / Vent / Pression : petits indicateurs, horaires raccourcis et **graphique Solar Mask conservé** à 220 px de hauteur. En YAML, `sun_compact: false` restaure les grandes dimensions et `sun_diagram_height` règle la hauteur (plafond compact 260 px).

La carte complète Niak Weather propose `full_sun_position: today` pour placer le module Soleil dans la grille native « Aujourd'hui » avec **3 cartes maximum par ligne** à partir de 860 px (2 entre 560 et 859 px, 1 en dessous). La position `after` ou `before` reste possible.

Les panneaux **Air extérieur et Pollens réunis** occupent désormais, dans la carte complète, la largeur d'une seule carte Pluie / Vent / Pression. Chacun conserve son indice, sa source et ses détails repliables, mais leurs jauges et libellés sont réduits. Le réglage `full_compact_air: false` rétablit les deux grands panneaux.

```yaml
type: custom:niak-weather-modular-card
format: full
full_show_sun: true
full_sun_position: today
sun_compact: true
sun_show_diagram: true
sun_diagram_height: 220
full_compact_air: true
```

## Soleil & Ensoleillement et Radars — 0.2.7-beta.1

Ces deux cartes existent **indépendamment** et peuvent être activées comme sections facultatives dans la carte complète `format: full`. Niak Weather continue de produire seul le bulletin du jour, exclusivement à partir des prévisions de son fournisseur.

### Soleil & Ensoleillement

```yaml
type: custom:niak-weather-modular-card
format: sun-home
background_mode: glass
sun_difference_entity: sensor.difference_de_soleil
sun_duration_entity: sensor.sunterrasse_sun_duration
sun_show_times: true
sun_show_diagram: true
# sun_diagram_entity: sensor.votre_zone_solar_diagram
# sun_elevation_entity: sensor.votre_zone_sun_effective_elevation
sun_diagram_height: 320
```

Les heures proviennent des **prochains événements** de `sun.sun` : aube, lever, coucher, crépuscule. Si l'événement est celui de demain, il est indiqué comme tel, pour éviter de prétendre qu'il s'est produit aujourd'hui. La durée d'ensoleillement de la maison provient d'un capteur de zone Solar Mask en **minutes**, sans confusion avec la durée théorique du jour. La carte `custom:solar-mask-card` du projet [38decibel](https://github.com/38decibel/Solar-Mask-Card) est réutilisée **si elle est déjà installée**, ainsi que son intégration Solar Mask.

### Radars de pluie

```yaml
type: custom:niak-weather-modular-card
format: radars
background_mode: transparent
radar_layout: grid   # grid, stack, tabs
radar_height: 420
radar_url_current: ""
radar_url_forecast: ""
```

**Aucune adresse radar n'est préremplie.** Il faut saisir soi-même les deux URL dans l'éditeur ou en YAML. Sans URL, aucune page externe n'est chargée. Les URL doivent commencer par `http://` ou `https://`. Certains fournisseurs empêchent l'intégration iframe ; ce blocage dépend du site, pas de Home Assistant.

### Ajouter les deux sections dans la carte complète

```yaml
type: custom:niak-weather-modular-card
format: full
full_show_sun: true
full_sun_position: after
full_sun_order: "1"
full_show_radars: true
full_radars_position: after
full_radars_order: "2"
full_show_moon: true
full_moon_position: after
full_moon_order: "3"
radar_url_current: ""
radar_url_forecast: ""
```

Les modules supplémentaires sont **désactivés par défaut** afin de préserver les tableaux de bord existants. Leur emplacement et leur ordre peuvent être modifiés dans l'éditeur visuel.

## Carte complète officielle avec options supplémentaires — 0.2.7-beta.1

Le format `full` **embarque directement la carte originale Niak Weather** (`custom:niak-weather-card`) pour conserver son rendu, ses animations, la frise automatique, ses graphiques et ses sections repliables. L'intégration Niak Weather et sa ressource frontend doivent être chargées. Nos réglages n'altèrent pas le dépôt original.

```yaml
type: custom:niak-weather-modular-card
format: full
background_mode: glass     # glass, theme, transparent
show_title: true
show_date: true
show_source: true
full_source_position: header # header, footer
temperature_position: right # left, right
full_clock: none            # none, left, right
full_show_banner: true
show_bulletin: true
show_temp_range: true
show_temp_trend: true
show_animations: true
collapse_today: false
collapse_predictions: false
banner_blocks: [bulletin, events]
today_blocks: [comfort, rain, wind, pressure, extras, air]
forecast_blocks: [hours, days, air]
full_show_moon: false
full_moon_position: after   # after, before
# moon_visual_mode: original
# moon_entity: sensor.votre_phase_lunaire
```

La carte permet de déplacer et masquer les éléments des trois listes dans son **éditeur visuel**. Les options de fond, de source, date et position de la température sont appliquées au rendu original. La Lune est une carte additionnelle, désactivée par défaut, placée avant ou après Niak Weather. Pour l'activer, il faut l'intégration [Lunar Phase](https://github.com/ngocjohn/lunar-phase). Les paramètres `moon_visual_mode`, `moon_image_url`, `moon_entity` et `moon_position` restent disponibles.

Les styles additionnels reposent sur les classes CSS de la version actuelle de Niak Weather. Si la carte officielle change de structure dans une mise à jour future, certaines options visuelles pourront demander une adaptation, sans affecter ses données.

## Carte Air extérieur complète — 0.2.7-beta.1

La carte `format: air` reprend l'indice de qualité de l'air de Niak Weather avec une jauge segmentée colorée (échelle ATMO), le polluant le plus défavorable, la liste des polluants et leurs concentrations lorsqu'elles existent. Les données anciennes et les indices spéciaux (code 7) sont distingués.

```yaml
type: custom:niak-weather-modular-card
format: air
background_mode: glass
show_title: true
show_date: true
show_source: true
air_period: today           # today, tomorrow ou both
air_layout: auto            # auto, grid ou stack
air_order: today-first      # today-first ou tomorrow-first
air_gauge_position: left    # left ou right
air_source_mode: provider   # provider ou custom
# air_source_custom: "Ma source météo"
air_source_position: header # header ou footer
air_show_zone: true
air_show_updated: true
air_show_worse: true
show_chart: true
show_stats: true
show_details: true
air_details_open: false
```

Les réglages sont aussi accessibles dans l'éditeur de carte. `show_date` gère la date de la carte, `air_show_updated` la date de publication des données. Le fond peut être verre dépoli (`glass`), thème HA (`theme`) ou transparent (`transparent`). Les panneaux Aujourd'hui/Demain peuvent être ordonnés, présentés côte à côte ou superposés. Les prévisions de demain ne sont affichées **que si Niak Weather les fournit**.

## Refonte des cartes météo et visuel Lune — version 0.2.3-beta.1

**Nouveau en 0.2.3-beta.1 — dispositions de Synthèse :** `overview_layout: compact` (par défaut, bloc température et bulletin côte à côte) ou `overview_layout: classic` (bloc température aligné à gauche ou à droite, bulletin sur toute la largeur **en dessous**). `temperature_position: left|right` reste indépendant de ce réglage. Les cartes existantes conservent le rendu compact qui était déjà présent.

```yaml
type: custom:niak-weather-modular-card
format: overview
overview_layout: classic
temperature_position: left
show_bulletin: true
```

**Correctif responsive :** de 351 à 630 px, les positions Gauche et Droite restent réellement côte à côte. À 350 px ou moins, les éléments passent sur deux lignes en conservant l'alignement choisi. Le HTML change aussi l'ordre des deux blocs pour éviter un positionnement purement CSS.

Une carte principale **Synthèse / En ce moment** (`format: overview`) fusionne le rendu des deux anciennes cartes. La température actuelle est affichée au dixième, accompagnée des minimales/maximales prévues et de la tendance mesurée en °C/h (uniquement si Niak Weather fournit ces données). Le bulletin du jour est intégré et peut être masqué. La frise Événements est facultative. **Depuis 0.2.3-beta.1**, `temperature_position: left` ou `right` permet de déplacer ensemble le bloc température (valeur, min/max, tendance et source). L'éditeur visuel propose ce même choix. Sur une carte étroite, les sections s'empilent verticalement et le bloc température reste en premier.

```yaml
type: custom:niak-weather-modular-card
format: overview
background_mode: glass
temperature_position: right  # right (défaut) ou left
show_title: true
show_date: true
show_source: true
show_bulletin: true
show_temp_range: true
show_temp_trend: true
show_events: false
```

**Indicateurs :** une seule carte `format: extras` avec sélection des indicateurs par cases à cocher. Les cinq formats unitaires ont disparu du sélecteur. Les anciens YAML `summary`, `current`, `solar`, `uv`, `lux`, `humidity`, `dew` sont automatiquement interprétés comme `overview` ou `extras`, et leurs anciens tags personnalisés restent enregistrés, pour éviter de casser les dashboards existants.

**Lune :** `moon_visual_mode` accepte `original` (photographies du projet ngocjohn, chargées depuis jsDelivr : connexion Internet requise), `generated` (SVG local), `image` (PNG/JPEG/WebP personnalisé), ou `svg` (fichier SVG personnalisé rendu comme une image). `moon_image_url` accepte une URL HTTPS ou locale comme `/local/moon/{index}_moon.svg`. `{index}` (0–30) et `{phase}` permettent un jeu d'images évoluant avec la phase. Si une image ne charge pas, un SVG généré est affiché. Les noms et images du projet original appartiennent à ngocjohn (MIT).

```yaml
type: custom:niak-weather-modular-card
format: moon
background_mode: glass
moon_visual_mode: original
# Option personnalisée :
# moon_visual_mode: svg
# moon_image_url: /local/moon/{index}_moon.svg
```

## Carte Lune indépendante — Lunar Phase

Depuis **0.2.3-beta.1**, le format `moon` ajoute une carte inspirée de la disposition de [Lunar Phase Card](https://github.com/ngocjohn/lunar-phase-card), dans le style de Niak Weather Modular Cards (fonds `glass`, `theme`, `transparent`, grille responsive, thème HA). Par défaut, le visuel utilise les photographies de la carte Lunar Phase originale (chargement en ligne) ; le mode `generated` dessine localement un SVG. Aucun calcul astronomique supplémentaire n'est réalisé.

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

La version **0.2.3-beta.1** ajoute une carte `extras` qui reprend les cinq pastilles de Niak Weather sans conteneur « Aujourd'hui ». Les formats `solar`, `uv`, `lux`, `humidity` et `dew` affichent chaque mesure séparément.

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

Depuis **0.2.3-beta.1**, le format `comfort` reprend l'affichage de Niak Weather : valeur de ressenti, libellé, facteurs, bouton d'information et **jauge colorée de −5 °C à 45 °C** avec les deux repères du thermomètre (lorsque disponible) et du ressenti.

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