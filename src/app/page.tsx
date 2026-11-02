import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  ImagePlus,
  LockKeyhole,
  Sprout,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Portrait } from "@/components/portrait";

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/about">Made with care</Link>
        </nav>
        <Link href="/studio" className="button button-small button-secondary">
          Your space <ArrowUpRight size={15} />
        </Link>
      </header>
      <main id="main">
        <section className="hero">
          <div className="hero-copy">
            <div className="pill">
              <span className="status-dot" /> A little reassurance. A little
              more choice.
            </div>
            <h1>
              Your hair may change.
              <br />
              <em>You are still you.</em>
            </h1>
            <p>
              Choosing a wig around hair loss is more than choosing a style. Compare
              real options, weigh cost and return terms, and keep a clear reason for your choice.
            </p>
            <Link href="/studio" className="button button-primary button-large">
              Find your familiar <ArrowRight size={19} />
            </Link>
            <div className="hero-footnote">
              <LockKeyhole size={14} />
              <span>Your photos stay private. No account needed.</span>
            </div>
          </div>
          <div
            className="hero-art"
            aria-label="Illustrated hairstyle studies, not AI try-on results"
          >
            <div className="hero-art-top">
              <span className="tiny-caps">A SPACE TO FEEL LIKE YOURSELF</span>
              <Sprout size={22} strokeWidth={1.2} />
            </div>
            <div className="hero-portrait main-portrait">
              <Portrait variant={1} shade="#594034" skin="#deb393" />
              <span className="portrait-caption">Something familiar</span>
            </div>
            <div className="hero-portrait little-portrait">
              <Portrait variant={0} shade="#594034" skin="#deb393" />
              <span className="portrait-caption">
                A new possibility <Heart size={13} />
              </span>
            </div>
            <div className="art-note">
              <span className="handwritten">
                Room for a little
                <br />
                possibility.
              </span>
              <svg
                viewBox="0 0 100 70"
                width="68"
                height="48"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 8C58 1 87 28 63 56M62 43L63 57L79 52"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="art-disclosure">
              Style illustrations · your preview starts with your photo
            </div>
          </div>
        </section>
        <div className="reassurance-strip">
          <span>
            <Check size={16} /> Your pace, your choice
          </span>
          <span>
            <Check size={16} /> A saved photo to come back to
          </span>
          <span>
            <Check size={16} /> Honest previews, practical next steps
          </span>
        </div>
        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A FEW SMALL STEPS</span>
              <h2>A familiar place to begin.</h2>
            </div>
            <p>
              Made for the decisions around hair loss.
              <br />
              There is no right way to look. Only your way.
            </p>
          </div>
          <div className="how-grid">
            <article>
              <span className="step-icon">
                <ImagePlus size={23} strokeWidth={1.4} />
              </span>
              <span className="step-number">01</span>
              <h3>Keep a photo of you</h3>
              <p>
                Start with a clear photo you like. A saved reference can still
                be used if a newer photo is unsuitable.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Sprout size={24} strokeWidth={1.4} />
              </span>
              <span className="step-number">02</span>
              <h3>Compare the real trade-offs</h3>
              <p>
                Review each wig beside your original photo and its reference. Try its hair layer live, then compare price, shade and seller return terms.
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Heart size={23} strokeWidth={1.4} />
              </span>
              <span className="step-number">03</span>
              <h3>Choose with a little support</h3>
              <p>
                Record why one option suits you, invite a trusted opinion, and take your unanswered questions to the seller.
              </p>
            </article>
          </div>
        </section>
        <section className="gentle-banner">
          <div>
            <span className="eyebrow">ALWAYS ON YOUR TERMS</span>
            <h2>A preview is a starting point.</h2>
            <p>
              See possibilities for colour and style. Check fit, comfort and
              return policies with the seller before you buy.
            </p>
          </div>
          <Link href="/about" className="text-link">
            What a preview can tell you <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>A familiar reflection. A little more choice.</p>
        <Link href="/about">Privacy & preview limits</Link>
      </footer>
    </div>
  );
}
