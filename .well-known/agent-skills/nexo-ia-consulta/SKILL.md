# Consultar NeXo IA

Consulta servicios, planes de precios y genera un link de contacto por
WhatsApp para NeXo IA, un producto que automatiza la atención de WhatsApp
para negocios, consultorios y profesionales en Colombia.

Usa esta skill cuando alguien pregunte qué es NeXo IA, cuánto cuesta, qué
incluye cada plan, o quiera iniciar contacto con el negocio.

## Cómo usarla

Conéctate al servidor MCP en `https://www.agentes-inteligencia-artificial.online/mcp`
(transporte Streamable HTTP, JSON-RPC 2.0) y llama a una de estas
herramientas:

- `get_services` — descripción de qué hace NeXo IA y qué problema resuelve.
- `get_pricing` — los 4 planes disponibles (Recepción IA, Agenda IA, NeXo
  Pro, NeXo Growth) con precio de implementación, mensualidad en COP y
  qué incluye cada uno.
- `start_conversation` — genera un link `wa.me` para iniciar contacto real
  por WhatsApp, opcionalmente asociado a un plan específico.

## Ejemplo

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_pricing","arguments":{}}}
```

## Validar

El MCP Server Card está publicado en
`/.well-known/mcp/server-card.json` y describe el mismo endpoint.
