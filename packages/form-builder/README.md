# Form Builder

A drag-and-drop form builder component for EVE OS marketplace.

## Features

- **14+ Field Types**: Text, textarea, number, email, date, dropdown, checkbox, radio, file upload, camera capture, document upload, signature, geolocation, and timestamp
- **Drag & Drop**: Intuitive field placement and reordering
- **Live Preview**: See your form as users will see it
- **URL Sharing**: Share forms via encoded URLs - no backend required
- **Form Validation**: Built-in validation with Zod
- **LocalStorage**: Automatic form persistence

## Usage

```tsx
import { FormRenderer, BuilderPage } from '@eve-market/form-builder';

// Use the full builder page
<BuilderPage />

// Or just the form renderer for displaying forms
<FormRenderer
  form={formConfig}
  onSubmit={(data) => console.log(data)}
/>
```

## Field Types

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `textarea` | Multi-line text area |
| `number` | Numeric input |
| `email` | Email with validation |
| `date` | Date picker |
| `dropdown` | Select dropdown |
| `checkbox` | Multiple choice checkboxes |
| `radio` | Single choice radio buttons |
| `file` | Generic file upload |
| `camera` | Camera/image capture |
| `document` | Document upload (PDF, etc.) |
| `signature` | Signature pad |
| `geolocation` | GPS location capture |
| `timestamp` | Auto-fill current timestamp |

## Components

- `BuilderPage` - Full form builder interface
- `FillFormPage` - Form submission page
- `HomePage` - Form list/dashboard
- `FormRenderer` - Renders a form config
- `FieldPalette` - Drag source for field types
- `FormCanvas` - Drop target for form layout
- `FieldEditor` - Field property editor

## License

EVE-MARKET-001
