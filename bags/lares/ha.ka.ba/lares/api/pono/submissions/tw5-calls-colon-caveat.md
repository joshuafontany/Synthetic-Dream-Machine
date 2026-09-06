

<a id="/entry"></a>

# Calls ~ an unquoted value carrying a colon

**Branch** `tiddlywiki-com` · **File** `editions/tw5.com/tiddlers/procedures/calls/Calls.tid`

**Title** Document that an unquoted parameter value cannot contain a colon

<a id="/the-claim"></a>

## The claim being corrected

`Calls` tells a reader when delimiters may be dropped:

> Each parameter value can be enclosed in single quotes, double quotes, triple double quotes or double square brackets. Triple double quotes allow a value to contain almost anything. **If a value contains no spaces or single or double quotes, it requires no delimiters.**

That last sentence promises more than the grammar allows, and the gap stays silent. A value carrying a colon also needs delimiters, because `name:value` reads as call syntax itself: the parser takes the text before the colon as a parameter name. The positional parameter is never filled, and the value leaves the output with no error anywhere.

`Call Syntax` already states this correctly. `param-name ":" value` stands as one of its productions, and `param-name` reads as a sequence of letters, digits, hyphens and underscores. A URI scheme spells with exactly those characters, so `https://example.com` matches the named-parameter form. The prose in `Calls` reaches past its own grammar.

<a id="/the-change"></a>

## The proposed change

Replace the closing sentence of that paragraph, and set a warning beneath it.

**From:**

```
If a value contains no spaces or single or double quotes, it requires no delimiters.
```

**To:**

```
If a value contains no spaces, quotes or colons, it requires no delimiters.

<<.warning """A colon in an unquoted value reads as the separator of a named parameter: in
`<<my-procedure https://example.com>>` the parser takes `https` as a parameter name, and the
positional parameter receives nothing. Enclose such a value in quotes, or label it with a
parameter name — `<<my-procedure address=https://example.com>>` — where no quotes are needed.""">>
```

<a id="/for-the-reviewer"></a>

## Notes for the reviewer

A tiddler title needs no delimiters, and the reason carries the whole behaviour: `$:/some/tiddler` fails the parameter-name test at `$:/some`, so it rides whole. A URI scheme passes that test. Nothing else separates the two cases.

The `name=value` form asks the least of an author, since it drops the quoting entirely — the `=` binds before the value's colon arrives.

<a id="/measured"></a>

## Measured

Rendered in TiddlyWiki against `\procedure link-to(target)` returning `[target=<<target>>]`:

|  call |  output |
|---|---|
| `<<link-to https://example.com>>` | `[target=]` |
| `<<link-to 12:30>>` | `[target=]` |
| `<<link-to "https://example.com">>` | `[target=https://example.com]` |
| `<<link-to target="https://example.com">>` | `[target=https://example.com]` |
| `<<link-to target=https://example.com>>` | `[target=https://example.com]` |
| `<<link-to $:/some/tiddler>>` | `[target=$:/some/tiddler]` |

A time of day trips the case a URI trips, so the warning leads with the general shape rather than with URIs alone.

<a id="/edges"></a>

- `lar:///ha.ka.ba/lares/docs/relational-parameter`
- `lar:///ha.ka.ba/lares/api/pono/tiddlywiki-wikitext`
