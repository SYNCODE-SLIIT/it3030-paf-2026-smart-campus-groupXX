# UI Components

Atomic child components for the Smart Campus application. Import from the barrel:

```ts
import { Button, Input, Card, Chip } from '@/components/ui';
```

All colours come from CSS variables defined in `app/globals.css`. Components handle shape, size, radius, and effects — not raw colour values.

---

## Design Tokens (globals.css)

| Token | Example values |
|---|---|
| `--yellow-50` → `--yellow-900` | Primary / brand colour scale |
| `--neutral-0` → `--neutral-950` | Warm greyscale |
| `--red-*` / `--green-*` / `--blue-*` / `--orange-*` | Semantic colour scales |
| `--bg`, `--surface`, `--surface-2`, `--surface-dark` | Backgrounds |
| `--border`, `--border-strong` | Borders |
| `--text-h`, `--text-body`, `--text-muted`, `--text-label` | Text |
| `--radius-sm` `--radius-md` `--radius-lg` `--radius-xl` | 8 / 12 / 16 / 22 px |
| `--font-body` `--font-display` `--font-mono` | Open Sans / Poppins / JetBrains Mono |

Theme switches via `data-theme="light"` or `data-theme="dark"` on `<html>`. Follows system preference automatically; `localStorage` key `theme` persists a manual override.

---

## Button

```tsx
<Button variant="glass" size="md" loading={false} disabled={false} fullWidth={false}>
  Label
</Button>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'glass' \| 'primary' \| 'ghost' \| 'ghost-accent' \| 'subtle' \| 'dark' \| 'danger' \| 'ghost-danger' \| 'success' \| 'info'` | `'primary'` | Visual style |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Height and padding |
| `loading` | `boolean` | `false` | Replaces content with a spinner |
| `disabled` | `boolean` | `false` | Reduces opacity and blocks interaction |
| `fullWidth` | `boolean` | `false` | Stretches to container width |
| `iconLeft` | `ReactNode` | — | Icon before label |
| `iconRight` | `ReactNode` | — | Icon after label |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML button type |
| `onClick` | `MouseEventHandler` | — | Click handler |

All other native `<button>` attributes are forwarded.

---

## Input

```tsx
<Input
  label="Email"
  placeholder="you@campus.edu"
  status="default"
  hint="We will never share your email."
  error=""
  iconLeft={<Icon />}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Field label above the input |
| `status` | `'default' \| 'error' \| 'success'` | `'default'` | Border and focus ring colour |
| `hint` | `string` | — | Helper text shown below (hidden when `error` is set) |
| `error` | `string` | — | Error message; also sets `status` to `error` |
| `iconLeft` | `ReactNode` | — | Icon inside the left edge |
| `iconRight` | `ReactNode` | — | Icon inside the right edge |
| `disabled` | `boolean` | `false` | Reduces opacity and blocks interaction |

All native `<input>` attributes (`type`, `value`, `onChange`, `name`, `id`, `required`, etc.) are forwarded.

---

## Textarea

Same label / hint / error / status / disabled props as `Input`, plus:

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | `4` | Visible row count |
| `resize` | `'none' \| 'vertical' \| 'both'` | `'vertical'` | CSS resize behaviour |

Min-height is 90 px. All native `<textarea>` attributes are forwarded.

---

## Select

```tsx
<Select
  label="Role"
  options={[{ value: 'student', label: 'Student' }, { value: 'staff', label: 'Staff' }]}
  placeholder="Choose…"
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `{ value: string; label: string }[]` | — | Dropdown options |
| `placeholder` | `string` | — | Disabled first option shown when nothing is selected |
| `label` / `hint` / `error` / `status` / `disabled` | — | — | Same as `Input` |

All native `<select>` attributes are forwarded.

---

## Checkbox

```tsx
<Checkbox label="Accept terms" checked={checked} onChange={handleChange} />
```

| Prop | Type | Description |
|---|---|---|
| `label` | `string` | Text next to the checkbox |
| `checked` | `boolean` | Controlled checked state |
| `defaultChecked` | `boolean` | Uncontrolled initial state |
| `onChange` | `ChangeEventHandler<HTMLInputElement>` | Change handler |
| `disabled` | `boolean` | Disables interaction |

All native `<input type="checkbox">` attributes are forwarded.

---

## Radio

Same API as `Checkbox`. Use the same `name` on a group of radios to make them mutually exclusive.

```tsx
<Radio label="Option A" name="group" value="a" />
<Radio label="Option B" name="group" value="b" />
```

---

## Toggle

```tsx
<Toggle label="Notifications" checked={on} onChange={(checked) => setOn(checked)} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Text next to the toggle |
| `checked` | `boolean` | — | Controlled state |
| `defaultChecked` | `boolean` | `false` | Uncontrolled initial state |
| `onChange` | `(checked: boolean) => void` | — | Called with the new boolean value |
| `disabled` | `boolean` | `false` | Disables interaction |

---

## Card

```tsx
<Card variant="default" hoverable image="/photo.jpg" footer={<Actions />}>
  Card content goes here.
</Card>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'default' \| 'dark'` | `'default'` | Light surface or dark surface |
| `hoverable` | `boolean` | `false` | Lifts card 2 px on hover |
| `image` | `string` | — | URL for an image at the top of the card |
| `imageAlt` | `string` | `''` | Alt text for the image |
| `footer` | `ReactNode` | — | Content rendered in a bordered footer row |
| `onClick` | `MouseEventHandler` | — | Makes the whole card clickable |

---

## Badge

Numeric indicator, typically used on nav items or tab counts.

```tsx
<Badge color="red">12</Badge>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `'yellow' \| 'red' \| 'green' \| 'blue' \| 'neutral'` | `'yellow'` | Background colour |

---

## Chip

Status tag / label. Renders in mono uppercase.

```tsx
<Chip color="green" size="md" dot>Active</Chip>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `'yellow' \| 'red' \| 'green' \| 'blue' \| 'orange' \| 'neutral' \| 'glass'` | `'neutral'` | Colour variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Padding and font size |
| `dot` | `boolean` | `false` | Small coloured dot before the label |

---

## Avatar

```tsx
<Avatar initials="JD" size="md" shape="circle" />
<Avatar src="/photo.jpg" alt="Jane Doe" size="lg" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Image URL; renders `<img>` when provided |
| `alt` | `string` | `''` | Alt text for the image |
| `initials` | `string` | — | Fallback text when no `src` |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 24 / 32 / 40 / 52 / 68 px |
| `shape` | `'circle' \| 'square'` | `'circle'` | Border-radius style |

### AvatarStack

Wraps multiple `<Avatar>` components with a left overlap.

```tsx
<AvatarStack>
  <Avatar initials="A" size="sm" />
  <Avatar initials="B" size="sm" />
  <Avatar initials="C" size="sm" />
</AvatarStack>
```

---

## Alert

Inline status message. Not dismissible by default.

```tsx
<Alert variant="success" title="Saved" dismissible onDismiss={() => setShow(false)}>
  Your changes have been saved.
</Alert>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'error' \| 'success' \| 'warning' \| 'info' \| 'neutral'` | — | Required. Sets colour and border |
| `title` | `string` | — | Bold heading line |
| `icon` | `ReactNode` | — | Icon before the text block |
| `dismissible` | `boolean` | `false` | Shows a close button |
| `onDismiss` | `() => void` | — | Called when close button is clicked |

---

## Progress

```tsx
<Progress value={72} label="Completion" showValue color="yellow" size="md" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number` | — | Required. 0–100 |
| `label` | `string` | — | Label above the bar |
| `showValue` | `boolean` | `false` | Shows percentage on the right |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Track height: 4 / 8 / 12 px |
| `color` | `'yellow' \| 'green' \| 'blue' \| 'red' \| 'orange'` | `'yellow'` | Fill colour |

---

## Skeleton

Loading placeholder with a shimmer animation.

```tsx
<Skeleton variant="line" width="60%" />
<Skeleton variant="circle" width={40} height={40} />
<Skeleton variant="rect" height={120} />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'line' \| 'circle' \| 'rect'` | `'line'` | Shape and border-radius |
| `width` | `string \| number` | `'100%'` | CSS width |
| `height` | `string \| number` | variant default | CSS height (10 / 40 / 80 px) |

---

## Divider

```tsx
<Divider />
<Divider strong />
<Divider label="or continue with" />
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | — | Text centred between two lines |
| `strong` | `boolean` | `false` | Uses `--border-strong` instead of `--border` |

---

## Tooltip

Wraps any element. Tooltip appears above on hover.

```tsx
<Tooltip content="Download CSV">
  <Button variant="ghost" size="sm">Export</Button>
</Tooltip>
```

| Prop | Type | Description |
|---|---|---|
| `content` | `string` | Tooltip text |
| `children` | `ReactNode` | The element that triggers the tooltip |

---

## Tabs

Renders the tab bar only. Content panels are rendered by the caller based on the active value.

```tsx
const [active, setActive] = useState('overview');

<Tabs
  variant="underline"
  tabs={[
    { label: 'Overview', value: 'overview' },
    { label: 'Courses', value: 'courses', badge: 5 },
  ]}
  value={active}
  onChange={setActive}
/>

{active === 'overview' && <OverviewPanel />}
{active === 'courses' && <CoursesPanel />}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `'underline' \| 'pill' \| 'boxed'` | `'underline'` | Visual style of the tab bar |
| `tabs` | `{ label: string; value: string; badge?: number }[]` | — | Tab definitions |
| `value` | `string` | — | Currently active tab value (controlled) |
| `onChange` | `(value: string) => void` | — | Called when a tab is clicked |
