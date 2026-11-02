# Niak Weather Add-on 🌤️

**Add-on pour l'intégration [Hestia Weather](https://github.com/Niakman13/niak-weather-integration) (ex-Niak Weather) : Synthèse, Lune, Solar Mask et radars de pluie.**

**Version actuelle : 0.3.0-beta.1** (bêta).

Projet communautaire **non officiel**. Depuis la mise à jour de l'intégration, la carte `hestia-weather-card` affiche elle-même la météo complète (vent, pluie, pression, air, pollens, prévisions…). Ce dépôt ne garde que ce qu'elle ne fait pas :

| Format | Carte | Source des données |
|---|---|---|
| `overview` | **Synthèse** : météo actuelle, min/max, tendance, bulletin, événements facultatifs | Intégration Hestia Weather |
| `moon` | **Lune** : phase, illumination, horaires, prochaines phases | [Lunar Phase](https://github.com/ngocjohn/lunar-phase) |
| `sun-home` | **Soleil & Ensoleillement**, avec graphique **Solar Mask** | Capteurs HA + [Solar Mask](https://github.com/38decibel/Solar-Mask) |
| `radars` | **Radars de pluie** à partir de **liens** (iframe) | Vos URL |

Les couleurs suivent le thème Hestia Weather (`--hestia-*-color`, avec repli sur les anciennes variables `--niak-*-color`).

> **Venez de la version modulaire (0.2.x) ?** Les formats `full`, `bulletin`, `events`, `comfort`, `extras`, `rain`, `wind`, `pressure`, `pollen`, `hours`, `days`, `pollen-forecast` et `air` ne sont plus fournis ici : une carte qui les utilise affiche un message vous renvoyant vers `hestia-weather-card`. Les anciens formats `summary` et `current` sont toujours reconnus (ils deviennent `overview`). L'historique Git conserve l'ancien code.

## Installation HACS

1. Installer et configurer l'intégration **Hestia Weather** (nécessaire seulement pour la Synthèse).
2. Dans **HACS → Dépôts personnalisés**, ajouter `https://github.com/Jrmysmallstep/niak-weather-modular-card`, catégorie **Tableau de bord (Dashboard)**.
3. Installer, recharger l'interface, puis **Ajouter une carte → Niak Weather · …**.

Si la ressource n'est pas ajoutée automatiquement : **Paramètres → Tableaux de bord → Ressources**, `/hacsfiles/niak-weather-modular-card/niak-weather-modular-card.js`, type **module JavaScript**. Sans release GitHub, HACS suit la branche `main` : utiliser **Retélécharger**, puis recharger le navigateur (dans l'appli mobile : Dépannage → Réinitialiser le cache du frontend).

**Installation manuelle :** copier `dist/niak-weather-modular-card.js` dans `/config/www/` et ajouter la ressource `/local/niak-weather-modular-card.js`.

Toutes les cartes utilisent `type: custom:niak-weather-modular-card` et le paramètre `format`. Un éditeur visuel est disponible.

## Synthèse

```yaml
type: custom:niak-weather-modular-card
format: overview
overview_layout: classic        # compact (défaut) ou classic
temperature_position: left      # right (défaut) ou left
show_bulletin: true
show_temp_range: true
show_temp_trend: true
show_events: true
show_animations: true
# entry_id: ...                 # seulement si plusieurs lieux Hestia Weather
```

Le ciel animé (`hestia-weather-sky`) et la frise d'événements (`hestia-frise`) sont repris de l'intégration lorsqu'ils sont chargés ; les anciens éléments `niak-*` restent reconnus. Sans eux, la Synthèse s'affiche sans animation et la liste des événements prend le relais.

## Soleil & Ensoleillement

Nécessite l'[intégration Solar Mask](https://github.com/38decibel/Solar-Mask) et sa [carte](https://github.com/38decibel/Solar-Mask-Card).

```yaml
type: custom:niak-weather-modular-card
format: sun-home
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

Aube, lever, coucher et crépuscule viennent de `sun.sun`. Le diagramme Solar Mask garde ses courbes et sa légende (titre interne masqué, fond transparent). Mode compact : 240 px par défaut (260 px max).

## Lune

```yaml
type: custom:niak-weather-modular-card
format: moon
moon_position: left               # left ou right
moon_visual_mode: original        # original, generated, image, svg
show_details: true
show_stats: true
# moon_entity: sensor.votre_capteur
# moon_image_url: /local/moon/{index}_moon.svg
# moon_southern_hemisphere: true
```

## Radars de pluie (par lien)

```yaml
type: custom:niak-weather-modular-card
format: radars
radar_layout: tabs               # grid, stack ou tabs
radar_height: 420
radar_url_current: "https://…"
radar_url_forecast: "https://…"
```

Aucune URL n'est préremplie ; elles doivent commencer par `https://` ou `http://`. Certains sites interdisent l'affichage en iframe.

## Options communes

| Paramètre | Défaut | Utilisation |
|---|---|---|
| `background_mode` | `glass` | Verre dépoli (`glass`), thème (`theme`) ou transparent (`transparent`) |
| `show_title` / `show_source` / `show_date` | `true` | Titre, source, date |
| `show_border` | `true` | Bordure de la carte |
| `show_chart` / `show_stats` / `show_details` | `true` | Visuel, statistiques, détails (Lune) |

L'éditeur n'affiche que les réglages utiles à chaque carte.

## Développement

Source : `src/niak-weather-modular-card.js` ; `dist/niak-weather-modular-card.js` est celui que HACS installe et doit rester synchronisé.

```bash
npm test
npm run build
```

Aucune dépendance npm.

## Crédits et licence

Conception d'origine : [Niak Weather par Niakman13](https://github.com/Niakman13/niak-weather-integration) (MIT). Projet communautaire indépendant, sans affiliation officielle. Cartes tierces : [Solar Mask Card](https://github.com/38decibel/Solar-Mask-Card), [Lunar Phase Card](https://github.com/ngocjohn/lunar-phase-card). Voir [LICENSE](LICENSE).
