class KodiSmartPlaylistCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("kodi-smart-playlist-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:kodi-smart-playlist-card",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "partymode",
      window: "videolibrary",
      debug: false,
      entity: "",
      playlists: [
        {
          name: "Filme",
          icon: "mdi:movie-open-play",
          playlist: "special://profile/playlists/video/Filme.xsp",
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
      open_mode: "partymode",
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

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  connectedCallback() {
    if (!this._refreshTimer) {
      this._refreshTimer = setInterval(() => this._render(), 10000);
    }
  }

  disconnectedCallback() {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
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
        .filter(function (item) {
          return item && item.playlist;
        })
        .map(
          function (item) {
            return {
              name: item.name || item.playlist,
              playlist: item.playlist,
              icon: item.icon || this._config.icon,
              method: item.method || this._config.method || "Player.Open",
              open_mode: item.open_mode || "partymode",
              window: item.window || "videolibrary",
              params: item.params,
            };
          }.bind(this)
        );
    }

    return [
      {
        name: this._config.name,
        playlist: this._config.playlist,
        icon: this._config.icon,
        method: this._config.method || "Player.Open",
        open_mode: "partymode",
        window: "videolibrary",
        params: this._config.params,
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
              <div class="row-subtitle">${this._escape(entry.playlist)}</div>
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

        .row-subtitle {
          margin-top: 3px;
          color: var(--secondary-text-color);
          font-size: 0.8rem;
          line-height: 1.2;
          word-break: break-all;
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
      serviceData = {
        entity_id: config.entity,
        method: method,
      };

      // Home Assistant kodi.call_method expects method parameters as top-level fields.
      if (entry.params && typeof entry.params === "object" && !Array.isArray(entry.params)) {
        Object.assign(serviceData, entry.params);
      } else if (method === "GUI.ActivateWindow") {
        serviceData.window = entry.window || "videolibrary";
        serviceData.parameters = [entry.playlist];
      } else if (method === "Player.Open") {
        const openMode = entry.open_mode || "partymode";
        if (openMode === "xbmc_builtin_party") {
          const commands = [
            "PlayMedia(" + entry.playlist + ")",
            "PlayerControl(RepeatAll)",
            "PlayerControl(RandomOn)",
          ];
          const responses = [];
          for (let i = 0; i < commands.length; i += 1) {
            const builtInServiceData = {
              entity_id: config.entity,
              method: "XBMC.ExecuteBuiltin",
              command: commands[i],
            };
            const stepResponse = await this._hass.callService("kodi", "call_method", builtInServiceData);
            responses.push({ command: commands[i], response: stepResponse });
          }
          if (config.debug) {
            this._pushDebug(
              this._formatDebug("success", { mode: "xbmc_builtin_party", commands: commands }, responses)
            );
          }
          this._showToast("Playlist gestartet (XBMC Builtin): " + entry.name);
          this._render();
          return;
        }
        serviceData.item = openMode === "file" ? { file: entry.playlist } : { partymode: entry.playlist };
      } else {
        const openMode = entry.open_mode || "partymode";
        serviceData.item = openMode === "file" ? { file: entry.playlist } : { partymode: entry.playlist };
      }

      const response = await this._hass.callService("kodi", "call_method", serviceData);
      await this._applyPostPlayCommands(config.entity);
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

  async _applyPostPlayCommands(entityId) {
    const commands = [
      { method: "Player.SetRepeat", payload: { playerid: 0, repeat: "all" } },
      { method: "Player.SetShuffle", payload: { playerid: 0, shuffle: true } },
    ];

    for (let i = 0; i < commands.length; i += 1) {
      const command = commands[i];
      const request = {
        entity_id: entityId,
        method: command.method,
        ...command.payload,
      };
      try {
        const response = await this._hass.callService("kodi", "call_method", request);
        if (this._config && this._config.debug) {
          this._pushDebug(this._formatDebug("success", request, response));
        }
      } catch (err) {
        if (this._config && this._config.debug) {
          this._pushDebug(this._formatDebug("error", request, null, err));
        }
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
      open_mode: "partymode",
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
            open_mode: this._config.open_mode || "partymode",
            window: this._config.window || "videolibrary",
            playlist: this._config.playlist,
          },
        ];
      } else {
        this._config.playlists = [
          {
            name: "Neue Playlist",
            icon: this._config.icon || "mdi:playlist-play",
            open_mode: this._config.open_mode || "partymode",
            window: this._config.window || "videolibrary",
            playlist: "",
          },
        ];
      }
    }
    this._config.playlists = (this._config.playlists || []).map((item) => ({
      ...item,
      open_mode: item.open_mode || this._config.open_mode || "partymode",
      window: item.window || this._config.window || "videolibrary",
    }));
    delete this._config.repeat_all;
    delete this._config.random_on;

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
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
        open_mode: item.open_mode || normalized.open_mode || "partymode",
        window: item.window || normalized.window || "videolibrary",
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

    playlists[index][field] = value;

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
        open_mode: this._config.open_mode || "partymode",
        window: this._config.window || "videolibrary",
        playlist: "",
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
        open_mode: this._config.open_mode || "partymode",
        window: this._config.window || "videolibrary",
        playlist: "",
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

              <label>Window</label>
              <select data-field="window" data-index="${index}">
                ${this._getWindowOptions(item.window || this._config.window || "videolibrary")}
              </select>

              <label>Open Mode</label>
              <select data-field="open_mode" data-index="${index}">
                ${this._getOpenModeOptions(item.open_mode || this._config.open_mode || "partymode")}
              </select>

              <label>Playlist-Pfad (.xsp)</label>
              <input data-field="playlist" data-index="${index}" type="text" value="${this._escapeAttr(item.playlist || "")}" />
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
      if (this._hass) {
        picker.hass = this._hass;
      }
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

  _getWindowOptions(selectedWindow) {
    const baseOptions = ["videolibrary", "musiclibrary", "videos"];
    const options = baseOptions.indexOf(selectedWindow) === -1 ? [selectedWindow].concat(baseOptions) : baseOptions;
    return options
      .map(function (name) {
        const selected = name === selectedWindow ? "selected" : "";
        return `<option value="${this._escapeAttr(name)}" ${selected}>${this._escape(name)}</option>`;
      }.bind(this))
      .join("");
  }

  _getOpenModeOptions(selectedMode) {
    const modes = ["partymode", "file", "xbmc_builtin_party"];
    const options = modes.indexOf(selectedMode) === -1 ? [selectedMode].concat(modes) : modes;
    return options
      .map(
        function (mode) {
          const selected = mode === selectedMode ? "selected" : "";
          const label =
            mode === "file"
              ? "file (komplette Playlist)"
              : mode === "xbmc_builtin_party"
                ? "xbmc_builtin_party (PlayMedia + Repeat + Random)"
                : "partymode (dynamisch)";
          return `<option value="${this._escapeAttr(mode)}" ${selected}>${this._escape(label)}</option>`;
        }.bind(this)
      )
      .join("");
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
