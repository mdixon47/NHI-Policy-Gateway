export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  opaUrl: process.env.OPA_URL || 'http://localhost:8181',
  toolServerUrl: process.env.TOOL_SERVER_URL || 'http://localhost:3001',
  logLevel: process.env.LOG_LEVEL || 'info',
};
