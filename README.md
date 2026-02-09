# Kodi Smart Playlist Card (Home Assistant)

Eine Lovelace-Kachel, die eine oder mehrere Kodi Smart Playlists (`.xsp`) per JSON-RPC startet.

## Features

- Einzelne Playlist (`playlist`) oder mehrere Playlists (`playlists`) in einer Card
- Nutzt Home Assistant Service `kodi.call_method`
- Standardaufruf per `GUI.ActivateWindow` mit Playlist als `params.parameters[0]`
- Frei konfigurierbarer Name, Icon, JSON-RPC Methode und `window`
- Visueller Lovelace-Editor (GUI) zum Bearbeiten der Card-Konfiguration
- `window`-Auswahl im Editor als Dropdown (`videolibrary`, `musiclibrary`, `videos`)
- Optionaler Debug-Modus mit Rueckmeldungsfeld in der Kachel

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
method: GUI.ActivateWindow
window: videolibrary
```

## Beispiel 2: Mehrere Playlists in einer Card

```yaml
type: custom:kodi-smart-playlist-card
name: Wohnzimmer Kodi
entity: media_player.kodi_wohnzimmer
playlists:
  - name: Filme
    icon: mdi:movie-open-play
    window: videolibrary
    playlist: special://profile/playlists/video/Filme.xsp
  - name: Serien
    icon: mdi:television-play
    window: videolibrary
    playlist: special://profile/playlists/video/Serien.xsp
  - name: Musik Favoriten
    icon: mdi:music
    window: musiclibrary
    playlist: special://profile/playlists/music/Favoriten.xsp
```

## Hinweise

- `entity` muss eine aktive Kodi-Integration sein (`media_player.*`).
- Für `.xsp` typischerweise Kodi-Pfade nutzen, z. B.:
  - `special://profile/playlists/video/...`
  - `special://profile/playlists/music/...`
- Für `type="mixed"` Playlists meist `window: videos` verwenden (nicht `videolibrary`).
- Standard-Methode ist `GUI.ActivateWindow`.
- Standard-Window ist `videolibrary`.

## Entspricht folgendem JSON-RPC Muster

Die Card ruft standardmäßig sinngemäß Folgendes auf:

```json
{
  "jsonrpc": "2.0",
  "method": "GUI.ActivateWindow",
  "params": {
    "window": "videolibrary",
    "parameters": ["special://profile/playlists/video/newmovies.xsp"]
  },
  "id": 2
}
```
