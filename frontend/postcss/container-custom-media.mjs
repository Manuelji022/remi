/** Expands `@container name (--cq-*)` from the @custom-media block.
 * postcss-custom-media covers @media only. @custom-media names are not valid
 * inside @container, so this mirrors the proposal's build.py substitution.
 */
export default function containerCustomMedia() {
  return {
    postcssPlugin: 'remi-container-custom-media',
    Once(root) {
      const media = new Map()

      root.walkAtRules('custom-media', (atRule) => {
        const match = /^(--[\w-]+)\s+(.+)$/.exec(atRule.params.trim())
        if (!match) return
        media.set(match[1], match[2].trim())
      })

      if (media.size === 0) return

      root.walkAtRules('container', (atRule) => {
        let params = atRule.params
        for (const [name, query] of media) {
          params = params.replaceAll(`(${name})`, query)
        }
        atRule.params = params
      })
    },
  }
}

containerCustomMedia.postcss = true
