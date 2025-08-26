export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const ip = request.headers.get("cf-connecting-ip") || "Nieznane IP";
      const userAgent = request.headers.get("user-agent") || "";
      const lang = request.headers.get("accept-language") || "";
      const time = new Date().toISOString();

      if (url.pathname === "/add" && request.method === "POST") {
        const data = await request.json();
        const nick = (data.nick || "").trim();
        const discord = (data.discord || "").trim();

        if (!nick) return new Response(JSON.stringify({ error: "Podaj nick!" }), { status: 400 });

        // Pobierz aktualną listę graczy z KV
        let usersRaw = await env.USERS.get("list").catch(() => null);
        let users = usersRaw ? JSON.parse(usersRaw) : [];

        users.push({ nick, discord, ip, userAgent, lang, time });

        // Zapisz do KV
        await env.USERS.put("list", JSON.stringify(users));

        // Wyślij powiadomienie na Discord
        if (env.DISCORD_WEBHOOK) {
          fetch(env.DISCORD_WEBHOOK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `✅ Nowy gracz: **${nick}**
Discord: ${discord || "-"}
IP: ${ip}
Przeglądarka/System: ${userAgent}
Język: ${lang}
Czas: ${time}`
            })
          }).catch(() => console.log("Nie udało się wysłać webhooka"));
        }

        return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
      }

      if (url.pathname === "/list") {
        let usersRaw = await env.USERS.get("list").catch(() => null);
        let users = usersRaw ? JSON.parse(usersRaw) : [];
        return new Response(JSON.stringify(users), { headers: { "Content-Type": "application/json" } });
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      console.log("Błąd Workera:", err);
      return new Response(JSON.stringify({ error: "Błąd serwera" }), { status: 500 });
    }
  }
};
