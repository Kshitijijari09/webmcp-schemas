# Schema style guide: writing descriptions an LLM can disambiguate

`CONTRIBUTING.md` covers the mechanical review rubric (naming,
required files, annotations). This document is about the one part of
authoring a canonical schema that's genuinely a skill, not a checklist
item: writing a `description` an LLM can use to correctly choose
between tools it's never seen before.

## The test

Before writing a description, imagine an agent that has _only_ the
`name`, `title`, and `description` of every tool in the vertical — no
other context, no memory of prior turns, no access to your site's UI.
Ask: **could it correctly pick this tool over its closest siblings,
every time?** If you're not confident, the description isn't done.

This is a stricter bar than "does this describe what the tool does."
A perfectly accurate description can still fail the test if a sibling
tool is equally accurate and the two overlap.

## What actually goes wrong

**1. Two tools describe overlapping actions with no tiebreaker.**

```
❌ search_products: "Search the product catalog."
❌ apply_filters:   "Filter the product catalog."
```

An agent given a query with both a search term and a price range has
no way to know which one to call, or in what order. Compare the real
retail versions:

```
✅ search_products: "...Use this first when you don't yet know a
   specific product's ID or exact name. Use check_stock instead once
   you already have a productId and only need to know availability.
   Use apply_filters instead of repeating this call if you just need
   to narrow the current results without changing the search term."

✅ apply_filters: "...Use this after search_products when refining an
   existing result set with facets; use search_products directly
   instead if the user wants a different search term, not just
   narrower results."
```

Each description names its closest siblings by their exact tool name
and states the specific condition that routes to one over the other.
That's the pattern: **don't just describe the tool — describe the
boundary between it and its neighbors.**

**2. The description explains the "what" but not the "when."**

```
❌ get_order_status: "Retrieves an order."
```

Compare:

```
✅ get_order_status: "Look up the current status of a previously
   placed order by orderId — read-only, does not modify the order.
   Use start_return instead if the user wants to return items from a
   delivered order rather than just check where it is."
```

The second version tells the agent not just what the tool returns,
but the specific user intent ("just checking status" vs. "wants to
return items") that should route to it instead of a neighbor.

**3. Vague nouns instead of the tool's actual vocabulary.**

Write descriptions using the same terms your `inputSchema` uses
(`productId`, `cartId`, `orderId`), not generic paraphrases ("the
item", "the thing"). An agent matching a user's request against your
schema benefits from the description echoing the field names it will
actually need to supply.

**4. Missing the confirmation signal in the description itself.**

If `annotations.requiresConfirmation` is `true`, say so in plain
language in the description too — don't rely on the agent reading the
annotation object correctly. Compare:

```
✅ add_to_cart: "...This changes the cart, so it requires user
   confirmation before it runs."
```

This is redundant with the annotation on purpose. Annotations are
structured for code to read; the description is what the agent's
reasoning actually sees first.

## A minimal checklist

- [ ] Does the description name its closest sibling tool(s) by their
      exact `name`, not a vague reference?
- [ ] Does it state the specific condition that should route to this
      tool _instead of_ that sibling — not just what this tool does in
      isolation?
- [ ] Does it use the same field names as `inputSchema`
      (`productId`, not "the item")?
- [ ] If `requiresConfirmation: true`, does the description say so in
      plain language, not just via the annotation?
- [ ] Read it back with no other context — would you route correctly?

## Length

There's no hard character limit, but every retail description in this
registry is 1–3 sentences: what the tool does, then the boundary
condition(s) against its nearest siblings. If a description needs a
fourth sentence to disambiguate, that's usually a sign the tool's
scope overlaps too much with a neighbor and the two should be
reconsidered rather than explained around.
