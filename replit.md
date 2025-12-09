# MedAB Quiz - Multiplayer Game

## Overview

A real-time multiplayer medical quiz game inspired by Kahoot, where players can create or join game rooms and compete answering questions about medical topics. The application features live gameplay with WebSocket communication, a leaderboard system, and a vibrant, game-show aesthetic using bold typography and playful UI elements.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast Hot Module Replacement (HMR)
- Wouter for lightweight client-side routing instead of React Router

**UI Component System**
- shadcn/ui component library with Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- Custom color palette including answer-specific colors (red, blue, yellow, green) for quiz buttons
- Typography system based on Montserrat (primary) and Inter (secondary) fonts per design guidelines

**State Management**
- React Context API (GameContext) for global game state management
- TanStack Query (React Query) for server state caching and synchronization
- Local component state with useState/useReducer for UI-specific logic

**Real-time Communication**
- WebSocket client connection managed through GameContext
- Event-driven architecture for handling game state updates (player joins, question transitions, answer submissions)
- Automatic reconnection logic not implemented (connection is managed per session)

### Backend Architecture

**Server Framework**
- Express.js HTTP server with TypeScript
- HTTP server wrapped to support WebSocket upgrade via the `ws` library
- Middleware stack: JSON body parsing, URL encoding, request logging

**WebSocket Server**
- Standalone WebSocket server (not Socket.io) for real-time bidirectional communication
- In-memory game state management using Maps for rooms, players, and socket associations
- Message-based protocol with typed events (create_room, join_room, start_game, answer, etc.)

**Game Logic**
- Stateful game rooms with status tracking (waiting, playing, question_results, finished)
- Room code generation using random alphanumeric strings (6 characters)
- Score calculation based on answer correctness and response time
- Automatic progression through questions with results phases between each question

**Routing & API Design**
- WebSocket-first architecture (no REST endpoints for game operations)
- Static file serving for built client assets
- SPA fallback routing to serve index.html for client-side routes

### Data Storage Solutions

**Current Implementation**
- Pure in-memory storage using JavaScript Maps and objects
- No database persistence - all game state is ephemeral and lost on server restart
- MemStorage class implements IStorage interface for potential future database migration

**Schema Definition**
- Drizzle ORM configured for PostgreSQL (schema defined but not actively used)
- Zod schemas for runtime validation of game entities (Question, Player, GameRoom, WSMessage)
- Type-safe data models shared between client and server via shared/schema.ts

**Data Models**
- Questions: Predefined anatomy questions with 4 options and correct answer index
- Players: ID, name, score, host status, answer tracking
- GameRooms: Room code, player list, game status, current question tracking
- WebSocket messages: Strongly typed event payloads for all game actions

### Authentication & Authorization

**Current State**
- No authentication system implemented
- Players identified by randomly generated UUIDs on join
- Room access controlled only by knowledge of room code
- Host privileges determined by join order (first player becomes host)

**Security Considerations**
- No user accounts or persistent identity
- Sessions are WebSocket-connection-bound
- Room codes provide minimal access control (6-character alphanumeric)

### Game Flow Architecture

**Lobby Phase**
- Host creates room, receives unique room code
- Other players join via room code entry
- Real-time player list updates via WebSocket broadcasts
- Host initiates game start when ready

**Active Gameplay Phase**
- Sequential question presentation with 30-second timer per question
- Client-side timer countdown with server-authoritative timing
- Answer submission locks player response
- Auto-submit on timeout: When timer reaches 0 without an answer, client auto-submits a timeout response
- Server-side backup timeout: Server forces progression after 33 seconds (30s + 3s buffer) if any client fails to report
- Automatic transition to results after all players answer or timeout

**Results & Leaderboard Phase**
- Per-question results showing correct answer and updated scores
- Final leaderboard with medal icons for top 3 positions
- Host controls progression to next question or game end

## External Dependencies

### Third-Party UI Libraries
- **Radix UI**: Headless component primitives (@radix-ui/react-*) for accessible UI components
- **Lucide React**: Icon library for consistent iconography
- **class-variance-authority**: Utility for managing component variants
- **Tailwind CSS**: Utility-first CSS framework with PostCSS

### Build & Development Tools
- **Vite**: Frontend build tool and dev server
- **esbuild**: Fast JavaScript bundler for server-side code
- **tsx**: TypeScript execution for development scripts
- **Replit plugins**: Runtime error overlay, cartographer, dev banner for Replit environment

### Database & ORM
- **Drizzle ORM**: TypeScript ORM configured for PostgreSQL (schema defined but not connected)
- **Drizzle Kit**: Schema migration tool
- **PostgreSQL**: Target database system (not currently provisioned)

### Validation & Type Safety
- **Zod**: Runtime schema validation and type inference
- **TypeScript**: Static type checking across entire codebase

### Real-time Communication
- **ws**: WebSocket library for Node.js server implementation

### Form & Data Handling
- **React Hook Form**: Form state management with @hookform/resolvers
- **TanStack Query**: Server state synchronization and caching
- **date-fns**: Date manipulation utilities

### Session Management (Configured but Unused)
- **express-session**: Session middleware
- **connect-pg-simple**: PostgreSQL session store
- Both configured but not actively used due to in-memory game state approach

## Question Management System

### Overview
The game supports multiple ways to add questions:
1. **Question Library**: Browse and select from saved questions in the database
2. **Import Questions**: Upload PDF or paste formatted text to parse questions
3. **Manual Entry**: Create questions one by one
4. **Default Questions**: Use the built-in 3 anatomy questions

### Folder Organization
Questions can be organized into folders (e.g., "Upper Limb", "Lower Limb", "Thorax"):
- Create folders from the Question Library view
- Move questions between folders individually or in bulk
- Filter questions by folder when selecting for a quiz
- Questions without a folder appear as "unfiled"

### Quiz Limits
- Maximum 500 questions per quiz (increased from original limit)
- Larger question text area for longer questions
- Improved scrollable list for large question sets

### Question Format for Import
Questions should be formatted like this:
```
Q: What is the largest bone in the human body?
A) Skull
B) Femur*
C) Tibia
D) Humerus

Q: Which muscle is the primary flexor of the forearm?
A) Triceps brachii
B) Brachialis*
C) Deltoid
D) Pronator teres
```
- Mark the correct answer with an asterisk (*)
- Each question must have exactly 4 options (A, B, C, D)

### Architecture

**Database (`shared/schema.ts`)**
- `savedQuestions` table: Stores questions permanently for reuse
- Fields: id, question, options (JSONB), correctIndex, category, createdAt

**Backend Services**
- `server/questionParser.ts`: Parses formatted text/PDF into questions
- `server/db.ts`: Drizzle ORM database connection

**REST Endpoints (`server/routes.ts`)**
- `POST /api/parse-questions`: Parses PDF or text into questions
- `GET /api/saved-questions`: Retrieves all saved questions (with optional folderId filter)
- `POST /api/saved-questions`: Saves questions to database (with optional folderId)
- `DELETE /api/saved-questions/:id`: Deletes a saved question
- `POST /api/saved-questions/:id/move`: Move a question to a different folder
- `POST /api/saved-questions/bulk-move`: Move multiple questions to a folder
- `GET /api/folders`: Get all folders
- `POST /api/folders`: Create a new folder
- `PUT /api/folders/:id`: Update a folder
- `DELETE /api/folders/:id`: Delete a folder
- `GET /api/folders/:id/questions`: Get questions in a specific folder
- `POST /api/generate-questions`: AI-powered generation (requires OPENAI_API_KEY)

**WebSocket Messages**
- `set_custom_questions`: Host sends selected questions to server
- `questions_updated`: Server broadcasts question count to all players

**Frontend Components**
- `QuestionBuilder.tsx`: Full-featured UI for question management
  - Library view: Browse, select, and manage saved questions
  - Import view: Parse questions from PDF or formatted text
  - Manual view: Create questions one by one
- Lobby shows "Configure Questions" card for hosts

### Optional Environment Variables
- `OPENAI_API_KEY`: Required only for AI question generation (optional - app works without it)