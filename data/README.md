# Adding a project

Projects are rendered from `projects.json`. No code changes are needed — edit the JSON and drop in an image.

## Fields

| Field      | Type    | Notes |
|------------|---------|-------|
| `title`    | string  | Card heading. |
| `intro`    | string  | Card description. |
| `image`    | string  | Path to a `.jpg`, `.png`, or `.gif`, relative to `personal/`. Use `""` for a text-only card (the usual glass card). |
| `link`     | string  | External URL (opens in a new tab) or a local page such as `pages/drawings.html`. Leave `""` for a card with no destination. |
| `featured` | boolean | `true` = shown on the home page. `false` = only on `projects.html`. |

## Example

```json
{
  "title": "My New Project",
  "intro": "One or two sentences about it. Click here to open.",
  "image": "assets/Projects/my_project/cover.png",
  "link": "https://example.com/my-project",
  "featured": true
}
```

## Behaviour

- A project **with** an `image` uses the featured card: the preview rises from the bottom edge of the card, keeps side/top spacing, is cropped at the bottom, and scales up on hover.
- A project **without** an `image` uses the standard glass card.
- `featured: true` → home page (`index.html#projects`).
- All projects (featured and not) → `projects.html`.
- Put images under `personal/assets/Projects/<project-name>/` and reference them from there.
