# Walkthrough: Bug Fixes and UI Polish

I have successfully implemented all of the requested bug fixes and UI styling updates for this phase! 

## Changes Made

### Layout Fixes
- Added `flex-direction: column` to the `.tree-node-children` class in `index.css`. Your collection requests will now properly stack vertically instead of wrapping side-by-side.

### Consistent Button Styling
- Moved the `.rb-send-btn` and `.rb-save-btn` styles into global `.primary-btn` and `.secondary-btn` utility classes in `index.css`.
- The `PromptModal`, `SaveRequestModal`, and `VariablesModal` components have all been updated to use these global class names, ensuring a cohesive and beautiful dark-theme appearance across the app.

### Modal Form Layouts
- Adjusted `.modal-body` padding to `var(--space-6)` so that forms and text no longer touch the edges of the modal.
- Passed explicit `width` properties (e.g. `width="480px"`) to the `Modal` components and updated the internal `.save-dialog` form components to use `width: '100%'`. This perfectly resolves the issue of having massive empty voids on the right side of modals!
- Styled the `.form-group` labels, inputs, and dropdowns to have nice padding, rounded borders, and a beautiful dark-mode background matching the app's aesthetic.

### Variable Highlighting and Hover Tooltips
- Updated `RequestBuilder.tsx` to automatically resolve variables using the `CollectionStore` and `EnvironmentStore` when highlighting them in the URL bar.
- Unresolved variables (like `{{fake_var}}`) are now styled with a red, dotted underline using `.url-variable-unresolved`.
- Resolved variables (like `{{real_var}}`) maintain their standard purple highlight.
- Re-architected the `z-index` layering of the URL input and its highlighting overlay. This allows the native browser `title` tooltips to successfully trigger! When you hover your mouse over a resolved variable, the actual resolved value is displayed. 

## Verification
You can verify the final changes by:
1. Expanding a collection in the sidebar to ensure requests render vertically.
2. Opening any modal (e.g. Save Request) to see the tailored widths, padded layouts, and styled inputs.
3. Hovering over a resolved variable in the URL bar to see its tooltip!
