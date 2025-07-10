import { TextRenderer } from './TextRenderer';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import {
    CharacterBounds,
    TextSelection,
    ConnectionLine,
    SupportedLanguage,
    TextStyle
} from '../types/index';

export class CodeVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private textRenderer: TextRenderer;
    private syntaxHighlighter: SyntaxHighlighter;

    // State
    private codeLines: string[] = [];
    private currentLanguage: SupportedLanguage = 'javascript';
    private syntaxStyles: TextStyle[][] = [];
    private connectionLines: ConnectionLine[] = [];
    private defaultLineColor: string = '#007acc';

    // Interaction state
    private isSelecting: boolean = false;
    private selectionStart: CharacterBounds | null = null;
    private selectionEnd: CharacterBounds | null = null;
    private currentSelection: TextSelection | null = null;
    private pendingSelection: TextSelection | null = null;

    // Connection creation state
    private firstSelection: TextSelection | null = null;
    private isCreatingConnection: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;

        this.textRenderer = new TextRenderer(canvas);
        this.syntaxHighlighter = new SyntaxHighlighter();

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Mouse events for text selection
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Keyboard events for connection creation
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    private handleMouseDown(event: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const char = this.textRenderer.getCharacterAt(x, y);
        if (char) {
            this.isSelecting = true;
            this.selectionStart = char;
            this.selectionEnd = char;
            this.updateSelection();
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isSelecting || !this.selectionStart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const char = this.textRenderer.getCharacterAt(x, y);
        if (char) {
            this.selectionEnd = char;
            this.updateSelection();
        }
    }

    private handleMouseUp(_event: MouseEvent): void {
        if (this.isSelecting && this.currentSelection) {
            this.finalizeSelection();
        }

        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionEnd = null;
    }

    private handleKeyDown(event: KeyboardEvent): void {
        // Press 'C' to create connection between selections
        if (event.key === 'c' || event.key === 'C') {
            if (this.pendingSelection && this.firstSelection) {
                this.createConnection(this.firstSelection, this.pendingSelection);
                this.firstSelection = null;
                this.pendingSelection = null;
                this.isCreatingConnection = false;
            } else if (this.pendingSelection) {
                this.firstSelection = this.pendingSelection;
                this.isCreatingConnection = true;
                console.log('First selection set. Select another text sequence and press C again to create connection.');
            }
        }

        // Press 'Escape' to cancel connection creation
        if (event.key === 'Escape') {
            this.firstSelection = null;
            this.isCreatingConnection = false;
            console.log('Connection creation cancelled.');
        }

        // Press 'Delete' to clear all connections
        if (event.key === 'Delete') {
            this.connectionLines = [];
            this.render();
            console.log('All connections cleared.');
        }
    }

    private updateSelection(): void {
        if (!this.selectionStart || !this.selectionEnd) return;

        // Determine selection bounds
        const startLine = Math.min(this.selectionStart.lineIndex, this.selectionEnd.lineIndex);
        const endLine = Math.max(this.selectionStart.lineIndex, this.selectionEnd.lineIndex);

        let startChar: number, endChar: number;

        if (startLine === endLine) {
            startChar = Math.min(this.selectionStart.charIndex, this.selectionEnd.charIndex);
            endChar = Math.max(this.selectionStart.charIndex, this.selectionEnd.charIndex);
        } else {
            if (this.selectionStart.lineIndex < this.selectionEnd.lineIndex) {
                startChar = this.selectionStart.charIndex;
                endChar = this.selectionEnd.charIndex;
            } else {
                startChar = this.selectionEnd.charIndex;
                endChar = this.selectionStart.charIndex;
            }
        }

        this.currentSelection = {
            startCharIndex: startChar,
            endCharIndex: endChar,
            startLine: startLine,
            endLine: endLine
        };

        this.render();
    }

    private finalizeSelection(): void {
        if (this.currentSelection) {
            this.pendingSelection = { ...this.currentSelection };
            console.log(`Selected: Line ${this.currentSelection.startLine + 1}, Char ${this.currentSelection.startCharIndex} to Line ${this.currentSelection.endLine + 1}, Char ${this.currentSelection.endCharIndex}`);

            if (this.isCreatingConnection) {
                console.log('Now select the end point and press C to create connection.');
            } else {
                console.log('Press C to set this as start of a connection.');
            }
        }

        this.currentSelection = null;
    }

    private createConnection(start: TextSelection, end: TextSelection): void {
        const connection: ConnectionLine = {
            id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            start: { ...start },
            end: { ...end },
            color: this.defaultLineColor,
            width: 2
        };

        this.connectionLines.push(connection);
        this.render();

        console.log(`Connection created between Line ${start.startLine + 1} and Line ${end.startLine + 1}`);
    }

    public loadCode(code: string, language?: SupportedLanguage): void {
        this.codeLines = code.split('\n');
        this.currentLanguage = language || this.syntaxHighlighter.detectLanguage(code);
        this.syntaxStyles = this.syntaxHighlighter.highlight(code, this.currentLanguage);
        this.render();

        console.log(`Code loaded with ${this.codeLines.length} lines (${this.currentLanguage})`);
    }

    public setFontSize(size: number): void {
        this.textRenderer.setFontSize(size);
        this.render();
    }

    public setDefaultLineColor(color: string): void {
        this.defaultLineColor = color;
    }

    public handleResize(): void {
        this.render();
    }

    private render(): void {
        // Clear canvas
        this.textRenderer.clear();

        // Render syntax-highlighted text
        this.textRenderer.renderText(this.codeLines, this.syntaxStyles);

        // Render current selection highlight
        if (this.currentSelection) {
            this.textRenderer.highlightSelection(
                this.currentSelection.startLine,
                this.currentSelection.startCharIndex,
                this.currentSelection.endLine,
                this.currentSelection.endCharIndex,
                'rgba(0, 122, 204, 0.3)'
            );
        }

        // Render pending selection highlight (different color)
        if (this.pendingSelection && !this.currentSelection) {
            this.textRenderer.highlightSelection(
                this.pendingSelection.startLine,
                this.pendingSelection.startCharIndex,
                this.pendingSelection.endLine,
                this.pendingSelection.endCharIndex,
                this.isCreatingConnection ? 'rgba(255, 193, 7, 0.3)' : 'rgba(40, 167, 69, 0.3)'
            );
        }

        // Render first selection highlight when creating connection
        if (this.firstSelection && this.isCreatingConnection) {
            this.textRenderer.highlightSelection(
                this.firstSelection.startLine,
                this.firstSelection.startCharIndex,
                this.firstSelection.endLine,
                this.firstSelection.endCharIndex,
                'rgba(220, 53, 69, 0.3)'
            );
        }

        // Render connection lines
        this.renderConnectionLines();
    }

    private renderConnectionLines(): void {
        for (const connection of this.connectionLines) {
            this.renderConnectionLine(connection);
        }
    }

    private renderConnectionLine(connection: ConnectionLine): void {
        // Get the bounding boxes for start and end selections
        const startBounds = this.getSelectionBounds(connection.start);
        const endBounds = this.getSelectionBounds(connection.end);

        if (!startBounds || !endBounds) return;

        // Calculate connection points (center of selections)
        const startX = startBounds.x + startBounds.width / 2;
        const startY = startBounds.y + startBounds.height / 2;
        const endX = endBounds.x + endBounds.width / 2;
        const endY = endBounds.y + endBounds.height / 2;

        // Draw the line
        this.ctx.save();
        this.ctx.strokeStyle = connection.color;
        this.ctx.lineWidth = connection.width;
        this.ctx.setLineDash([]);

        // Draw a curved line
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);

        // Calculate control points for bezier curve
        const controlOffset = Math.abs(endY - startY) * 0.5;

        this.ctx.bezierCurveTo(
            startX + controlOffset, startY,
            endX - controlOffset, endY,
            endX, endY
        );

        this.ctx.stroke();

        // Draw arrow at end
        this.drawArrow(endX, endY, Math.atan2(endY - startY, endX - startX), connection.color);

        this.ctx.restore();
    }

    private drawArrow(x: number, y: number, angle: number, color: string): void {
        const arrowLength = 10;
        const arrowWidth = 6;

        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-arrowLength, -arrowWidth / 2);
        this.ctx.lineTo(-arrowLength, arrowWidth / 2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    private getSelectionBounds(selection: TextSelection): { x: number, y: number, width: number, height: number } | null {
        const startBounds = this.textRenderer.getCharacterBounds(selection.startLine, selection.startCharIndex);
        const endBounds = this.textRenderer.getCharacterBounds(selection.endLine, selection.endCharIndex);

        if (!startBounds || !endBounds) return null;

        const x = Math.min(startBounds.x, endBounds.x);
        const y = Math.min(startBounds.y, endBounds.y);
        const width = Math.max(endBounds.x + endBounds.width - x, startBounds.x + startBounds.width - x);
        const height = Math.max(endBounds.y + endBounds.height - y, startBounds.y + startBounds.height - y);

        return { x, y, width, height };
    }

    // Public API methods
    public getConnectionLines(): ConnectionLine[] {
        return [...this.connectionLines];
    }

    public removeConnection(id: string): void {
        this.connectionLines = this.connectionLines.filter(conn => conn.id !== id);
        this.render();
    }

    public clearAllConnections(): void {
        this.connectionLines = [];
        this.render();
    }

    public exportConnections(): string {
        return JSON.stringify(this.connectionLines, null, 2);
    }

    public importConnections(connectionsJson: string): void {
        try {
            const connections = JSON.parse(connectionsJson) as ConnectionLine[];
            this.connectionLines = connections;
            this.render();
        } catch (error) {
            console.error('Failed to import connections:', error);
        }
    }
} 