interface PagesFunctionContext<Env = Record<string, any>> {
  request: Request;
  env: Env;
}

type PagesFunction<Env = Record<string, any>> = (
  context: PagesFunctionContext<Env>
) => Promise<Response> | Response;

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const key = context.env.GEMINI_API_KEY;
  const isConfigured = !!key && key !== "MY_GEMINI_API_KEY" && key.trim() !== "";
  return new Response(
    JSON.stringify({ configured: isConfigured }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
};
