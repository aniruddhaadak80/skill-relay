const openapi = {
  openapi: "3.1.0",
  info: { title: "Skill Relay API", version: "1.1.0", description: "Cross-harness relay packs and canonical skill copy bundles over public agent-skill signals." },
  servers: [{ url: "/" }],
  paths: {
    "/api/health": { get: { summary: "Health and persistence state", responses: { "200": { description: "Service status" } } } },
    "/api/catalog": { get: { summary: "Search public skill records", parameters: [{ name: "q", in: "query", required: false, schema: { type: "string" } }, { name: "limit", in: "query", required: false, schema: { type: "integer" } }], responses: { "200": { description: "Catalog page" } } } },
    "/api/engine": { post: { summary: "Explainably score a skill for a task", responses: { "200": { description: "Score factors, compatibility, and analysis seal" } } } },
    "/api/packs": { get: { summary: "List relay packs", responses: { "200": { description: "Persisted packs" } } }, post: { summary: "Create a relay pack", responses: { "201": { description: "Created pack" } } } },
    "/api/packs/{id}": { get: { summary: "Read a relay pack", responses: { "200": { description: "Pack" } } }, patch: { summary: "Update a relay pack", responses: { "200": { description: "Updated pack" } } }, delete: { summary: "Delete a relay pack", responses: { "200": { description: "Deleted" } } } },
    "/api/audit": { get: { summary: "Read and verify the append-only audit chain", responses: { "200": { description: "Audit events and chain result" } } } },
    "/api/skills/{id}": { get: { summary: "Read one exact skill and its canonical copy bundle", responses: { "200": { description: "Skill record plus JSON, Markdown, source, and agent payload URLs" }, "404": { description: "Skill not found" } } } },
    "/api/skills/{id}/skill.md": { get: { summary: "Download the safe metadata-only SKILL.md relay manifest", responses: { "200": { description: "Markdown manifest", content: { "text/markdown": {} } } } } },
    "/api/mcp": { post: { summary: "MCP-style JSON-RPC endpoint", responses: { "200": { description: "JSON-RPC response" } } } }
  }
};

export async function GET() {
  return Response.json(openapi);
}
