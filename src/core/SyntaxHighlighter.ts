import { Token, SyntaxTheme, TextStyle, SupportedLanguage, LanguageConfig } from '../types/index';

export class SyntaxHighlighter {
    private themes: Map<string, SyntaxTheme> = new Map();
    private languages: Map<SupportedLanguage, LanguageConfig> = new Map();

    constructor() {
        this.initializeLanguages();
        this.initializeThemes();
    }

    private initializeLanguages(): void {
        // JavaScript/TypeScript
        this.languages.set('javascript', {
            name: 'JavaScript',
            extensions: ['.js', '.jsx'],
            keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'class', 'extends', 'import', 'export', 'default', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static', 'async', 'await'],
            operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '=>'],
            brackets: ['(', ')', '[', ']', '{', '}'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' }
        });

        this.languages.set('typescript', {
            name: 'TypeScript',
            extensions: ['.ts', '.tsx'],
            keywords: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'class', 'extends', 'import', 'export', 'default', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'static', 'async', 'await', 'interface', 'type', 'enum', 'public', 'private', 'protected', 'readonly'],
            operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '=>'],
            brackets: ['(', ')', '[', ']', '{', '}'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' }
        });

        // Python
        this.languages.set('python', {
            name: 'Python',
            extensions: ['.py'],
            keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'with', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False'],
            operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not'],
            brackets: ['(', ')', '[', ']', '{', '}'],
            lineComment: '#'
        });
    }

    private initializeThemes(): void {
        // VS Code Dark+ theme
        const darkTheme: SyntaxTheme = {
            keyword: { color: '#569cd6' },
            string: { color: '#ce9178' },
            number: { color: '#b5cea8' },
            comment: { color: '#6a9955' },
            operator: { color: '#d4d4d4' },
            bracket: { color: '#ffd700' },
            function: { color: '#dcdcaa' },
            variable: { color: '#9cdcfe' },
            type: { color: '#4ec9b0' },
            default: { color: '#d4d4d4' }
        };

        this.themes.set('dark', darkTheme);
    }

    public detectLanguage(code: string, hint?: string): SupportedLanguage {
        if (hint && this.languages.has(hint as SupportedLanguage)) {
            return hint as SupportedLanguage;
        }

        // Simple heuristics for language detection
        if (code.includes('function') && (code.includes('const') || code.includes('let'))) {
            if (code.includes('interface') || code.includes(': string') || code.includes(': number')) {
                return 'typescript';
            }
            return 'javascript';
        }

        if (code.includes('def ') && code.includes(':')) {
            return 'python';
        }

        // Default fallback
        return 'javascript';
    }

    public tokenize(code: string, language: SupportedLanguage): Token[] {
        const tokens: Token[] = [];
        const lines = code.split('\n');
        const langConfig = this.languages.get(language);

        if (!langConfig) {
            return this.tokenizeGeneric(code);
        }

        let globalIndex = 0;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            let columnIndex = 0;

            while (columnIndex < line.length) {
                const remaining = line.slice(columnIndex);

                // Skip whitespace
                const whitespaceMatch = remaining.match(/^\s+/);
                if (whitespaceMatch) {
                    columnIndex += whitespaceMatch[0].length;
                    globalIndex += whitespaceMatch[0].length;
                    continue;
                }

                // Comments
                if (langConfig.lineComment && remaining.startsWith(langConfig.lineComment)) {
                    const commentText = remaining;
                    tokens.push({
                        type: 'comment',
                        value: commentText,
                        startIndex: globalIndex,
                        endIndex: globalIndex + commentText.length,
                        line: lineIndex,
                        column: columnIndex
                    });
                    globalIndex += commentText.length;
                    break; // Rest of line is comment
                }

                // String literals
                const stringMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
                if (stringMatch) {
                    tokens.push({
                        type: 'string',
                        value: stringMatch[0],
                        startIndex: globalIndex,
                        endIndex: globalIndex + stringMatch[0].length,
                        line: lineIndex,
                        column: columnIndex
                    });
                    columnIndex += stringMatch[0].length;
                    globalIndex += stringMatch[0].length;
                    continue;
                }

                // Numbers
                const numberMatch = remaining.match(/^\d+\.?\d*/);
                if (numberMatch) {
                    tokens.push({
                        type: 'number',
                        value: numberMatch[0],
                        startIndex: globalIndex,
                        endIndex: globalIndex + numberMatch[0].length,
                        line: lineIndex,
                        column: columnIndex
                    });
                    columnIndex += numberMatch[0].length;
                    globalIndex += numberMatch[0].length;
                    continue;
                }

                // Identifiers and keywords
                const identifierMatch = remaining.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
                if (identifierMatch) {
                    const value = identifierMatch[0];
                    const type = langConfig.keywords.includes(value) ? 'keyword' : 'identifier';

                    tokens.push({
                        type,
                        value,
                        startIndex: globalIndex,
                        endIndex: globalIndex + value.length,
                        line: lineIndex,
                        column: columnIndex
                    });
                    columnIndex += value.length;
                    globalIndex += value.length;
                    continue;
                }

                // Operators and brackets
                let matched = false;
                for (const op of [...langConfig.operators, ...langConfig.brackets].sort((a, b) => b.length - a.length)) {
                    if (remaining.startsWith(op)) {
                        const type = langConfig.brackets.includes(op) ? 'bracket' : 'operator';
                        tokens.push({
                            type,
                            value: op,
                            startIndex: globalIndex,
                            endIndex: globalIndex + op.length,
                            line: lineIndex,
                            column: columnIndex
                        });
                        columnIndex += op.length;
                        globalIndex += op.length;
                        matched = true;
                        break;
                    }
                }

                if (!matched) {
                    // Single character fallback
                    tokens.push({
                        type: 'default',
                        value: remaining[0],
                        startIndex: globalIndex,
                        endIndex: globalIndex + 1,
                        line: lineIndex,
                        column: columnIndex
                    });
                    columnIndex += 1;
                    globalIndex += 1;
                }
            }

            // Account for newline character
            globalIndex += 1;
        }

        return tokens;
    }

    private tokenizeGeneric(code: string): Token[] {
        // Simple fallback tokenizer
        const tokens: Token[] = [];
        const lines = code.split('\n');
        let globalIndex = 0;

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                tokens.push({
                    type: 'default',
                    value: line[charIndex],
                    startIndex: globalIndex,
                    endIndex: globalIndex + 1,
                    line: lineIndex,
                    column: charIndex
                });
                globalIndex++;
            }
            globalIndex++; // newline
        }

        return tokens;
    }

    public getStylesForTokens(tokens: Token[], theme: string = 'dark'): TextStyle[][] {
        const themeConfig = this.themes.get(theme);
        if (!themeConfig) {
            throw new Error(`Theme '${theme}' not found`);
        }

        const lines: TextStyle[][] = [];

        for (const token of tokens) {
            // Ensure line array exists
            while (lines.length <= token.line) {
                lines.push([]);
            }

            const style = themeConfig[token.type] || themeConfig.default || { color: '#d4d4d4' };

            // Apply style to each character in the token
            for (let i = 0; i < token.value.length; i++) {
                lines[token.line][token.column + i] = style;
            }
        }

        return lines;
    }

    public highlight(code: string, language?: SupportedLanguage, theme: string = 'dark'): TextStyle[][] {
        const detectedLanguage = language || this.detectLanguage(code);
        const tokens = this.tokenize(code, detectedLanguage);
        return this.getStylesForTokens(tokens, theme);
    }
} 