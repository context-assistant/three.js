# Context Assistant - Multi-Phase Development Plan

## Project Overview

This document outlines the comprehensive plan to build a context-aware AI assistant that wraps the three.js project using iframes. The system will allow users to interact with three.js Editor, Playground, Manual, and API Documentation through an enhanced interface with AI chat capabilities powered by a local Ollama server.

## Core Principles

- **No modifications to three.js core**: All changes contained within `context-assistant/` and `.cursor/` folders
- **Same-origin iframes**: Production build of three.js integrated into Vite dev server
- **Modular integration**: Simple, human-readable integration scripts injected into iframes
- **Local-first**: No backend, uses sessionStorage for chat, IndexedDB for future RAG
- **TypeScript + Tailwind**: Modern stack with Flowbite components and dark theme
- **80% test coverage**: Unit and integration tests required

---

## Phase 1: Project Setup & Tooling

### 1.1 Context Assistant Project Initialization
**Goal**: Set up the TypeScript/Vite project structure in `context-assistant/` folder

**Tasks**:
- [ ] Initialize Vite project with TypeScript template in `context-assistant/`
- [ ] Configure `package.json` with separate dependencies from root three.js project
- [ ] Set up TypeScript configuration (`tsconfig.json`)
- [ ] Configure Vite for:
  - TypeScript compilation
  - Tailwind CSS integration
  - Path aliases (`@/` for src directory)
  - Static asset handling
  - Dev server configuration (port, proxy if needed)
- [ ] Install dependencies:
  - `vite`
  - `typescript`
  - `tailwindcss` + `postcss` + `autoprefixer`
  - `flowbite` + `flowbite-react` (or vanilla Flowbite)
  - `@types/node` (if needed)
- [ ] Set up ESLint configuration matching three.js style
- [ ] Create basic folder structure:
  ```
  context-assistant/
  ├── src/
  │   ├── components/
  │   ├── services/
  │   ├── types/
  │   ├── utils/
  │   ├── App.tsx (or App.ts)
  │   └── main.ts
  ├── public/
  ├── tests/
  │   ├── unit/
  │   └── integration/
  ├── package.json
  ├── tsconfig.json
  ├── vite.config.ts
  ├── tailwind.config.js
  └── postcss.config.js
  ```

**Deliverables**:
- Working Vite dev server
- TypeScript compilation
- Tailwind CSS configured with dark theme
- Flowbite components available

### 1.2 Three.js Production Build Integration
**Goal**: Integrate three.js production build into Vite dev server

**Tasks**:
- [ ] Create script to run three.js production build (`npm run build`)
- [ ] Configure Vite to serve static files from:
  - `editor/` → `/editor/`
  - `playground/` → `/playground/`
  - `manual/` → `/manual/`
  - `docs/` → `/docs/`
  - `examples/` → `/examples/` (if needed)
  - `files/` → `/files/`
- [ ] Ensure all static assets (CSS, JS, images) are accessible
- [ ] Test that iframes can load three.js pages from same origin
- [ ] Document build process in README

**Deliverables**:
- Vite dev server serves three.js static files
- All iframe pages load correctly
- Same-origin policy satisfied

### 1.3 Development Workflow Setup
**Goal**: Create scripts and documentation for development workflow

**Tasks**:
- [ ] Create npm scripts in `context-assistant/package.json`:
  - `dev`: Start Vite dev server
  - `build`: Build for production
  - `preview`: Preview production build
  - `test`: Run tests
  - `test:unit`: Run unit tests
  - `test:integration`: Run integration tests
  - `test:coverage`: Generate coverage report
  - `lint`: Run linter
- [ ] Set up test framework (Vitest recommended for Vite projects)
- [ ] Configure test coverage to target 80%
- [ ] Create `.gitignore` for `context-assistant/` build artifacts
- [ ] Document development setup in README

**Deliverables**:
- Working development scripts
- Test framework configured
- Development documentation

---

## Phase 2: Core UI Foundation

### 2.1 Layout & Navigation Structure
**Goal**: Build the main application layout with navbar and content area

**Tasks**:
- [ ] Create main App component with:
  - Top navbar (full width, fixed or sticky)
  - Main content area (fills remaining viewport height, `overflow-y: auto`)
  - Proper viewport height handling (`100vh` minus navbar height)
- [ ] Implement navbar with:
  - Logo/branding on left
  - Navigation items: Home, Editor, Playground, Manual, Documentation, Settings
  - AI Assistant button on right (icon only initially)
- [ ] Create routing system (can use simple state management or lightweight router)
- [ ] Implement view switching:
  - Landing page (Home)
  - Editor view
  - Playground view
  - Manual view
  - Documentation view
  - Settings view
- [ ] Style with Tailwind + Flowbite dark theme
- [ ] Ensure responsive design

**Deliverables**:
- Functional navbar
- View switching works
- Responsive layout
- Dark theme applied

### 2.2 Landing Page
**Goal**: Create informative landing page

**Tasks**:
- [ ] Design landing page with:
  - Project description
  - Feature highlights
  - Links to Editor, Playground, Manual, Documentation
  - Visual appeal using Flowbite components
- [ ] Ensure links match navbar navigation
- [ ] Style consistently with dark theme

**Deliverables**:
- Complete landing page
- Navigation links functional

### 2.3 Iframe Container System
**Goal**: Create system to manage iframes for different views

**Tasks**:
- [ ] Create `IframeManager` service/utility:
  - Track active iframe
  - Create/destroy iframes on demand
  - Handle iframe loading states
  - Manage iframe lifecycle
- [ ] Create `IframeContainer` component:
  - Renders iframe with proper sizing
  - Handles loading states
  - Manages iframe visibility
- [ ] Implement iframe creation for:
  - Editor (`/editor/index.html`)
  - Playground (`/playground/index.html`)
  - Manual (`/manual/index.html`)
  - Documentation (`/docs/index.html`)
- [ ] Ensure iframes fill main content area
- [ ] Handle iframe errors gracefully

**Deliverables**:
- Iframe management system
- All four iframe types can be loaded
- Proper error handling

**Testing**:
- Unit tests for IframeManager
- Integration tests for iframe loading
- Test iframe lifecycle (create/destroy)

---

## Phase 3: Integration Script Injection System

### 3.1 Integration Script Framework
**Goal**: Create modular system for injecting integration scripts into iframes

**Tasks**:
- [ ] Design integration script architecture:
  - Base integration script template
  - Module system for different integrations
  - Direct window access API (same-origin iframes)
- [ ] Create `IntegrationInjector` service:
  - Detects iframe type (editor, playground, manual, docs)
  - Injects appropriate integration script
  - Handles script loading and execution
  - Manages script lifecycle
  - Waits for iframe to fully load before injection
- [ ] Implement direct window access system:
  - Access iframe's `window` object directly (same-origin)
  - Access iframe's `document` for DOM manipulation
  - Expose integration API on iframe's window object (e.g., `window.contextAssistantAPI`)
  - Type-safe API contracts
  - Error handling for timing issues
  - **Note**: Using direct window access instead of postMessage because:
    - Same-origin iframes allow full access to iframe's window/document
    - More powerful and flexible for complex operations
    - Simpler API (direct method calls vs message passing)
    - Integration scripts are injected anyway, so we control the namespace
    - Still maintains clear integration point via `window.contextAssistantAPI`
- [ ] Create base integration script template:
  - Exposes API object on `window.contextAssistantAPI`
  - Provides utilities for DOM manipulation
  - Exposes methods for specific integrations
  - Handles initialization and cleanup

**Deliverables**:
- Integration injection system
- Direct window access API
- Base script template

**Testing**:
- Unit tests for IntegrationInjector
- Integration tests for script injection
- Test direct API access
- Test timing/race conditions

### 3.2 Editor Integration
**Goal**: Create integration script for three.js Editor

**Tasks**:
- [ ] Analyze editor structure:
  - Identify editor object location
  - Understand scene structure
  - Map available APIs
- [ ] Create `editor-integration.js`:
  - Access editor instance
  - Read scene details
  - List objects in scene (nested groups)
  - Expose editor controls/state
- [ ] Implement object listing:
  - Recursive traversal of scene graph
  - Group objects by type/parent
  - Extract object properties
  - Format for @mention feature
- [ ] Expose API methods on `window.contextAssistantAPI`:
  - `getSceneObjects()`: Return list of all objects
  - `getEditorState()`: Return current editor state
  - `executeCommand()`: Execute editor commands (future)

**Deliverables**:
- Editor integration script
- Object listing functionality
- Direct API access for editor

**Testing**:
- Unit tests for object traversal
- Integration tests with actual editor iframe
- Test API method calls

### 3.3 Playground Integration
**Goal**: Create integration script for three.js Playground

**Tasks**:
- [ ] Analyze playground structure
- [ ] Create `playground-integration.js`:
  - Access playground editor/code
  - Read current code state
  - Access scene/renderer if available
- [ ] Implement similar object listing as editor
- [ ] Expose API methods on `window.contextAssistantAPI` for playground-specific features

**Deliverables**:
- Playground integration script
- Basic playground API

**Testing**:
- Integration tests with playground iframe

### 3.4 Manual & Documentation Integration
**Goal**: Create integration script for Manual and API Docs

**Tasks**:
- [ ] Analyze manual/docs structure
- [ ] Create `docs-integration.js`:
  - Detect current page/section
  - Extract page content/metadata
  - Provide navigation context
- [ ] Share same iframe for both (as specified)
- [ ] Expose API methods on `window.contextAssistantAPI`:
  - `getCurrentPage()`: Return current page info
  - `navigateTo()`: Navigate to specific page (if possible)

**Deliverables**:
- Documentation integration script
- Page context extraction

**Testing**:
- Integration tests with docs iframe

### 3.5 Integration Script Build System
**Goal**: Ensure integration scripts are properly bundled and injected

**Tasks**:
- [ ] Configure Vite to build integration scripts:
  - Separate entry points for each integration
  - Output as standalone scripts
  - Minify for production
- [ ] Create injection mechanism:
  - Load script into iframe after iframe loads
  - Handle script execution timing
  - Retry logic for slow-loading iframes
- [ ] Test injection in all iframe types

**Deliverables**:
- Build system for integration scripts
- Reliable injection mechanism

---

## Phase 4: Settings & Agent Builder

### 4.1 Settings View
**Goal**: Create settings page accessible from navbar

**Tasks**:
- [ ] Create Settings component/view
- [ ] Design settings layout with sections:
  - LLM Settings
  - Chat History
  - Agent Builder
- [ ] Implement LLM Settings:
  - Ollama endpoint input (default: `http://localhost:11434`)
  - Test connection button
  - Connection status indicator
- [ ] Implement Chat History Settings:
  - Toggle for "Persist chat history" (sessionStorage)
  - Clear history button
- [ ] Style with Flowbite components
- [ ] Persist settings to localStorage

**Deliverables**:
- Complete settings view
- LLM endpoint configuration
- Chat history toggle

**Testing**:
- Unit tests for settings persistence
- Integration tests for Ollama connection

### 4.2 Ollama Service
**Goal**: Create service to interact with Ollama API

**Tasks**:
- [ ] Create `OllamaService`:
  - List available models (`GET /api/tags`)
  - Get model info
  - Test connection
  - Handle errors gracefully
- [ ] Implement model fetching:
  - Cache model list
  - Refresh mechanism
  - Error handling for offline server
- [ ] Create TypeScript types for Ollama API responses

**Deliverables**:
- Ollama service
- Model listing functionality

**Testing**:
- Unit tests for OllamaService (mock API)
- Integration tests with real Ollama (optional)

### 4.3 Agent Builder UI
**Goal**: Create agent configuration interface

**Tasks**:
- [ ] Design agent builder form:
  - Agent name input
  - Avatar image upload:
    - File input for image selection
    - Image preview
    - Crop/resize functionality (optional, can use browser native)
    - Store as base64 or blob URL in localStorage
    - Default avatar if none provided
    - Max file size validation
    - Supported formats: PNG, JPG, WebP
  - Model selection dropdown (from OllamaService)
  - LLM parameters:
    - context_window (number input)
    - max_tokens (number input)
    - temperature (slider 0-2)
    - top_k (number input)
    - top_p (number input)
    - mirostat (checkbox)
    - mirostat_tau (number input, conditional)
    - mirostat_eta (number input, conditional)
  - Personality traits (slider pairs):
    - curious vs. cautious
    - organized vs. careless
    - friendly vs. challenging
    - zany vs. sober
    - sarcastic vs. serious
- [ ] Implement trait sliders:
  - Range slider component (0-100)
  - 50% = neutral (no trait applied)
  - <50% = left trait with percentage
  - >50% = right trait with percentage
  - Visual indicator of selected trait
- [ ] Create agent list view:
  - List saved agents with avatars
  - Edit/delete actions
  - Set as default
  - Avatar display in list
- [ ] Implement agent persistence:
  - Save to localStorage (including avatar as base64)
  - Load on app start
  - Validation
  - Handle avatar storage efficiently (consider size limits)

**Deliverables**:
- Complete agent builder UI
- Avatar upload and storage
- Agent persistence
- Trait slider system

**Testing**:
- Unit tests for agent config validation
- Unit tests for trait calculation
- Integration tests for agent CRUD

### 4.4 Agent Management Service
**Goal**: Create service to manage agent configurations

**Tasks**:
- [ ] Create `AgentService`:
  - Save agent config
  - Load agent config
  - Delete agent
  - Get default agent
  - Validate agent config
- [ ] Implement agent selection:
  - Current agent state management
  - Agent switching
  - Default agent handling

**Deliverables**:
- Agent management service
- Agent state management

**Testing**:
- Unit tests for AgentService
- Test agent validation

---

## Phase 5: AI Chat Interface

### 5.1 Chat Panel Component
**Goal**: Create resizable side panel for chat interface

**Tasks**:
- [ ] Create `ChatPanel` component:
  - Overlay panel (right side)
  - Full viewport height
  - Resizable width (drag handle)
  - Open/close animation
  - Z-index above main content
- [ ] Implement panel state:
  - Open/closed state
  - Width state (persist to localStorage)
  - Toggle from navbar button
- [ ] Style with Flowbite dark theme
- [ ] Ensure mobile responsiveness

**Deliverables**:
- Resizable chat panel
- Open/close functionality

**Testing**:
- Unit tests for panel state
- Integration tests for resize functionality

### 5.2 Chat UI Layout
**Goal**: Create chat bubble container and input area

**Tasks**:
- [ ] Create chat layout:
  - Chat bubble container (fills available space)
  - Input area at bottom (fixed height initially)
- [ ] Implement chat bubble container:
  - Scrollable message area
  - Auto-scroll to bottom on new messages
  - Proper spacing and styling
- [ ] Create message bubble components:
  - User messages (right-aligned)
  - Assistant messages (left-aligned):
    - Display agent avatar if available
    - Show agent name
  - Loading indicator
  - Error messages
- [ ] Style with Tailwind + Flowbite

**Deliverables**:
- Chat UI layout
- Message bubble components

**Testing**:
- Unit tests for message rendering
- Test scroll behavior

### 5.3 Input Textarea with Auto-resize
**Goal**: Create expandable textarea for user input

**Tasks**:
- [ ] Create input textarea:
  - Starts at 4 rows
  - Expands up to 11 rows while typing
  - Bottom row has padding (text doesn't overflow)
- [ ] Implement auto-resize logic:
  - Calculate height based on content
  - Smooth expansion
  - Maintain minimum/maximum rows
- [ ] Create bottom row overlay UI:
  - Agent selectbox
  - Icon buttons:
    - Clear chat
    - Settings
    - @ (mention)
    - Send (becomes abort during request)
  - Proper spacing and alignment
- [ ] Style consistently

**Deliverables**:
- Auto-resizing textarea
- Bottom row controls

**Testing**:
- Unit tests for textarea resize logic
- Test button states

### 5.4 Chat Service & State Management
**Goal**: Create service to manage chat state and Ollama communication

**Tasks**:
- [ ] Create `ChatService`:
  - Send messages to Ollama
  - Handle streaming responses (if Ollama supports)
  - Manage chat history (last 10 messages)
  - Abort requests
  - Error handling
- [ ] Implement message management:
  - Add user message
  - Add assistant message
  - Update streaming message
  - Clear chat
- [ ] Implement context window management:
  - Keep last 10 messages
  - Summarize long responses if needed
  - Warn user if context overflow
- [ ] Create message types:
  - User message
  - Assistant message
  - System message
  - Error message
- [ ] Integrate with AgentService for current agent config

**Deliverables**:
- Chat service
- Message state management
- Ollama integration

**Testing**:
- Unit tests for ChatService (mock Ollama)
- Test message history management
- Test context window handling
- Integration tests with real Ollama (optional)

### 5.5 Ollama Chat Integration
**Goal**: Implement Ollama API calls for chat

**Tasks**:
- [ ] Implement Ollama chat endpoint:
  - `POST /api/chat`
  - Include agent config (temperature, top_k, etc.)
  - Include personality traits in system prompt
  - Handle streaming vs non-streaming
- [ ] Create request builder:
  - Format messages for Ollama
  - Include system prompt with agent personality
  - Handle context window limits
- [ ] Implement response handling:
  - Parse streaming responses
  - Handle errors
  - Update UI in real-time
- [ ] Add abort functionality:
  - Cancel in-flight requests
  - Update UI state

**Deliverables**:
- Ollama chat integration
- Streaming support
- Error handling

**Testing**:
- Unit tests with mocked Ollama responses
- Test streaming parsing
- Test abort functionality

### 5.6 @Mention Feature
**Goal**: Implement @mention for scene objects

**Tasks**:
- [ ] Create @mention UI:
  - Trigger on '@' keypress
  - Show dropdown/modal with object list
  - Search/filter objects
  - Display nested groups
  - Select object to insert
- [ ] Integrate with integration scripts:
  - Access `window.contextAssistantAPI` from active iframe
  - Call `getSceneObjects()` method directly
  - Handle different iframe types (editor vs playground)
  - Format object references
- [ ] Implement mention insertion:
  - Insert into textarea at cursor
  - Format as `@ObjectName` or similar
  - Include in message context
- [ ] Create object reference formatter:
  - Include object details in prompt context
  - Format for LLM consumption

**Deliverables**:
- @mention UI
- Object selection
- Mention insertion

**Testing**:
- Unit tests for mention UI
- Integration tests with direct iframe API access
- Test object list formatting

### 5.7 Chat History Persistence
**Goal**: Implement sessionStorage for chat history

**Tasks**:
- [ ] Implement sessionStorage service:
  - Save messages to sessionStorage
  - Load messages on app start
  - Clear on user request
  - Respect "persist chat history" setting
- [ ] Create message serialization:
  - Convert messages to JSON
  - Handle special characters
  - Include metadata (timestamp, agent, etc.)
- [ ] Implement loading state:
  - Show loading indicator
  - Restore chat on panel open
  - Handle corrupted data gracefully

**Deliverables**:
- Chat history persistence
- SessionStorage integration

**Testing**:
- Unit tests for sessionStorage service
- Test data persistence/loading
- Test corruption handling

---

## Phase 6: Testing & Quality Assurance

### 6.1 Unit Testing
**Goal**: Achieve 80% code coverage with unit tests

**Tasks**:
- [ ] Set up Vitest configuration
- [ ] Write unit tests for:
  - All services (OllamaService, AgentService, ChatService, IframeManager, IntegrationInjector)
  - Utility functions
  - Component logic (non-UI)
  - State management
- [ ] Configure coverage reporting
- [ ] Aim for 80%+ coverage
- [ ] Fix any bugs discovered

**Deliverables**:
- Comprehensive unit test suite
- 80%+ coverage report

### 6.2 Integration Testing
**Goal**: Test full user workflows

**Tasks**:
- [ ] Set up integration test framework
- [ ] Write integration tests for:
  - Iframe loading and switching
  - Integration script injection
  - Chat message flow
  - Agent configuration
  - Settings persistence
  - @mention functionality
- [ ] Test cross-browser compatibility (three.js supported browsers)
- [ ] Test error scenarios

**Deliverables**:
- Integration test suite
- Test documentation

### 6.3 E2E Testing (Optional)
**Goal**: Test complete user journeys

**Tasks**:
- [ ] Set up E2E testing (Playwright or Cypress)
- [ ] Write E2E tests for:
  - Opening app → navigating to editor → opening chat → sending message
  - Creating agent → using in chat
  - @mention workflow
- [ ] Run in CI/CD if applicable

**Deliverables**:
- E2E test suite (if implemented)

---

## Phase 7: CI/CD Pipeline

### 7.1 GitHub Actions Setup
**Goal**: Set up automated testing and deployment

**Tasks**:
- [ ] Create `.github/workflows/` directory structure
- [ ] Create `ci.yml` workflow:
  - Trigger on: pull requests and pushes to main branch
  - Steps:
    - Checkout code
    - Set up Node.js
    - Install dependencies (root and context-assistant)
    - Run three.js build (if needed for tests)
    - Run linting
    - Run unit tests
    - Run integration tests
    - Generate coverage report
    - Upload coverage to codecov or similar (optional)
    - Fail if coverage < 80%
- [ ] Create `deploy.yml` workflow:
  - Trigger on: release tags or manual dispatch
  - Steps:
    - Checkout code
    - Set up Node.js
    - Install dependencies
    - Build three.js production build
    - Build context-assistant production build
    - Configure GitHub Pages deployment
    - Deploy to GitHub Pages
- [ ] Configure GitHub Pages settings:
  - Set source to GitHub Actions
  - Configure custom domain if needed
- [ ] Add workflow status badges to README
- [ ] Test workflows on test branch/PR

**Deliverables**:
- CI workflow for testing
- CD workflow for deployment
- GitHub Pages deployment

**Testing**:
- Verify CI runs on PR
- Verify deployment on release

---

## Phase 8: Production Build & Deployment

### 8.1 Production Build Configuration
**Goal**: Optimize for production

**Tasks**:
- [ ] Configure Vite production build:
  - Minification
  - Tree shaking
  - Code splitting
  - Asset optimization
- [ ] Build integration scripts for production
- [ ] Test production build locally
- [ ] Optimize bundle sizes

**Deliverables**:
- Production build configuration
- Optimized bundles

### 8.2 Static File Integration
**Goal**: Ensure three.js static files are included in production

**Tasks**:
- [ ] Configure build to copy three.js static files
- [ ] Test all iframe pages in production build
- [ ] Verify all assets load correctly
- [ ] Test same-origin policy in production

**Deliverables**:
- Production build with all static files
- Verified iframe functionality

### 8.3 Documentation
**Goal**: Create AI agent playbooks and developer documentation

**Tasks**:
- [ ] Create AI agent playbook (`.cursor/prompts/`):
  - Project structure overview
  - Key architectural decisions
  - Development guidelines
  - Testing requirements
  - Common patterns and conventions
  - Integration script development guide
  - Troubleshooting guide
- [ ] Document build process
- [ ] Document deployment process (if applicable)
- [ ] Create code comments for complex logic

**Deliverables**:
- AI agent playbook
- Developer documentation
- Code documentation

---

## Phase 9: Future Enhancements (Out of Scope for Initial Plan)

### 9.1 RAG System
**Note**: Mentioned but not detailed - future phase

- Index three.js API and manual
- Store summaries in IndexedDB
- Two-step RAG: summaries → full documents
- Search integration in chat

### 9.2 Advanced Features
- Editor command execution from chat
- Code generation and injection
- Scene manipulation via chat
- Multi-agent conversations
- Chat export/import

---

## Development Guidelines

### Code Organization
- Keep all code in `context-assistant/` folder
- Use TypeScript for type safety
- Follow three.js coding style where applicable
- Modular, reusable components
- Clear separation of concerns

### Testing Requirements
- 80% code coverage minimum
- Unit tests for all services and utilities
- Integration tests for key workflows
- Test error scenarios

### Browser Support
- Match three.js browser support: `> 1%, not dead, not ie 11, not op_mini all`

### Styling
- Use Tailwind CSS with Flowbite components
- Dark theme throughout
- Responsive design
- Consistent spacing and typography

### Performance
- Lazy load iframes when possible
- Optimize bundle sizes
- Efficient state management
- Minimize re-renders

---

## Success Criteria

- [ ] All iframe pages load and function correctly
- [ ] Integration scripts inject successfully with direct window access
- [ ] Chat interface works with Ollama
- [ ] Agent builder creates and saves configurations with avatars
- [ ] @mention feature lists and inserts objects
- [ ] Settings persist correctly
- [ ] 80% test coverage achieved
- [ ] CI/CD pipeline runs successfully
- [ ] Production build works correctly
- [ ] GitHub Pages deployment functional
- [ ] AI agent playbook complete

---

## Notes

- This plan assumes three.js project is already forked and set up
- Ollama must be running locally for chat functionality
- No backend required - fully client-side
- Future RAG system will use IndexedDB (not in initial phases)
- All development should respect the constraint: no edits outside `context-assistant/` and `.cursor/` folders

