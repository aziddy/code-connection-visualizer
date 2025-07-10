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
}

export interface ConnectionLine {
    id: string;
    start: TextSelection;
    end: TextSelection;
    color: string;
    width: number;
}

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