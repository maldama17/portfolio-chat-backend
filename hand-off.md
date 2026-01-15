# Scroll Bug Debug Handoff

## Issue
Users cannot scroll within the chat widget's messages container. When attempting to scroll, the main page body scrolls instead.

---

## 1. Files Inspected

| File | Purpose |
|------|---------|
| `test.html` | Local test page with embedded widget (main debugging target) |
| `widget/embed.html` | Production widget code |
| `.cursor/debug.log` | Runtime instrumentation logs |

---

## 2. Hypotheses Tested

| ID | Hypothesis | Result |
|----|------------|--------|
| H1 | Messages container has no constrained height | **REJECTED** - `flex: 1 1 0; height: 0` fix corrected this |
| H2 | Touch events propagating to body | **INCONCLUSIVE** - scroll events ARE captured |
| H3 | Panel height issue | **REJECTED** - panel height correctly at 736px |
| H4 | `overflow-y: auto` not applied | **REJECTED** - confirmed `overflowY: "auto"` in logs |
| H5 | Content not overflowing | **PARTIALLY CONFIRMED** - with 2 messages, no overflow; with 4+ messages, overflow exists |
| H8 | Missing `touch-action: pan-y` | **APPLIED** - no effect |
| H9 | Wheel events bubbling to body | **INCONCLUSIVE** - wheel handler fires but scroll doesn't happen |
| H11 | Flex container not constraining child height | **FIXED** - `height: 0` + `flex: 1 1 0` corrected scrollHeight calculation |

---

## 3. Changes Made

### CSS Changes to `.mllm-messages`:
```css
/* BEFORE */
.mllm-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* AFTER */
.mllm-messages {
  flex: 1 1 0;
  height: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
}
```

### CSS Changes to `#mllm-panel`:
```css
/* ADDED */
overflow: hidden;
min-height: 0;
```

### JS Changes:
- Added wheel event handler on messages container with `stopPropagation()`
- Added body-level wheel listener to detect event leaks
- Added extensive instrumentation logging

---

## 4. Evidence Gathered

### Log Evidence (key entries):

**With 4 messages (scrollable):**
```json
{"scrollHeight":1155,"clientHeight":585,"canScroll":true}
{"scrollTop":570} // programmatic scroll WORKED
```

**With 2 messages (not scrollable):**
```json
{"scrollHeight":585,"clientHeight":585,"canScroll":false}
```

**Wheel events ARE captured:**
```json
{"location":"test.html:wheel","deltaY":-31,"scrollTop":0,"scrollHeight":585,"clientHeight":585}
```

### Key Observations:
1. Programmatic `scrollTo()` works (confirmed by `scrollTop` changes in logs)
2. Wheel events fire on the messages container (confirmed by wheel handler logs)
3. `scrollHeight > clientHeight` when content overflows (flex fix worked)
4. But **user-initiated scroll does not move scrollTop** even when canScroll=true

---

## 5. Unknowns & Top 3 Most Likely Causes

### What Remains Unknown:
- Why wheel events are captured but don't result in scroll position changes
- Whether the issue is browser-specific (macOS trackpad behavior)
- Whether there's a CSS property conflict we haven't identified

### Top 3 Most Likely Causes:

1. **Passive event listener conflict** - The wheel event handlers are added with `{ passive: true }`, which means they can't call `preventDefault()`. However, something may be preventing the default scroll behavior from executing.

2. **Nested flex scroll container issue** - The `.mllm-messages` is both a flex item (`flex: 1 1 0`) AND a flex container (`display: flex; flex-direction: column`). This nested flex-within-flex with `overflow: auto` may have browser-specific rendering bugs.

3. **`display: flex` on scroll container** - Having `display: flex; flex-direction: column` on the scrollable container itself may interfere with native scroll behavior. The scroll container might need to be a simple `display: block` element, with flex layout only on a wrapper inside it.

---

## Recommended Next Steps

1. **Try removing `display: flex` from `.mllm-messages`** - Use a wrapper div for flex layout instead
2. **Test in different browsers** - Confirm if issue is Safari/Chrome-specific
3. **Check for CSS `pointer-events` interference** - Ensure nothing is blocking scroll input
4. **Simplify the DOM structure** - Remove nested flex containers
