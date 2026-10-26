# Niak Weather Modular Cards 🌤️

**Cartes météo indépendantes et personnalisables pour Home Assistant.**

**Version actuelle : 0.2.9-beta.2** (bêta, en cours de tests sur installations réelles).

Projet communautaire **non officiel**. Il complète [Niak Weather de Niakman13](https://github.com/Niakman13/niak-weather-integration), sans remplacer ni modifier son intégration. Les cartes météo lisent ses données locales via le WebSocket `niak_weather/subscribe`.

## Installation HACS

1. Installer et configurer [Niak Weather](https://github.com/Niakman13/niak-weather-integration) (intégration officielle).
2. Dans **HACS → Dépôts personnalisés**, ajouter :
   `https://github.com/Jrmysmallstep/niak-weather-modular-card`
3. Choisir la catégorie **Tableau de bord (Dashboard)**, puis installer **Niak Weather Modular Cards**.
4. Recharger l'interface Home Assistant et, dans un tableau de bord, sélectionner **Ajouter une carte → Niak Modular · …**.

HACS doit normalement ajouter la ressource JavaScript automatiquement. Sinon, dans **Paramètres → Tableaux de bord → Ressources**, ajouter :

```text
/hacsfiles/niak-weather-modular-card/niak-weather-modular-card.js
```

Type : **module JavaScript**. Sans release GitHub publiée, HACS utilise la branche `main`. Pour appliquer une correction de cette branche, utiliser **Retélécharger** dans HACS et recharger le navigateur.

**Installation manuelle :** copier `dist/niak-weather-modular-card.js` vers `/config/www/niak-weather-modular-card.js` et ajouter la ressource `/local/niak-weather-modular-card.js` (module JavaScript).

## Les 17 formats

Toutes les cartes utilisent `type: custom:niak-weather-modular-card` et le paramètre `format`. Un éditeur visuel est disponible.

| Format | Carte |
|---|---|
| `full` | Carte Niak Weather officielle intégrée, avec options de disposition et modules supplémentaires |
| `overview` | Synthèse : météo actuelle, températures, bulletin, événements facultatifs |
| `bulletin` | Bulletin météo |
| `events` | Frise des événements |
| `comfort` | Ressenti et jauge de température |
| `extras` | Mesures complémentaires (soleil, UV, lux, humidité, point de rosée) |
| `rain` | Pluie |
| `wind` | Vent |
| `pressure` | Pression |
| `pollen` | Pollens actuels |
| `hours` | Prévisions 18 heures |
| `days` | Prévisions 7 jours |
| `pollen-forecast` | Prévisions des pollens |
| `air` | Qualité de l'air, indice et polluants |
| `moon` | Lune : phase, illumination et horaires |
| `sun-home` | Soleil & Ensoleillement, avec graphique Solar Mask |
| `radars` | Deux radars de pluie à partir des URL configurées |

Les anciens formats YAML `summary`, `current`, `solar`, `uv`, `lux`, `humidity` et `dew` continuent d'être interprétés pour préserver les tableaux de bord existants ; ils ne figurent plus dans le sélecteur.

## Exemples simples

**Vent, sans source météo :**

```yaml
type: custom:niak-weather-modular-card
format: wind
background_mode: glass
show_source: false
show_chart: true
```

**Synthèse, température à gauche, bulletin dessous :**

```yaml
type: custom:niak-weather-modular-card
format: overview
overview_layout: classic
temperature_position: left
show_bulletin: true
show_temp_range: true
show_temp_trend: true
show_events: false
```

La tendance en °C/h s'affiche uniquement lorsque Niak Weather la fournit. Les dispositions `compact` et `classic` restent disponibles, indépendamment de `temperature_position: left|right`.

**Mesures complémentaires :**

```yaml
type: custom:niak-weather-modular-card
format: extras
background_mode: transparent
extras_blocks: [solar, uv, lux, humidity, dew]
```

## Carte complète et disposition des modules

Le format `full` affiche la **carte originale Niak Weather** et ajoute des réglages visuels sans modifier son dépôt. Le code de la carte officielle doit être chargé par Home Assistant.

```yaml
type: custom:niak-weather-modular-card
format: full
background_mode: glass
show_title: true
show_source: true
show_date: true
temperature_position: right
full_clock: none
show_temp_range: true
show_temp_trend: true
full_air_position: with_comfort
full_compact_air: true
full_air_border: false
full_show_sun: true
full_sun_position: today
sun_compact: true
sun_mask_border: false
full_show_moon: true
full_show_radars: true
full_modules_position: after
full_modules_order: [sun, moon, radars]
radar_layout: tabs
radar_url_current: ""
radar_url_forecast: ""
```

Les modules **Soleil, Lune et Radars** sont désactivés par défaut et s'activent indépendamment. Lorsqu'ils sont placés dans la grille supplémentaire, ils utilisent jusqu'à 3 colonnes sur grand écran, 2 sur tablette et 1 sur téléphone. `full_modules_position` choisit avant/après la carte complète ; `full_modules_order` définit l'ordre. Si Soleil est placé dans la section Aujourd'hui avec `full_sun_position: today`, il rejoint les panneaux météo.

`full_air_position: with_comfort` place Air/Pollens à côté de Ressenti lorsque la largeur le permet. `after_measures` les place après les mesures. `full_compact_air` et `full_air_border` règlent leur compacité et leurs bordures, y compris pour les prévisions du lendemain.

L'éditeur propose aussi l'ordre des blocs de synthèse (`banner_blocks`), des mesures (`today_blocks`) et des prévisions (`forecast_blocks`), le repli des sections, la position des sources et les options d'animation.

## Soleil & Ensoleillement

Nécessite l'[intégration Solar Mask](https://github.com/38decibel/Solar-Mask) et sa [carte Lovelace](https://github.com/38decibel/Solar-Mask-Card). Les capteurs de durée et de différence sont configurables.

```yaml
type: custom:niak-weather-modular-card
format: sun-home
background_mode: glass
sun_difference_entity: sensor.difference_de_soleil
sun_duration_entity: sensor.sunterrasse_sun_duration
sun_show_times: true
sun_show_diagram: true
sun_compact: true
sun_mask_border: false
# sun_diagram_entity: sensor.votre_zone_solar_diagram
# sun_elevation_entity: sensor.votre_zone_sun_effective_elevation
# sun_diagram_height: 240
```

Les prochains événements solaires (aube, lever, coucher, crépuscule) proviennent de `sun.sun`. Le diagramme Solar Mask reste celui de la carte tierce : **titre interne masqué, zone SVG transparente, courbes et légende conservées**. Les deux indicateurs supérieurs sont affichés sans fond coloré ni sous-texte. Le mode compact utilise **240 px** par défaut pour le diagramme (260 px maximum) ; une hauteur personnalisée est prioritaire. `sun_compact: false` active le mode détaillé et `sun_mask_border: true` rétablit l'encadrement interne.

## Radars de pluie

```yaml
type: custom:niak-weather-modular-card
format: radars
background_mode: transparent
radar_layout: stack  # grid, stack ou tabs
radar_height: 420
radar_url_current: ""
radar_url_forecast: ""
```

Les URL sont **facultatives et jamais préremplies**. Elles doivent commencer par `https://` ou `http://`. Les sous-titres au-dessus des images sont supprimés : les indications du radar affiché suffisent. En mode `tabs`, les boutons Actuel / Prévisions restent présents. Certains sites interdisent leur affichage en iframe.

## Air extérieur

```yaml
type: custom:niak-weather-modular-card
format: air
air_period: both                 # today, tomorrow, both
air_layout: auto                 # auto, grid, stack
air_order: today-first
air_gauge_position: left
air_source_mode: provider
air_source_position: header
air_show_zone: true
air_show_updated: true
air_show_worse: true
show_details: true
air_details_open: false
```

L'indice, les polluants et leurs concentrations suivent les données fournies par Niak Weather. La prévision du lendemain n'apparaît que si le fournisseur la transmet. Une source personnalisée est possible avec `air_source_mode: custom` et `air_source_custom`.

## Lune

Pour le format `moon`, installer [Lunar Phase](https://github.com/ngocjohn/lunar-phase) ; cette carte ne dépend pas du WebSocket Niak Weather.

```yaml
type: custom:niak-weather-modular-card
format: moon
moon_position: left               # left ou right
moon_visual_mode: original        # original, generated, image, svg
show_details: true
show_stats: true
# moon_entity: sensor.votre_capteur
# moon_image_url: /local/moon/{index}_moon.svg
```

`original` utilise les photos du projet Lunar Phase Card (chargement en ligne) ; `generated` dessine un SVG local. Les modes `image` et `svg` acceptent une image personnalisée. L'option `moon_southern_hemisphere: true` inverse l'orientation. Une image indisponible bascule vers le dessin SVG.

## Apparence et options communes

| Paramètre | Défaut | Utilisation |
|---|---|---|
| `background_mode` | `glass` | Verre dépoli (`glass`), couleur du thème (`theme`) ou fond transparent (`transparent`) |
| `show_title` | `true` | Afficher le titre |
| `show_source` | `true` | Afficher la source météo |
| `show_date` | `true` | Afficher la date (selon le format) |
| `show_chart` | `true` | Afficher le graphique quand il est disponible |
| `show_stats` | `true` | Afficher les statistiques |
| `show_details` | `true` | Afficher les détails |
| `show_border` | `true` | Afficher la bordure principale quand elle s'applique |
| `show_animations` | `true` | Activer le ciel animé lorsqu'il est disponible |
| `entry_id` | Automatique (un seul lieu) | Sélectionner un lieu Niak Weather précis |

Toutes les options n'ont pas d'effet sur tous les formats ; l'éditeur visuel affiche les réglages adaptés. Les modes `theme` et `transparent` évitent le flou d'arrière-plan sur les appareils modestes.

## Compatibilité et limites

- Les formats météo utilisent la version **1** du contrat de données `niak_weather/subscribe`. Une modification de ce contrat dans l'intégration officielle peut nécessiter une adaptation.
- Les capteurs et prévisions ne sont pas inventés si la source ne fournit aucune donnée.
- La frise d'événements Niak est conservée lorsqu'elle est disponible : son animation continue entre les mises à jour. Sur ordinateur, elle se met en pause au survol.
- Le ciel animé officiel et certains styles de la carte `full` dépendent de la structure frontend de Niak Weather.
- La version actuelle est une **bêta** : les tests automatiques ne remplacent pas les vérifications sur de vrais dashboards, thèmes et appareils.
- Solar Mask, Lunar Phase et les pages des fournisseurs de radar restent des projets tiers : les consulter pour leurs propres exigences et licences.

## Développement

La source éditable est `src/niak-weather-modular-card.js`. Le fichier `dist/niak-weather-modular-card.js` est celui que HACS installe et doit toujours rester synchronisé.

```bash
npm test
npm run build
```

Le projet n'exige aucune dépendance npm. Le code des anciennes versions reste consultable dans l'**historique Git**, sans encombrer la version active.

## Crédits et licence

Intégration et conception d'origine : [Niak Weather par Niakman13](https://github.com/Niakman13/niak-weather-integration) (licence MIT). Ce projet communautaire indépendant reprend des idées, des composants et le flux de données de Niak Weather en conservant les mentions requises. Aucune affiliation officielle n'est revendiquée.

Cartes tierces complémentaires : [Solar Mask Card](https://github.com/38decibel/Solar-Mask-Card) et [Lunar Phase Card](https://github.com/ngocjohn/lunar-phase-card). Voir [LICENSE](LICENSE).
