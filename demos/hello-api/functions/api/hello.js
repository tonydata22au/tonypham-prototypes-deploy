// Pages Function: GET /api/hello
export function onRequestGet() {
  return Response.json({ message: 'Hello from Pages Functions', time: new Date().toISOString() });
}
