import {vi} from 'vitest';

type ProgressInput = {loaded: number; total: number};

export class FakeXMLHttpRequest {
  method = '';
  url = '';
  status = 0;
  responseText = '';
  requestBody: Document | XMLHttpRequestBodyInit | null = null;
  withCredentials = false;
  upload = {
    onprogress: null as ((event: ProgressEvent<EventTarget>) => void) | null,
  };
  onabort: ((event: ProgressEvent<EventTarget>) => void) | null = null;
  onerror: ((event: ProgressEvent<EventTarget>) => void) | null = null;
  onload: ((event: ProgressEvent<EventTarget>) => void) | null = null;

  open = vi.fn((method: string, url: string) => {
    this.method = method;
    this.url = url;
  });

  send = vi.fn((body: Document | XMLHttpRequestBodyInit | null = null) => {
    this.requestBody = body;
  });

  abort = vi.fn(() => {
    this.onabort?.(new ProgressEvent('abort'));
  });

  progress({loaded, total}: ProgressInput) {
    this.upload.onprogress?.(new ProgressEvent('progress', {
      lengthComputable: true,
      loaded,
      total,
    }));
  }

  respond(status: number, body: unknown = undefined) {
    this.status = status;
    this.responseText = body === undefined ? '' : JSON.stringify(body);
    this.onload?.(new ProgressEvent('load'));
  }

  fail() {
    this.onerror?.(new ProgressEvent('error'));
  }
}

export const createdXhrs: FakeXMLHttpRequest[] = [];

export function installFakeXhr() {
  const original = globalThis.XMLHttpRequest;
  createdXhrs.length = 0;
  globalThis.XMLHttpRequest = class extends FakeXMLHttpRequest {
    constructor() {
      super();
      createdXhrs.push(this);
    }
  } as unknown as typeof XMLHttpRequest;

  return () => {
    globalThis.XMLHttpRequest = original;
    createdXhrs.length = 0;
  };
}
