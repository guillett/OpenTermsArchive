import DocumentDeclaration from '../../src/archivist/services/documentDeclaration.js';
import PageDeclaration from '../../src/archivist/services/pageDeclaration.js';
import Service from '../../src/archivist/services/service.js';

const service = new Service({
  id: 'service_with_declaration_history',
  name: 'Service with declaration history',
});

const filters = [
  async function removeSharesButton() {
    return 'last-removeSharesButton';
  },
  async function removePrintButton() {
    return 'last-removePrintButton';
  },
];

const latest = new DocumentDeclaration({
  service,
  type: 'Terms of Service',
  pages: [
    new PageDeclaration({
      location: 'https://www.service-with-declaration-history.example/terms',
      contentSelectors: 'main',
      noiseSelectors: undefined,
      filters,
    }),
  ],
  validUntil: null,
});

const document = new DocumentDeclaration({
  service,
  type: 'Terms of Service',
  pages: [
    new PageDeclaration({
      location: 'https://www.service-with-declaration-history.example/tos',
      contentSelectors: 'body',
      noiseSelectors: undefined,
      filters: undefined,
    }),
  ],
  validUntil: '2020-08-22T21:30:21.000Z',
});

const document2 = new DocumentDeclaration({
  service,
  type: 'Terms of Service',
  pages: [
    new PageDeclaration({
      location: 'https://www.service-with-declaration-history.example/tos',
      contentSelectors: 'main',
      noiseSelectors: undefined,
      filters: [
        async function removeSharesButton() {
          return 'last-removeSharesButton';
        },
      ],
    }),
  ],
  validUntil: '2020-09-30T21:30:21.000Z',
});

service.addDocumentDeclaration(latest);
service.addDocumentDeclaration(document);
service.addDocumentDeclaration(document2);

export default service;
