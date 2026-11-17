/* Study Decks party server.
   One Durable Object per room code. It keeps no game state: the big screen (host)
   runs the game, and this just passes messages between the host and the phones.
     host   -> { to: "*" | "<player id>", d: {...} }   delivered to phones as { d }
     phone  -> {...}                                     delivered to host as { from, d }
     server -> { sys: "join" | "leave" | "roster" | "hostgone" | "hostback" | "noroom" | "full" | "taken" }
   WebSockets use the hibernation API, so an idle room costs nothing. */
import { DurableObject } from "cloudflare:workers";

const MAX_PLAYERS = 12, MAX_MSG = 24000, STALE_MS = 3 * 60 * 60 * 1000;

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  reject(reason) {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    server.send(JSON.stringify({ sys: reason }));
    server.close(4000, reason);
    return new Response(null, { status: 101, webSocket: client });
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("expected a websocket", { status: 426 });
    const url = new URL(request.url);
    const role = url.searchParams.get("role") === "host" ? "host" : "player";
    const id = (url.searchParams.get("id") || "").replace(/[^\w-]/g, "").slice(0, 40);
    const key = (url.searchParams.get("key") || "").slice(0, 60);
    const meta = (await this.ctx.storage.get("meta")) || null;
    const hosts = this.ctx.getWebSockets("host");

    if (role === "host") {
      if (!key) return this.reject("taken");
      const stale = !meta || Date.now() - meta.at > STALE_MS;
      if (meta && meta.key !== key && !(stale && !hosts.length)) return this.reject("taken");
      hosts.forEach(ws => { try { ws.close(4001, "replaced"); } catch (e) {} });
      await this.ctx.storage.put("meta", { key, at: Date.now() });
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server, ["host"]);
      server.serializeAttachment({ role: "host" });
      server.send(JSON.stringify({ sys: "roster", ids: this.playerIds() }));
      this.toPlayers("*", JSON.stringify({ sys: "hostback" }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (!meta || !id) return this.reject("noroom");
    const mine = this.ctx.getWebSockets("id:" + id);
    if (!mine.length && this.playerIds().length >= MAX_PLAYERS) return this.reject("full");
    mine.forEach(ws => { try { ws.close(4001, "replaced"); } catch (e) {} });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, ["player", "id:" + id]);
    server.serializeAttachment({ role: "player", id });
    this.toHost(JSON.stringify({ sys: "join", id }));
    if (!hosts.length) server.send(JSON.stringify({ sys: "hostgone" }));
    return new Response(null, { status: 101, webSocket: client });
  }

  playerIds() {
    const ids = new Set();
    this.ctx.getWebSockets("player").forEach(ws => { const a = ws.deserializeAttachment(); if (a && a.id) ids.add(a.id); });
    return [...ids];
  }
  toHost(text) { this.ctx.getWebSockets("host").forEach(ws => { try { ws.send(text); } catch (e) {} }); }
  toPlayers(to, text) {
    this.ctx.getWebSockets(to === "*" ? "player" : "id:" + to).forEach(ws => { try { ws.send(text); } catch (e) {} });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_MSG) return;
    const att = ws.deserializeAttachment() || {};
    let msg; try { msg = JSON.parse(message); } catch (e) { return; }
    if (att.role === "host") {
      if (!msg || msg.d === undefined) return;
      this.toPlayers(msg.to === "*" || !msg.to ? "*" : String(msg.to), JSON.stringify({ d: msg.d }));
    } else if (att.id) {
      this.toHost(JSON.stringify({ from: att.id, d: msg }));
    }
  }

  async gone(ws) {
    const att = ws.deserializeAttachment() || {};
    if (att.role === "host") {
      if (!this.ctx.getWebSockets("host").some(w => w !== ws && w.readyState === 1)) this.toPlayers("*", JSON.stringify({ sys: "hostgone" }));
    } else if (att.id) {
      if (!this.ctx.getWebSockets("id:" + att.id).some(w => w !== ws && w.readyState === 1)) this.toHost(JSON.stringify({ sys: "leave", id: att.id }));
    }
  }
  async webSocketClose(ws, code, reason) { await this.gone(ws); try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch (e) {} }
  async webSocketError(ws) { await this.gone(ws); }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const m = /^\/r\/([A-Z]{4})$/.exec(url.pathname);
    if (m) return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
    return new Response(JSON.stringify({ ok: true, service: "study-decks-party" }), {
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  },
};
