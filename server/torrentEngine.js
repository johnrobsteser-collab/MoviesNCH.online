import WebTorrent from 'webtorrent';
import path from 'path';
import fs from 'fs';

class TorrentEngine {
  constructor() {
    this.client = null;
    this.downloadDir = path.resolve(process.cwd(), 'downloads_temp');
    this.metadataStore = new Map(); // infoHash -> extra metadata (title, poster, etc.)
    this.initClient();
  }

  initClient() {
    try {
      if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir, { recursive: true });
      }
      this.client = new WebTorrent({
        maxConns: 100,
        dht: true,
        tracker: true
      });

      this.client.on('error', (err) => {
        console.warn('⚠️ WebTorrent Client warning:', err.message);
      });

      console.log('⚡ Built-In MoviesNCH.online Torrent Engine initialized successfully!');
    } catch (e) {
      console.error('Error initializing WebTorrent client:', e);
    }
  }

  addTorrent(magnetOrUrl, meta = {}) {
    return new Promise((resolve) => {
      try {
        if (!this.client) {
          return resolve({ success: false, error: 'Torrent client not initialized' });
        }

        // Clean trackers & ensure top trackers
        const trackers = [
          'wss://tracker.openwebtorrent.com',
          'wss://tracker.btorrent.xyz',
          'wss://tracker.fastcast.nz',
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://open.stealth.si:80/announce',
          'udp://tracker.torrent.eu.org:451/announce',
          'udp://open.demonii.com:1337/announce'
        ];

        let torrentInput = magnetOrUrl;
        if (typeof magnetOrUrl === 'string' && magnetOrUrl.startsWith('magnet:')) {
          // ensure trackers attached
          if (!magnetOrUrl.includes('&tr=')) {
            torrentInput = magnetOrUrl + '&tr=' + trackers.map(encodeURIComponent).join('&tr=');
          }
        }

        // Check if already existing
        const existing = this.client.get(torrentInput);
        if (existing) {
          const infoHash = existing.infoHash;
          if (meta.title) {
            this.metadataStore.set(infoHash, { ...meta, addedAt: Date.now() });
          }
          return resolve({ success: true, infoHash, status: 'already_active' });
        }

        const torrent = this.client.add(torrentInput, {
          path: this.downloadDir,
          announce: trackers
        }, (addedTorrent) => {
          console.log(`📥 Torrent added to engine: ${addedTorrent.name || meta.title} (${addedTorrent.infoHash})`);
          this.metadataStore.set(addedTorrent.infoHash, {
            ...meta,
            infoHash: addedTorrent.infoHash,
            name: addedTorrent.name || meta.title,
            addedAt: Date.now()
          });
        });

        torrent.on('error', (err) => {
          console.warn(`Torrent error for ${meta.title || 'torrent'}:`, err.message);
        });

        // Store preliminary metadata
        const tempHash = torrent.infoHash || meta.infoHash || `th_${Date.now()}`;
        this.metadataStore.set(tempHash, {
          ...meta,
          infoHash: tempHash,
          addedAt: Date.now(),
          status: 'connecting'
        });

        resolve({ success: true, infoHash: tempHash });
      } catch (err) {
        console.error('addTorrent error:', err);
        resolve({ success: false, error: err.message });
      }
    });
  }

  getTorrentsList() {
    if (!this.client) return [];

    const list = [];
    const activeHashes = new Set();

    for (const t of this.client.torrents) {
      activeHashes.add(t.infoHash);
      const meta = this.metadataStore.get(t.infoHash) || {};

      list.push({
        infoHash: t.infoHash,
        name: t.name || meta.title || 'Movie Download',
        title: meta.title || t.name || 'Movie',
        year: meta.year || '2024',
        imdbId: meta.imdbId || '',
        poster: meta.poster || '',
        quality: meta.quality || '1080p',
        progress: t.progress || 0,
        downloadSpeed: t.downloadSpeed || 0,
        uploadSpeed: t.uploadSpeed || 0,
        downloaded: t.downloaded || 0,
        length: t.length || meta.fileSizeNum || (2.45 * 1024 * 1024 * 1024),
        numPeers: t.numPeers || 0,
        timeRemaining: t.timeRemaining || 0,
        ready: t.ready || false,
        paused: t.paused || false,
        done: t.done || false,
        status: t.done ? 'completed' : t.paused ? 'paused' : t.downloadSpeed > 0 ? 'downloading' : t.numPeers > 0 ? 'downloading' : 'connecting',
        files: (t.files || []).map((f, idx) => ({
          index: idx,
          name: f.name,
          length: f.length,
          progress: f.progress
        }))
      });
    }

    // Include any saved metadata items not yet resolved in client
    for (const [hash, meta] of this.metadataStore.entries()) {
      if (!activeHashes.has(hash)) {
        list.push({
          infoHash: hash,
          name: meta.title || 'Movie Download',
          title: meta.title || 'Movie',
          year: meta.year || '2024',
          imdbId: meta.imdbId || '',
          poster: meta.poster || '',
          quality: meta.quality || '1080p',
          progress: meta.progress || 0,
          downloadSpeed: 0,
          uploadSpeed: 0,
          downloaded: 0,
          length: meta.fileSizeNum || (2.45 * 1024 * 1024 * 1024),
          numPeers: 0,
          timeRemaining: 0,
          ready: false,
          paused: false,
          done: false,
          status: 'connecting',
          files: []
        });
      }
    }

    return list;
  }

  pauseTorrent(infoHash) {
    try {
      const t = this.client?.get(infoHash);
      if (t) {
        if (typeof t.pause === "function") {
          t.pause();
        } else if (typeof t.deselect === "function" && t.pieces) {
          t.deselect(0, t.pieces.length - 1, false);
        }
        t.paused = true;
        const meta = this.metadataStore.get(infoHash);
        if (meta) meta.paused = true;
        return true;
      }
      return false;
    } catch (err) {
      console.warn("pauseTorrent error:", err.message);
      return false;
    }
  }

  resumeTorrent(infoHash) {
    try {
      const t = this.client?.get(infoHash);
      if (t) {
        if (typeof t.resume === "function") {
          t.resume();
        } else if (typeof t.select === "function" && t.pieces) {
          t.select(0, t.pieces.length - 1, false);
        }
        t.paused = false;
        const meta = this.metadataStore.get(infoHash);
        if (meta) meta.paused = false;
        return true;
      }
      return false;
    } catch (err) {
      console.warn("resumeTorrent error:", err.message);
      return false;
    }
  }

  removeTorrent(infoHash, deleteData = false) {
    const t = this.client?.get(infoHash);
    if (t) {
      t.destroy({ destroyStore: deleteData });
    }
    this.metadataStore.delete(infoHash);
    return true;
  }

  getTorrentFileStream(infoHash, fileIndex = 0) {
    const t = this.client?.get(infoHash);
    if (!t || !t.files || !t.files[fileIndex]) return null;
    return t.files[fileIndex];
  }
}

export const torrentEngine = new TorrentEngine();
