class KodiSmartPlaylistCard extends HTMLElement {
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
        .filter((item) => item && item.playlist)
        .map((item) => ({
          name: item.name || item.playlist,
          playlist: item.playlist,
          icon: item.icon || this._config.icon,
          method: item.method || this._config.method || "Player.Open",
          params: item.params,
        }));
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
        (entry, index) => `
          <button class="playlist-row" data-index="${index}" ${disabled ? "disabled" : ""}>
            <ha-icon icon="${this._escape(entry.icon)}"></ha-icon>
            <div class="row-text">
              <div class="row-title">${this._escape(entry.name)}</div>
              <div class="row-subtitle">${this._escape(entry.playlist)}</div>
            </div>
          </button>
        `
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
      detail: { message },
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

customElements.define("kodi-smart-playlist-card", KodiSmartPlaylistCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-smart-playlist-card",
  name: "Kodi Smart Playlist Card",
  description: "Startet eine oder mehrere Kodi Smart Playlists (.xsp) via JSON-RPC.",
});
