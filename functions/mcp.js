/**
 * Minimal MCP server (Model Context Protocol, JSON-RPC 2.0 over HTTP) for
 * NeXo IA. Exposes real, existing site content as agent-callable tools —
 * no new business functionality, just an agent-consumable interface to
 * what the marketing site already shows to humans (plans, services, and
 * the same WhatsApp contact flow as the page's own buttons).
 */

const WHATSAPP_NUMBER = "573102691503";

const PLANS = [
  {
    id: "recepcion-ia",
    name: "Recepción IA",
    audience:
      "Profesionales, consultorios y pequeños negocios que quieren empezar a atender automáticamente sus consultas por WhatsApp.",
    setup_price_cop: 299000,
    monthly_price_cop: 49900,
    includes: [
      "Agente de IA para WhatsApp",
      "Atención automática 24/7",
      "Entrenado con la información del negocio",
      "Responde servicios, horarios, ubicación y preguntas frecuentes",
      "Conversaciones naturales con clientes",
      "Captura datos de posibles clientes",
      "Transferencia a una persona cuando sea necesario",
      "Soporte y mantenimiento básico",
    ],
  },
  {
    id: "agenda-ia",
    name: "Agenda IA",
    audience:
      "Negocios y consultorios que quieren convertir las conversaciones de WhatsApp directamente en citas.",
    setup_price_cop: 599000,
    monthly_price_cop: 99900,
    includes: [
      "Todo lo incluido en Recepción IA",
      "Integración con Google Calendar",
      "Consulta de disponibilidad",
      "Agendamiento automático de citas",
      "Confirmación de citas",
      "Reprogramación y cancelación",
      "Recordatorios automáticos",
      "Registro básico de clientes",
      "Transferencia inteligente a atención humana",
    ],
  },
  {
    id: "nexo-pro",
    name: "NeXo Pro",
    audience: "Negocios que quieren convertir WhatsApp en un verdadero sistema comercial automatizado.",
    setup_price_cop: 999000,
    monthly_price_cop: 199900,
    includes: [
      "Todo lo incluido en Agenda IA",
      "Calificación automática de leads",
      "Identificación de intención e interés",
      "Clasificación de oportunidades",
      "Memoria de clientes y conversaciones",
      "Seguimiento automático de interesados (24/48/72 horas)",
      "Base de datos / CRM de contactos",
      "Handoff inteligente a una persona",
      "Reportes y métricas básicas",
    ],
  },
  {
    id: "nexo-growth",
    name: "NeXo Growth",
    audience:
      "Empresas que quieren automatizar atención, seguimiento, recuperación de oportunidades y crecimiento comercial.",
    setup_price_cop: 1599000,
    monthly_price_cop: 399900,
    includes: [
      "Todo lo incluido en NeXo Pro",
      "Recuperación automática de leads",
      "Reactivación de clientes o pacientes",
      "Campañas de seguimiento y reactivación de contactos",
      "Automatizaciones comerciales avanzadas",
      "Integraciones con otras herramientas",
      "CRM y gestión avanzada de contactos",
      "Dashboards y analítica",
      "Flujos personalizados",
      "Soporte prioritario",
    ],
  },
];

const SERVICES_SUMMARY =
  "NeXo IA automatiza la atención de WhatsApp para negocios, consultorios y profesionales en Colombia. " +
  "El agente de IA responde consultas 24/7, captura datos de clientes potenciales, puede agendar citas " +
  "(según el plan) y hacer seguimiento automático a conversaciones que quedaron sin avanzar. Está pensado " +
  "para negocios que pierden oportunidades porque no pueden responder WhatsApp a tiempo.";

const TOOLS = [
  {
    name: "get_services",
    description:
      "Describe qué problema resuelve NeXo IA y qué hace su producto (agentes de IA para WhatsApp). Úsalo cuando alguien pregunte qué es NeXo IA o qué hace.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_pricing",
    description:
      "Devuelve los planes y precios actuales de NeXo IA (implementación + mensualidad en COP), con lo que incluye cada uno. Úsalo cuando pregunten precio, planes o costo.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "start_conversation",
    description:
      "Genera un link de WhatsApp para iniciar contacto real con NeXo IA sobre un plan específico o una consulta general. No envía ningún mensaje por sí mismo — solo genera el enlace que el usuario debe abrir.",
    inputSchema: {
      type: "object",
      properties: {
        plan_id: {
          type: "string",
          description: "Uno de: recepcion-ia, agenda-ia, nexo-pro, nexo-growth. Omitir para una consulta general.",
          enum: PLANS.map((p) => p.id),
        },
        message: {
          type: "string",
          description: "Mensaje opcional a incluir. Si se omite, se genera un mensaje por defecto según el plan.",
        },
      },
      additionalProperties: false,
    },
  },
];

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolContent(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function handleToolCall(name, args) {
  if (name === "get_services") {
    return toolContent({ summary: SERVICES_SUMMARY, plans_available: PLANS.map((p) => p.id) });
  }

  if (name === "get_pricing") {
    return toolContent({
      currency: "COP",
      plans: PLANS.map(({ id, name, audience, setup_price_cop, monthly_price_cop, includes }) => ({
        id,
        name,
        audience,
        setup_price_cop,
        monthly_price_cop,
        includes,
      })),
      note: "Los precios publicados corresponden al alcance estándar de cada plan. Integraciones o desarrollos adicionales se cotizan por separado.",
    });
  }

  if (name === "start_conversation") {
    const planId = args && args.plan_id;
    const plan = PLANS.find((p) => p.id === planId);
    const defaultMessage = plan
      ? `Hola, quiero empezar con ${plan.name}`
      : "Hola, quiero saber más sobre NeXo IA";
    const message = (args && args.message) || defaultMessage;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    return toolContent({ whatsapp_url: url, plan: plan ? plan.name : null });
  }

  throw new Error(`Unknown tool: ${name}`);
}

async function handleRpc(body) {
  const { id, method, params } = body;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2025-06-18",
      serverInfo: { name: "nexo-ia-mcp", version: "1.0.0" },
      capabilities: { tools: {} },
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const toolName = params && params.name;
    const args = (params && params.arguments) || {};
    try {
      return jsonRpcResult(id, handleToolCall(toolName, args));
    } catch (err) {
      return jsonRpcError(id, -32602, err.message);
    }
  }

  if (method === "notifications/initialized" || method === "ping") {
    return jsonRpcResult(id, {});
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify(jsonRpcError(null, -32700, "Parse error")), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = await handleRpc(body);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      protocol: "mcp",
      transport: "streamable-http",
      note: "Send JSON-RPC 2.0 requests via POST. Methods: initialize, tools/list, tools/call.",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
