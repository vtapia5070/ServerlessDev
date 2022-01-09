const schema = {
  type: 'object',
  properties: {
    body: {
      type: 'string',
      minLenth: 1,
      pattern: '\=$',
    },
  },
  required: ['body'],
};

export default schema;