class KodiSmartPlaylistCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("kodi-smart-playlist-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:kodi-smart-playlist-card",
      name: "Kodi Playlist",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "partymode",
      window: "videolibrary",
      repeat_all: false,
      random_on: false,
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
    this._config = {
      name: "Kodi Playlist",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "partymode",
      window: "videolibrary",
      repeat_all: false,
      random_on: false,
      debug: false,
      ...config,
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
              icon: item.icon || this._config.icon || "mdi:playlist-play",
              method: item.method || this._config.method || "Player.Open",
              open_mode: this._normalizeOpenMode(item.open_mode || this._config.open_mode || "partymode"),
              window: item.window || this._config.window || "videolibrary",
              repeat_all:
                typeof item.repeat_all === "boolean" ? item.repeat_all : !!this._config.repeat_all,
              random_on:
                typeof item.random_on === "boolean" ? item.random_on : !!this._config.random_on,
              params: item.params,
            };
          }.bind(this)
        );
    }

    return [
      {
        name: this._config.name,
        playlist: this._config.playlist,
        icon: this._config.icon || "mdi:playlist-play",
        method: this._config.method || "Player.Open",
        open_mode: this._normalizeOpenMode(this._config.open_mode || "partymode"),
        window: this._config.window || "videolibrary",
        repeat_all: !!this._config.repeat_all,
        random_on: !!this._config.random_on,
        params: this._config.params,
      },
    ];
  }

  _render() {
    if (!this.shadowRoot || !this._config) {
      return;
    }

    const stateObj = this._hass && this._hass.states && this._hass.states[this._config.entity];
    const state = stateObj && stateObj.state ? stateObj.state : "unavailable";
    const disabled = !this._hass || !stateObj;
    const entries = this._getEntries();
    const hasEntity = !!this._config.entity;
    const hasEntries = entries.length > 0;

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
          <div class="title">${this._escape(this._config.name || "Kodi Playlist")}</div>
          <div class="status">Kodi: ${this._escape(state)}</div>
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
          padding: 12px 16px 8px;
          border-bottom: 1px solid var(--divider-color);
        }

        .title {
          font-weight: 600;
          line-height: 1.2;
        }

        .status {
          margin-top: 2px;
          color: var(--secondary-text-color);
          font-size: 0.8rem;
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
      const windowName = entry.window || config.window || this._guessWindow(entry.playlist);
      serviceData = {
        entity_id: config.entity,
        method: method,
      };

      // Home Assistant kodi.call_method expects method parameters as top-level fields.
      if (entry.params && typeof entry.params === "object" && !Array.isArray(entry.params)) {
        Object.assign(serviceData, entry.params);
      } else if (method === "GUI.ActivateWindow") {
        serviceData.window = windowName;
        serviceData.parameters = [entry.playlist];
      } else if (method === "Player.Open") {
        const openMode = this._normalizeOpenMode(entry.open_mode || config.open_mode || "partymode");
        serviceData.item = openMode === "file" ? { file: entry.playlist } : { partymode: entry.playlist };
      } else {
        const openMode = this._normalizeOpenMode(entry.open_mode || config.open_mode || "partymode");
        serviceData.item = openMode === "file" ? { file: entry.playlist } : { partymode: entry.playlist };
      }

      const response = await this._hass.callService("kodi", "call_method", serviceData);
      if (method === "Player.Open") {
        if (entry.repeat_all) {
          await this._hass.callService("media_player", "repeat_set", {
            entity_id: config.entity,
            repeat: "all",
          });
        }
        if (entry.random_on) {
          await this._hass.callService("media_player", "shuffle_set", {
            entity_id: config.entity,
            shuffle: true,
          });
        }
      }
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

  _showToast(message) {
    const event = new CustomEvent("hass-notification", {
      detail: { message: message },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
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

  _normalizeOpenMode(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "file") {
      return "file";
    }
    if (raw.indexOf("file") !== -1) {
      return "file";
    }
    return "partymode";
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
      name: "Kodi Playlist",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      open_mode: "partymode",
      window: "videolibrary",
      repeat_all: false,
      random_on: false,
      debug: false,
      entity: "",
      ...config,
    };

    if (!Array.isArray(this._config.playlists) || this._config.playlists.length === 0) {
      if (this._config.playlist) {
        this._config.playlists = [
          {
            name: this._config.name || "Playlist",
            icon: this._config.icon || "mdi:playlist-play",
            open_mode: this._config.open_mode || "partymode",
            window: this._config.window || "videolibrary",
            repeat_all: !!this._config.repeat_all,
            random_on: !!this._config.random_on,
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
            repeat_all: !!this._config.repeat_all,
            random_on: !!this._config.random_on,
            playlist: "",
          },
        ];
      }
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _emitConfig(config) {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: config },
        bubbles: true,
        composed: true,
      })
    );
  }

  _updateRootField(field, value) {
    let normalizedValue = value;
    if (field === "debug") {
      normalizedValue = value === "true";
    }
    if (field === "repeat_all" || field === "random_on") {
      normalizedValue = value === "true";
    }
    if (field === "open_mode") {
      normalizedValue = this._normalizeOpenMode(value);
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
    if (field === "repeat_all" || field === "random_on") {
      playlists[index][field] = value === "true";
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
        open_mode: this._config.open_mode || "partymode",
        window: this._config.window || "videolibrary",
        repeat_all: !!this._config.repeat_all,
        random_on: !!this._config.random_on,
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
        repeat_all: !!this._config.repeat_all,
        random_on: !!this._config.random_on,
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
              <ha-icon-picker data-field="icon" data-index="${index}" value="${this._escapeAttr(item.icon || "mdi:playlist-play")}"></ha-icon-picker>

              <label>Window</label>
              <select data-field="window" data-index="${index}">
                ${this._getWindowOptions(item.window || this._config.window || "videolibrary")}
              </select>

              <label>Open Mode</label>
              <select data-field="open_mode" data-index="${index}">
                ${this._getOpenModeOptions(item.open_mode || this._config.open_mode || "partymode")}
              </select>

              <label>RepeatAll</label>
              <select data-field="repeat_all" data-index="${index}">
                ${this._getBooleanOptions(!!item.repeat_all)}
              </select>

              <label>RandomOn</label>
              <select data-field="random_on" data-index="${index}">
                ${this._getBooleanOptions(!!item.random_on)}
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

        <label>Kartenname</label>
        <input data-root="name" type="text" value="${this._escapeAttr(this._config.name || "")}" />

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

    const playlistInputs = this.shadowRoot.querySelectorAll("input[data-field]");
    for (let i = 0; i < playlistInputs.length; i += 1) {
      const input = playlistInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-field");
        const index = Number(input.getAttribute("data-index"));
        this._updatePlaylistField(index, field, input.value);
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
    const normalizedSelected = this._normalizeOpenMode(selectedMode || "partymode");
    const options = ["partymode", "file"];
    return options
      .map(
        function (mode) {
          const selected = mode === normalizedSelected ? "selected" : "";
          const label =
            mode === "file"
              ? "file (komplette Playlist)"
              : "partymode (dynamisch)";
          return `<option value="${this._escapeAttr(mode)}" ${selected}>${this._escape(label)}</option>`;
        }.bind(this)
      )
      .join("");
  }

  _getBooleanOptions(selectedValue) {
    return `
      <option value="false" ${selectedValue ? "" : "selected"}>Aus</option>
      <option value="true" ${selectedValue ? "selected" : ""}>Ein</option>
    `;
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
