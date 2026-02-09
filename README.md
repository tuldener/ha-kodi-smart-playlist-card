# Kodi Smart Playlist Card (Home Assistant)

Eine Lovelace-Kachel, die eine oder mehrere Kodi Smart Playlists (`.xsp`) per JSON-RPC startet.

## Features

- Einzelne Playlist (`playlist`) oder mehrere Playlists (`playlists`) in einer Card
- Nutzt Home Assistant Service `kodi.call_method`
- Frei konfigurierbarer Name, Icon und JSON-RPC Methode
- Visueller Lovelace-Editor (GUI) zum Bearbeiten der Card-Konfiguration

## Installation

1. Datei `kodi-smart-playlist-card.js` nach `/config/www/kodi-smart-playlist-card.js` kopieren.
2. In Home Assistant unter **Einstellungen -> Dashboards -> Ressourcen** als JavaScript-Modul eintragen:
   - URL: `/local/kodi-smart-playlist-card.js`
   - Typ: `JavaScript Module`

## Beispiel 1: Einzelne Playlist

```yaml
type: custom:kodi-smart-playlist-card
name: Filme
icon: mdi:movie-open-play
entity: media_player.kodi_wohnzimmer
playlist: special://profile/playlists/video/Filme.xsp
method: Player.Open
```

## Beispiel 2: Mehrere Playlists in einer Card

```yaml
type: custom:kodi-smart-playlist-card
name: Wohnzimmer Kodi
entity: media_player.kodi_wohnzimmer
playlists:
  - name: Filme
    icon: mdi:movie-open-play
    playlist: special://profile/playlists/video/Filme.xsp
  - name: Serien
    icon: mdi:television-play
    playlist: special://profile/playlists/video/Serien.xsp
  - name: Musik Favoriten
    icon: mdi:music
    playlist: special://profile/playlists/music/Favoriten.xsp
```

## Hinweise

- `entity` muss eine aktive Kodi-Integration sein (`media_player.*`).
- Für `.xsp` typischerweise Kodi-Pfade nutzen, z. B.:
  - `special://profile/playlists/video/...`
  - `special://profile/playlists/music/...`
- Standard-Methode ist `Player.Open`.
