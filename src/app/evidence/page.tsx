import Link from "next/link";
import {
  ArrowLeft,
  FlaskConical,
  ClipboardCheck,
  ScanFace,
} from "lucide-react";
import { Brand } from "@/components/brand";

export const metadata = { title: "Prototype test notes · StillYou" };

export default function Evidence() {
  return (
    <div className="about-page">
      <header className="landing-nav">
        <Brand />
        <Link href="/studio" className="text-link">
          <ArrowLeft size={15} /> Open your space
        </Link>
      </header>
      <main id="main" className="about-content">
        <span className="eyebrow">PROTOTYPE TEST NOTES · OCTOBER 20, 2026</span>
        <h1>
          Useful comparisons.
          <br />
          <em>Visible limitations.</em>
        </h1>
        <p className="lead">
          StillYou helps you explain a wig purchase decision: what looks
          familiar, what the seller says, why you prefer it, and what you still
          need to ask.
        </p>
        <section>
          <ClipboardCheck />
          <h2>What happens after the preview</h2>
          <ol className="evidence-steps">
            <li>Set your own priorities and item budget.</li>
            <li>
              Review the original photo, actual wig reference and generated
              result together.
            </li>
            <li>
              Compare price, shade, cap, fibre and return conditions with links
              to their sources.
            </li>
            <li>
              Save your current pick and the reason for choosing it. Unanswered
              questions stay on your printable decision card.
            </li>
          </ol>
          <p>
            Family votes remain a separate opinion. Changing the selected
            variant clears its old review; changing material product facts or
            priorities requires you to save your choice again. There is no
            automatic best-wig score.
          </p>
        </section>
        <section>
          <FlaskConical />
          <h2>What we actually tested</h2>
          <div className="evidence-table-wrap">
            <table className="evidence-table">
              <thead>
                <tr>
                  <th>Reference set</th>
                  <th>Observed result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>5 commercial wig variants on faceless mannequin heads</td>
                  <td>
                    All 5 rejected with <code>error_no_face</code>. These
                    product images did not produce previews.
                  </td>
                </tr>
                <tr>
                  <td>
                    5 physical wigs on mannequins with painted faces, cropped
                    from 2 licensed photographs
                  </td>
                  <td>
                    All 5 generated. Visual inspection found 3 useful broad
                    style impressions and 2 with important fringe or length
                    differences.
                  </td>
                </tr>
                <tr>
                  <td>
                    Very short hair source with a painted-face wig reference
                  </td>
                  <td>
                    Generated successfully. Short hair does not always cause an
                    error.
                  </td>
                </tr>
                <tr>
                  <td>2 facial colour responses</td>
                  <td>
                    Both omitted hair-colour fields. No shade-match score is
                    shown.
                  </td>
                </tr>
                <tr>
                  <td>Hat preview</td>
                  <td>
                    Generated, but changed face, clothing and framing. Kept as
                    an experimental extra.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The five painted-face references depict physical display wigs. They
            are not linked to current retail SKUs. This was a small technical
            test on one main provider demonstration face, plus one short-hair
            source—not a representative accuracy study.
          </p>
          <p>
            “Useful” describes our visual inspection of silhouette and colour
            direction. It does not verify identity preservation, exact shade,
            fit or comfort. Retail-product fidelity remains unproven.
          </p>
          <p>
            Live mode is a separate 2D overlay from a saved YouCam result.
            Browser tests exercised real hair segmentation and face tracking
            with a moving demonstration portrait: movement, face loss and
            recovery, camera cleanup and no frame uploads passed. These were
            simulated-camera tests, not physical-device or 3D wig validation.
          </p>
        </section>
        <section>
          <ScanFace />
          <h2>What still needs evidence</h2>
          <p>
            We have not measured purchase confidence, reduced returns or money
            saved, and have not run a study with people choosing wigs around
            treatment. These are intended benefits, not established results.
          </p>
          <p>
            Before wider use, the prototype needs permitted on-person product
            tests, more varied faces and lighting, physical-device camera
            checks, and feedback from intended users. Webcam capture and photo
            upload are both available; a saved photo is always labelled with its
            date.
          </p>
        </section>
        <section>
          <h2>Reference provenance</h2>
          <p>
            Painted-face mannequin references:{" "}
            <a
              className="text-link"
              href="https://commons.wikimedia.org/wiki/File:Three_mannequin_heads_in_brightly-colored_wigs.jpg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Arnaud de Gramont · CC BY-SA 3.0
            </a>{" "}
            and{" "}
            <a
              className="text-link"
              href="https://commons.wikimedia.org/wiki/File:Mannequin_wigs.jpg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Dslcards · CC BY-SA 4.0
            </a>
            . Crops were used for technical evaluation. Private test photographs
            and generated results are not embedded on this page.
          </p>
          <p>
            YouCam Hair Style VTO generates the wig impressions. Makeup VTO
            supports the optional brow preview with smoothing disabled. Hat VTO
            and Facial Color Tones Analyzer have the limitations described
            above.
          </p>
        </section>
        <Link href="/studio" className="button button-primary">
          Start your own comparison
        </Link>
      </main>
    </div>
  );
}
