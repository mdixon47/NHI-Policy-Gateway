export const toolRegistry = {
  file_read: {
    name: 'file_read',
    description: 'Read contents of a file',
    parameters: { path: { type: 'string', required: true } },
  },
  db_query: {
    name: 'db_query',
    description: 'Execute a database query',
    parameters: { query: { type: 'string', required: true } },
  },
  api_call: {
    name: 'api_call',
    description: 'Make an external API call',
    parameters: {
      url: { type: 'string', required: true },
      method: { type: 'string', required: false },
    },
  },
};
