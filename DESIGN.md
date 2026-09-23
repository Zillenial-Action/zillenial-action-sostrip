# Sostrip customer account UI

## Direction

- Identity: a practical ticket companion for Sostrip participants, with the existing magenta and warm-neutral palette.
- Typography: Hanken Grotesk carries headings; Inter carries labels, form controls, and supporting copy.
- Energy: 2. The interface should feel active through the brand color and clear actions, not through decorative effects.
- Rhythm: 1. Auth and account screens keep a calm, predictable reading order because the user is completing a task.
- Motion: 2. Screens arrive with the same reveal behavior used on every other page, and the primary action carries the app's own glow accent. No looping decoration beyond that.

## Component decisions (2026-09-22 update: eye-catching pass, aligned to the rest of the app)

The user asked for the auth/account screens to look eye-catching and match the rest of the app rather than read as a separate, flatter template. The previous "no shadow, sentence-case label" treatment was a deliberate calm baseline, but it also used a different implementation language (hand-rolled CSS with raw hex) from the rest of the app (Tailwind utilities on design tokens, `rounded-2xl` shadow cards, a primary-colored hero band on inner pages, `data-reveal`/`animate-reveal` entrances, `cta-glow` on the primary action). This pass replaces the flat panel with the app's own established motifs instead of inventing new ones:

- Auth and account headers now reuse the same primary-colored, `rounded-b-[32px]` hero band used by `EventDetailHero` and the homepage `HeroSection` (radial highlight overlay, white circular back button, white logo), instead of a plain white row. This is the single highest-impact "eye-catching" change and it is a literal reuse of an existing, shipped pattern, not a new decoration.
- The heading and intro sit inside that colored band in white, the same way the homepage hero carries its headline, and the "Akun Sostrip" kicker is a translucent white pill (same treatment as the category/status pills on `EventDetailHero`), not a duplicate of the H1's own words.
- The form now sits in the same `rounded-2xl` white card with the app's soft magenta-tinted shadow (`shadow-[...rgba(80,67,78,...)]`) used by checkout and event cards, pulled up slightly over the hero band (`-mt-4`) the same way `EventRecommendations` overlaps `HeroSection`. This replaces the bespoke bordered-panel-with-no-shadow treatment.
- Labels switched from sentence case back to the app's own uppercase, tracked eyebrow style used on every checkout field, so every form in the app reads the same way.
- The primary submit button on each auth form (and nowhere else on these screens) carries `cta-glow`, the same pulsing-shadow accent used on the checkout and event ticket sticky CTAs, as the one deliberate accent per screen.
- Account order rows and the account button keep one restrained radius, now pill-shaped and pulled from the same radius/shadow language as the rest of the app's cards and CTAs, still with no ornamental stripe and status color paired with a text label.
- OAuth callback still uses text hierarchy and a live status message instead of a decorative icon-in-circle loading treatment; only its color values moved from raw hex to the shared tokens.
- Login fields keep relevant mail, lock, and visibility icons to improve scanning without replacing their text labels.
- The primary login icon still changes to a spinner and explicit loading label only while authentication is processed, so motion confirms the user's action.
- Google sign-in still uses the provider mark to distinguish OAuth from the email and password action at a glance.
- Auth fields, notices, page headers, icons, and async action buttons remain shared components so every account screen presents the same states and interaction language.
- Account order styles stay on globally available, account-prefixed selectors because the order cards are created in the browser after Astro renders the page.
- Bottom navigation has only real destinations: Beranda, Event, and Akun. The active top rule is a state indicator, not decoration.
- The page reserves space for the fixed navigation and respects the device safe area so the last action remains reachable.

## Validation and feedback (2026-09-22 update: strong passwords, toast output)

- Register and reset-password now require a strong password (15-72 characters, upper and lower case, a number, a symbol), enforced identically on the client (`validateStrongPassword` in `lib/auth-form.ts`) and the server (`CustomerAuthController::strongPasswordRule`), so a user can never end up in a state the two sides disagree on.
- Both password-creation screens show a live 4-segment strength bar (`PasswordStrengthBar.astro`) under the password field. It pairs color with a text label ("Kekuatan password: Kuat") rather than color alone, and every color used passes 4.5:1 against the white card.
- Auth form feedback (validation summaries, API errors, and the forgot/reset success messages) now goes through the app's existing global toast (`window.toast`, from `Toast.astro`) instead of the page's own inline `AuthNotice` banner, so auth matches how the rest of the app already surfaces transient feedback (see `EventDetailHero`'s share-link copy toasts). Per-field inline errors under each input stay as-is, since those point at a specific field rather than summarizing the whole form. `AuthNotice` itself stays in use on `dashboard/akun.astro`, which is a persistent account-state banner, not a one-off submit result.
