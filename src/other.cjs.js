'use strict';

var puppeteer = require('puppeteer-extra');
var stealthPlugin = require('puppeteer-extra-plugin-stealth');
var AbortController = require('abort-controller');
var HttpProxyAgent = require('http-proxy-agent');
var HttpsProxyAgent = require('https-proxy-agent');
var nodeFetch = require('node-fetch');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var puppeteer__default = /*#__PURE__*/_interopDefaultLegacy(puppeteer);
var stealthPlugin__default = /*#__PURE__*/_interopDefaultLegacy(stealthPlugin);
var AbortController__default = /*#__PURE__*/_interopDefaultLegacy(AbortController);
var HttpProxyAgent__default = /*#__PURE__*/_interopDefaultLegacy(HttpProxyAgent);
var HttpsProxyAgent__default = /*#__PURE__*/_interopDefaultLegacy(HttpsProxyAgent);
var nodeFetch__default = /*#__PURE__*/_interopDefaultLegacy(nodeFetch);

class FetchDocumentError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FetchDocumentError';
  }
}

puppeteer__default["default"].use(stealthPlugin__default["default"]());

async function fetch$2(url, cssSelectors, options = { timeout: 5000, language: 'en', elementTimeout: 5000 }) {

  {
    throw new Error('The headless browser should be controlled manually with "launchHeadlessBrowser" and "stopHeadlessBrowser".');
  }
}

async function fetch$1(url, options = { timeout: 5000, language: 'en' }) {
  const controller = new AbortController__default["default"]();
  const timeout = setTimeout(() => controller.abort(), options.timeout);

  const fetchOptions = {
    signal: controller.signal,
    credentials: 'include',
    headers: { 'Accept-Language': options.language },
  };

  if (url.startsWith('https:') && process.env.HTTPS_PROXY) {
    fetchOptions.agent = new HttpsProxyAgent__default["default"](process.env.HTTPS_PROXY);
  } else if (url.startsWith('http:') && process.env.HTTP_PROXY) {
    fetchOptions.agent = new HttpProxyAgent__default["default"](process.env.HTTP_PROXY);
  }

  let response;

  try {
    response = await nodeFetch__default["default"](url, fetchOptions);

    if (!response.ok) {
      throw new FetchDocumentError(`Received HTTP code ${response.status} when trying to fetch '${url}'`);
    }

    const mimeType = response.headers.get('content-type');

    let content;

    if (mimeType.startsWith('text/')) {
      content = await response.text();
    } else {
      content = Buffer.from(await response.arrayBuffer());
    }

    if (!content) {
      throw new FetchDocumentError(`Received an empty content when fetching '${url}'`);
    }

    return {
      mimeType,
      content,
    };
  } catch (error) {
    if (error instanceof nodeFetch.AbortError) {
      throw new FetchDocumentError(`Timed out after ${options.timeout / 1000} seconds when trying to fetch '${url}'`);
    }

    throw new FetchDocumentError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetch({ url, executeClientScripts, cssSelectors, options }) {
  if (executeClientScripts) {
    return fetch$2(url, cssSelectors, options);
  }

  return fetch$1(url, options);
}

module.exports = fetch;
