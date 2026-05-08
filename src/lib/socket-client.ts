// Raw WebSocket client — no auth, no tokens.
// Server messages arrive as JSON: { type: string; payload: unknown }
// Binary frames are only sent (lecturer audio), never received.

type Handler = (payload: unknown) => void;

const WS_URL: string =
  (import.meta.env['VITE_WS_URL'] as string | undefined) ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS  = 30_000;
const MAX_RECONNECTS    = 8;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private _connected = false;
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closing = false;

  /** Set from SESSION_JOINED so views can include it in RAISE_HAND / ASK_QUESTION. */
  sessionId: string | null = null;

  get isConnected(): boolean { return this._connected; }

  connect(): void {
    this.closing = false;
    this._clearReconnect();
    this._open();
  }

  disconnect(): void {
    this.closing = true;
    this._clearReconnect();
    this.sessionId = null;
    if (this.ws) {
      this.ws.onopen    = null;
      this.ws.onclose   = null;
      this.ws.onerror   = null;
      this.ws.onmessage = null;
      this.ws.close(1000, 'user disconnect');
      this.ws = null;
    }
    this._connected = false;
  }

  send(type: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type, payload }));
  }

  sendBinary(data: ArrayBuffer | Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(data);
  }

  on(type: string, handler: Handler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type)!.add(handler);
  }

  off(type: string, handler?: Handler): void {
    if (!handler) { this.handlers.delete(type); return; }
    this.handlers.get(type)?.delete(handler);
  }

  once(type: string, handler: Handler): void {
    const wrapped: Handler = (payload) => { handler(payload); this.off(type, wrapped); };
    this.on(type, wrapped);
  }

  private _open(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    ) return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectCount = 0;
      this._emit('open', {});
    };

    this.ws.onclose = (ev) => {
      this._connected = false;
      this._emit('close', { code: ev.code, reason: ev.reason });
      if (!this.closing) this._scheduleReconnect();
    };

    this.ws.onerror = () => { /* onclose fires immediately after; no extra action needed */ };

    this.ws.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      try {
        const msg = JSON.parse(ev.data) as { type: string; payload: unknown };
        if (typeof msg.type === 'string') this._emit(msg.type, msg.payload);
      } catch { /* ignore malformed frames */ }
    };
  }

  private _emit(type: string, payload: unknown): void {
    this.handlers.get(type)?.forEach((h) => {
      try { h(payload); } catch { /* isolate handler errors from each other */ }
    });
  }

  private _scheduleReconnect(): void {
    if (this.reconnectCount >= MAX_RECONNECTS) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectCount, RECONNECT_MAX_MS);
    this.reconnectCount++;
    this.reconnectTimer = setTimeout(() => this._open(), delay);
  }

  private _clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsClient = new WsClient();

// EVENTS mirrors the backend ServerMessage `type` strings exactly.
export const EVENTS = {
  SESSION_JOINED:    'SESSION_JOINED',
  SESSION_STARTED:   'SESSION_STARTED',
  SESSION_ENDED:     'SESSION_ENDED',
  TRANSCRIPT_UPDATE: 'TRANSCRIPT_UPDATE',
  CAPTION_UPDATE:    'CAPTION_UPDATE',
  SIGN_GESTURE:      'SIGN_GESTURE',
  SUMMARY_UPDATE:    'SUMMARY_UPDATE',
  KEYPOINTS_UPDATE:  'KEYPOINTS_UPDATE',
  STUDENT_COUNT:     'STUDENT_COUNT',
  HAND_RAISED:       'HAND_RAISED',
  QUESTION_ANSWER:   'QUESTION_ANSWER',
  ERROR:             'ERROR',
  CONNECTED:         'open',
  DISCONNECTED:      'close',
} as const;
