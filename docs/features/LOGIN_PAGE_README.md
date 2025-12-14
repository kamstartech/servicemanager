# FDH Bank Admin Panel - Login Page

## Overview
A beautifully designed login page matching the FDH Bank brand identity from the Elixir project.

## Features

### Design Elements
- **Two-column layout**: Login form on the left, branded background on the right
- **Brand colors**: FDH Blue (#154E9E) and FDH Orange (#f59e0b)
- **Typography**: Poppins font family for consistent branding
- **Responsive images**: Optimized with Next.js Image component

### Visual Assets
- **Logo**: FDH Bank logo in the header
- **Background**: Professional bank building image with blue overlay
- **Icons**: Clean, modern form inputs

### Form Features
- Email and password inputs with validation
- "Forgot password?" link
- Branded orange call-to-action button
- Loading state handling
- Smooth transitions and hover effects

## Access
Navigate to `/login` to view the login page.

## Brand Colors Used

| Color Name | Hex Code | Usage |
|------------|----------|--------|
| FDH Blue | #154E9E | Primary brand color, headings, focus states |
| FDH Light Blue | #1e62c7 | Active states, hover effects |
| FDH Orange | #f59e0b | CTA buttons, icons, accents |
| FDH Navy Blue | #012d81 | Secondary accents |

## Typography
- **Font Family**: Poppins
- **Weights**: 300 (light), 400 (regular), 500 (medium), 600 (semi-bold), 700 (bold)

## Images Required
Ensure these images exist in your `public` directory:
- `/images/logo/BLUE PNG/FDH LOGO-06.png` - Header logo
- `/images/backgrounds/login.jpg` - Background image

## Customization

### Change Colors
Colors are defined in `app/globals.css`:
```css
--color-fdh-blue: #154E9E;
--color-fdh-orange: #f59e0b;
```

### Modify Layout
Edit `app/login/page.tsx` to adjust the layout or add new features.

### Update Branding
Replace images in `public/images/` directory with your own.

## Integration
To integrate authentication:
1. Update the `handleSubmit` function in `app/login/page.tsx`
2. Add your authentication API calls
3. Handle redirect on successful login
4. Add error message display

## Screenshots
The login page features:
- Clean, professional design
- Brand-consistent styling
- Intuitive user interface
- Modern web standards
