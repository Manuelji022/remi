type CustomMediaAtRule = {
  params: string
}

type CustomMediaRoot = {
  walkAtRules: (
    name: string,
    callback: (atRule: CustomMediaAtRule) => void,
  ) => void
}

type ContainerCustomMediaPlugin = {
  postcssPlugin: string
  Once: (root: CustomMediaRoot) => void
}

/** Expands `@container name (--cq-*)` from the @custom-media block.
 * postcss-custom-media covers @media only. @custom-media names are not valid
 * inside @container, so this mirrors the proposal's build.py substitution.
 */
function containerCustomMedia(): ContainerCustomMediaPlugin {
  return {
    postcssPlugin: 'remi-container-custom-media',
    Once(root) {
      const media = new Map<string, string>()

      root.walkAtRules('custom-media', (atRule) => {
        const match = /^(--[\w-]+)\s+(.+)$/.exec(atRule.params.trim())
        if (!match?.[1] || !match[2]) return
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

const containerCustomMediaPlugin = Object.assign(containerCustomMedia, {
  postcss: true as const,
})

export default containerCustomMediaPlugin
