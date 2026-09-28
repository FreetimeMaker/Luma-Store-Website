import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: "How Luma Store handles accounts, data and third-party services.",
};

export default function PrivacyPage() {
  return (
    <main className="glass-page mx-auto max-w-4xl space-y-6 px-3 pb-16 sm:px-4 sm:pb-20">
      <section className="glass-panel p-5 sm:p-8">
        <p className="ui-eyebrow mb-3">Privacy</p>
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacy at Luma Store</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
          You do not need an account to browse apps, read app information, or download public releases from Luma Store.
          Sign-in is only required for developer features such as submitting apps, managing published apps, and viewing
          developer analytics.
        </p>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">What Luma Store stores</h2>
        <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
          <p>
            When you use the public store without signing in, Luma Store does not require you to create a profile.
            The store keeps aggregate download statistics so developers can see how often their apps are downloaded.
          </p>
          <p>
            If you sign in as a developer, Luma Store stores the account identifier and profile information supplied
            through the authentication provider as needed to associate submissions and developer settings with your account.
            Data you intentionally submit to the Developer Dashboard, such as app metadata, repository links, release files,
            funding settings, and submission history, is also stored.
          </p>
          <p>
            Luma Store does not sell personal data to advertisers or data brokers.
          </p>
        </div>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Developer sign-in</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Developer access currently uses GitHub or GitLab through Supabase Auth. These services process the sign-in
          themselves and may receive normal connection information such as your IP address and browser details under
          their own privacy policies. Luma Store does not require either provider for normal browsing or downloads.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          GitHub sign-in requests the permissions needed for developer workflows, including access to basic profile
          information and public repositories. Luma Store uses provider access only for features that need it, such as
          developer submissions and repository-backed metadata.
        </p>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Third-party infrastructure</h2>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Luma Store relies on infrastructure providers for hosting, authentication, database, storage, and source-code
          integrations. Those providers may process technical request data required to operate their services. Their own
          privacy policies apply to that processing.
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          The website does not load Google Fonts from Google. UI fonts use local/system resources instead of making a
          font request to Google when you visit the site.
        </p>
      </section>

      <section className="glass-panel p-5 sm:p-8">
        <h2 className="text-xl font-semibold text-white">Your choices</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300">
          <li>Browse and download apps without signing in.</li>
          <li>Create a direct Luma Store email/password account without using a social login provider.</li>
          <li>Use an account only when you need account, submission, or management features.</li>
          <li>Sign out at any time from the Developer Dashboard.</li>
          <li>Contact the project if you need help with developer-account data.</li>
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/" className="ui-button-secondary px-4 py-2.5 text-sm text-white">Back to store</Link>
          <a
            href="https://github.com/FreetimeMaker/Luma-Store-Website/issues"
            target="_blank"
            rel="noreferrer"
            className="ui-button-secondary px-4 py-2.5 text-sm text-white"
          >
            Privacy question / issue for Website ↗
          </a>
          <a
            href="https://github.com/FreetimeMaker/Luma-Store-Android/issues"
            target="_blank"
            rel="noreferrer"
            className="ui-button-secondary px-4 py-2.5 text-sm text-white"
          >
            Privacy question / issue for Android App ↗
          </a>
        </div>
      </section>

      <p className="px-1 text-xs leading-5 text-slate-500">
        Last updated: September 28, 2026. This page describes the current Luma Store Website, Android App and developer dashboard.
      </p>
    </main>
  );
}
