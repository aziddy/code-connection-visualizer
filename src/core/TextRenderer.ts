import { CharacterBounds, FontConfig, TextStyle, RendererState } from '../types/index';

export class TextRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private fontConfig: FontConfig;
    private state: RendererState;
    private characterBounds: CharacterBounds[][] = []; // [line][char]
    private measuringCanvas: HTMLCanvasElement;
    private measuringCtx: CanvasRenderingContext2D;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;

        // Create measuring canvas for accurate character metrics
        this.measuringCanvas = document.createElement('canvas');
        this.measuringCanvas.width = 1000;
        this.measuringCanvas.height = 100;
        const measuringCtx = this.measuringCanvas.getContext('2d');
        if (!measuringCtx) {
            throw new Error('Could not create measuring context');
        }
        this.measuringCtx = measuringCtx;

        // Default font configuration
        this.fontConfig = {
            family: 'Consolas, Monaco, "Courier New", monospace',
            size: 14,
            weight: 'normal',
            style: 'normal'
        };

        // Initialize renderer state
        this.state = {
            fontSize: 14,
            fontFamily: this.fontConfig.family,
            lineHeight: 20,
            charWidth: 8.4, // Will be calculated accurately
            scrollX: 0,
            scrollY: 0,
            scale: 1
        };

        this.updateFontMetrics();
    }

    private updateFontMetrics(): void {
        const font = this.getFontString();
        this.measuringCtx.font = font;
        this.ctx.font = font;

        // Measure character width using 'M' (typically widest character in monospace)
        const metrics = this.measuringCtx.measureText('M');
        this.state.charWidth = metrics.width;

        // Calculate line height with some padding
        const textMetrics = this.measuringCtx.measureText('Mg');
        const actualHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
        this.state.lineHeight = Math.max(actualHeight * 1.4, this.state.fontSize * 1.4);
    }

    private getFontString(): string {
        return `${this.fontConfig.style} ${this.fontConfig.weight} ${this.fontConfig.size}px ${this.fontConfig.family}`;
    }

    public setFontSize(size: number): void {
        this.fontConfig.size = size;
        this.state.fontSize = size;
        this.updateFontMetrics();
    }

    public setFontFamily(family: string): void {
        this.fontConfig.family = family;
        this.state.fontFamily = family;
        this.updateFontMetrics();
    }

    public clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    public renderText(lines: string[], styles?: TextStyle[][]): void {
        this.clear();
        this.characterBounds = [];

        const startX = 20 - this.state.scrollX;
        const startY = 30 - this.state.scrollY;

        this.ctx.font = this.getFontString();
        this.ctx.textBaseline = 'top';

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const line = lines[lineIndex];
            const lineY = startY + lineIndex * this.state.lineHeight;

            // Skip lines that are outside viewport
            if (lineY + this.state.lineHeight < 0 || lineY > this.canvas.height) {
                this.characterBounds[lineIndex] = [];
                continue;
            }

            const lineBounds: CharacterBounds[] = [];

            for (let charIndex = 0; charIndex < line.length; charIndex++) {
                const char = line[charIndex];
                const charX = startX + charIndex * this.state.charWidth;

                // Calculate character bounds
                const bounds: CharacterBounds = {
                    char,
                    x: charX,
                    y: lineY,
                    width: this.state.charWidth,
                    height: this.state.lineHeight,
                    charIndex,
                    lineIndex
                };

                lineBounds.push(bounds);

                // Apply style if provided
                const style = styles?.[lineIndex]?.[charIndex];
                if (style) {
                    // Draw background if specified
                    if (style.backgroundColor) {
                        this.ctx.fillStyle = style.backgroundColor;
                        this.ctx.fillRect(charX, lineY, this.state.charWidth, this.state.lineHeight);
                    }

                    // Set text color
                    this.ctx.fillStyle = style.color;
                } else {
                    // Default text color
                    this.ctx.fillStyle = '#d4d4d4';
                }

                // Draw the character
                this.ctx.fillText(char, charX, lineY);
            }

            this.characterBounds[lineIndex] = lineBounds;
        }
    }

    public getCharacterAt(x: number, y: number): CharacterBounds | null {
        for (const line of this.characterBounds) {
            for (const char of line) {
                if (x >= char.x && x < char.x + char.width &&
                    y >= char.y && y < char.y + char.height) {
                    return char;
                }
            }
        }
        return null;
    }

    public getCharacterBounds(lineIndex: number, charIndex: number): CharacterBounds | null {
        if (lineIndex < 0 || lineIndex >= this.characterBounds.length) {
            return null;
        }
        if (charIndex < 0 || charIndex >= this.characterBounds[lineIndex].length) {
            return null;
        }
        return this.characterBounds[lineIndex][charIndex];
    }

    public getAllCharacterBounds(): CharacterBounds[][] {
        return this.characterBounds;
    }

    public getState(): RendererState {
        return { ...this.state };
    }

    public setScroll(x: number, y: number): void {
        this.state.scrollX = x;
        this.state.scrollY = y;
    }

    public getLineHeight(): number {
        return this.state.lineHeight;
    }

    public getCharWidth(): number {
        return this.state.charWidth;
    }

    public highlightSelection(startLine: number, startChar: number, endLine: number, endChar: number, color: string = 'rgba(0, 122, 204, 0.3)'): void {
        this.ctx.fillStyle = color;

        if (startLine === endLine) {
            // Single line selection
            const bounds = this.characterBounds[startLine];
            if (bounds && bounds.length > 0) {
                const startX = bounds[startChar]?.x || 0;
                const endX = bounds[Math.min(endChar, bounds.length - 1)]?.x || startX;
                const y = bounds[0].y;
                this.ctx.fillRect(startX, y, Math.max(endX - startX + this.state.charWidth, this.state.charWidth), this.state.lineHeight);
            }
        } else {
            // Multi-line selection
            for (let line = startLine; line <= endLine; line++) {
                const bounds = this.characterBounds[line];
                if (!bounds || bounds.length === 0) continue;

                if (line === startLine) {
                    // First line - from startChar to end of line
                    const startX = bounds[startChar]?.x || 0;
                    const endX = bounds[bounds.length - 1]?.x + this.state.charWidth || startX;
                    this.ctx.fillRect(startX, bounds[0].y, endX - startX, this.state.lineHeight);
                } else if (line === endLine) {
                    // Last line - from start to endChar
                    const startX = bounds[0].x;
                    const endX = bounds[Math.min(endChar, bounds.length - 1)]?.x || startX;
                    this.ctx.fillRect(startX, bounds[0].y, endX - startX + this.state.charWidth, this.state.lineHeight);
                } else {
                    // Middle lines - entire line
                    const startX = bounds[0].x;
                    const endX = bounds[bounds.length - 1]?.x + this.state.charWidth || startX;
                    this.ctx.fillRect(startX, bounds[0].y, endX - startX, this.state.lineHeight);
                }
            }
        }
    }
} 