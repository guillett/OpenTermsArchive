import chai from 'chai';

import PageDeclaration from './pageDeclaration.js';

const { expect } = chai;

describe('PageDeclaration', () => {
  const URL = 'http://www.test.com/page';

  describe('#getCssSelectors', () => {
    context('with "select" property', () => {
      context('with string selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({ location: URL, contentSelectors: 'body' }).getCssSelectors();

          expect(result).to.deep.equal(['body']);
        });
      });

      context('with range selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            contentSelectors: {
              startBefore: '#startBefore',
              endBefore: '#endBefore',
            },
          }).getCssSelectors();

          expect(result).to.deep.equal([ '#startBefore', '#endBefore' ]);
        });
      });

      context('with an array of mixed selectors', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            contentSelectors: [
              {
                startBefore: '#startBefore',
                endBefore: '#endBefore',
              },
              'body',
            ],
          }).getCssSelectors();

          expect(result).to.deep.equal([ '#startBefore', '#endBefore', 'body' ]);
        });
      });
    });

    context('with "remove" property', () => {
      context('with string selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({ location: URL, noiseSelectors: 'body' }).getCssSelectors();

          expect(result).to.deep.equal(['body']);
        });
      });

      context('with range selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            noiseSelectors: {
              startBefore: '#startBefore',
              endBefore: '#endBefore',
            },
          }).getCssSelectors();

          expect(result).to.deep.equal([ '#startBefore', '#endBefore' ]);
        });
      });

      context('with an array of mixed selectors', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            noiseSelectors: [
              {
                startBefore: '#startBefore',
                endBefore: '#endBefore',
              },
              'body',
            ],
          }).getCssSelectors();

          expect(result).to.deep.equal([ '#startBefore', '#endBefore', 'body' ]);
        });
      });
    });

    context('with both "select" and "remove" property', () => {
      context('with string selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            contentSelectors: 'body',
            noiseSelectors: 'h1',
          }).getCssSelectors();

          expect(result).to.deep.equal([ 'body', 'h1' ]);
        });
      });

      context('with range selector', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            contentSelectors: {
              startBefore: '#startBefore',
              endBefore: '#endBefore',
            },
            noiseSelectors: {
              startBefore: '#startBefore',
              endBefore: '#endBefore',
            },
          }).getCssSelectors();

          expect(result).to.deep.equal([
            '#startBefore',
            '#endBefore',
            '#startBefore',
            '#endBefore',
          ]);
        });
      });

      context('with an array of mixed selectors', () => {
        it('extracts selectors', async () => {
          const result = new PageDeclaration({
            location: URL,
            contentSelectors: [
              {
                startBefore: '#startBefore',
                endBefore: '#endBefore',
              },
              'body',
            ],
            noiseSelectors: [
              {
                startBefore: '#startBefore',
                endBefore: '#endBefore',
              },
              'body',
            ],
          }).getCssSelectors();

          expect(result).to.deep.equal([
            '#startBefore',
            '#endBefore',
            'body',
            '#startBefore',
            '#endBefore',
            'body',
          ]);
        });
      });
    });
  });
});