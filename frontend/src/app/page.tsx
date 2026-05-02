import { getTranslations } from 'next-intl/server';

// Placeholder page for M3-A. The real shell (3 tabs + sub-cat dropdown
// + card list area) is built in M3-C. Right now this validates that:
//   - Next.js App Router renders
//   - next-intl loads zh-TW dictionary on the server
//   - Tailwind tokens (jko-red) work
//   - Layout renders with the right lang attribute
export default async function Home() {
  const t = await getTranslations();

  return (
    <main className="flex flex-col flex-1">
      <header className="bg-(--color-jko) text-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-4 text-center">
          <h1 className="text-lg font-semibold">{t('header.title')}</h1>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 text-zinc-600">
        <p className="text-sm">
          {/* Placeholder copy — M3-C replaces this with the real shell. */}
          M3-A scaffold check: Next.js + Tailwind + next-intl wired. Tabs,
          sub-category dropdown, and card list land in M3-C.
        </p>
      </section>
    </main>
  );
}
