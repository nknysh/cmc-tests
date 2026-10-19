/** The failing test's attachment that the CoinBoard locator heal reads. */
export const DOM_SNAPSHOT_ATTACHMENT = 'dom snapshot'
/** Longest DOM snapshot attached to a failing test, in characters. */
export const DOM_SNAPSHOT_MAX_LENGTH = 20_000

/**
 * Serializes an element's tag, the attributes locators key off and its direct text, for the
 * CoinBoard locator self-heal (`.agents/coinboard-locators/`). An ARIA snapshot alone drops the
 * `data-testid` and `for` attributes some page object locators use. Class and style are left
 * out as noise. It runs in the browser via `locator.evaluate`, so it must stay self-contained.
 */
export function serializeElement(root: Element): string {
  const KEEP_ATTRS = /^(data-|aria-|role$|id$|href$|for$|name$|type$|value$|selected$|disabled$)/
  const MAX_DEPTH = 20
  // A coin select holds ~100 options; a few show their shape without crowding out the rest of the page.
  const MAX_SELECT_OPTIONS = 5
  const serialize = (el: Element, depth: number): string => {
    if (depth > MAX_DEPTH) return ''
    const tag = el.tagName.toLowerCase()
    if (tag === 'script' || tag === 'style' || tag === 'svg') return `<${tag}></${tag}>`
    const attrs = Array.from(el.attributes)
      .filter((a) => KEEP_ATTRS.test(a.name))
      .map((a) => `${a.name}="${a.value}"`)
      .join(' ')
    const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`
    const directText = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join(' ')
    const childElements = Array.from(el.children)
    const shown = tag === 'select' ? childElements.slice(0, MAX_SELECT_OPTIONS) : childElements
    const hidden = childElements.length - shown.length
    const children = shown.map((c) => serialize(c, depth + 1)).join('') + (hidden > 0 ? `<!-- ${hidden} more -->` : '')
    return `${openTag}${directText}${children}</${tag}>`
  }
  return serialize(root, 0)
}
