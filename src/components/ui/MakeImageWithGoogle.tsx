"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * "Make one with Google" for the shop editor's image fields — the free route a
 * vendor can always take.
 *
 * This is what `AiImageButton` became. That component also carried a "Generate with
 * AI" button wired to `/api/seller/shop/image`, and this one does not, because the
 * in-app generator cannot run at a $0 provider balance: there is no free image tier
 * on any of the providers we checked, so the button was an affordance whose first
 * real use always failed. The route is kept and still works if the account is ever
 * funded — see its header — but nothing in the UI calls it.
 *
 * What is left is the whole component: Google's two image generators, one click away,
 * with the steps spelled out. The steps are not padding — "describe your shop to
 * Google" is not enough to get an image out of either one.
 *
 * Rendered from **both** `ImageUpload` and `ImageGalleryUpload`. Those two do not
 * share an upload path — the gallery has its own `fetch("/api/upload")` — so this is a
 * child they each render rather than something either one inherits. It reports
 * nothing back: the vendor downloads the picture and uploads it through the parent,
 * exactly as if they had taken it themselves.
 */

/**
 * Primary target. Its country availability is broad and its flow is "describe it, it
 * appears", which is the workflow the helper copy walks through. Needs a Google
 * account.
 */
const GEMINI_IMAGE_URL = "https://gemini.google.com/app";

/**
 * The alternative route, for the countries where Gemini's image tools are not offered.
 *
 * This used to be `labs.google/fx/tools/image-fx`, labelled "ImageFX". Google retired
 * standalone ImageFX into Flow, so that URL now redirects into Flow while the label
 * still promised ImageFX — a vendor who clicked it arrived somewhere the copy had not
 * described and had to guess what to do. The destination was always Flow; only the
 * name was wrong. Flow's image mode is also behind a selector that defaults to
 * *video*, which is why the steps below spell that one out.
 */
const FLOW_URL = "https://labs.google/fx/tools/flow";

/**
 * One class string for both route buttons, shared rather than written twice.
 *
 * They used to differ on purpose — Gemini took a tinted green fill, Flow an outline —
 * to say "try this one first". The user asked for them to look alike: an outlined
 * control reads as the lesser option even when it is not, and Flow is the route for
 * exactly the countries where Gemini's image tools are missing, so it is the *only*
 * option there. Identical means neither one looks like the fallback.
 *
 * Sharing the constant is the point, not a tidy-up: the failure being fixed was the two
 * buttons carrying different styles, and two literals can drift again.
 *
 * What this costs is the ordering signal the fill used to carry. What replaces it is
 * position (Gemini first) and the steps panel, which walks through Gemini first. The
 * names stay **Gemini** and **Flow** rather than becoming "Google": Google makes both
 * products, so a "Make one with Google" label beside another Google link would name the
 * pair, not the route.
 */
const ROUTE_BUTTON =
  "inline-flex items-center gap-1.5 rounded-md border border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors";

interface MakeImageWithGoogleProps {
  className?: string;
}

function ExternalArrowIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14 5h5v5M19 5l-8 8M18 14v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h4"
      />
    </svg>
  );
}

export default function MakeImageWithGoogle({
  className = "",
}: MakeImageWithGoogleProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className={cn("mt-2", className)}>
      <p className="text-xs text-gray-400">
        No photo yet? Google can make one free — describe your shop, save the picture it gives
        you, then upload it here.{" "}
        <button
          type="button"
          onClick={() => setShowHelp((h) => !h)}
          className="text-green-600 dark:text-green-400 font-semibold underline cursor-pointer"
        >
          {showHelp ? "Hide the steps" : "Show the steps"}
        </button>
      </p>

      {/* Both routes are visible at once and carry the *same* button styling, via the
          shared `ROUTE_BUTTON` above. The link used to be `text-gray-500` with no
          underline and read as a caption — the user's report was "if one does not know
          this is a link, how does he click it?" — and it then became a grey outline,
          which fixed the "is it a link" half and left the "which one is the real
          option" half implying Flow was second-best. Both are filled now. With no
          in-app generator left, burying either one behind the collapsed panel would
          hide half the feature. */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <a
          href={GEMINI_IMAGE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={ROUTE_BUTTON}
        >
          Make one with Gemini
          <ExternalArrowIcon />
        </a>
        <a
          href={FLOW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={ROUTE_BUTTON}
        >
          Make one with Flow
          <ExternalArrowIcon />
        </a>
      </div>

      {/* The steps are specific on purpose — "describe your shop to Google" is what
          sent the first vendor into Flow with no idea what to do there — and each is
          taken from Google's own documentation rather than guessed. Two of them are
          load-bearing: Gemini answers with *text* unless the prompt asks for an image,
          and Flow opens on video, so its image selector is the step everyone misses.
          The panel is collapsed by default because this component renders three times
          on the shop editor (thumbnail, banner, gallery) and seven open steps each time
          would bury the form. */}
      {showHelp && (
        <div className="mt-2 space-y-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Google Gemini{" "}
              <span className="font-normal text-gray-400">· free · needs a Google account</span>
            </p>
            <ol className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside">
              <li>
                Open Gemini, then choose <strong>Create images</strong> from the tools menu (the
                🍌 icon).
              </li>
              <li>
                Begin your prompt with <strong>&ldquo;Create an image of&hellip;&rdquo;</strong> —
                asked plainly, it can reply with text instead of a picture.
              </li>
              <li>
                Say what you sell, the colours and the style in detail. &ldquo;A bright laundry shop
                with neatly folded white towels and blue detergent bottles on a wooden
                counter&rdquo; works far better than &ldquo;a laundry shop&rdquo;.
              </li>
              <li>Download the image it gives you, then upload it here.</li>
            </ol>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Google Flow{" "}
              <span className="font-normal text-gray-400">
                · if Gemini isn&apos;t offered in your country
              </span>
            </p>
            <ol className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400 list-decimal list-inside">
              <li>
                Open Flow, then click a project — or <strong>+ New</strong> if you have none yet,
                and give it any name. That is the whole sign-up; nothing else needs setting up
                first.
              </li>
              <li>
                Find the prompt box — it sits on the right of the page, or along the bottom on a
                narrow screen — then click the <strong>model name</strong> inside it and pick{" "}
                <strong>Image</strong>. Flow starts on video, so this is the step not to miss.
              </li>
              <li>
                Describe your shop in that same box, click <strong>Generate</strong>, download the
                result, then upload it here.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
