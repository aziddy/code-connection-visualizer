# Code Connect Visualizer

A powerful TypeScript web application for visualizing connections between code elements using a custom canvas-based rendering engine.

## Features

### ✅ Implemented (Text System)

- **Custom Text Rendering Engine**: Built from scratch using HTML5 Canvas
- **Syntax Highlighting**: Automatic language detection and color coding
- **Character-Level Interaction**: Precise mouse interaction with individual characters
- **Text Selection**: Click and drag to select text sequences
- **Connection Visualization**: Draw curved lines between selected code segments
- **Multi-Language Support**: JavaScript, TypeScript, Python, C, Devicetree detection

### 🎯 Key Capabilities

1. **Text Rendering**
   - Monospace font rendering with accurate character metrics
   - Character bounding box calculation for precise interaction
   - Viewport optimization (only renders visible text)
   - Smooth scrolling support

2. **Syntax Highlighting**
   - Real-time language detection
   - Token-based parsing (keywords, strings, numbers, comments, operators)
   - VS Code Dark+ theme colors
   - Extensible language configuration system

3. **Interactive Selection**
   - Character-precise mouse selection
   - Single-line and multi-line selection support
   - Visual feedback with highlight colors
   - Keyboard shortcuts for connection creation

4. **Connection System**
   - Create curved bezier connections between code segments
   - Color-coded selection states (blue, green, yellow, red)
   - Visual arrows showing connection direction
   - Connection management (create, delete, export/import)

5. **Floating Prompt System**
   - Generic floating prompt window for quick actions
   - Draggable, closable prompts with customizable content
   - Connection creation and editing prompts
   - Export options prompt with multiple formats
   - Context menu integration (right-click/double-click)

## How to Use

### Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser** - the app should auto-open at `http://localhost:8080`

### Creating Code Connections

1. **Load Code**: 
   - Edit the code in the sidebar textarea
   - Click "Load Code" to render it with syntax highlighting

2. **Select Text Sequences**:
   - Click and drag to select characters/words/lines
   - Selected text will be highlighted in blue

3. **Create Connections**:
   - Select your first text sequence
   - Press `C` to set it as the start point (highlighted in red)
   - Select your second text sequence 
   - Press `C` again to create a connection

4. **Manage Connections**:
   - `Delete` key: Clear all connections
   - `Escape` key: Cancel connection creation
   - Color picker in sidebar: Change default line color

### Controls

- **Mouse**: Click and drag to select text
- **C key**: Create connections between selections (now opens floating prompt)
- **Right-click**: Open quick action prompt
- **Double-click**: Open quick action prompt
- **Click connection**: Edit connection with floating prompt  
- **Delete**: Clear all connections or delete selected connection
- **Escape**: Cancel connection creation or close floating prompt
- **Font Size Slider**: Adjust text size
- **Language Dropdown**: Override auto-detection
- **Color Picker**: Set connection line color
- **Export Buttons**: Now open floating prompt for format selection

## Technical Architecture

### Core Components

1. **TextRenderer** (`src/core/TextRenderer.ts`)
   - Canvas-based text rendering
   - Character metrics and positioning
   - Selection highlighting
   - Scrolling and viewport management

2. **SyntaxHighlighter** (`src/core/SyntaxHighlighter.ts`) 
   - Language detection algorithms
   - Token parsing and classification
   - Theme-based color application
   - Multi-language keyword support

3. **CodeVisualizer** (`src/core/CodeVisualizer.ts`)
   - Main orchestrator class
   - Event handling and interaction logic
   - Connection line rendering
   - State management

4. **Type System** (`src/types/index.ts`)
   - Comprehensive TypeScript interfaces
   - Character bounds, selections, connections
   - Rendering state and configuration

5. **FloatingPrompt** (`src/core/FloatingPrompt.ts`)
   - Generic floating window system
   - Draggable, customizable UI components
   - Event handling and state management
   - Template-based configuration system

6. **PromptTemplates** (`src/core/PromptTemplates.ts`)
   - Pre-configured prompt templates
   - Connection creation and editing forms
   - Export options and settings dialogs
   - Extensible template system for future features

### Performance Optimizations

- **Viewport Culling**: Only renders visible text lines
- **Efficient Character Mapping**: Fast coordinate-to-character lookup
- **Canvas Optimization**: Minimal redraws and context state management
- **Memory Management**: Proper cleanup of event listeners and objects

## Development Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Watch mode for development
npm run watch
```

## Browser Support

- Modern browsers with Canvas 2D support
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

## Future Enhancements

### Planned Features (in order of priority)

- [x] **Multi-File Support**: Connect across different files
- [x] **Advanced Connection Types**: Dotted, dashed line styles
- [x] **Connection Labels**: Add text labels to connections
- [x] **Change Connections**: Ability to Select, Edit Color/Stroke/Style/Label, Delete Connections
- [x] **Export Options**: Save Canvas as SVG, PNG, or PDF
- [x] **Floating Prompt Window**: Add a floating prompt window to the canvas that allows for both quick connection creation and editing
- [ ] **Control-F Substring Connect**: Option to form connections to other char/substring that matched the current selection
- [x] **Additional Syntax Highlighting 1**: Add for C and Devicetree (.dts, .dtsi, .overlay)
- [ ] **Code Folding**: Collapse/expand code sections  
- [ ] **Minimap**: Overview panel for large files
- [ ] **Save/Load ProjectFiles**: Add the option to save and load project files 
  - Save and load current project state - All Code (their position, syntax, and keeping their formatting), Connections (color, style, label, etc)) and whatever else is needed to restore the project to the same state
  - Probably in JSON format


- [ ] **Zoom and Pan**: Navigate large codebases
- [ ] **Search and Highlight**: Find and mark specific patterns
- [ ] **Plugin System**: Custom language highlighters
- [ ] **Collaborative Editing**: Real-time multi-user connections

- [ ] **Smart Connections**: Automatically detect related code
- [ ] **Refactoring Visualization**: Show code change impacts
- [ ] **Dependency Graphs**: Import/export relationship mapping
- [ ] **Code Metrics**: Complexity and coupling visualization
- [ ] **Animation System**: Animated connection creation
- [ ] **Themes**: Multiple color schemes
- [ ] **Layout Algorithms**: Auto-arrange connections

## Contributing

This is a custom-built canvas engine designed for maximum flexibility and performance. The modular architecture makes it easy to extend with new features.

### Adding New Languages

1. Add language config to `SyntaxHighlighter.initializeLanguages()`
2. Update `SupportedLanguage` type in `types/index.ts`
3. Add detection heuristics to `detectLanguage()` method

### Adding New Themes

1. Create theme config in `SyntaxHighlighter.initializeThemes()`
2. Define color mappings for token types
3. Update UI dropdown if desired

---

**Built with TypeScript, Canvas 2D, and Webpack** 🚀 