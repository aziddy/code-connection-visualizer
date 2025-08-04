import { TextRenderer } from './TextRenderer';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { FloatingPrompt } from './FloatingPrompt';
import { PromptTemplates } from './PromptTemplates';
import { PaneManager } from './PaneManager';
import {
    CharacterBounds,
    TextSelection,
    ConnectionLine,
    SupportedLanguage,
    CodeFile,
    FileLayout,
    LineStyle,
    EditorPane,
    LayoutMode
} from '../types/index';

export class CodeVisualizer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private textRenderer: TextRenderer;
    private syntaxHighlighter: SyntaxHighlighter;
    private paneManager: PaneManager;

    // Multi-file state
    private codeFiles: Map<string, CodeFile> = new Map();
    private fileLayouts: Map<string, FileLayout> = new Map();
    private connectionLines: ConnectionLine[] = [];
    private activeFileId: string | null = null;

    // Store last used connection settings for reuse
    private lastUsedSettings: {
        color: string;
        style: LineStyle;
        width: number;
    } = {
        color: '#007acc',
        style: 'solid',
        width: 2
    };

    // Interaction state
    private isSelecting: boolean = false;
    private selectionStart: CharacterBounds | null = null;
    private selectionEnd: CharacterBounds | null = null;
    private currentSelection: TextSelection | null = null;
    private pendingSelection: TextSelection | null = null;

    // Connection creation state
    private firstSelection: TextSelection | null = null;
    private isCreatingConnection: boolean = false;
    
    // Connection editing state
    private selectedConnection: ConnectionLine | null = null;
    
    // Floating prompt state
    private currentPrompt: FloatingPrompt | null = null;
    private promptContainer: HTMLElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get 2D context from canvas');
        }
        this.ctx = ctx;

        this.textRenderer = new TextRenderer(canvas);
        this.syntaxHighlighter = new SyntaxHighlighter();
        this.paneManager = new PaneManager();
        
        // Set up prompt container (use canvas parent or body)
        this.promptContainer = canvas.parentElement || document.body;

        this.setupPaneManager();
        this.setupEventListeners();
    }

    private setupPaneManager(): void {
        // Set initial canvas dimensions
        this.paneManager.setCanvasDimensions(this.canvas.width, this.canvas.height);

        // Listen for pane changes
        this.paneManager.onPaneChange((panes: EditorPane[]) => {
            this.updateFileLayoutsFromPanes();
            this.render();
            
            // Dispatch custom event for UI updates
            const event = new CustomEvent('panesChanged', { detail: { panes } });
            this.canvas.dispatchEvent(event);
        });

        // Listen for layout changes
        this.paneManager.onLayoutChange(() => {
            this.updateFileLayoutsFromPanes();
            this.render();
        });
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

        // Check if clicking on a pane tab
        const tabClick = this.paneManager.isPaneTabAt(x, y);
        if (tabClick) {
            if (tabClick.isCloseButton) {
                this.paneManager.removePane(tabClick.paneId);
            } else {
                this.paneManager.setActivePane(tabClick.paneId);
            }
            return;
        }

        // Check if clicking on a connection line first
        const clickedConnection = this.getConnectionAtPosition(x, y);
        if (clickedConnection) {
            this.selectConnection(clickedConnection);
            return;
        }

        // If not clicking on a connection, handle text selection
        this.clearConnectionSelection();
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
        // Press 'C' to create connection between selections without prompt
        if (event.key === 'c' || event.key === 'C') {
            if (this.pendingSelection && this.firstSelection) {
                this.createConnectionDirectly(this.firstSelection, this.pendingSelection);
            } else if (this.pendingSelection) {
                this.firstSelection = this.pendingSelection;
                this.isCreatingConnection = true;
                console.log('First selection set. Select another text sequence and press C again to create connection.');
            }
        }

        // Press 'Escape' to cancel connection creation or close prompt
        if (event.key === 'Escape') {
            if (this.currentPrompt) {
                this.currentPrompt.close();
                this.currentPrompt = null;
            } else {
                this.firstSelection = null;
                this.isCreatingConnection = false;
                console.log('Connection creation cancelled.');
            }
        }

        // Press 'Delete' to clear all connections or delete selected connection
        if (event.key === 'Delete') {
            if (this.selectedConnection) {
                // Delete only the selected connection
                this.deleteSelectedConnection();
            } else {
                // Delete all connections if none selected
                this.connectionLines = [];
                this.render();
                console.log('All connections cleared.');
            }
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


    public loadCodeFile(id: string, name: string, code: string, language?: SupportedLanguage): string {
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
        
        // Create a new pane for this file or attach to existing pane
        let paneId: string;
        const activePane = this.paneManager.getActivePane();
        
        if (activePane && !activePane.fileId) {
            // Use existing empty pane
            this.paneManager.attachFileToPane(activePane.id, id, name);
            paneId = activePane.id;
        } else {
            // Create new pane
            paneId = this.paneManager.createPane(name, id);
        }
        
        this.updateFileLayoutsFromPanes();
        this.render();

        console.log(`Code file '${name}' loaded with ${lines.length} lines (${detectedLanguage})`);
        
        return paneId;
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
        this.lastUsedSettings.color = color;
    }

    public setDefaultLineStyle(style: LineStyle): void {
        this.lastUsedSettings.style = style;
    }


    public handleResize(): void {
        this.paneManager.setCanvasDimensions(this.canvas.width, this.canvas.height);
        this.updateFileLayoutsFromPanes();
        this.render();
    }

    private updateFileLayoutsFromPanes(): void {
        this.fileLayouts.clear();
        
        const paneLayouts = this.paneManager.getPaneLayouts();
        const panes = this.paneManager.getPanes();

        for (const pane of panes) {
            const paneLayout = paneLayouts.get(pane.id);
            if (!paneLayout || !pane.fileId) continue;

            // Convert pane layout to file layout
            this.fileLayouts.set(pane.fileId, {
                id: pane.fileId,
                x: paneLayout.x,
                y: paneLayout.y,
                width: paneLayout.width,
                height: paneLayout.height - paneLayout.tabHeight,
                visible: true
            });
        }
    }

    private render(): void {
        console.log(`Rendering ${this.codeFiles.size} files`);
        
        // Clear canvas
        this.textRenderer.clear();

        // Render pane tabs first
        this.renderPaneTabs();

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

    private renderPaneTabs(): void {
        const panes = this.paneManager.getPanes();
        const paneLayouts = this.paneManager.getPaneLayouts();
        
        if (panes.length === 0) return;

        this.ctx.save();
        
        // For now, render a simple tab bar across the top
        const tabHeight = 30;
        const tabWidth = Math.min(150, this.canvas.width / Math.max(1, panes.length));
        
        let currentX = 0;
        
        for (const pane of panes) {
            const paneLayout = paneLayouts.get(pane.id);
            if (!paneLayout) continue;
            
            // Tab background
            this.ctx.fillStyle = pane.isActive ? '#3c3c3c' : '#2d2d30';
            this.ctx.fillRect(currentX, 0, tabWidth, tabHeight);
            
            // Tab border
            this.ctx.strokeStyle = '#444444';
            this.ctx.strokeRect(currentX, 0, tabWidth, tabHeight);
            
            // Tab text
            this.ctx.fillStyle = '#cccccc';
            this.ctx.font = '12px Consolas, Monaco, "Courier New", monospace';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            
            const text = pane.title.length > 15 ? pane.title.substring(0, 12) + '...' : pane.title;
            this.ctx.fillText(text, currentX + 8, tabHeight / 2);
            
            // Close button (X)
            if (panes.length > 1) {
                this.ctx.fillStyle = '#cccccc';
                this.ctx.font = '14px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('×', currentX + tabWidth - 15, tabHeight / 2);
            }
            
            currentX += tabWidth;
        }
        
        this.ctx.restore();
    }

    private renderConnectionLines(): void {
        for (const connection of this.connectionLines) {
            const isSelected = this.selectedConnection?.id === connection.id;
            this.renderConnectionLine(connection, isSelected);
        }
    }

    private renderConnectionLine(connection: ConnectionLine, isSelected: boolean = false): void {
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
        
        // Highlight selected connections
        if (isSelected) {
            this.ctx.strokeStyle = '#ffff00'; // Yellow highlight
            this.ctx.lineWidth = connection.width + 2; // Thicker line
            this.ctx.globalAlpha = 0.7;
        } else {
            this.ctx.strokeStyle = connection.color;
            this.ctx.lineWidth = connection.width;
        }
        
        // Set line dash pattern based on style
        switch (connection.style) {
            case 'dotted':
                this.ctx.setLineDash([2, 4]);
                break;
            case 'dashed':
                this.ctx.setLineDash([8, 4]);
                break;
            case 'solid':
            default:
                this.ctx.setLineDash([]);
                break;
        }

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

        // Draw arrow at end (always solid)
        this.ctx.setLineDash([]);
        const arrowColor = isSelected ? '#ffff00' : connection.color;
        this.drawArrow(endX, endY, Math.atan2(endY - startY, endX - startX), arrowColor);

        // Draw label if present
        if (connection.label) {
            const labelColor = isSelected ? '#ffff00' : connection.color;
            this.drawConnectionLabel(connection.label, startX, startY, endX, endY, labelColor, isSelected);
        }

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

    private drawConnectionLabel(label: string, startX: number, startY: number, endX: number, endY: number, color: string, isSelected: boolean = false): void {
        // Calculate midpoint of the connection
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        // Set label style
        this.ctx.save();
        this.ctx.font = '12px Consolas, Monaco, "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Measure text for background
        const textMetrics = this.ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 16; // Approximate height

        // Draw background rectangle
        const padding = 4;
        if (isSelected) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; // Yellow background when selected
        } else {
            this.ctx.fillStyle = 'rgba(30, 30, 30, 0.9)'; // Dark background with transparency
        }
        this.ctx.fillRect(
            midX - textWidth / 2 - padding,
            midY - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );

        // Draw border
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(
            midX - textWidth / 2 - padding,
            midY - textHeight / 2 - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );

        // Draw text
        this.ctx.fillStyle = '#ffffff'; // White text
        this.ctx.fillText(label, midX, midY);

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

        // Detach file from any panes that have it
        const panes = this.paneManager.getPanes();
        for (const pane of panes) {
            if (pane.fileId === id) {
                this.paneManager.detachFileFromPane(pane.id);
            }
        }
        
        this.updateFileLayoutsFromPanes();
        this.render();
    }

    public getCodeFiles(): CodeFile[] {
        return Array.from(this.codeFiles.values());
    }

    // Pane management public API
    public createEmptyPane(title: string = 'New Pane'): string {
        return this.paneManager.createPane(title, null);
    }

    public closePane(paneId: string): boolean {
        const pane = this.paneManager.getPane(paneId);
        if (pane && pane.fileId) {
            // Optionally remove the file when closing pane
            // this.codeFiles.delete(pane.fileId);
        }
        return this.paneManager.removePane(paneId);
    }

    public setActivePane(paneId: string): boolean {
        return this.paneManager.setActivePane(paneId);
    }

    public movePane(paneId: string, newPosition: number): boolean {
        return this.paneManager.movePane(paneId, newPosition);
    }

    public setLayoutMode(mode: LayoutMode): void {
        this.paneManager.setLayoutMode(mode);
    }

    public getPanes(): EditorPane[] {
        return this.paneManager.getPanes();
    }

    public getActivePane(): EditorPane | null {
        return this.paneManager.getActivePane();
    }

    public getLayoutMode(): LayoutMode {
        return this.paneManager.getLayoutMode();
    }

    // Connection selection and management methods
    private getConnectionAtPosition(x: number, y: number): ConnectionLine | null {
        const clickTolerance = 10; // Pixels

        for (const connection of this.connectionLines) {
            if (this.isPointNearConnection(x, y, connection, clickTolerance)) {
                return connection;
            }
        }
        return null;
    }

    private isPointNearConnection(x: number, y: number, connection: ConnectionLine, tolerance: number): boolean {
        const startBounds = this.getSelectionBounds(connection.start);
        const endBounds = this.getSelectionBounds(connection.end);

        if (!startBounds || !endBounds) return false;

        const startX = startBounds.x + startBounds.width / 2;
        const startY = startBounds.y + startBounds.height / 2;
        const endX = endBounds.x + endBounds.width / 2;
        const endY = endBounds.y + endBounds.height / 2;

        // Check distance to the bezier curve (approximated with line segments)
        const numSegments = 20;
        for (let i = 0; i < numSegments; i++) {
            const t1 = i / numSegments;
            const t2 = (i + 1) / numSegments;

            const p1 = this.getBezierPoint(startX, startY, endX, endY, t1);
            const p2 = this.getBezierPoint(startX, startY, endX, endY, t2);

            const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
            if (distance <= tolerance) {
                return true;
            }
        }

        return false;
    }

    private getBezierPoint(startX: number, startY: number, endX: number, endY: number, t: number): {x: number, y: number} {
        const controlOffset = Math.abs(endY - startY) * 0.5;
        const cp1x = startX + controlOffset;
        const cp1y = startY;
        const cp2x = endX - controlOffset;
        const cp2y = endY;

        // Cubic bezier formula
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX,
            y: mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY
        };
    }

    private distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) {
            // x1, y1 and x2, y2 are the same point
            return Math.sqrt(A * A + B * B);
        }

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));

        const xx = x1 + param * C;
        const yy = y1 + param * D;

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private selectConnection(connection: ConnectionLine): void {
        this.selectedConnection = connection;
        this.render();
        console.log(`Selected connection: ${connection.id}`);
        
        // Show connection editing prompt
        this.showConnectionEditPrompt(connection);
        
        // Notify UI about connection selection
        this.notifyConnectionSelected(connection);
    }

    private clearConnectionSelection(): void {
        if (this.selectedConnection) {
            this.selectedConnection = null;
            this.render();
            
            // Notify UI about connection deselection
            this.notifyConnectionDeselected();
        }
    }

    private notifyConnectionSelected(connection: ConnectionLine): void {
        // Dispatch custom event for UI to handle
        const event = new CustomEvent('connectionSelected', { 
            detail: { connection } 
        });
        this.canvas.dispatchEvent(event);
    }

    private notifyConnectionDeselected(): void {
        // Dispatch custom event for UI to handle
        const event = new CustomEvent('connectionDeselected');
        this.canvas.dispatchEvent(event);
    }

    public updateSelectedConnection(updates: Partial<Pick<ConnectionLine, 'color' | 'width' | 'style' | 'label'>>): void {
        if (!this.selectedConnection) return;

        // Update the selected connection
        Object.assign(this.selectedConnection, updates);
        this.render();
        
        console.log(`Updated connection ${this.selectedConnection.id}:`, updates);
    }

    public deleteSelectedConnection(): void {
        if (!this.selectedConnection) return;

        const connectionId = this.selectedConnection.id;
        this.connectionLines = this.connectionLines.filter(conn => conn.id !== connectionId);
        this.selectedConnection = null;
        this.render();
        
        console.log(`Deleted connection: ${connectionId}`);
        this.notifyConnectionDeselected();
    }

    public getSelectedConnection(): ConnectionLine | null {
        return this.selectedConnection;
    }

    // Export functionality
    public exportAsPNG(filename: string = 'code-visualization'): void {
        // Create a temporary canvas with the current content
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d')!;
        
        // Fill with background color
        tempCtx.fillStyle = '#1e1e1e';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Copy the current canvas content
        tempCtx.drawImage(this.canvas, 0, 0);
        
        // Create download link
        tempCanvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                console.log(`PNG exported as ${filename}.png`);
            }
        }, 'image/png');
    }

    public exportAsSVG(filename: string = 'code-visualization'): void {
        const svgContent = this.generateSVG();
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`SVG exported as ${filename}.svg`);
    }

    public exportAsPDF(filename: string = 'code-visualization'): void {
        // Dynamic import for jsPDF to avoid bundling issues
        import('jspdf').then(({ jsPDF }) => {
            // Create a high-resolution canvas for PDF
            const tempCanvas = document.createElement('canvas');
            const scale = 2; // Higher resolution for PDF
            tempCanvas.width = this.canvas.width * scale;
            tempCanvas.height = this.canvas.height * scale;
            const tempCtx = tempCanvas.getContext('2d')!;
            
            // Scale context for high-resolution rendering
            tempCtx.scale(scale, scale);
            tempCtx.fillStyle = '#1e1e1e';
            tempCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Re-render everything at higher resolution
            this.renderToContext(tempCtx);
            
            // Convert canvas to image and add to PDF
            const imgData = tempCanvas.toDataURL('image/png');
            
            // Calculate PDF dimensions (A4 landscape)
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate image dimensions to fit page
            const canvasAspectRatio = tempCanvas.width / tempCanvas.height;
            const pageAspectRatio = pageWidth / pageHeight;
            
            let imgWidth, imgHeight;
            if (canvasAspectRatio > pageAspectRatio) {
                // Canvas is wider relative to page
                imgWidth = pageWidth - 20; // 10mm margin on each side
                imgHeight = imgWidth / canvasAspectRatio;
            } else {
                // Canvas is taller relative to page
                imgHeight = pageHeight - 20; // 10mm margin on top/bottom
                imgWidth = imgHeight * canvasAspectRatio;
            }
            
            // Center image on page
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;
            
            // Add image to PDF
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            
            // Save PDF
            pdf.save(`${filename}.pdf`);
            console.log(`PDF exported as ${filename}.pdf`);
        }).catch(error => {
            console.error('Failed to load jsPDF:', error);
            // Fallback to high-res PNG
            const tempCanvas = document.createElement('canvas');
            const scale = 2;
            tempCanvas.width = this.canvas.width * scale;
            tempCanvas.height = this.canvas.height * scale;
            const tempCtx = tempCanvas.getContext('2d')!;
            
            tempCtx.scale(scale, scale);
            tempCtx.fillStyle = '#1e1e1e';
            tempCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.renderToContext(tempCtx);
            
            tempCanvas.toBlob((blob) => {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${filename}-hires.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    console.log(`Fallback: High-res PNG exported as ${filename}-hires.png`);
                }
            }, 'image/png');
        });
    }

    private generateSVG(): string {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        svg += `<rect width="100%" height="100%" fill="#1e1e1e"/>`;
        
        // Add file backgrounds and borders
        for (const [fileId, codeFile] of this.codeFiles) {
            const layout = this.fileLayouts.get(fileId);
            if (layout && layout.visible) {
                svg += this.generateFileSVG(codeFile, layout);
            }
        }
        
        // Add connections
        for (const connection of this.connectionLines) {
            svg += this.generateConnectionSVG(connection);
        }
        
        svg += '</svg>';
        return svg;
    }

    private generateFileSVG(codeFile: CodeFile, layout: FileLayout): string {
        let svg = '';
        
        // File background
        svg += `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" fill="#1e1e1e" stroke="#3e3e42" stroke-width="1"/>`;
        
        // File name
        svg += `<text x="${layout.x + 5}" y="${layout.y + 17}" font-family="Consolas, Monaco, monospace" font-size="12" fill="#cccccc">${this.escapeXML(codeFile.name)}</text>`;
        
        // Code text
        const textStartX = layout.x + 10;
        const textStartY = layout.y + 35;
        const lineHeight = 20; // Approximate line height
        
        for (let lineIndex = 0; lineIndex < Math.min(codeFile.lines.length, 30); lineIndex++) {
            const line = codeFile.lines[lineIndex];
            const y = textStartY + lineIndex * lineHeight;
            
            svg += `<text x="${textStartX}" y="${y}" font-family="Consolas, Monaco, monospace" font-size="14" fill="#d4d4d4">${this.escapeXML(line)}</text>`;
        }
        
        return svg;
    }

    private generateConnectionSVG(connection: ConnectionLine): string {
        const startBounds = this.getSelectionBounds(connection.start);
        const endBounds = this.getSelectionBounds(connection.end);
        
        if (!startBounds || !endBounds) return '';
        
        const startX = startBounds.x + startBounds.width / 2;
        const startY = startBounds.y + startBounds.height / 2;
        const endX = endBounds.x + endBounds.width / 2;
        const endY = endBounds.y + endBounds.height / 2;
        
        const controlOffset = Math.abs(endY - startY) * 0.5;
        
        let svg = '';
        
        // Connection line
        const dashArray = connection.style === 'dotted' ? '2,4' : connection.style === 'dashed' ? '8,4' : 'none';
        const strokeDashArray = dashArray !== 'none' ? ` stroke-dasharray="${dashArray}"` : '';
        
        svg += `<path d="M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}" stroke="${connection.color}" stroke-width="${connection.width}" fill="none"${strokeDashArray}/>`;
        
        // Arrow
        const angle = Math.atan2(endY - startY, endX - startX);
        const arrowLength = 10;
        
        const arrowX1 = endX - arrowLength * Math.cos(angle - Math.PI / 6);
        const arrowY1 = endY - arrowLength * Math.sin(angle - Math.PI / 6);
        const arrowX2 = endX - arrowLength * Math.cos(angle + Math.PI / 6);
        const arrowY2 = endY - arrowLength * Math.sin(angle + Math.PI / 6);
        
        svg += `<polygon points="${endX},${endY} ${arrowX1},${arrowY1} ${arrowX2},${arrowY2}" fill="${connection.color}"/>`;
        
        // Label
        if (connection.label) {
            const labelX = (startX + endX) / 2;
            const labelY = (startY + endY) / 2;
            
            svg += `<rect x="${labelX - 50}" y="${labelY - 10}" width="100" height="20" fill="rgba(30,30,30,0.9)" stroke="${connection.color}" stroke-width="1"/>`;
            svg += `<text x="${labelX}" y="${labelY + 4}" font-family="Consolas, Monaco, monospace" font-size="12" fill="white" text-anchor="middle">${this.escapeXML(connection.label)}</text>`;
        }
        
        return svg;
    }

    private renderToContext(ctx: CanvasRenderingContext2D): void {
        // This method re-renders everything to a given context (for high-res export)
        const originalCtx = this.ctx;
        this.ctx = ctx;
        
        // Re-render all files
        for (const [fileId, codeFile] of this.codeFiles) {
            const layout = this.fileLayouts.get(fileId);
            if (layout && layout.visible) {
                this.textRenderer.renderFileText(codeFile, layout);
            }
        }
        
        // Re-render connections
        this.renderConnectionLines();
        
        // Restore original context
        this.ctx = originalCtx;
    }

    private escapeXML(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Floating prompt methods

    private showConnectionEditPrompt(connection: ConnectionLine): void {
        // Close any existing prompt
        if (this.currentPrompt) {
            this.currentPrompt.close();
        }

        const config = PromptTemplates.editConnectionPrompt(
            connection,
            (values) => this.handleConnectionEdit(connection, values),
            () => this.handleConnectionDelete(connection),
            () => this.handleConnectionEditCancel()
        );

        this.currentPrompt = new FloatingPrompt(config);
        this.currentPrompt.onClose(() => {
            this.currentPrompt = null;
        });
        this.currentPrompt.show(this.promptContainer);
    }

    private createConnectionDirectly(start: TextSelection, end: TextSelection): void {
        const connection: ConnectionLine = {
            id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            start: { ...start },
            end: { ...end },
            color: this.lastUsedSettings.color,
            width: this.lastUsedSettings.width,
            style: this.lastUsedSettings.style,
            label: undefined // Always leave label blank as requested
        };

        this.connectionLines.push(connection);
        this.render();

        // Clean up connection creation state
        this.firstSelection = null;
        this.pendingSelection = null;
        this.isCreatingConnection = false;

        const startFile = this.codeFiles.get(start.fileId!)?.name || 'Unknown';
        const endFile = this.codeFiles.get(end.fileId!)?.name || 'Unknown';
        console.log(`Connection created between ${startFile}:${start.startLine + 1} and ${endFile}:${end.startLine + 1} (${connection.style} style)`);
    }


    private handleConnectionEdit(connection: ConnectionLine, values: any): void {
        // Update connection properties
        if (values.label !== undefined) connection.label = values.label || undefined;
        if (values.color) connection.color = values.color;
        if (values.style) connection.style = values.style;
        if (values.width) connection.width = values.width;

        // Update last used settings when connection is edited
        this.lastUsedSettings = {
            color: connection.color,
            style: connection.style,
            width: connection.width
        };

        this.render();
        
        // Close prompt
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
        
        console.log(`Updated connection ${connection.id}:`, values);
    }

    private handleConnectionDelete(connection: ConnectionLine): void {
        this.connectionLines = this.connectionLines.filter(conn => conn.id !== connection.id);
        this.selectedConnection = null;
        this.render();
        
        // Close prompt
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
        
        console.log(`Deleted connection: ${connection.id}`);
        this.notifyConnectionDeselected();
    }

    private handleConnectionEditCancel(): void {
        // Just close the prompt, keep the connection selected
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    // Public methods for triggering prompts
    public showQuickActionPrompt(x: number, y: number): void {
        if (!this.pendingSelection) return;

        const config = PromptTemplates.quickActionPrompt(
            {
                fileName: this.codeFiles.get(this.pendingSelection.fileId!)?.name || 'Unknown',
                startLine: this.pendingSelection.startLine,
                selectedText: this.getSelectedText(this.pendingSelection)
            },
            (values) => this.handleQuickConnect(values),
            (values) => this.handleQuickEdit(values),
            () => this.handleQuickCancel()
        );

        config.position = { x, y };

        this.currentPrompt = new FloatingPrompt(config);
        this.currentPrompt.onClose(() => {
            this.currentPrompt = null;
        });
        this.currentPrompt.show(this.promptContainer);
    }

    public showExportPrompt(x: number, y: number): void {
        const config = PromptTemplates.exportPrompt(
            (values) => this.handleExport(values),
            () => this.handleExportCancel(),
            'code-visualization'
        );

        config.position = { x, y };

        this.currentPrompt = new FloatingPrompt(config);
        this.currentPrompt.onClose(() => {
            this.currentPrompt = null;
        });
        this.currentPrompt.show(this.promptContainer);
    }

    private handleQuickConnect(_values: any): void {
        if (this.pendingSelection) {
            this.firstSelection = this.pendingSelection;
            this.isCreatingConnection = true;
            console.log('First selection set for quick connection. Select another text sequence and press C.');
        }
        
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    private handleQuickEdit(values: any): void {
        console.log('Quick edit not implemented yet:', values);
        
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    private handleQuickCancel(): void {
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    private handleExport(values: any): void {
        const filename = values.filename || 'code-visualization';
        const format = values.format || 'png';
        
        switch (format) {
            case 'png':
                this.exportAsPNG(filename);
                break;
            case 'svg':
                this.exportAsSVG(filename);
                break;
            case 'pdf':
                this.exportAsPDF(filename);
                break;
        }
        
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    private handleExportCancel(): void {
        if (this.currentPrompt) {
            this.currentPrompt.close();
            this.currentPrompt = null;
        }
    }

    private getSelectedText(selection: TextSelection): string {
        if (!selection.fileId) return '';
        
        const codeFile = this.codeFiles.get(selection.fileId);
        if (!codeFile) return '';
        
        if (selection.startLine === selection.endLine) {
            // Single line selection
            const line = codeFile.lines[selection.startLine];
            return line.substring(selection.startCharIndex, selection.endCharIndex + 1);
        } else {
            // Multi-line selection
            let text = '';
            for (let i = selection.startLine; i <= selection.endLine; i++) {
                const line = codeFile.lines[i];
                if (i === selection.startLine) {
                    text += line.substring(selection.startCharIndex) + '\n';
                } else if (i === selection.endLine) {
                    text += line.substring(0, selection.endCharIndex + 1);
                } else {
                    text += line + '\n';
                }
            }
            return text;
        }
    }
} 