# Design Guidelines: Multiplayer Anatomy Quiz Game

## Design Approach
**Reference-Based: Kahoot.com Style**

This game takes direct inspiration from Kahoot's energetic, game-show aesthetic with bold typography, playful layouts, and clear visual hierarchy. The design prioritizes instant recognition, fast decision-making, and competitive excitement.

## Typography System

**Primary Font:** Montserrat (Google Fonts) - Bold, geometric, perfect for game UI
**Secondary Font:** Inter (Google Fonts) - Clean readability for body text

Hierarchy:
- Room codes/Game titles: 4xl to 6xl, font-bold
- Questions: 3xl to 4xl, font-bold
- Answer options: xl to 2xl, font-semibold
- Timer/Score: 2xl to 3xl, font-bold
- Player names: base to lg, font-medium
- Instructions/Helper text: sm to base, font-normal

## Layout & Spacing System

**Tailwind Units:** 2, 4, 6, 8, 12, 16, 24
- Consistent button padding: px-8 py-4
- Screen padding: p-6 to p-8
- Component gaps: gap-4 to gap-6
- Section spacing: space-y-8 to space-y-12

## Screen Layouts

### 1. Landing/Room Creation Screen
- Centered vertical layout (flex flex-col items-center justify-center min-h-screen)
- Logo/Game title at top
- Two prominent action cards: "Create Room" and "Join Room"
- Cards: rounded-2xl with shadow-xl, p-8
- Call-to-action buttons fill card width

### 2. Lobby/Waiting Room
- Split layout: Left sidebar (w-1/3) for room info, Right (w-2/3) for player grid
- Room code display: Massive text in a bordered box at top
- Player grid: grid grid-cols-2 md:grid-cols-3 gap-4
- Each player card: rounded-xl, p-4, with player number badge
- Host controls (Start Game button) fixed at bottom, w-full

### 3. Question Screen (Active Gameplay)
- Top bar: Timer (circular progress) + Question number
- Question text: Centered, max-w-4xl, dominant space (40% of viewport)
- Answer grid: 2x2 grid (grid-cols-2 gap-6), each button h-24 to h-32
- Buttons use geometric shapes (triangles, diamonds, circles, squares) as indicators
- Progress indicator at bottom showing question X of 3

### 4. Leaderboard Screen (After Each Question)
- Podium-style layout for top 3 (different heights: 2nd shorter, 1st tallest, 3rd shortest)
- Remaining players: Vertical list with rank badges
- Score emphasis: Large numbers, bold
- "Next Question" button (for host) at bottom center
- Quick transition animations (slide-in from sides)

### 5. Final Leaderboard
- Full-screen celebration layout
- Winner spotlight: Larger card with trophy icon
- Top 3: Horizontal card layout with medals (1st gold, 2nd silver, 3rd bronze concept)
- Full rankings below in scrollable list
- "Play Again" and "Exit" buttons at bottom

## Component Library

### Core UI Elements

**Buttons:**
- Primary action: rounded-xl, px-8 py-4, text-lg font-bold, shadow-lg
- Answer buttons: rounded-2xl, w-full h-full, flex items-center justify-center
- Icon buttons (settings, info): rounded-full, p-3

**Input Fields:**
- Text inputs: rounded-lg, px-6 py-4, text-lg, border-2
- Room code input: Uppercase, letter-spacing-wide, text-center, text-3xl

**Cards:**
- Player cards: rounded-xl, p-4, shadow-md
- Question cards: rounded-2xl, p-8, shadow-2xl
- Info cards: rounded-xl, p-6, border-2

### Game-Specific Components

**Timer Display:**
- Circular progress ring (SVG-based, 120px diameter)
- Countdown number in center (text-4xl font-bold)
- Pulsing animation in final 5 seconds

**Answer Buttons (Kahoot-style):**
- Four large buttons in 2x2 grid
- Each with geometric icon (triangle, diamond, circle, square)
- Icons: 2xl to 3xl size, positioned left of text
- Disabled state for post-answer selection

**Leaderboard Entries:**
- Rank badge: Circular, absolute positioned left, w-10 h-10
- Player name: Truncate with ellipsis
- Score: Right-aligned, tabular-nums
- Hover: subtle scale transform (scale-105)

**Room Code Display:**
- Monospace variant for clarity
- Bordered container: border-4, rounded-xl
- Minimum text size: text-5xl
- Copy-to-clipboard button adjacent

### Navigation & Controls

**Host Controls:**
- Fixed bottom bar with shadow-2xl
- Start/Next buttons: Full-width on mobile, max-w-md on desktop
- Disabled states when waiting for players

**Progress Indicators:**
- Linear progress bar for question progress (1 of 3, 2 of 3, etc.)
- Dot indicators alternative: flex gap-2 with rounded-full pills

## Animations

**Strategic Use Only:**
- Timer countdown: Smooth circular progress
- Answer selection: Quick scale + pulse effect
- Leaderboard entry: Staggered slide-in (100ms delay between items)
- Transitions: Fast page transitions (200-300ms)
- Correct/Wrong feedback: Single flash/shake (avoid excessive celebration)

## Icons

**Font Awesome (CDN):**
- Trophy, medal icons for rankings
- Timer icon (clock)
- User icons for players
- Check/X for correct/incorrect
- Copy icon for room code

## Responsive Behavior

**Mobile-First Grid Adjustments:**
- Answer buttons: Single column on mobile (grid-cols-1), 2x2 on tablet+
- Leaderboard: Full-width stacked on mobile
- Player grid: 2 columns mobile, 3-4 on desktop
- Font sizes: Scale down one step on mobile (3xl → 2xl, etc.)

**Critical Breakpoints:**
- Mobile: Full-width layouts, larger touch targets
- Tablet (md:): Introduce grid layouts
- Desktop (lg:): Multi-column, sidebar layouts

## Accessibility

- High contrast for answer buttons against backgrounds
- Keyboard navigation for all interactive elements
- Clear focus states: ring-4 ring-offset-2
- ARIA labels for timer, scores, room codes
- Minimum touch target: 44x44px (h-12 minimum for buttons)

## Images

**Hero/Landing Image:**
No large hero image required - game interface prioritizes functionality and immediate action. Keep landing clean and focused.

**Anatomy Question Images:**
- Question slides may include anatomical diagrams
- Images: max-w-lg, rounded-lg, shadow-lg, centered above question text
- Ensure images don't dominate - questions remain readable