import Link from "next/link";
import { ArrowLeft, Heart, LockKeyhole, ScanFace } from "lucide-react";
import { Brand } from "@/components/brand";

export default function About() {
  return (
    <div className="about-page">
      <header className="landing-nav">
        <Brand />
        <Link className="text-link" href="/studio">
          <ArrowLeft size={15} /> Back to your space
        </Link>
      </header>
      <main id="main" className="about-content">
        <span className="eyebrow">MADE WITH CARE</span>
        <h1>
          A little clarity.
          <br />
          <em>A lot of choice.</em>
        </h1>
        <p className="lead">
          StillYou is a space to explore appearance while choosing a wig. Your
          preferences come first, including the choice not to wear one.
        </p>
        <section>
          <ScanFace />
          <h2>What a preview shows</h2>
          <p>
            An AI preview offers an impression of colour and style. It may
            change details of your face, hairline, clothing or background.
            Compare it with your original photo. It cannot verify fit, comfort,
            cap construction, fibre feel or exact colour.
          </p>
          <p>
            Live mode takes the hair layer from a saved AI preview and follows
            your face in the camera. This is a front-facing 2D overlay, not a 3D
            wig or a way to inspect its back. Your own hair may remain visible.
            Alignment controls do not measure cap size. Large turns or lost face
            tracking hide the overlay.
          </p>
          <p>
            Every result names the date of the source photo. A saved photo shows
            an earlier appearance; it does not predict how you look now or how
            you will look during treatment. A hat preview may also change
            clothing and background, and does not predict appearance without
            hair.
          </p>
          <p>
            Colour analysis may provide a broad hair-colour family from a photo.
            Our tested responses omitted this value; the app shows when it is
            unavailable. Lighting and dye affect the result. It is not a
            calibrated measurement or a match percentage. Brow previews
            explicitly turn off skin smoothing, though generated results still
            require your review.
          </p>
        </section>
        <section>
          <LockKeyhole />
          <h2>Your photos, your control</h2>
          <p>
            You confirm permission before saving photos. A private browser
            cookie opens your workspace without an account. Use this browser to
            return; clearing the cookie removes access. Workspaces expire after
            30 days and expired photos are deleted by the daily cleanup job or
            when an expired workspace is accessed.
          </p>
          <p>
            Photos are resized and image metadata is removed. When you request a
            preview, the required photos are sent to our AI processing provider,
            Perfect Corp. Provider processing and retention follow its own
            terms. Deleting your StillYou workspace removes our stored copies;
            it does not reverse processing already performed by the provider.
          </p>
          <p>
            Live-mode camera frames are processed locally in this browser with
            MediaPipe. They are not uploaded or saved. Opening the live panel
            does not start your camera until you choose Start live preview.
            Closing it, switching wigs or putting the tab in the background
            stops the camera.
          </p>
          <p>
            Family sharing is optional. Only the selected generated previews and
            their choice names are shared, for up to seven days. Anyone with the
            link can view, vote or save a copy. Your original photos, product
            policy notes and other previews stay private. You can revoke the
            link at any time, but cannot recall copies someone has saved.
          </p>
          <p>
            This is a hackathon prototype. Avoid uploading confidential
            documents or photos you do not have permission to use.
          </p>
        </section>
        <section>
          <Heart />
          <h2>Support, without assumptions</h2>
          <p>
            Nothing here is medical advice, a treatment prediction or an
            insurance guarantee. Return policies depend on the seller and item.
            Policy notes are entered by you, not independently verified by
            StillYou. Financial assistance and coverage depend on eligibility
            and current availability.
          </p>
          <p>
            Style drawings in the app are illustrations, not purchasable
            products or completed AI previews. Custom wig-reference fidelity
            must be checked with the actual reference images before relying on
            the comparison.
          </p>
          <p>
            Your comparison combines your priorities, a personal preview review,
            seller facts you record and questions still to confirm. Family votes
            are a separate opinion. StillYou never selects a best wig for you.
            Changing your priorities or the chosen product facts asks you to
            save your decision again.
          </p>
          <Link href="/evidence" className="text-link">
            Read the prototype test notes
          </Link>
        </section>
        <Link href="/studio" className="button button-primary">
          Open your space
        </Link>
      </main>
    </div>
  );
}
