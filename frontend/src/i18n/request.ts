import { getRequestConfig } from 'next-intl/server';

// Single-locale setup (no URL prefix). Default = zh-TW per ADR-0007.
// `en` is shipped as a stub bundle so the keying machinery is exercised
// but no `/en/...` routes exist. If we ever introduce a locale switcher
// or URL prefix, this is the file that grows to handle that.
const DEFAULT_LOCALE = 'zh-TW' as const;

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  messages: (await import(`@/messages/${DEFAULT_LOCALE}.json`)).default,
}));
