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
    if (!config.entity) {
      throw new Error("`entity` ist erforderlich (Kodi media_player Entitaet).");
    }

    if (!config.playlist && (!Array.isArray(config.playlists) || config.playlists.length === 0)) {
      throw new Error("`playlist` oder `playlists` ist erforderlich.");
    }

    this._config = {
      name: "Kodi Playlist",
      icon: "mdi:playlist-play",
      method: "Player.Open",
      ...config,
    };

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
              icon: item.icon || this._config.icon,
              method: item.method || this._config.method || "Player.Open",
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

    this.shadowRoot.innerHTML = `
      <ha-card>
        <div class="header">
          <div class="title">${this._escape(this._config.name || "Kodi Playlist")}</div>
          <div class="status">Kodi: ${this._escape(state)}</div>
        </div>
        <div class="list">${rows}</div>
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

    const entries = this._getEntries();
    const entry = entries[index];
    if (!entry) {
      return;
    }

    try {
      await this._hass.callService("kodi", "call_method", {
        entity_id: config.entity,
        method: entry.method || "Player.Open",
        item: {
          file: entry.playlist,
        },
        params: entry.params,
      });

      this._showToast("Playlist gestartet: " + entry.name);
    } catch (err) {
      const message = (err && err.message) || "Unbekannter Fehler";
      this._showToast("Fehler: " + message);
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
      entity: "",
      ...config,
    };

    if (!Array.isArray(this._config.playlists) || this._config.playlists.length === 0) {
      if (this._config.playlist) {
        this._config.playlists = [
          {
            name: this._config.name || "Playlist",
            icon: this._config.icon || "mdi:playlist-play",
            playlist: this._config.playlist,
          },
        ];
      } else {
        this._config.playlists = [
          {
            name: "Neue Playlist",
            icon: this._config.icon || "mdi:playlist-play",
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
    const next = { ...this._config, [field]: value };
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

              <label>Icon (mdi:...)</label>
              <input data-field="icon" data-index="${index}" type="text" value="${this._escapeAttr(item.icon || "")}" />

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
        <input data-root="entity" type="text" value="${this._escapeAttr(this._config.entity || "")}" placeholder="media_player.kodi_wohnzimmer" />

        <label>Kartenname</label>
        <input data-root="name" type="text" value="${this._escapeAttr(this._config.name || "")}" />

        <label>Standard-Icon (mdi:...)</label>
        <input data-root="icon" type="text" value="${this._escapeAttr(this._config.icon || "")}" />

        <label>JSON-RPC Methode</label>
        <input data-root="method" type="text" value="${this._escapeAttr(this._config.method || "Player.Open")}" />

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

    const playlistInputs = this.shadowRoot.querySelectorAll("input[data-field]");
    for (let i = 0; i < playlistInputs.length; i += 1) {
      const input = playlistInputs[i];
      input.addEventListener("change", () => {
        const field = input.getAttribute("data-field");
        const index = Number(input.getAttribute("data-index"));
        this._updatePlaylistField(index, field, input.value);
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
}

customElements.define("kodi-smart-playlist-card", KodiSmartPlaylistCard);
customElements.define("kodi-smart-playlist-card-editor", KodiSmartPlaylistCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-smart-playlist-card",
  name: "Kodi Smart Playlist Card",
  description: "Startet eine oder mehrere Kodi Smart Playlists (.xsp) via JSON-RPC.",
});
