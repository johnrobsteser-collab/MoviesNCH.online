import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { torrentEngine } from './server/torrentEngine.js';
import { 
  generateOtp, 
  verifyOtp, 
  getNchPriceOracle, 
  getFiatConversion, 
  activateSubscription, 
  getSubscriptionStatus,
  BPI_CONFIG,
  CRYPTO_CONFIG
} from './server/subscriptionService.js';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'movie-builtin-torrent-and-subscription-api',
      configureServer(server) {
        // Helper to parse JSON body
        const parseJsonBody = (req) => {
          return new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                resolve(JSON.parse(body || '{}'));
              } catch {
                resolve({});
              }
            });
          });
        };

        // Helper to send JSON response
        const sendJson = (res, statusCode, data) => {
          res.statusCode = statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        };

        // ====================================================================
        // 🔒 KYC AUTHENTICATION ROUTES (Email Link / Code & SMS OTP)
        // ====================================================================
        server.middlewares.use('/api/kyc/send-otp', async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });
          const { identifier, channel } = await parseJsonBody(req);
          if (!identifier) return sendJson(res, 400, { success: false, error: 'Email or phone number is required' });

          const result = generateOtp(identifier, channel);
          return sendJson(res, 200, result);
        });

        server.middlewares.use('/api/kyc/verify-otp', async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });
          const { identifier, code } = await parseJsonBody(req);
          if (!identifier || !code) return sendJson(res, 400, { success: false, error: 'Identifier and OTP code required' });

          const result = verifyOtp(identifier, code);
          return sendJson(res, result.success ? 200 : 400, result);
        });

        // ====================================================================
        // 💳 SUBSCRIPTION ORACLE & PAYMENT DETAILS
        // ====================================================================
        // 1. Live NCH dynamic oracle from CEXhybrid.io (20 USDT eq. for 2 Years)
        server.middlewares.use('/api/subscription/oracle-nch', async (req, res) => {
          const data = await getNchPriceOracle();
          return sendJson(res, 200, data);
        });

        // 2. Fiat conversion & BPI Bank auto-credit details ($13.56 -> PHP)
        server.middlewares.use('/api/subscription/fiat-details', async (req, res) => {
          const data = await getFiatConversion();
          return sendJson(res, 200, data);
        });

        // 3. Activate subscription (Card, USDT 0x7e7380..., or NCH CEXhybrid.io)
        server.middlewares.use('/api/subscription/activate', async (req, res) => {
          if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });
          const { identifier, tier, paymentMethod, txRef } = await parseJsonBody(req);
          if (!tier) return sendJson(res, 400, { success: false, error: 'Subscription tier is required' });

          const result = activateSubscription({ identifier, tier, paymentMethod, txRef });
          return sendJson(res, 200, result);
        });

        // 4. Check user subscription status
        server.middlewares.use('/api/subscription/status', async (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const identifier = url.searchParams.get('identifier');
          const result = getSubscriptionStatus(identifier);
          return sendJson(res, 200, result);
        });

        // ====================================================================
        // ⚡ TORRENT ENGINE ROUTES
        // ====================================================================
        // 1. ADD TORRENT TO BUILT-IN ENGINE
        server.middlewares.use('/api/torrent/add', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            return res.end('Method Not Allowed');
          }
          const data = await parseJsonBody(req);
          const { magnetUri, title, year, imdbId, quality, poster } = data;

          if (!magnetUri) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'magnetUri is required' }));
          }

          const result = await torrentEngine.addTorrent(magnetUri, {
            title: title || 'Movie Download',
            year: year || '2024',
            imdbId: imdbId || '',
            quality: quality || '1080p',
            poster: poster || ''
          });

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        });

        // 2. GET ACTIVE & COMPLETED TORRENTS LIST
        server.middlewares.use('/api/torrent/list', (req, res) => {
          const list = torrentEngine.getTorrentsList();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, torrents: list }));
        });

        // 3. PAUSE TORRENT
        server.middlewares.use('/api/torrent/pause', async (req, res) => {
          const data = await parseJsonBody(req);
          const ok = torrentEngine.pauseTorrent(data.infoHash);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: ok }));
        });

        // 4. RESUME TORRENT
        server.middlewares.use('/api/torrent/resume', async (req, res) => {
          const data = await parseJsonBody(req);
          const ok = torrentEngine.resumeTorrent(data.infoHash);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: ok }));
        });

        // 5. DELETE TORRENT
        server.middlewares.use('/api/torrent/delete', async (req, res) => {
          const data = await parseJsonBody(req);
          const ok = torrentEngine.removeTorrent(data.infoHash, data.deleteData);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: ok }));
        });

        // 6. STREAM OR DOWNLOAD TORRENT FILE
        server.middlewares.use('/api/torrent/stream', (req, res) => {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const infoHash = url.searchParams.get('infoHash');
          const fileIndex = parseInt(url.searchParams.get('fileIndex') || '0', 10);

          const file = torrentEngine.getTorrentFileStream(infoHash, fileIndex);
          if (!file) {
            res.statusCode = 404;
            return res.end('File not ready or torrent not found');
          }

          const range = req.headers.range;
          if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
            const chunksize = (end - start) + 1;

            res.writeHead(206, {
              'Content-Range': `bytes ${start}-${end}/${file.length}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': 'video/mp4'
            });

            file.createReadStream({ start, end }).pipe(res);
          } else {
            res.writeHead(200, {
              'Content-Length': file.length,
              'Content-Type': 'video/mp4'
            });
            file.createReadStream().pipe(res);
          }
        });
      }
    }
  ],
  server: {
    port: 5175,
    host: true
  }
});
