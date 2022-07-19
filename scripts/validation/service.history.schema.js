import { DOCUMENT_TYPES } from '../../src/archivist/services/index.js';

import definitions from './definitions.js';

const AVAILABLE_TYPES_NAME = Object.keys(DOCUMENT_TYPES);

const documentsProperties = () => {
  const result = {};

  AVAILABLE_TYPES_NAME.forEach(type => {
    result[type] = {
      type: 'array',
      items: {
        oneOf: [
          { $ref: '#/definitions/singlePageDocumentHistory' },
          { $ref: '#/definitions/multiPageDocumentHistory' },
          { $ref: '#/definitions/pdfDocumentHistory' },
        ],
      },
    };
  });

  return result;
};

const schema = {
  type: 'object',
  additionalProperties: false,
  title: 'Service declaration history',
  properties: documentsProperties(),
  propertyNames: { enum: AVAILABLE_TYPES_NAME },
  definitions: {
    ...definitions,
    pdfDocumentHistory: {
      type: 'object',
      additionalProperties: false,
      required: [ 'fetch', 'validUntil' ],
      properties: {
        fetch: {
          type: 'string',
          pattern: '^https?://.+.[pP][dD][fF](\\?.+)?$',
          description: 'The URL where the document can be found',
        },
        validUntil: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
    singlePageDocumentHistory: {
      type: 'object',
      additionalProperties: false,
      required: [ 'fetch', 'validUntil' ],
      properties: {
        fetch: { $ref: '#/definitions/location' },
        select: { $ref: '#/definitions/contentSelectors' },
        filter: { $ref: '#/definitions/filters' },
        remove: { $ref: '#/definitions/noiseSelectors' },
        executeClientScripts: { $ref: '#/definitions/executeClientScripts' },
        validUntil: { $ref: '#/definitions/validUntil' },
      },
    },
    multiPageDocumentHistory: {
      type: 'object',
      additionalProperties: false,
      required: ['combine'],
      properties: {
        combine: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['fetch'],
            properties: {
              fetch: { $ref: '#/definitions/location' },
              select: { $ref: '#/definitions/contentSelectors' },
              filter: { $ref: '#/definitions/filters' },
              remove: { $ref: '#/definitions/noiseSelectors' },
              executeClientScripts: { $ref: '#/definitions/executeClientScripts' },
            },
          },
        },
        select: { $ref: '#/definitions/contentSelectors' },
        filter: { $ref: '#/definitions/filters' },
        remove: { $ref: '#/definitions/noiseSelectors' },
        executeClientScripts: { $ref: '#/definitions/executeClientScripts' },
        validUntil: { $ref: '#/definitions/validUntil' },
      },
    },
  },
};

export default schema;
