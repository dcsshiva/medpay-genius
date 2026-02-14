

## Fix: Chatbot Navigation Links Opening in New Tab

### Problem
ReactMarkdown sanitizes URLs and strips non-standard protocols like `nav://`. This means the custom link handler never matches `href?.startsWith('nav://')`, so every link falls through to the regular `<a target="_blank">` branch, opening a new browser tab.

### Solution
Add the `urlTransform` prop to `ReactMarkdown` to allow the `nav://` protocol to pass through unsanitized. This is a one-line fix.

### Changes

**File: `src/components/AIChatbot.tsx`**

Add a `urlTransform` prop to the `<ReactMarkdown>` component that preserves `nav://` URLs while keeping default sanitization for all other URLs:

```tsx
<ReactMarkdown
  urlTransform={(url) => {
    if (url.startsWith('nav://')) return url;
    return url; // default behavior
  }}
  components={markdownComponents}
>
  {processContent(msg.content)}
</ReactMarkdown>
```

This ensures `nav://` URLs reach the custom `a` component handler, which renders them as in-page navigation buttons instead of external links.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/AIChatbot.tsx` | Add `urlTransform` prop to `ReactMarkdown` to allow `nav://` protocol |

