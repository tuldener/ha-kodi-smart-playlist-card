# Kodi Smart Playlist Card (Home Assistant)

Eine Lovelace-Kachel, die eine oder mehrere Kodi Smart Playlists (`.xsp`) per JSON-RPC startet.

## Features

- Einzelne Playlist (`playlist`) oder mehrere Playlists (`playlists`) in einer Card
- Nutzt Home Assistant Service `kodi.call_method`
- Standardaufruf per `Player.Open` mit Playlist als `item.partymode`
- Frei konfigurierbarer Name und `window`
- `open_mode` pro Playlist waehlt zwischen `partymode` und `file`
- Zwei Zusatz-Icon-Kacheln unter der Playlist-Liste: `Repeat All Ein/Aus` und `Zufaellige Folge Ein/Aus`
- Konfigurierbare `Button Player ID` fuer Repeat/Shuffle (`auto`, `0`, `1`)
- Visueller Lovelace-Editor (GUI) zum Bearbeiten der Card-Konfiguration
- `window`-Auswahl im Editor als Dropdown (`videolibrary`, `musiclibrary`, `videos`)
- Icon-Auswahl pro Playlist im suchbaren Picker
- Optionaler Debug-Modus mit Rueckmeldungsfeld in der Kachel (letzte 5 Aufrufe)

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
open_mode: file
```

## Beispiel 2: Mehrere Playlists in einer Card

```yaml
type: custom:kodi-smart-playlist-card
name: Wohnzimmer Kodi
entity: media_player.kodi_wohnzimmer
playlists:
  - name: Filme
    icon: mdi:movie-open-play
    open_mode: file
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
- Bei `method: GUI.ActivateWindow` fuer `type="mixed"` Playlists meist `window: videos` verwenden.
- Standard-Methode ist `Player.Open`.
- `window` wird nur fuer `GUI.ActivateWindow` benoetigt.
- `open_mode: partymode` zeigt oft nur eine kleine, dynamische Queue.
- `open_mode: file` laedt die komplette Smart Playlist.
- `Repeat All Ein/Aus` nutzt Kodi JSON-RPC `Player.SetRepeat`.
- `Zufaellige Folge Ein/Aus` nutzt Kodi JSON-RPC `Player.SetShuffle`.
- `Button Player ID` steuert optional, ob die Buttons mit festem `playerid` senden.

## Entspricht folgendem JSON-RPC Muster

Die Card ruft standardmäßig sinngemäß Folgendes auf:

```json
{
  "jsonrpc": "2.0",
  "method": "Player.Open",
  "params": {
    "item": {
      "partymode": "special://profile/playlists/video/newmovies.xsp"
    }
  },
  "id": 2
}
```
