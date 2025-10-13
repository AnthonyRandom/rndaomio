# RNDAOMIO - Multimedia Toolkit

A brutalist, terminal-inspired browser-based multimedia toolkit with a futuristic monochrome design and aggressive glitch aesthetics. Currently featuring a Discord file size compressor with support for drag-and-drop, paste, and directory uploads.

## Design Features

- **Brutalist/Terminal UI**: Sharp edges, bold typography, and minimalist design
- **Monochrome Theme**: Black/white/greyscale with pastel accent colors
- **Aggressive Glitch Effects**: Fast, chaotic animations inspired by retro terminals
- **Text Scramble Loading**: Characters randomize on load then reveal sequentially
- **Icon Shuffle Glitch**: Terminal icon cycles through different symbols randomly
- **RGB Split Effects**: Chromatic aberration text glitching
- **Rapid Animations**: Fast-paced hover, blink, and color flash effects
- **Scan Lines**: Enhanced CRT-style scan line animation (4s loop)
- **Glitchy Trails**: Motion blur trails on interactive elements
- **Bold Animations**: Framer Motion powered spring physics
- **Responsive Design**: Built with Tailwind CSS

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons

## Getting Started

### Install Dependencies

\`\`\`bash
npm install
\`\`\`

### Run Development Server

\`\`\`bash
npm run dev
\`\`\`

### Build for Production

\`\`\`bash
npm run build
\`\`\`

### Preview Production Build

\`\`\`bash
npm run preview
\`\`\`

## Features

### Glitch Animation System

- **Text Scramble Effect**: All text scrambles on page load with random characters, then reveals character-by-character after 1 second
- **Glitch Text Component**: Periodic RGB split glitch effect with chromatic aberration (red/cyan channels)
- **Icon Shuffle**: Terminal icon randomly cycles through Cpu, HardDrive, Activity icons every 8 seconds
- **Rapid Blinking**: Status indicators with 0.3s blink cycles
- **Color Flash**: Hue rotation animations for dynamic color cycling
- **Pixelated Build-In**: Main content fades in with blur-to-sharp pixelation effect
- **Stroke Fill Animation**: Text outline to fill animations on hover
- **Glitch Trails**: Motion blur trails on moving elements
- **Enhanced Scan Lines**: Faster 4s animation cycle with increased opacity
- **Border Pulse**: Dynamic border color transitions on active elements
- **Spring Physics**: Aggressive spring animations (stiffness: 200, damping: 15)

### File Compressor

- Upload files via drag & drop, file browser, or clipboard paste
- Select target size limits: 10MB, 50MB, or 500MB (Discord tiers)
- Real-time compression progress with pulsing animations
- Download compressed files with animated button states
- View download history with staggered reveal animations
- Glitch effects on all interactive elements

### Coming Soon

- Format Converter
- Image Optimizer
- Additional multimedia tools

## Project Structure

\`\`\`
rndaomio/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn components (button, progress, select)
│   │   ├── CompressorTool.tsx     # Main compression interface
│   │   ├── FileUploader.tsx       # Drag-drop file upload
│   │   ├── SystemStats.tsx        # Live system statistics
│   │   ├── ScrambleText.tsx       # Text scramble animation
│   │   ├── GlitchText.tsx         # RGB split glitch effect
│   │   ├── GlitchIcon.tsx         # Icon shuffle effect
│   │   └── TerminalHeader.tsx     # Terminal-style header
│   ├── lib/
│   │   └── utils.ts      # Utility functions
│   ├── App.tsx                    # Main application with load state
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Global styles + glitch animations
├── public/
│   └── vite.svg                   # Brutalist favicon
├── index.html                     # HTML with Google Fonts
├── package.json
├── tailwind.config.js             # Tailwind + glitch keyframes
├── tsconfig.json
└── vite.config.ts
\`\`\`

## Design System

### Colors

- Background: `hsl(0 0% 8%)` - Near black
- Foreground: `hsl(0 0% 98%)` - Near white
- Border: `hsl(0 0% 18%)` - Dark grey
- Accent: `hsl(24 100% 85%)` - Pastel peach
- Glitch Red: `#ff00de` - Magenta for RGB split
- Glitch Cyan: `#00fff9` - Cyan for RGB split

### Typography

- Font: Monospace (JetBrains Mono via Google Fonts, Courier New, Consolas)
- Text Transform: Uppercase for headings and labels
- Letter Spacing: Wide tracking (0.1em - 0.15em)
- Font Smoothing: Antialiased

### Animation Timing

- **Fast**: 0.1s - 0.3s (glitches, blinks)
- **Medium**: 0.5s - 0.8s (reveals, transitions)
- **Slow**: 1.5s - 4s (ambient effects, scan lines)
- **Spring Physics**: stiffness: 150-200, damping: 12-15

### Glitch Effects

- **Scramble Speed**: 12-20ms character cycling
- **Reveal Speed**: 18-30ms character-by-character reveal
- **Blink Cycle**: 0.3s rapid, 0.1s ultra-rapid
- **RGB Split**: ±2-5px offset on X/Y axes
- **Scan Line**: 4s vertical loop
- **Icon Glitch**: Every 8s, 400ms duration
- **Text Glitch**: Every 5s, 200ms duration

### Components

All components follow the brutalist aesthetic with:
- Sharp corners (border-radius: 0)
- Bold borders (2-4px solid)
- High contrast (WCAG AA compliant)
- No drop shadows (only borders)
- Clear hierarchy with spacing
- Aggressive, fast animations
- Glitch effects on interaction

## License

MIT

