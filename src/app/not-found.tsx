import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="empty-page">
      <span className="eyebrow">STILLYOU</span>
      <h1>This page isn’t here.</h1>
      <p>Your space is a good place to start again.</p>
      <Link href="/studio" className="button button-primary">
        Go to your space
      </Link>
    </main>
  );
}
