import fsApi from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Ajv from 'ajv';
import { expect } from 'chai';
import config from 'config';
import { ESLint } from 'eslint';
import jsonSourceMap from 'json-source-map';

import fetch, { launchHeadlessBrowser, stopHeadlessBrowser } from '../../src/archivist/fetcher/index.js';
import filter from '../../src/archivist/filter/index.js';
import * as services from '../../src/archivist/services/index.js';

import serviceHistorySchema from './service.history.schema.js';
import serviceSchema from './service.schema.js';

const fs = fsApi.promises;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_PATH = path.resolve(__dirname, '../../');
const ESLINT_CONFIG_PATH = path.join(ROOT_PATH, '.eslintrc.yaml');

const MIN_DOC_LENGTH = 100;
const SLOW_DOCUMENT_THRESHOLD = 10 * 1000; // number of milliseconds after which a document fetch is considered slow

const args = process.argv.slice(2); // Keep only args that are after the script filename

let schemaOnly = false;

const eslint = new ESLint({ overrideConfigFile: ESLINT_CONFIG_PATH, fix: false });
const eslintWithFix = new ESLint({ overrideConfigFile: ESLINT_CONFIG_PATH, fix: true });

if (args.includes('--schema-only')) {
  schemaOnly = true;
  args.splice(args.indexOf('--schema-only'), 1);
}

let servicesToValidate = args;

(async () => {
  const declarationsPath = path.resolve(ROOT_PATH, config.get('services.declarationsPath'));

  // If services to validate are passed as a string with services id separated by a newline character
  if (servicesToValidate.length == 1 && servicesToValidate[0].includes('\n')) {
    servicesToValidate = servicesToValidate[0].split('\n').filter(value => value);
  }

  const serviceDeclarations = await services.loadWithHistory(servicesToValidate);

  if (!servicesToValidate.length) {
    servicesToValidate = Object.keys(serviceDeclarations);
  }

  describe('Service declarations validation', async function () {
    this.timeout(30000);
    this.slow(SLOW_DOCUMENT_THRESHOLD);

    servicesToValidate.forEach(serviceId => {
      const service = serviceDeclarations[serviceId];
      const filePath = path.join(declarationsPath, `${serviceId}.json`);
      const historyFilePath = path.join(declarationsPath, `${serviceId}.history.json`);

      if (!service) {
        throw new Error(`Could not find any service with id "${serviceId}"`);
      }

      before(launchHeadlessBrowser);

      after(stopHeadlessBrowser);

      describe(serviceId, async () => {
        it('valid declaration schema', async () => {
          const declaration = JSON.parse(await fs.readFile(filePath));

          assertValid(serviceSchema, declaration);
        });

        it('valid declaration file format', async () => {
          await lintFile(filePath);
        });

        if (service.hasHistory()) {
          it('valid history declaration schema', async () => {
            const declarationHistory = JSON.parse(await fs.readFile(historyFilePath));

            assertValid(serviceHistorySchema, declarationHistory);
          });

          it('valid history declaration file format', async () => {
            await lintFile(path.join(declarationsPath, `${serviceId}.history.json`));
          });
        }

        const filtersFilePath = path.join(declarationsPath, `${serviceId}.filters.js`);

        if (fsApi.existsSync(filtersFilePath)) {
          it('valid filters file format', async () => {
            await lintFile(filtersFilePath);
          });
        }

        const filtersHistoryFilePath = path.join(declarationsPath, `${serviceId}.filters.history.js`);

        if (fsApi.existsSync(filtersHistoryFilePath)) {
          it('valid filters history file format', async () => {
            await lintFile(filtersHistoryFilePath);
          });
        }

        if (!schemaOnly) {
          service.getDocumentTypes().forEach(type => {
            describe(type, () => {
              let content;
              let filteredContent;
              let mimeType;
              const documentDeclaration = service.getDocumentDeclaration(type);

              before(async function () {
                if (!documentDeclaration) {
                  console.log('      (Tests skipped as declaration has been archived)');
                  this.skip();
                }
              });

              it('fetchable URL', async () => {
                const { location, executeClientScripts } = documentDeclaration;
                const document = await fetch({
                  url: location,
                  executeClientScripts,
                  cssSelectors: documentDeclaration.getCssSelectors(),
                  config: config.get('fetcher'),
                });

                content = document.content;
                mimeType = document.mimeType;
              });

              it('selector matches an element in the web page', async function checkSelector() {
                if (!content) {
                  console.log('      (Tests skipped as url is not fetchable)');
                  this.skip();
                }

                filteredContent = await filter({
                  content,
                  documentDeclaration,
                  mimeType,
                });

                expect(filteredContent).to.not.be.empty;
              });

              it(`filtered content has at least ${MIN_DOC_LENGTH} characters`, async function checkContentLength() {
                if (!content) {
                  console.log('      (Tests skipped as url is not fetchable)');
                  this.skip();
                }

                if (!filteredContent) {
                  console.log('      (Tests skipped as content cannot be filtered)');
                  this.skip();
                }

                expect(filteredContent.length).to.be.greaterThan(MIN_DOC_LENGTH);
              });

              it('content is consistent when fetched and filtered twice in a row', async function checkContentConsistency() {
                this.slow(SLOW_DOCUMENT_THRESHOLD * 2);

                if (!content) {
                  console.log('      (Tests skipped as url is not fetchable)');
                  this.skip();
                }

                if (!filteredContent) {
                  console.log('      (Tests skipped as content cannot be filtered)');
                  this.skip();
                }

                const {
                  location,
                  executeClientScripts,
                } = documentDeclaration;
                const document = await fetch({
                  url: location,
                  executeClientScripts,
                  cssSelectors: documentDeclaration.getCssSelectors(),
                  config: config.get('fetcher'),
                });
                const secondFilteredContent = await filter({
                  content: document.content,
                  documentDeclaration,
                  mimeType: document.mimeType,
                });

                expect(secondFilteredContent).to.equal(filteredContent);
              });
            });
          });
        }
      });
    });
  });

  run();
})();

const validator = new Ajv({
  allErrors: true,
  jsonPointers: true,
});

function assertValid(schema, subject) {
  const valid = validator.validate(schema, subject);

  if (!valid) {
    const errorPointers = new Set();
    let errorMessage = '';
    const sourceMap = jsonSourceMap.stringify(subject, null, 2);
    const jsonLines = sourceMap.json.split('\n');

    validator.errors.forEach(error => {
      errorMessage += `\n\n${validator.errorsText([error])}`;
      const errorPointer = sourceMap.pointers[error.dataPath];

      if (errorPointer) {
        errorMessage += `\n> ${jsonLines
          .slice(errorPointer.value.line, errorPointer.valueEnd.line)
          .join('\n> ')}`;
        errorPointers.add(errorPointer);
      } else {
        errorMessage += ' (in entire file)\n';
      }
    });

    errorMessage += `\n\n${errorPointers.size} features have errors in total`;

    throw new Error(errorMessage);
  }
}

async function lintFile(filePath) {
  const [lintResult] = await eslint.lintFiles(filePath);

  if (!lintResult.errorCount) {
    return;
  }

  // Create a new instance of linter with option `fix` set to true to get a fixed output.
  // It is not possible to use only a linter with this option enabled because when this option is set, if it can fix errors, it considers that there are no errors and returns `0` for the `errorCount`.
  // So use two linters to have access both to `errorCount` and fix `output` variables.
  const [lintResultFixed] = await eslintWithFix.lintFiles(filePath);

  expect(lintResult.source).to.equal(lintResultFixed.output, `${path.basename(filePath)} is not properly formatted. Use the lint script to format it correctly.\n`);
}
