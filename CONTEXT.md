# Remi

This context covers the language used to describe the weekly meal-planning product so product, frontend, and future backend work all refer to the same concepts consistently.

## Language

**Weekly Menu**:
A generated plan for one calendar week containing the meals to account for on each day.
_Avoid_: Meal plan, weekly plan

**Calendar Week**:
A Monday-through-Sunday time period used as the fixed boundary for a Weekly Menu.
_Avoid_: Rolling week, next 7 days

**Current Calendar Week**:
The Monday-through-Sunday week containing today's date, and the default week shown by the product.
_Avoid_: Active week, this 7-day period

**Past Day**:
A day within the Current Calendar Week that falls before today's date and remains visible in the Weekly Menu.
_Avoid_: Hidden day, expired day

**Meal Slot**:
A required planning position within a day of a Weekly Menu.
_Avoid_: Optional meal, suggestion slot

**Lunch**:
The daytime Meal Slot for a day in a Weekly Menu.
_Avoid_: Brunch, midday option

**Dinner**:
The evening Meal Slot for a day in a Weekly Menu.
_Avoid_: Supper, evening option

**Day Context**:
A user-declared reason why one Meal Slot in a specific day is expected to happen away from home.
_Avoid_: Planned meal, generated meal, whole-day mode

**Office**:
A Day Context indicating the away-from-home meal is expected to happen because of office routine.
_Avoid_: Lunch planned, away meal

**Eat Out**:
A Day Context indicating the away-from-home meal is expected to happen because the user plans to eat outside the home.
_Avoid_: No-menu day, removed day

**Planning Scope**:
The set of Meal Slots within a day that still require planning at home.
_Avoid_: Context, schedule mode

**Home-Planned Meal Slot**:
A Meal Slot that falls within the Planning Scope for a given day and therefore requires planning at home.
_Avoid_: Existing slot, generated slot

**Unplanned Meal Slot**:
A Meal Slot that remains part of the Weekly Menu but intentionally has no planned meal because it falls outside the Planning Scope.
_Avoid_: Missing slot, deleted slot

**Custom Recipe**:
A user-provided recipe that acts as a soft preference for future Weekly Menu generation.
_Avoid_: Required recipe, guaranteed recipe

## Relationships

- A **Weekly Menu** belongs to exactly one **Calendar Week**
- A **Calendar Week** contains exactly seven days: Monday through Sunday
- The product defaults to showing the **Current Calendar Week**
- A **Past Day** still appears within the **Weekly Menu** for the **Current Calendar Week**
- Each day in a **Weekly Menu** contains exactly two **Meal Slots**: **Lunch** and **Dinner**
- A day may also have one **Day Context** that informs planning
- The **Planning Scope** determines which **Meal Slots** still require planning at home
- Each day still retains both **Meal Slots** even when only some are **Home-Planned Meal Slots**
- A **Meal Slot** outside the **Planning Scope** becomes an **Unplanned Meal Slot** rather than being removed
- Every **Unplanned Meal Slot** must be explainable by a **Day Context**
- A **Day Context** explains the away-from-home Meal Slot, while the **Planning Scope** identifies the Home-Planned Meal Slot
- If there is no **Day Context**, the **Planning Scope** must be **Both**
- If there is a **Day Context**, the **Planning Scope** must be exactly one Meal Slot: **Lunch** or **Dinner**
- A **Custom Recipe** influences generation as a soft preference and is not guaranteed to appear in a **Weekly Menu**

## Example dialogue

> **Dev:** "When we generate a **Weekly Menu**, are we generating the next 7 days from today?"
> **Domain expert:** "No, a **Weekly Menu** always belongs to a **Calendar Week**, which runs Monday through Sunday."

> **Dev:** "Which week do we show by default when the user opens the product?"
> **Domain expert:** "Show the **Current Calendar Week** by default, even if the week has already started."

> **Dev:** "Do days that have already passed disappear from the current week's view?"
> **Domain expert:** "No, they remain visible as **Past Days** within the full Weekly Menu."

> **Dev:** "Can a day have a different set of meals, like breakfast or brunch instead of lunch?"
> **Domain expert:** "Not in this phase. Each day has exactly two Meal Slots: **Lunch** and **Dinner**."

> **Dev:** "Does `Office` or `Eat Out` directly replace meals in the Weekly Menu?"
> **Domain expert:** "No. Those are **Day Contexts**. They inform planning, while the **Planning Scope** decides which Meal Slots still need to be planned at home."

> **Dev:** "If only dinner needs home planning on Tuesday, do we remove lunch from the Weekly Menu?"
> **Domain expert:** "No. The day still keeps both Meal Slots. Only one of them is a **Home-Planned Meal Slot**."

> **Dev:** "What happens to a Meal Slot that does not need planning because the user is at the office or eating out?"
> **Domain expert:** "Keep the slot visible, but treat it as an **Unplanned Meal Slot** with no planned meal."

> **Dev:** "Can a Meal Slot be unplanned without any reason attached to the day?"
> **Domain expert:** "No. Every **Unplanned Meal Slot** must be explainable by a **Day Context**."

> **Dev:** "Does `Office` describe the whole day, or just the away-from-home meal?"
> **Domain expert:** "It explains the away-from-home Meal Slot. The Planning Scope tells us which other Meal Slot still needs home planning."

> **Dev:** "Can I pick `Dinner` as the Planning Scope without choosing `Office` or `Eat Out`?"
> **Domain expert:** "No. Without a Day Context, the Planning Scope must be **Both**. A single-slot Planning Scope only makes sense when the other slot is explained by a Day Context."

> **Dev:** "If I add a Custom Recipe, does it have to appear in the Weekly Menu?"
> **Domain expert:** "No. A **Custom Recipe** is a soft preference for generation, not a guaranteed inclusion."

## Flagged ambiguities

- "meal plan" and "weekly menu" were both used for the main product concept — resolved: **Weekly Menu** is the canonical term.
- "week" could have meant a rolling 7-day period or a fixed weekly boundary — resolved: use **Calendar Week** for a Monday-through-Sunday week.
- The default target week could have been the current week or next week — resolved: default to the **Current Calendar Week**.
- Days earlier in the current week could have been hidden or removed — resolved: keep them visible as **Past Days**.
- A day could have contained flexible meal types — resolved: each day contains exactly two **Meal Slots**: **Lunch** and **Dinner**.
- `Office` / `Eat Out` could have been interpreted as the planned meals themselves — resolved: they are **Day Contexts**, while meal coverage is described separately by **Planning Scope**.
- `Office` / `Eat Out` could have been interpreted as whole-day modes — resolved: they explain the away-from-home Meal Slot, not the whole day.
- A Meal Slot could have been removed when it did not require home planning — resolved: both Meal Slots always remain in the Weekly Menu model.
- A non-home-planned Meal Slot could have been filled anyway or removed entirely — resolved: keep it visible as an **Unplanned Meal Slot** with no planned meal.
- A Meal Slot could have been left unplanned without explanation — resolved: every **Unplanned Meal Slot** must be explainable by a **Day Context**.
- The UI could have allowed contradictory combinations of Day Context and Planning Scope — resolved: enforce only valid combinations in the product state.
- A Custom Recipe could have been interpreted as a mandatory inclusion — resolved: it is a soft preference only.
