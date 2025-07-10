import { TextRenderer } from './TextRenderer';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import {
    CharacterBounds,
    TextSelection,
    ConnectionLine,
    SupportedLanguage,
    CodeFile,
    FileLayout
} from '../types/index';

export class CodeVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private textRenderer: TextRenderer;
    private syntaxHighlighter: SyntaxHighlighter;

    // Multi-file state
    private codeFiles: Map<string, CodeFile> = new Map();
    private fileLayouts: Map<string, FileLayout> = new Map();
    private connectionLines: ConnectionLine[] = [];
    private defaultLineColor: string = '#007acc';
    private activeFileId: string | null = null;

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

        const result = this.getCharacterAtPosition(x, y);
        if (result) {
            this.isSelecting = true;
            this.selectionStart = result.char;
            this.selectionEnd = result.char;
            this.activeFileId = result.fileId;
            this.updateSelection();
        }
    }

    private handleMouseMove(event: MouseEvent): void {
        if (!this.isSelecting || !this.selectionStart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const result = this.getCharacterAtPosition(x, y);
        if (result && result.fileId === this.activeFileId) {
            this.selectionEnd = result.char;
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
        if (!this.selectionStart || !this.selectionEnd || !this.activeFileId) return;

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
            endLine: endLine,
            fileId: this.activeFileId
        };

        this.render();
    }

    private finalizeSelection(): void {
        if (this.currentSelection) {
            this.pendingSelection = { ...this.currentSelection };
            const fileName = this.codeFiles.get(this.currentSelection.fileId!)?.name || 'Unknown';
            console.log(`Selected in ${fileName}: Line ${this.currentSelection.startLine + 1}, Char ${this.currentSelection.startCharIndex} to Line ${this.currentSelection.endLine + 1}, Char ${this.currentSelection.endCharIndex}`);

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
            id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            start: { ...start },
            end: { ...end },
            color: this.defaultLineColor,
            width: 2
        };

        this.connectionLines.push(connection);
        this.render();

        const startFile = this.codeFiles.get(start.fileId!)?.name || 'Unknown';
        const endFile = this.codeFiles.get(end.fileId!)?.name || 'Unknown';
        console.log(`Connection created between ${startFile}:${start.startLine + 1} and ${endFile}:${end.startLine + 1}`);
    }

    public loadCodeFile(id: string, name: string, code: string, language?: SupportedLanguage): void {
        console.log(`CodeVisualizer.loadCodeFile called: ${id}, ${name}, code length: ${code.length}`);
        
        const detectedLanguage = language || this.syntaxHighlighter.detectLanguage(code);
        const lines = code.split('\n');
        const syntaxStyles = this.syntaxHighlighter.highlight(code, detectedLanguage);

        const codeFile: CodeFile = {
            id,
            name,
            content: code,
            language: detectedLanguage,
            lines,
            syntaxStyles
        };

        this.codeFiles.set(id, codeFile);
        console.log(`Files now loaded: ${Array.from(this.codeFiles.keys()).join(', ')}`);
        
        this.updateFileLayouts();
        this.render();

        console.log(`Code file '${name}' loaded with ${lines.length} lines (${detectedLanguage})`);
    }

    // Legacy method for backward compatibility
    public loadCode(code: string, language?: SupportedLanguage): void {
        this.loadCodeFile('file1', 'Main File', code, language);
    }

    public setFontSize(size: number): void {
        this.textRenderer.setFontSize(size);
        this.render();
    }

    public setDefaultLineColor(color: string): void {
        this.defaultLineColor = color;
    }

    public handleResize(): void {
        this.updateFileLayouts();
        this.render();
    }

    private render(): void {
        console.log(`Rendering ${this.codeFiles.size} files`);
        
        // Clear canvas
        this.textRenderer.clear();

        // Render all code files
        for (const [fileId, codeFile] of this.codeFiles) {
            const layout = this.fileLayouts.get(fileId);
            console.log(`File ${fileId}: layout exists=${!!layout}, visible=${layout?.visible}`);
            if (layout && layout.visible) {
                console.log(`Rendering file ${fileId} at position (${layout.x}, ${layout.y})`);
                this.textRenderer.renderFileText(codeFile, layout);
            }
        }

        // Render current selection highlight
        if (this.currentSelection) {
            const layout = this.fileLayouts.get(this.currentSelection.fileId!);
            if (layout) {
                this.textRenderer.highlightSelectionInFile(
                    layout,
                    this.currentSelection.startLine,
                    this.currentSelection.startCharIndex,
                    this.currentSelection.endLine,
                    this.currentSelection.endCharIndex,
                    'rgba(0, 122, 204, 0.3)'
                );
            }
        }

        // Render pending selection highlight (different color)
        if (this.pendingSelection && !this.currentSelection) {
            const layout = this.fileLayouts.get(this.pendingSelection.fileId!);
            if (layout) {
                this.textRenderer.highlightSelectionInFile(
                    layout,
                    this.pendingSelection.startLine,
                    this.pendingSelection.startCharIndex,
                    this.pendingSelection.endLine,
                    this.pendingSelection.endCharIndex,
                    this.isCreatingConnection ? 'rgba(255, 193, 7, 0.3)' : 'rgba(40, 167, 69, 0.3)'
                );
            }
        }

        // Render first selection highlight when creating connection
        if (this.firstSelection && this.isCreatingConnection) {
            const layout = this.fileLayouts.get(this.firstSelection.fileId!);
            if (layout) {
                this.textRenderer.highlightSelectionInFile(
                    layout,
                    this.firstSelection.startLine,
                    this.firstSelection.startCharIndex,
                    this.firstSelection.endLine,
                    this.firstSelection.endCharIndex,
                    'rgba(220, 53, 69, 0.3)'
                );
            }
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
        if (!selection.fileId) return null;
        
        const layout = this.fileLayouts.get(selection.fileId);
        if (!layout) return null;

        const startBounds = this.textRenderer.getCharacterBoundsInFile(layout, selection.startLine, selection.startCharIndex);
        const endBounds = this.textRenderer.getCharacterBoundsInFile(layout, selection.endLine, selection.endCharIndex);

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

    // Multi-file specific methods
    private updateFileLayouts(): void {
        const files = Array.from(this.codeFiles.values());
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        console.log(`updateFileLayouts: ${files.length} files, canvas: ${canvasWidth}x${canvasHeight}`);
        
        if (files.length === 0) {
            console.log('No files to layout');
            return;
        }

        // Calculate layout based on number of files
        if (files.length === 1) {
            this.fileLayouts.set(files[0].id, {
                id: files[0].id,
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                visible: true
            });
        } else if (files.length === 2) {
            // Side by side layout
            const width = canvasWidth / 2;
            this.fileLayouts.set(files[0].id, {
                id: files[0].id,
                x: 0,
                y: 0,
                width: width - 10,
                height: canvasHeight,
                visible: true
            });
            this.fileLayouts.set(files[1].id, {
                id: files[1].id,
                x: width + 10,
                y: 0,
                width: width - 10,
                height: canvasHeight,
                visible: true
            });
        } else if (files.length === 3) {
            // 2 top, 1 bottom layout
            const width = canvasWidth / 2;
            const height = canvasHeight / 2;
            this.fileLayouts.set(files[0].id, {
                id: files[0].id,
                x: 0,
                y: 0,
                width: width - 5,
                height: height - 5,
                visible: true
            });
            this.fileLayouts.set(files[1].id, {
                id: files[1].id,
                x: width + 5,
                y: 0,
                width: width - 5,
                height: height - 5,
                visible: true
            });
            this.fileLayouts.set(files[2].id, {
                id: files[2].id,
                x: canvasWidth / 4,
                y: height + 5,
                width: canvasWidth / 2,
                height: height - 5,
                visible: true
            });
        }
    }

    private getCharacterAtPosition(x: number, y: number): { char: CharacterBounds; fileId: string } | null {
        for (const [fileId, layout] of this.fileLayouts) {
            if (layout.visible && 
                x >= layout.x && x <= layout.x + layout.width &&
                y >= layout.y && y <= layout.y + layout.height) {
                const char = this.textRenderer.getCharacterAtInFile(layout, x, y);
                if (char) {
                    return { char, fileId };
                }
            }
        }
        return null;
    }

    public removeCodeFile(id: string): void {
        this.codeFiles.delete(id);
        this.fileLayouts.delete(id);
        
        // Remove connections involving this file
        this.connectionLines = this.connectionLines.filter(
            conn => conn.start.fileId !== id && conn.end.fileId !== id
        );
        
        this.updateFileLayouts();
        this.render();
    }

    public getCodeFiles(): CodeFile[] {
        return Array.from(this.codeFiles.values());
    }
} 