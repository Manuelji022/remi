// Server-only, development-only: functions.ts imports this module and only
// calls it when isAiMockEnabled(). It never performs network I/O.
export const MOCK_DECISION_SEED = 17
const GATEWAY_DECISION_URL = 'https://ai-gateway.vercel.sh/v4/ai/decision-model'

// In-process Gateway stand-in for the real AI SDK transport. `decision-ok`
// answers with the LAST candidate (proving a non-first selection);
// `decision-invalid` answers with an id that is not a candidate.
export function mockDecisionFetch(
  scenario: 'decision-ok' | 'decision-invalid',
): typeof fetch {
  return async (url, init) => {
    if (String(url) !== GATEWAY_DECISION_URL)
      throw new Error('Mock Decisions transport only answers the Gateway')
    const body = JSON.parse(String(init?.body))
    const ids = Object.keys(body.questions.selectedMenu.criteria)
    const choice =
      scenario === 'decision-ok' ? ids[ids.length - 1] : 'menu-unknown'
    const state = JSON.parse(body.stateParts[0].text)
    // Read by the real-stack harness from the server log; no data beyond ids.
    console.info(
      'DECISION_MOCK_TRANSPORT',
      JSON.stringify({
        scenario,
        candidateCount: ids.length,
        choice,
        selected: state.candidates[choice] ?? null,
      }),
    )
    return Response.json({
      answers: { selectedMenu: { type: 'choice', choice } },
    })
  }
}
