export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Pobierz IP i nagłówki użytkownika
    const ip = request.headers.get("cf-connecting-ip") || "Nieznane IP";
    const userAgent = request.headers.get("user-agent") || "";
    const lang = request.headers.get("accept-language") || "";
    const time = new Date().toISOString();

    if (url.pathname === "/add" && request.method === "POST") {
      const data = await request.json();
      const nick = data.nick.trim();
      const discord = data.discord ? data.discord.trim() : "";

      // ====== KV Binding ======
      // W Pages musisz mieć KV namespace z bindingiem "USERS"
      let usersRaw = await env.USERS.get("list");
      let users = usersRaw ? JSON.parse(usersRaw) : [];

      const newUser = { nick, discord, ip, userAgent, lang, time };
      users.push(newUser);

      await env.USERS.put("list", JSON.stringify(users));
      // ========================

      // ====== Discord Webhook ======
      // W Pages musisz mieć Secret/Environment Variable: DISCORD_WEBHOOK
      const webhook = env.DISCORD_WEBHOOK;
      const content = `✅ Nowy gracz: **${nick}**
Discord: ${discord || "-"}
IP: ${ip}
Przeglądarka / System: ${userAgent}
Język: ${lang}
Czas: ${time}`;

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      // =============================

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.pathname === "/list") {
      const usersRaw = await env.USERS.get("list");
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      return new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
};
