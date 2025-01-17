import AbortController from 'abort-controller';
import HttpProxyAgent from 'http-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import nodeFetch, { AbortError } from 'node-fetch';

import { FetchDocumentError } from './errors.js';

export default async function fetch(url, configuration) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuration.navigationTimeout);

  const nodeFetchOptions = {
    signal: controller.signal,
    credentials: 'include',
    headers: { 'Accept-Language': configuration.language },
  };

  if (url.startsWith('https:') && process.env.HTTPS_PROXY) {
    nodeFetchOptions.agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
  } else if (url.startsWith('http:') && process.env.HTTP_PROXY) {
    nodeFetchOptions.agent = new HttpProxyAgent(process.env.HTTP_PROXY);
  }

  let response;

  try {
    response = await nodeFetch(url, nodeFetchOptions);

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
    if (error instanceof AbortError) {
      throw new FetchDocumentError(`Timed out after ${configuration.navigationTimeout / 1000} seconds when trying to fetch '${url}'`);
    }

    throw new FetchDocumentError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}
