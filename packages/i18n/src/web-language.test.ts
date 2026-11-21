import { expect, it } from 'vitest';
import { matchWebLanguage } from './web-language.ts';

it('maps a detected country to a supported language before falling back to browser preferences', () => {
  expect(matchWebLanguage('PK', ['en-US'])).toBe('ur');
  expect(matchWebLanguage('SA', ['en-US'])).toBe('ar');
  expect(matchWebLanguage('BD', ['hi-IN'])).toBe('bn');
  expect(matchWebLanguage('BR', ['es-ES'])).toBe('pt-BR');
  expect(matchWebLanguage('US', ['fr-FR', 'es-MX'])).toBe('es');
  expect(matchWebLanguage(null, ['tl-PH'])).toBe('fil');
  expect(matchWebLanguage(null, ['de-DE'])).toBe('en');
});
