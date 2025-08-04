// Basic geometry types
export interface Point {
    x: number;
    y: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Character positioning and bounds
export interface CharacterBounds {
    char: string;
    x: number;
    y: number;
    width: number;
    height: number;
    charIndex: number;
    lineIndex: number;
}

// Text rendering configuration
export interface FontConfig {
    family: string;
    size: number;
    weight: string;
    style: string;
}

export interface TextStyle {
    color: string;
    backgroundColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

// Syntax highlighting types
export interface Token {
    type: string;
    value: string;
    startIndex: number;
    endIndex: number;
    line: number;
    column: number;
}

export interface SyntaxTheme {
    [tokenType: string]: TextStyle;
}

// Selection and interaction types
export interface TextSelection {
    startCharIndex: number;
    endCharIndex: number;
    startLine: number;
    endLine: number;
    fileId?: string; // Add optional fileId to support multi-file selections
}

export type LineStyle = 'solid' | 'dotted' | 'dashed';

export interface ConnectionLine {
    id: string;
    start: TextSelection;
    end: TextSelection;
    color: string;
    width: number;
    style: LineStyle;
    label?: string;
}

// Multi-file support types
export interface CodeFile {
    id: string;
    name: string;
    content: string;
    language: SupportedLanguage;
    lines: string[];
    syntaxStyles: TextStyle[][];
}

export interface FileLayout {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
}

// Dynamic pane system types
export interface EditorPane {
    id: string;
    fileId: string | null;
    order: number;
    title: string;
    isActive: boolean;
}

export interface PaneLayout {
    paneId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    tabHeight: number;
}

export type LayoutMode = 'single' | 'split-horizontal' | 'split-vertical' | 'grid' | 'auto';

// Renderer state
export interface RendererState {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    charWidth: number;
    scrollX: number;
    scrollY: number;
    scale: number;
}

// Language detection types
export type SupportedLanguage =
    | 'javascript'
    | 'typescript'
    | 'python'
    | 'java'
    | 'cpp'
    | 'c'
    | 'devicetree'
    | 'html'
    | 'css'
    | 'json'
    | 'markdown';

export interface LanguageConfig {
    name: string;
    extensions: string[];
    keywords: string[];
    operators: string[];
    brackets: string[];
    lineComment?: string;
    blockComment?: { start: string; end: string };
} 