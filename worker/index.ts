interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

const VERSION = "0.1.0";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "keytune",
        version: VERSION,
      });
    }

    return env.ASSETS.fetch(request);
  },
};
