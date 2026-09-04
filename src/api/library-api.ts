import type {LibraryResponse} from '../../shared/contracts';
import {requestJson} from './http';

export function fetchLibrary(signal: AbortSignal): Promise<LibraryResponse> {
  return requestJson<LibraryResponse>('/api/library', {signal});
}
