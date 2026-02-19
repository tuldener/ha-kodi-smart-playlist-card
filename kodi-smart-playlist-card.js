class KodiSmartPlaylistCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("kodi-smart-playlist-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:kodi-smart-playlist-card",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "file",
      window: "videolibrary",
      debug: false,
      entity: "",
      playlists: [
        {
          name: "Filme",
          icon: "mdi:playlist-play",
          playlist_type: "video",
          playlist: "playlist.xsp",
          repeat_mode: "off",
          shuffle: false,
        },
      ],
    };
  }

  setConfig(config) {
    const sanitizedConfig = { ...config };
    delete sanitizedConfig.repeat_all;
    delete sanitizedConfig.random_on;
    if (Array.isArray(sanitizedConfig.playlists) && sanitizedConfig.playlists.length > 0) {
      delete sanitizedConfig.open_mode;
      delete sanitizedConfig.window;
    }

    this._config = {
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "file",
      window: "videolibrary",
      debug: false,
      ...sanitizedConfig,
    };
    if (!Array.isArray(this._debugHistory)) {
      this._debugHistory = [];
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this._ensureRefreshTimer();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._ensureRefreshTimer();
    this._render();
  }

  connectedCallback() {
    this._ensureRefreshTimer();
    this._refreshEntityState();
    this._render();
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
  }

  _ensureRefreshTimer() {
    if (this._refreshTimer) {
      return;
    }
    this._refreshTimer = setInterval(async () => {
      if (!this.isConnected) {
        return;
      }
      await this._refreshEntityState();
      this._render();
    }, 30000);
  }

  async _refreshEntityState() {
    if (!this._hass || !this._config || !this._config.entity) {
      return;
    }
    try {
      await this._hass.callService("homeassistant", "update_entity", {
        entity_id: this._config.entity,
      });
    } catch (_err) {
      // Ignore refresh errors; regular hass updates still render the card.
    }
  }

  getCardSize() {
    const count = this._getEntries().length;
    return Math.max(1, count);
  }

  _getEntries() {
    if (!this._config) {
      return [];
    }

    if (Array.isArray(this._config.playlists) && this._config.playlists.length > 0) {
      return this._config.playlists
        .filter(
          function (item) {
            if (!item) {
              return false;
            }
            const playlistType = item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist) || "mixed";
            const openMode = this._normalizeOpenMode(item.open_mode || this._config.open_mode || "file", playlistType);
            if (openMode === "directory") {
              return true;
            }
            if (openMode === "partymode") {
              return playlistType === "music" || playlistType === "video";
            }
            return !!item.playlist;
          }.bind(this)
        )
        .map(
          function (item) {
            const playlistType = item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist) || "mixed";
            const openMode = this._normalizeOpenMode(item.open_mode || this._config.open_mode || "file", playlistType);
            const playlistPath = this._resolvePlaylistPath(item.playlist, playlistType);
            const directoryPath = item.directory || playlistPath || this._getPlaylistBasePath(playlistType);
            return {
              name: item.name || this._extractPlaylistName(item.playlist) || playlistType,
              playlist: playlistPath,
              directory: directoryPath,
              partymode_playlist: item.partymode_playlist || "",
              playlist_type: playlistType,
              icon: item.icon || this._config.icon,
              method: item.method || this._config.method || "Player.Open",
              open_mode: openMode,
              window: item.window || "videolibrary",
              params: item.params,
              repeat_mode: item.repeat_mode || "off",
              shuffle: this._toBool(item.shuffle),
              item_playlistid: item.item_playlistid,
              item_position: item.item_position,
              item_path: item.item_path,
              item_random: item.item_random,
              item_recursive: item.item_recursive,
              item_broadcastid: item.item_broadcastid,
              item_channelid: item.item_channelid,
              item_recordingid: item.item_recordingid,
              options_repeat: item.options_repeat,
              options_resume_mode: item.options_resume_mode,
              options_resume_percent: item.options_resume_percent,
              options_resume_time: item.options_resume_time,
              options_shuffled: item.options_shuffled,
            };
          }.bind(this)
        );
    }

    const fallbackType =
      this._config.playlist_type || this._guessPlaylistTypeFromPath(this._config.playlist) || "mixed";
    return [
      {
        name: this._config.name,
        playlist: this._resolvePlaylistPath(this._config.playlist, fallbackType),
        directory: this._config.directory || this._getPlaylistBasePath(fallbackType),
        partymode_playlist: this._config.partymode_playlist || "",
        playlist_type: fallbackType,
        icon: this._config.icon,
        method: this._config.method || "Player.Open",
        open_mode: this._normalizeOpenMode(this._config.open_mode || "file", fallbackType),
        window: "videolibrary",
        params: this._config.params,
        repeat_mode: this._config.repeat_mode || "off",
        shuffle: this._toBool(this._config.shuffle),
        item_playlistid: this._config.item_playlistid,
        item_position: this._config.item_position,
        item_path: this._config.item_path,
        item_random: this._config.item_random,
        item_recursive: this._config.item_recursive,
        item_broadcastid: this._config.item_broadcastid,
        item_channelid: this._config.item_channelid,
        item_recordingid: this._config.item_recordingid,
        options_repeat: this._config.options_repeat,
        options_resume_mode: this._config.options_resume_mode,
        options_resume_percent: this._config.options_resume_percent,
        options_resume_time: this._config.options_resume_time,
        options_shuffled: this._config.options_shuffled,
      },
    ];
  }

  _render() {
    if (!this.shadowRoot || !this._config) {
      return;
    }

    const stateObj = this._hass && this._hass.states && this._hass.states[this._config.entity];
    const disabled = !this._hass || !stateObj;
    const entries = this._getEntries();
    const hasEntity = !!this._config.entity;
    const hasEntries = entries.length > 0;
    const entityTitle =
      (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || this._config.name || "Kodi";
    const mediaTitle = this._getNowPlayingTitle(stateObj);

    const rows = entries
      .map(
        function (entry, index) {
          return `
          <button class="playlist-row" data-index="${index}" ${disabled ? "disabled" : ""}>
            <ha-icon icon="${this._escape(entry.icon)}"></ha-icon>
            <div class="row-text">
              <div class="row-title">${this._escape(entry.name)}</div>
            </div>
          </button>
        `;
        }.bind(this)
      )
      .join("");

    const debugEntries = this._debugHistory && this._debugHistory.length > 0 ? this._debugHistory : [];
    const debugItems = debugEntries
      .map(
        function (entry, index) {
          const nr = debugEntries.length - index;
          const open = index === 0 ? "open" : "";
          return `<details class="debug-entry" ${open}>
            <summary>Eintrag ${nr}</summary>
            <pre>${this._escape(entry)}</pre>
          </details>`;
        }.bind(this)
      )
      .join("");
    const debugBlock =
      this._config.debug
        ? `<div class="debug">
            <div class="debug-title">Debug Rueckmeldungen (letzte 5)</div>
            ${debugItems || "<pre>Noch keine Rueckmeldung.</pre>"}
          </div>`
        : "";

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="header-media-bg"></div>
          <div class="media-text">
            <div class="entity-title">${this._escape(entityTitle)}</div>
            <div class="now-title">${this._escape(mediaTitle)}</div>
          </div>
          <div class="header-actions">
            <button class="system-btn" data-system-method="System.Reboot" title="System Reboot" ${
              disabled ? "disabled" : ""
            }>
              <ha-icon icon="mdi:restart"></ha-icon>
            </button>
            <button class="system-btn" data-system-method="System.Shutdown" title="System Shutdown" ${
              disabled ? "disabled" : ""
            }>
              <ha-icon icon="mdi:power"></ha-icon>
            </button>
          </div>
        </div>
        <div class="list">${rows}</div>
        ${!hasEntity ? '<div class="hint">Bitte im Editor eine Kodi-Entity auswaehlen.</div>' : ""}
        ${!hasEntries ? '<div class="hint">Bitte mindestens eine Playlist konfigurieren.</div>' : ""}
        ${debugBlock}
      </ha-card>
      <style>
        :host { display: block; }
        ha-card { overflow: hidden; }

        .header {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          min-height: 96px;
          border-bottom: 1px solid var(--divider-color);
          overflow: hidden;
        }

        .header-media-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image: linear-gradient(
            110deg,
            color-mix(in srgb, var(--card-background-color) 95%, black 5%) 0%,
            color-mix(in srgb, var(--card-background-color) 85%, black 15%) 55%,
            color-mix(in srgb, var(--card-background-color) 70%, black 30%) 100%
          );
          background-size: cover;
          background-position: center;
          filter: saturate(1.02);
        }

        .media-text {
          position: relative;
          z-index: 1;
          min-width: 0;
        }

        .entity-title {
          font-size: 0.9rem;
          color: color-mix(in srgb, var(--primary-text-color) 90%, white 10%);
          line-height: 1.2;
        }

        .now-title {
          margin-top: 6px;
          font-weight: 600;
          font-size: 1.25rem;
          color: var(--primary-text-color);
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
        }

        .header-actions {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .system-btn {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--divider-color) 70%, white 30%);
          background: color-mix(in srgb, var(--card-background-color) 78%, black 22%);
          color: var(--primary-text-color);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }

        .system-btn ha-icon {
          --mdc-icon-size: 20px;
        }

        .system-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .system-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--card-background-color) 65%, black 35%);
        }

        .list {
          display: grid;
          grid-template-columns: 1fr;
        }

        .playlist-row {
          width: 100%;
          border: 0;
          border-bottom: 1px solid var(--divider-color);
          background: none;
          color: var(--primary-text-color);
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          text-align: left;
        }

        .playlist-row:last-child { border-bottom: 0; }
        .playlist-row:disabled { cursor: not-allowed; opacity: 0.6; }

        ha-icon {
          color: var(--primary-color);
          --mdc-icon-size: 22px;
        }

        .row-title {
          font-weight: 500;
          line-height: 1.2;
        }

        .hint {
          border-top: 1px solid var(--divider-color);
          padding: 10px 16px;
          color: var(--secondary-text-color);
          font-size: 0.8rem;
        }

        .debug {
          border-top: 1px solid var(--divider-color);
          padding: 10px 16px;
        }

        .debug-title {
          font-size: 0.8rem;
          color: var(--secondary-text-color);
          margin-bottom: 6px;
        }

        .debug pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.75rem;
          line-height: 1.3;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .debug-entry {
          margin-top: 6px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          padding: 4px 8px;
        }

        .debug-entry summary {
          cursor: pointer;
          font-size: 0.78rem;
          color: var(--secondary-text-color);
          margin: 2px 0;
        }
      </style>
    `;

    const buttons = this.shadowRoot.querySelectorAll("button.playlist-row");
    for (let i = 0; i < buttons.length; i += 1) {
      const button = buttons[i];
      button.addEventListener("click", () => this._handleTap(i));
    }

    const actionButtons = this.shadowRoot.querySelectorAll("button.system-btn");
    for (let i = 0; i < actionButtons.length; i += 1) {
      const button = actionButtons[i];
      const method = button.getAttribute("data-system-method");
      button.addEventListener("click", () => this._handleSystemAction(method));
    }

    this._setHeaderBackground(stateObj);
  }

  async _handleTap(index) {
    const config = this._config;
    if (!this._hass || !config) {
      return;
    }
    if (!config.entity) {
      this._showToast("Bitte zuerst eine Kodi-Entity konfigurieren.");
      return;
    }

    const entries = this._getEntries();
    const entry = entries[index];
    if (!entry) {
      return;
    }
    let serviceData = null;

    try {
      const method = entry.method || "Player.Open";
      const openMode = this._normalizeOpenMode(entry.open_mode || "file", entry.playlist_type);
      serviceData = {
        entity_id: config.entity,
        method: "Player.Open",
      };

      // Home Assistant kodi.call_method expects method parameters as top-level fields.
      if (entry.params && typeof entry.params === "object" && !Array.isArray(entry.params)) {
        Object.assign(serviceData, entry.params);
      } else if (openMode === "directory") {
        const directoryTarget = String(entry.directory || this._getPlaylistBasePath(entry.playlist_type)).trim();
        if (directoryTarget.toLowerCase().endsWith(".xsp")) {
          // Kodi must open .xsp as file; opening it as directory just lists the .xsp itself.
          serviceData.item = { file: directoryTarget };
        } else {
          serviceData.item = { directory: directoryTarget };
        }
      } else if (openMode === "partymode") {
        const explicitPartyPlaylist = String(entry.partymode_playlist || "").trim();
        const defaultPartyPlaylist = this._getDefaultPartyModePlaylistPath(entry.playlist_type);
        const useDynamicPartyMode =
          !explicitPartyPlaylist || explicitPartyPlaylist.toLowerCase() === defaultPartyPlaylist.toLowerCase();
        serviceData.item = {
          partymode: !useDynamicPartyMode
            ? this._resolvePlaylistPath(explicitPartyPlaylist, entry.playlist_type)
            : this._getPartyModeTarget(entry.playlist_type),
        };
      } else if (method === "Player.Open") {
        serviceData.item = { file: entry.playlist };
      } else {
        serviceData.item = { file: entry.playlist };
      }

      const builtItem = this._buildExtendedPlayerOpenItem(entry);
      if (builtItem) {
        serviceData.item = builtItem;
      }
      const builtOptions = this._buildPlayerOpenOptions(entry);
      if (builtOptions) {
        serviceData.options = builtOptions;
      }
      this._stripInlineRepeatShuffleOptions(serviceData);

      const response = await this._hass.callService("kodi", "call_method", serviceData);
      await this._applyPostPlayCommands(config.entity, entry);
      if (config.debug) {
        this._pushDebug(this._formatDebug("success", serviceData, response));
      }

      this._showToast("Playlist gestartet: " + entry.name);
      this._render();
    } catch (err) {
      const message = (err && err.message) || "Unbekannter Fehler";
      if (config.debug) {
        this._pushDebug(this._formatDebug("error", serviceData, null, err));
      }
      this._showToast("Fehler: " + message);
      this._render();
    }
  }

  async _handleSystemAction(method) {
    if (!this._hass || !this._config || !this._config.entity || !method) {
      this._showToast("Bitte zuerst eine Kodi-Entity konfigurieren.");
      return;
    }

    const serviceData = {
      entity_id: this._config.entity,
      method: method,
    };

    try {
      const response = await this._hass.callService("kodi", "call_method", serviceData);
      if (this._config.debug) {
        this._pushDebug(this._formatDebug("success", serviceData, response));
      }
      if (method === "System.Shutdown") {
        this._showToast("System.Shutdown gesendet.");
      } else {
        this._showToast("System.Reboot gesendet.");
      }
    } catch (err) {
      if (this._config.debug) {
        this._pushDebug(this._formatDebug("error", serviceData, null, err));
      }
      const message = (err && err.message) || "Unbekannter Fehler";
      this._showToast("Fehler: " + message);
    }
  }

  async _applyPostPlayCommands(entityId, entry) {
    const commands = [];
    const explicitRepeat = String((entry && entry.options_repeat) || "").trim();
    const repeatMode = explicitRepeat || String((entry && entry.repeat_mode) || "off").trim();
    const explicitShuffled = this._toOptionalBool(entry && entry.options_shuffled);
    const shuffleEnabled = explicitShuffled !== null ? explicitShuffled : this._toBool(entry && entry.shuffle);
    const playerIds = this._getCandidatePlayerIds(entry);

    if (repeatMode === "all" || repeatMode === "one" || repeatMode === "off") {
      commands.push({ method: "Player.SetRepeat", key: "repeat", value: repeatMode });
    }
    commands.push({ method: "Player.SetShuffle", key: "shuffle", value: shuffleEnabled });

    // Wait briefly after Player.Open so Kodi has an active player to target.
    await this._sleep(700);

    for (let i = 0; i < commands.length; i += 1) {
      const command = commands[i];
      let applied = false;
      let lastError = null;
      for (let attempt = 0; attempt < 3 && !applied; attempt += 1) {
        for (let p = 0; p < playerIds.length; p += 1) {
          const request = {
            entity_id: entityId,
            method: command.method,
            playerid: playerIds[p],
            [command.key]: command.value,
          };
          try {
            const response = await this._hass.callService("kodi", "call_method", request);
            if (this._config && this._config.debug) {
              this._pushDebug(this._formatDebug("success", request, response));
            }
            applied = true;
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!applied) {
          await this._sleep(450);
        }
      }

      if (!applied && this._config && this._config.debug) {
        const failedRequest = {
          entity_id: entityId,
          method: command.method,
          playerid: playerIds.join(","),
          [command.key]: command.value,
        };
        this._pushDebug(this._formatDebug("error", failedRequest, null, lastError || "No active player found"));
      }
    }
  }

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
      detail: { message: message },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  _getNowPlayingTitle(stateObj) {
    if (!stateObj || !stateObj.attributes) {
      return "Keine Wiedergabe";
    }
    const mediaTitle = stateObj.attributes.media_title;
    const mediaArtist = stateObj.attributes.media_artist;
    if (mediaTitle && mediaArtist) {
      return mediaArtist + " - " + mediaTitle;
    }
    if (mediaTitle) {
      return mediaTitle;
    }
    return "Keine Wiedergabe";
  }

  _setHeaderBackground(stateObj) {
    const bg = this.shadowRoot && this.shadowRoot.querySelector(".header-media-bg");
    if (!bg) {
      return;
    }
    const artwork = this._getArtworkUrl(stateObj);
    if (!artwork) {
      return;
    }
    const refreshedArtwork = this._withCacheBust(artwork);
    const safeArtwork = String(refreshedArtwork).replace(/"/g, "%22");
    bg.style.backgroundImage =
      'linear-gradient(100deg, rgba(17, 16, 12, 0.84) 0%, rgba(17, 16, 12, 0.70) 52%, rgba(17, 16, 12, 0.48) 100%), url("' +
      safeArtwork +
      '")';
  }

  _getArtworkUrl(stateObj) {
    if (!stateObj || !stateObj.attributes) {
      return "";
    }
    let artwork =
      stateObj.attributes.entity_picture ||
      stateObj.attributes.media_image_url ||
      stateObj.attributes.media_image ||
      "";
    if (!artwork) {
      return "";
    }
    if (typeof this._hass === "object" && typeof this._hass.hassUrl === "function" && artwork.startsWith("/")) {
      artwork = this._hass.hassUrl(artwork);
    }
    return artwork;
  }

  _withCacheBust(url) {
    if (!url) {
      return "";
    }
    const stamp = Math.floor(Date.now() / 10000);
    const separator = String(url).indexOf("?") === -1 ? "?" : "&";
    return String(url) + separator + "cb=" + stamp;
  }

  _escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _guessWindow(playlist) {
    const path = String(playlist || "").toLowerCase();
    if (path.indexOf("/playlists/music/") !== -1) {
      return "musiclibrary";
    }
    if (path.indexOf("/playlists/mixed/") !== -1) {
      return "videos";
    }
    return "videolibrary";
  }

  _getPlaylistBasePath(playlistType) {
    if (playlistType === "music") {
      return "special://profile/playlists/music/";
    }
    if (playlistType === "video") {
      return "special://profile/playlists/video/";
    }
    return "special://profile/playlists/mixed/";
  }

  _getDefaultPartyModePlaylistPath(playlistType) {
    if (playlistType === "music") {
      return "special://profile/playlists/music/Music.xsp";
    }
    return "special://profile/playlists/video/Video.xsp";
  }

  _resolvePlaylistPath(playlist, playlistType) {
    const value = String(playlist || "").trim();
    if (!value) {
      return "";
    }
    if (value.indexOf("://") !== -1 || value.indexOf("/") !== -1) {
      return value;
    }
    return this._getPlaylistBasePath(playlistType) + value;
  }

  _guessPlaylistTypeFromPath(playlistPath) {
    const path = String(playlistPath || "").toLowerCase();
    if (path.indexOf("/playlists/music/") !== -1) {
      return "music";
    }
    if (path.indexOf("/playlists/video/") !== -1) {
      return "video";
    }
    return "mixed";
  }

  _getWindowForPlaylistType(playlistType) {
    if (playlistType === "music") {
      return "musiclibrary";
    }
    return "videolibrary";
  }

  _toBool(value) {
    return value === true || value === "true";
  }

  _toOptionalBool(value) {
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    return null;
  }

  _toNumberOrNull(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _normalizeOpenMode(openMode, playlistType) {
    const mode = String(openMode || "file");
    if (mode === "directory") {
      return "directory";
    }
    if (mode === "partymode" && (playlistType === "music" || playlistType === "video")) {
      return "partymode";
    }
    return "file";
  }

  _getPartyModeTarget(playlistType) {
    return playlistType === "music" ? "music" : "video";
  }

  _buildExtendedPlayerOpenItem(entry) {
    if (!entry) {
      return null;
    }
    const playlistId = this._toNumberOrNull(entry.item_playlistid);
    if (playlistId !== null) {
      const position = this._toNumberOrNull(entry.item_position);
      return position === null ? { playlistid: playlistId } : { playlistid: playlistId, position: position };
    }
    const path = String(entry.item_path || "").trim();
    if (path) {
      const item = { path: path };
      const randomVal = this._toOptionalBool(entry.item_random);
      const recursiveVal = this._toOptionalBool(entry.item_recursive);
      if (randomVal !== null) {
        item.random = randomVal;
      }
      if (recursiveVal !== null) {
        item.recursive = recursiveVal;
      }
      return item;
    }
    const broadcastId = this._toNumberOrNull(entry.item_broadcastid);
    if (broadcastId !== null) {
      return { broadcastid: broadcastId };
    }
    const channelId = this._toNumberOrNull(entry.item_channelid);
    if (channelId !== null) {
      return { channelid: channelId };
    }
    const recordingId = this._toNumberOrNull(entry.item_recordingid);
    if (recordingId !== null) {
      return { recordingid: recordingId };
    }
    return null;
  }

  _buildPlayerOpenOptions(entry) {
    if (!entry) {
      return null;
    }
    const options = {};

    const resumeMode = String(entry.options_resume_mode || "").trim();
    if (resumeMode === "true") {
      options.resume = true;
    } else if (resumeMode === "false") {
      options.resume = false;
    } else if (resumeMode === "percent") {
      const pct = this._toNumberOrNull(entry.options_resume_percent);
      if (pct !== null) {
        options.resume = pct;
      }
    } else if (resumeMode === "time") {
      const t = this._parseResumeTime(entry.options_resume_time);
      if (t) {
        options.resume = t;
      }
    }

    return Object.keys(options).length > 0 ? options : null;
  }

  _stripInlineRepeatShuffleOptions(serviceData) {
    if (!serviceData || !serviceData.options || typeof serviceData.options !== "object") {
      return;
    }
    delete serviceData.options.repeat;
    delete serviceData.options.shuffled;
    if (Object.keys(serviceData.options).length === 0) {
      delete serviceData.options;
    }
  }

  _parseResumeTime(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return null;
    }
    const parts = raw.split(":");
    if (parts.length !== 3) {
      return null;
    }
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) {
      return null;
    }
    return { hours: h, minutes: m, seconds: s, milliseconds: 0 };
  }

  _extractPlaylistName(playlistPath) {
    const value = String(playlistPath || "").trim();
    if (!value) {
      return "";
    }
    const lastSlash = value.lastIndexOf("/");
    return lastSlash >= 0 ? value.slice(lastSlash + 1) : value;
  }

  _getCandidatePlayerIds(entry) {
    const type = (entry && entry.playlist_type) || "mixed";
    if (type === "music") {
      return [0, 1];
    }
    return [1, 0];
  }

  _sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  _formatDebug(status, requestPayload, responsePayload, err) {
    const parts = [];
    parts.push("status: " + status);
    parts.push("time: " + new Date().toISOString());
    if (requestPayload) {
      parts.push("request:");
      parts.push(this._toJsonString(requestPayload));
    }
    if (responsePayload !== undefined) {
      parts.push("response:");
      parts.push(this._toJsonString(responsePayload));
    }
    if (err) {
      parts.push("error:");
      parts.push((err && err.message) || String(err));
    }
    return parts.join("\n");
  }

  _toJsonString(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch (_error) {
      return String(value);
    }
  }

  _pushDebug(entryText) {
    if (!Array.isArray(this._debugHistory)) {
      this._debugHistory = [];
    }
    this._debugHistory.unshift(String(entryText));
    if (this._debugHistory.length > 5) {
      this._debugHistory = this._debugHistory.slice(0, 5);
    }
  }
}

class KodiSmartPlaylistCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this._config = {
      type: "custom:kodi-smart-playlist-card",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "file",
      window: "videolibrary",
      debug: false,
      entity: "",
      ...config,
    };

    if (!Array.isArray(this._config.playlists) || this._config.playlists.length === 0) {
      if (this._config.playlist) {
        this._config.playlists = [
          {
            name: "Playlist",
            icon: this._config.icon || "mdi:playlist-play",
            open_mode: this._normalizeOpenMode(this._config.open_mode || "file", this._config.playlist_type || "mixed"),
            playlist_type: this._guessPlaylistTypeFromPath(this._config.playlist),
            playlist:
              this._config.playlist || this._getPlaylistBasePath(this._guessPlaylistTypeFromPath(this._config.playlist)),
            directory:
              this._getPlaylistBasePath(this._guessPlaylistTypeFromPath(this._config.playlist) || "mixed"),
            repeat_mode: "off",
            shuffle: false,
          },
        ];
      } else {
        this._config.playlists = [
          {
            name: "Neue Playlist",
            icon: this._config.icon || "mdi:playlist-play",
            open_mode: "file",
            playlist_type: "mixed",
            playlist: this._getPlaylistBasePath("mixed"),
            directory: this._getPlaylistBasePath("mixed"),
            repeat_mode: "off",
            shuffle: false,
          },
        ];
      }
    }
    this._config.playlists = (this._config.playlists || []).map((item) => ({
      ...item,
      playlist_type: item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist),
      playlist: item.playlist || this._getPlaylistBasePath(item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist)),
      directory: item.directory || this._getPlaylistBasePath(item.playlist_type || "mixed"),
      open_mode: this._normalizeOpenMode(item.open_mode || this._config.open_mode || "file", item.playlist_type),
      partymode_playlist: item.partymode_playlist || "",
      repeat_mode: item.repeat_mode || "off",
      shuffle: this._toBool(item.shuffle),
    }));
    delete this._config.repeat_all;
    delete this._config.random_on;

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.shadowRoot || !this.shadowRoot.innerHTML) {
      this._render();
      return;
    }
    this._syncIconPickersHass();
  }

  _emitConfig(config) {
    const normalized = this._normalizeConfigForSave(config);
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: normalized },
        bubbles: true,
        composed: true,
      })
    );
  }

  _normalizeConfigForSave(config) {
    const normalized = { ...config };
    delete normalized.name;
    delete normalized.repeat_all;
    delete normalized.random_on;

    if (Array.isArray(normalized.playlists) && normalized.playlists.length > 0) {
      normalized.playlists = normalized.playlists.map((item) => ({
        ...item,
        playlist_type: item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist),
        playlist: item.playlist || this._getPlaylistBasePath(item.playlist_type || this._guessPlaylistTypeFromPath(item.playlist)),
        directory: item.directory || this._getPlaylistBasePath(item.playlist_type || "mixed"),
        open_mode: this._normalizeOpenMode(item.open_mode || normalized.open_mode || "file", item.playlist_type),
        partymode_playlist: item.partymode_playlist || "",
        repeat_mode: item.repeat_mode || "off",
        shuffle: this._toBool(item.shuffle),
      }));
      delete normalized.open_mode;
      delete normalized.window;
    }

    return normalized;
  }

  _updateRootField(field, value) {
    let normalizedValue = value;
    if (field === "debug") {
      normalizedValue = value === "true";
    }
    const next = { ...this._config, [field]: normalizedValue };
    delete next.playlist;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _updatePlaylistField(index, field, value) {
    const playlists = (this._config.playlists || []).map(function (item) {
      return { ...item };
    });
    if (!playlists[index]) {
      return;
    }

    if (field === "shuffle") {
      playlists[index][field] = value === "true";
    } else if (field === "playlist_type") {
      playlists[index][field] = value;
      playlists[index].directory = this._getPlaylistBasePath(value);
      playlists[index].open_mode = this._normalizeOpenMode(playlists[index].open_mode || "file", value);
    } else if (field === "open_mode") {
      playlists[index][field] = this._normalizeOpenMode(value, playlists[index].playlist_type || "mixed");
    } else {
      playlists[index][field] = value;
    }

    const next = {
      ...this._config,
      playlists: playlists,
    };
    delete next.playlist;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _addPlaylist() {
    const playlists = (this._config.playlists || []).concat([
      {
        name: "Neue Playlist",
        icon: this._config.icon || "mdi:playlist-play",
        open_mode: this._normalizeOpenMode(this._config.open_mode || "file", "mixed"),
        playlist_type: "mixed",
        playlist: this._getPlaylistBasePath("mixed"),
        directory: this._getPlaylistBasePath("mixed"),
        repeat_mode: "off",
        shuffle: false,
      },
    ]);

    const next = {
      ...this._config,
      playlists: playlists,
    };
    delete next.playlist;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _removePlaylist(index) {
    const playlists = (this._config.playlists || []).filter(function (_item, i) {
      return i !== index;
    });

    if (playlists.length === 0) {
      playlists.push({
        name: "Neue Playlist",
        icon: this._config.icon || "mdi:playlist-play",
        open_mode: this._normalizeOpenMode(this._config.open_mode || "file", "mixed"),
        playlist_type: "mixed",
        playlist: this._getPlaylistBasePath("mixed"),
        directory: this._getPlaylistBasePath("mixed"),
        repeat_mode: "off",
        shuffle: false,
      });
    }

    const next = {
      ...this._config,
      playlists: playlists,
    };
    delete next.playlist;
    this._config = next;
    this._emitConfig(next);
    this._render();
  }

  _render() {
    if (!this.shadowRoot) {
      return;
    }

    const playlists = this._config.playlists || [];
    const kodiEntities = this._getKodiEntities();
    const hasCurrentEntity = !!this._config.entity;
    const knownEntity = kodiEntities.some(
      function (item) {
        return item.entity_id === this._config.entity;
      }.bind(this)
    );
    const entityOptions = []
      .concat(
        hasCurrentEntity && !knownEntity
          ? [
              {
                entity_id: this._config.entity,
                name: this._config.entity + " (manuell)",
              },
            ]
          : []
      )
      .concat(kodiEntities)
      .map(
        function (item) {
          const selected = item.entity_id === this._config.entity ? "selected" : "";
          return `<option value="${this._escapeAttr(item.entity_id)}" ${selected}>${this._escape(
            item.name
          )} (${this._escape(item.entity_id)})</option>`;
        }.bind(this)
      )
      .join("");

    const playlistRows = playlists
      .map(
        function (item, index) {
          const playlistType = item.playlist_type || "mixed";
          const openMode = this._normalizeOpenMode(item.open_mode || this._config.open_mode || "file", playlistType);
          const showFile = openMode === "file";
          const showDirectory = openMode === "directory";
          const showPartyFile = openMode === "partymode";
          const showRepeatShuffle = openMode !== "partymode";
          const resumeMode = String(item.options_resume_mode || "none");
          const showResumePercent = resumeMode === "percent";
          const showResumeTime = resumeMode === "time";
          return `
            <div class="playlist-item" data-index="${index}">
              <div class="row-head">
                <div class="row-label">Playlist ${index + 1}</div>
                <button class="danger" type="button" data-action="remove" data-index="${index}">Entfernen</button>
              </div>
              <label>Name</label>
              <input data-field="name" data-index="${index}" type="text" value="${this._escapeAttr(item.name || "")}" />

              <label>Icon</label>
              <ha-icon-picker
                data-field="icon"
                data-index="${index}"
                value="${this._escapeAttr(item.icon || this._config.icon || "mdi:playlist-play")}"
              ></ha-icon-picker>

              <label>Kategorie</label>
              <select data-field="playlist_type" data-index="${index}">
                ${this._getPlaylistTypeOptions(item.playlist_type || "mixed")}
              </select>

              <label>Open Mode</label>
              <select data-field="open_mode" data-index="${index}">
                ${this._getOpenModeOptions(openMode, playlistType)}
              </select>

              ${
                showFile
                  ? `<label>Playlist-Datei (.xsp)</label>
              <input
                data-field="playlist"
                data-index="${index}"
                type="text"
                placeholder="${this._escapeAttr(this._getPlaylistBasePath(playlistType))}"
                value="${this._escapeAttr(item.playlist || this._getPlaylistBasePath(playlistType))}"
              />`
                  : ""
              }

              ${
                showDirectory
                  ? `<label>Directory-Pfad</label>
              <input
                data-field="directory"
                data-index="${index}"
                type="text"
                placeholder="${this._escapeAttr(this._getPlaylistBasePath(playlistType))}"
                value="${this._escapeAttr(item.directory || this._getPlaylistBasePath(playlistType))}"
              />`
                  : ""
              }

              ${
                showPartyFile
                  ? `<label>Partymode Playlist (.xsp, optional)</label>
              <input
                data-field="partymode_playlist"
                data-index="${index}"
                type="text"
                placeholder="${this._escapeAttr(this._getDefaultPartyModePlaylistPath(playlistType))}"
                value="${this._escapeAttr(item.partymode_playlist || "")}"
              />`
                  : ""
              }

              ${
                showRepeatShuffle
                  ? `<label>Repeat</label>
              <select data-field="repeat_mode" data-index="${index}">
                ${this._getRepeatModeOptions(item.repeat_mode || "off")}
              </select>

              <label>Shuffle</label>
              <select data-field="shuffle" data-index="${index}">
                ${this._getBooleanOptions(this._toBool(item.shuffle))}
              </select>`
                  : ""
              }

              <label>Option repeat (optional)</label>
              <select data-field="options_repeat" data-index="${index}">
                ${this._getOptionsRepeatOptions(item.options_repeat || "")}
              </select>

              <label>Option shuffled (optional)</label>
              <select data-field="options_shuffled" data-index="${index}">
                ${this._getNullableBooleanOptions(item.options_shuffled)}
              </select>

              <label>Option resume</label>
              <select data-field="options_resume_mode" data-index="${index}">
                ${this._getResumeModeOptions(item.options_resume_mode || "none")}
              </select>

              ${
                showResumePercent
                  ? `<label>Resume Prozent</label>
              <input
                data-field="options_resume_percent"
                data-index="${index}"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="z. B. 12.5"
                value="${this._escapeAttr(item.options_resume_percent || "")}"
              />`
                  : ""
              }

              ${
                showResumeTime
                  ? `<label>Resume Zeit (HH:MM:SS)</label>
              <input
                data-field="options_resume_time"
                data-index="${index}"
                type="text"
                placeholder="00:10:00"
                value="${this._escapeAttr(item.options_resume_time || "")}"
              />`
                  : ""
              }
            </div>
          `;
        }.bind(this)
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <div class="editor">
        <label>Kodi Entity (media_player...)</label>
        <select data-root="entity">
          <option value="" ${!this._config.entity ? "selected" : ""}>Bitte waehlen...</option>
          ${entityOptions}
        </select>

        <label>Debug</label>
        <select data-root="debug">
          <option value="false" ${this._config.debug ? "" : "selected"}>Aus</option>
          <option value="true" ${this._config.debug ? "selected" : ""}>Ein</option>
        </select>

        <div class="section-head">
          <div>Playlists</div>
          <button id="add" type="button">+ Playlist</button>
        </div>

        ${playlistRows}
      </div>

      <style>
        :host {
          display: block;
        }

        .editor {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 8px 0;
        }

        .section-head,
        .row-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-head {
          margin-top: 8px;
          font-weight: 600;
        }

        .playlist-item {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 10px;
          display: grid;
          gap: 6px;
        }

        .row-label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        label {
          color: var(--secondary-text-color);
          font-size: 0.82rem;
        }

        input {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }

        select {
          width: 100%;
          box-sizing: border-box;
          padding: 8px 10px;
          border: 1px solid var(--divider-color);
          border-radius: 6px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font: inherit;
        }

        ha-icon-picker {
          width: 100%;
        }

        button {
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font: inherit;
          font-size: 0.82rem;
        }

        button.danger {
          color: var(--error-color);
        }
      </style>
    `;

    const rootInputs = this.shadowRoot.querySelectorAll("input[data-root]");
    for (let i = 0; i < rootInputs.length; i += 1) {
      const input = rootInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-root");
        this._updateRootField(field, input.value);
      });
    }
    const rootSelects = this.shadowRoot.querySelectorAll("select[data-root]");
    for (let i = 0; i < rootSelects.length; i += 1) {
      const select = rootSelects[i];
      select.addEventListener("change", () => {
        const field = select.getAttribute("data-root");
        this._updateRootField(field, select.value);
      });
    }

    const playlistInputs = this.shadowRoot.querySelectorAll("input[data-field]");
    for (let i = 0; i < playlistInputs.length; i += 1) {
      const input = playlistInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-field");
        const index = Number(input.getAttribute("data-index"));
        this._updatePlaylistField(index, field, input.value);
      });
    }
    const playlistIconPickers = this.shadowRoot.querySelectorAll("ha-icon-picker[data-field='icon']");
    for (let i = 0; i < playlistIconPickers.length; i += 1) {
      const picker = playlistIconPickers[i];
      picker.addEventListener("value-changed", (event) => {
        const index = Number(picker.getAttribute("data-index"));
        const value =
          event &&
          event.detail &&
          typeof event.detail.value === "string"
            ? event.detail.value
            : "";
        this._updatePlaylistField(index, "icon", value);
      });
    }
    const playlistSelects = this.shadowRoot.querySelectorAll("select[data-field]");
    for (let i = 0; i < playlistSelects.length; i += 1) {
      const select = playlistSelects[i];
      select.addEventListener("change", () => {
        const field = select.getAttribute("data-field");
        const index = Number(select.getAttribute("data-index"));
        this._updatePlaylistField(index, field, select.value);
      });
    }
    this._syncIconPickersHass();

    const removeButtons = this.shadowRoot.querySelectorAll("button[data-action='remove']");
    for (let i = 0; i < removeButtons.length; i += 1) {
      const button = removeButtons[i];
      button.addEventListener("click", () => {
        const index = Number(button.getAttribute("data-index"));
        this._removePlaylist(index);
      });
    }

    const addButton = this.shadowRoot.getElementById("add");
    if (addButton) {
      addButton.addEventListener("click", () => this._addPlaylist());
    }
  }

  _escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  _escape(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  _getPlaylistTypeOptions(selectedType) {
    const baseOptions = ["mixed", "music", "video"];
    const options = baseOptions.indexOf(selectedType) === -1 ? [selectedType].concat(baseOptions) : baseOptions;
    return options
      .map(function (name) {
        const selected = name === selectedType ? "selected" : "";
        return `<option value="${this._escapeAttr(name)}" ${selected}>${this._escape(name)}</option>`;
      }.bind(this))
      .join("");
  }

  _getRepeatModeOptions(selectedMode) {
    const modes = ["off", "all", "one"];
    const options = modes.indexOf(selectedMode) === -1 ? [selectedMode].concat(modes) : modes;
    return options
      .map(
        function (mode) {
          const selected = mode === selectedMode ? "selected" : "";
          return `<option value="${this._escapeAttr(mode)}" ${selected}>${this._escape(mode)}</option>`;
        }.bind(this)
      )
      .join("");
  }

  _getBooleanOptions(selectedValue) {
    return `
      <option value="false" ${selectedValue ? "" : "selected"}>aus</option>
      <option value="true" ${selectedValue ? "selected" : ""}>ein</option>
    `;
  }

  _getNullableBooleanOptions(value) {
    const normalized = value === true || value === "true" ? "true" : value === false || value === "false" ? "false" : "";
    return `
      <option value="" ${normalized === "" ? "selected" : ""}>nicht gesetzt</option>
      <option value="true" ${normalized === "true" ? "selected" : ""}>true</option>
      <option value="false" ${normalized === "false" ? "selected" : ""}>false</option>
    `;
  }

  _getOptionsRepeatOptions(value) {
    const current = String(value || "");
    const options = ["", "off", "one", "all"];
    return options
      .map(
        function (mode) {
          const selected = mode === current ? "selected" : "";
          const label = mode === "" ? "nicht gesetzt" : mode;
          return `<option value="${this._escapeAttr(mode)}" ${selected}>${this._escape(label)}</option>`;
        }.bind(this)
      )
      .join("");
  }

  _getResumeModeOptions(value) {
    const current = String(value || "none");
    const options = [
      { value: "none", label: "nicht gesetzt" },
      { value: "false", label: "false" },
      { value: "true", label: "true" },
      { value: "percent", label: "prozent" },
      { value: "time", label: "zeit" },
    ];
    return options
      .map(
        function (opt) {
          const selected = opt.value === current ? "selected" : "";
          return `<option value="${this._escapeAttr(opt.value)}" ${selected}>${this._escape(opt.label)}</option>`;
        }.bind(this)
      )
      .join("");
  }

  _syncIconPickersHass() {
    if (!this.shadowRoot || !this._hass) {
      return;
    }
    const playlistIconPickers = this.shadowRoot.querySelectorAll("ha-icon-picker[data-field='icon']");
    for (let i = 0; i < playlistIconPickers.length; i += 1) {
      playlistIconPickers[i].hass = this._hass;
    }
  }

  _getOpenModeOptions(selectedMode, playlistType) {
    const modes = ["file", "directory"];
    if (playlistType === "music" || playlistType === "video") {
      modes.push("partymode");
    }
    const options = modes.indexOf(selectedMode) === -1 ? [selectedMode].concat(modes) : modes;
    return options
      .map(
        function (mode) {
          const selected = mode === selectedMode ? "selected" : "";
          const label =
            mode === "directory"
              ? "Ordner (directory)"
              : mode === "partymode"
                ? "Partymode"
                : "Datei (file)";
          return `<option value="${this._escapeAttr(mode)}" ${selected}>${this._escape(label)}</option>`;
        }.bind(this)
      )
      .join("");
  }

  _toBool(value) {
    return value === true || value === "true";
  }

  _toOptionalBool(value) {
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    return null;
  }

  _toNumberOrNull(value) {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  _guessPlaylistTypeFromPath(playlistPath) {
    const path = String(playlistPath || "").toLowerCase();
    if (path.indexOf("/playlists/music/") !== -1) {
      return "music";
    }
    if (path.indexOf("/playlists/video/") !== -1) {
      return "video";
    }
    return "mixed";
  }

  _extractPlaylistName(playlistPath) {
    const value = String(playlistPath || "").trim();
    if (!value) {
      return "";
    }
    const lastSlash = value.lastIndexOf("/");
    return lastSlash >= 0 ? value.slice(lastSlash + 1) : value;
  }

  _getPlaylistBasePath(playlistType) {
    if (playlistType === "music") {
      return "special://profile/playlists/music/";
    }
    if (playlistType === "video") {
      return "special://profile/playlists/video/";
    }
    return "special://profile/playlists/mixed/";
  }

  _getDefaultPartyModePlaylistPath(playlistType) {
    if (playlistType === "music") {
      return "special://profile/playlists/music/Music.xsp";
    }
    return "special://profile/playlists/video/Video.xsp";
  }

  _normalizeOpenMode(openMode, playlistType) {
    const mode = String(openMode || "file");
    if (mode === "directory") {
      return "directory";
    }
    if (mode === "partymode" && (playlistType === "music" || playlistType === "video")) {
      return "partymode";
    }
    return "file";
  }

  _getKodiEntities() {
    if (!this._hass || !this._hass.states) {
      return [];
    }

    const allMediaPlayers = Object.keys(this._hass.states)
      .filter(
        function (entityId) {
          return entityId.indexOf("media_player.") === 0;
        }.bind(this)
      )
      .map(
        function (entityId) {
          const stateObj = this._hass.states[entityId];
          const friendlyName =
            (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || entityId;
          return {
            entity_id: entityId,
            name: friendlyName,
            is_kodi: /kodi/i.test(entityId + " " + friendlyName),
          };
        }.bind(this)
      )
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });

    const kodiMatches = allMediaPlayers.filter(function (item) {
        return item.is_kodi;
      });

    return kodiMatches.length > 0 ? kodiMatches : allMediaPlayers;
  }
}

customElements.define("kodi-smart-playlist-card", KodiSmartPlaylistCard);
customElements.define("kodi-smart-playlist-card-editor", KodiSmartPlaylistCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-smart-playlist-card",
  name: "Kodi Smart Playlist Card",
  description: "Startet eine oder mehrere Kodi Smart Playlists (.xsp) via JSON-RPC.",
});
