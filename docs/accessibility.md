# Accessibility

Target: WCAG 2.2 level AA where practical. This is the result of automated
checks plus keyboard testing (Phase 8D, October 2026) — not a full audit with
assistive-technology users, so it isn't a claim of full compliance.

## How it was checked

- **axe-core 4.10** (WCAG 2.0/2.1/2.2 A and AA rules, plus best practices) on
  every page with a sample week of data, at desktop (1360px) and phone (390px)
  widths, and in open states: task editor, Quick Add, a task's ⋯ menu, the
  phone "More" sheet, Plan a session, and the sign-in, create-account,
  forgot-password and reset-password screens.
- **Lighthouse accessibility** on Today, Tasks, Sprints, Calendar, Progress and
  Brain Dump: 91–96 before, **100 on all six** after.
- **Keyboard-only run-through**: skip link; Tab through Today, Tasks and
  Projects checking every stop has a visible focus indicator; Quick Add (N),
  focus kept inside dialogs, Escape to close; Space to complete a task; ⋯ menus
  with Enter, arrow keys and Escape (focus returns to the button); moving
  tasks between sprints without dragging.
- **Reduced motion**: with the system setting on, transitions and animations
  are switched off.

## What was fixed

- Colour contrast: secondary and faint text colours darkened to at least
  4.5:1; sidebar section labels; darker text shades for the amber and teal
  sprint names; darker red for overdue and delete labels; blue links now get
  darker (not lighter) on hover; completed calendar items less faded.
- Tab strips that filter content no longer point screen readers at panels
  that don't exist.
- "Skip to main content" link (first Tab press on every page).
- A clear blue focus outline on anything that doesn't define its own; list
  links that only changed background on focus now show a ring.
- Side panels and the sidebar have distinct names for screen-reader
  navigation; sign-in pages have a main region.
- ⋯ menus follow the WAI-ARIA menu-button pattern (non-modal), so the page
  isn't hidden from screen readers while a menu is open.

Already in place from earlier phases: labelled form fields and icon buttons;
dialogs that trap focus and close with Escape; drag-and-drop alternatives
(⋯ → Move to sprint, and the 1·2·3·4 buttons); about 44 × 44 px tap areas on
touch screens (8A).

## Known remaining items

- axe "region" (best practice, not a WCAG rule): an open menu's popup is
  rendered at the end of the page, outside the main regions. Screen readers
  still announce it as a menu attached to its button.
- Not tested with VoiceOver, TalkBack or NVDA by a person; colour contrast of
  charts' bar colours against each other wasn't assessed (each bar also has a
  text label and value).

## Re-checking

The axe and keyboard scripts used here were run against a local production
build. Lighthouse: `npx lighthouse http://localhost:3000/tasks --only-categories=accessibility`.
