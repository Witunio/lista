export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const ip = request.headers.get("cf-connecting-ip") || "Nieznane IP";
      const userAgent = request.headers.get("user-agent") || "";
      const lang = request.headers.get("accept-language") || "";
      const time = new Date().toISOString();

      // Dodaj obsługę CORS dla żądań przeglądarkowych
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      };

      // Obsługa preflight requests (OPTIONS)
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (url.pathname === "/add" && request.method === "POST") {
        // Sprawdź Content-Type
        const contentType = request.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          return new Response(JSON.stringify({ error: "Expected JSON content" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const data = await request.json();
        const nick = (data.nick || "").trim();
        const discord = (data.discord || "").trim();

        if (!nick) {
          return new Response(JSON.stringify({ error: "Podaj nick!" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Pobierz aktualną listę graczy z KV
        let users = [];
        try {
          const usersRaw = await env.USERS.get("list");
          if (usersRaw) {
            users = JSON.parse(usersRaw);
          }
        } catch (error) {
          console.error("Błąd parsowania danych z KV:", error);
        }

        // Sprawdź czy nick już istnieje
        const existingUser = users.find(user => user.nick.toLowerCase() === nick.toLowerCase());
        if (existingUser) {
          return new Response(JSON.stringify({ error: "Nick już istnieje!" }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        users.push({ nick, discord, ip, userAgent, lang, time });

        // Zapisz do KV
        try {
          await env.USERS.put("list", JSON.stringify(users));
        } catch (error) {
          console.error("Błąd zapisu do KV:", error);
          return new Response(JSON.stringify({ error: "Błąd zapisu danych" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        // Wyślij powiadomienie na Discord (bez oczekiwania na odpowiedź)
        if (env.DISCORD_WEBHOOK) {
          try {
            await fetch(env.DISCORD_WEBHOOK, {
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
            });
          } catch (error) {
            console.log("Nie udało się wysłać webhooka:", error);
          }
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (url.pathname === "/list" && request.method === "GET") {
        let users = [];
        try {
          const usersRaw = await env.USERS.get("list");
          if (usersRaw) {
            users = JSON.parse(usersRaw);
          }
        } catch (error) {
          console.error("Błąd odczytu listy użytkowników:", error);
        }

        return new Response(JSON.stringify(users), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response("Not found", {
        status: 404,
        headers: corsHeaders
      });
    } catch (err) {
      console.log("Błąd Workera:", err);
      return new Response(JSON.stringify({ error: "Błąd serwera" }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};
