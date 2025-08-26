export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Pobierz IP użytkownika i nagłówki
    const ip = request.headers.get("cf-connecting-ip") || "Nieznane IP";
    const userAgent = request.headers.get("user-agent") || "";
    const lang = request.headers.get("accept-language") || "";
    const time = new Date().toISOString();

    // Dodaj użytkownika
    if (url.pathname === "/add" && request.method === "POST") {
      const data = await request.json();
      const nick = data.nick.trim();
      const discord = data.discord ? data.discord.trim() : "";

      // Pobierz aktualną listę z KV
      let usersRaw = await env.USERS.get("list");
      let users = usersRaw ? JSON.parse(usersRaw) : [];

      const newUser = {
        nick,
        discord,
        ip,
        userAgent,
        lang,
        time
      };

      users.push(newUser);

      // Zapisz ponownie do KV
      await env.USERS.put("list", JSON.stringify(users));

      // Wyślij powiadomienie na Discord
      const webhook = env.DISCORD_WEBHOOK; // URL webhooka w Secret/Env
      const content = `✅ Nowy gracz: **${nick}**
Discord: ${discord || "-"}
IP: ${ip}
Przeglądarka / System: ${userAgent}
Język: ${lang}
Czas: ${time}`;

      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Pobierz listę graczy
    if (url.pathname === "/list") {
      const usersRaw = await env.USERS.get("list");
      const users = usersRaw ? JSON.parse(usersRaw) : [];
      return new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
