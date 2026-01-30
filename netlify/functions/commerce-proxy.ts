import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

const PROXY_URL = process.env.NAVER_PROXY_URL || "http://49.50.131.90:3100";
const PROXY_API_KEY = process.env.NAVER_PROXY_API_KEY || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CommerceProxyRequest {
  action: "naver_token" | "naver_api" | "proxy";
  // Naver token
  clientId?: string;
  clientSecret?: string;
  // Naver API
  apiPath?: string;
  accessToken?: string;
  method?: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  // Generic proxy
  url?: string;
  headers?: Record<string, string>;
}

const handler: Handler = async (
  event: HandlerEvent,
  _context: HandlerContext
) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const request: CommerceProxyRequest = JSON.parse(event.body || "{}");

    let proxyResponse;

    switch (request.action) {
      case "naver_token": {
        if (!request.clientId || !request.clientSecret) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: "clientId and clientSecret are required",
            }),
          };
        }

        proxyResponse = await fetch(`${PROXY_URL}/naver/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": PROXY_API_KEY,
          },
          body: JSON.stringify({
            clientId: request.clientId,
            clientSecret: request.clientSecret,
          }),
        });
        break;
      }

      case "naver_api": {
        if (!request.apiPath || !request.accessToken) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: "apiPath and accessToken are required",
            }),
          };
        }

        const queryString = request.query
          ? "?" + new URLSearchParams(request.query).toString()
          : "";

        proxyResponse = await fetch(
          `${PROXY_URL}/naver/api/${request.apiPath}${queryString}`,
          {
            method: request.method || "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": PROXY_API_KEY,
              Authorization: `Bearer ${request.accessToken}`,
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
          }
        );
        break;
      }

      case "proxy": {
        if (!request.url) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: "url is required" }),
          };
        }

        proxyResponse = await fetch(`${PROXY_URL}/proxy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": PROXY_API_KEY,
          },
          body: JSON.stringify({
            url: request.url,
            method: request.method || "GET",
            headers: request.headers || {},
            body: request.body,
          }),
        });
        break;
      }

      default:
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: "Invalid action" }),
        };
    }

    const data = await proxyResponse.json();

    return {
      statusCode: proxyResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("[Commerce Proxy Error]", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
    };
  }
};

export { handler };
