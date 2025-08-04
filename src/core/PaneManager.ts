import { EditorPane, PaneLayout, LayoutMode } from '../types/index';

export class PaneManager {
    private panes: Map<string, EditorPane> = new Map();
    private paneLayouts: Map<string, PaneLayout> = new Map();
    private activePaneId: string | null = null;
    private layoutMode: LayoutMode = 'auto';
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;
    private readonly TAB_HEIGHT = 30;
    private readonly PANE_MARGIN = 5;

    private onPaneChangeCallback?: (panes: EditorPane[]) => void;
    private onLayoutChangeCallback?: (layouts: Map<string, PaneLayout>) => void;

    constructor() {
        // Create initial pane
        this.createPane('Welcome', null);
    }

    public setCanvasDimensions(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.calculateLayouts();
    }

    public createPane(title: string, fileId: string | null = null): string {
        const paneId = `pane_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const order = this.panes.size;
        
        const pane: EditorPane = {
            id: paneId,
            fileId,
            order,
            title,
            isActive: this.panes.size === 0 // First pane is active
        };

        this.panes.set(paneId, pane);
        
        // Set as active if it's the first pane or no pane is currently active
        if (!this.activePaneId || this.panes.size === 1) {
            this.setActivePane(paneId);
        }

        this.calculateLayouts();
        this.notifyPaneChange();
        
        return paneId;
    }

    public removePane(paneId: string): boolean {
        if (!this.panes.has(paneId) || this.panes.size <= 1) {
            return false; // Don't allow removing the last pane
        }

        this.panes.delete(paneId);
        this.paneLayouts.delete(paneId);

        // If we removed the active pane, set a new active pane
        if (this.activePaneId === paneId) {
            const remainingPanes = Array.from(this.panes.values());
            if (remainingPanes.length > 0) {
                this.setActivePane(remainingPanes[0].id);
            } else {
                this.activePaneId = null;
            }
        }

        // Reorder remaining panes
        this.reorderPanes();
        this.calculateLayouts();
        this.notifyPaneChange();
        
        return true;
    }

    public setActivePane(paneId: string): boolean {
        if (!this.panes.has(paneId)) {
            return false;
        }

        // Deactivate all panes
        for (const pane of this.panes.values()) {
            pane.isActive = false;
        }

        // Activate the selected pane
        const pane = this.panes.get(paneId)!;
        pane.isActive = true;
        this.activePaneId = paneId;

        this.notifyPaneChange();
        return true;
    }

    public movePane(paneId: string, newOrder: number): boolean {
        const pane = this.panes.get(paneId);
        if (!pane) {
            return false;
        }

        const paneArray = Array.from(this.panes.values()).sort((a, b) => a.order - b.order);
        const currentIndex = paneArray.findIndex(p => p.id === paneId);
        
        if (currentIndex === -1) {
            return false;
        }

        // Remove from current position
        paneArray.splice(currentIndex, 1);
        
        // Insert at new position
        const targetIndex = Math.max(0, Math.min(newOrder, paneArray.length));
        paneArray.splice(targetIndex, 0, pane);

        // Update order for all panes
        paneArray.forEach((p, index) => {
            p.order = index;
        });

        this.calculateLayouts();
        this.notifyPaneChange();
        return true;
    }

    public attachFileToPane(paneId: string, fileId: string, title?: string): boolean {
        const pane = this.panes.get(paneId);
        if (!pane) {
            return false;
        }

        pane.fileId = fileId;
        if (title) {
            pane.title = title;
        }

        this.notifyPaneChange();
        return true;
    }

    public detachFileFromPane(paneId: string): boolean {
        const pane = this.panes.get(paneId);
        if (!pane) {
            return false;
        }

        pane.fileId = null;
        pane.title = 'Empty Pane';

        this.notifyPaneChange();
        return true;
    }

    public setLayoutMode(mode: LayoutMode): void {
        this.layoutMode = mode;
        this.calculateLayouts();
        this.notifyLayoutChange();
    }

    private reorderPanes(): void {
        const paneArray = Array.from(this.panes.values()).sort((a, b) => a.order - b.order);
        paneArray.forEach((pane, index) => {
            pane.order = index;
        });
    }

    private calculateLayouts(): void {
        if (this.canvasWidth === 0 || this.canvasHeight === 0) {
            return;
        }

        this.paneLayouts.clear();
        const paneArray = Array.from(this.panes.values()).sort((a, b) => a.order - b.order);
        
        if (paneArray.length === 0) {
            return;
        }

        const effectiveHeight = this.canvasHeight - this.TAB_HEIGHT;

        switch (this.layoutMode) {
            case 'single':
                this.calculateSingleLayout(paneArray, effectiveHeight);
                break;
            case 'split-horizontal':
                this.calculateHorizontalSplitLayout(paneArray, effectiveHeight);
                break;
            case 'split-vertical':
                this.calculateVerticalSplitLayout(paneArray, effectiveHeight);
                break;
            case 'grid':
                this.calculateGridLayout(paneArray, effectiveHeight);
                break;
            case 'auto':
            default:
                this.calculateAutoLayout(paneArray, effectiveHeight);
                break;
        }

        this.notifyLayoutChange();
    }

    private calculateSingleLayout(_panes: EditorPane[], effectiveHeight: number): void {
        // Only show the active pane
        const activePaneId = this.activePaneId;
        if (!activePaneId) return;

        this.paneLayouts.set(activePaneId, {
            paneId: activePaneId,
            x: 0,
            y: this.TAB_HEIGHT,
            width: this.canvasWidth,
            height: effectiveHeight,
            tabHeight: this.TAB_HEIGHT
        });
    }

    private calculateHorizontalSplitLayout(panes: EditorPane[], effectiveHeight: number): void {
        const paneHeight = effectiveHeight / panes.length;
        
        panes.forEach((pane, index) => {
            this.paneLayouts.set(pane.id, {
                paneId: pane.id,
                x: 0,
                y: this.TAB_HEIGHT + (paneHeight * index),
                width: this.canvasWidth,
                height: paneHeight - this.PANE_MARGIN,
                tabHeight: this.TAB_HEIGHT
            });
        });
    }

    private calculateVerticalSplitLayout(panes: EditorPane[], effectiveHeight: number): void {
        const paneWidth = this.canvasWidth / panes.length;
        
        panes.forEach((pane, index) => {
            this.paneLayouts.set(pane.id, {
                paneId: pane.id,
                x: paneWidth * index,
                y: this.TAB_HEIGHT,
                width: paneWidth - this.PANE_MARGIN,
                height: effectiveHeight,
                tabHeight: this.TAB_HEIGHT
            });
        });
    }

    private calculateGridLayout(panes: EditorPane[], effectiveHeight: number): void {
        const cols = Math.ceil(Math.sqrt(panes.length));
        const rows = Math.ceil(panes.length / cols);
        const paneWidth = this.canvasWidth / cols;
        const paneHeight = effectiveHeight / rows;

        panes.forEach((pane, index) => {
            const col = index % cols;
            const row = Math.floor(index / cols);

            this.paneLayouts.set(pane.id, {
                paneId: pane.id,
                x: col * paneWidth,
                y: this.TAB_HEIGHT + (row * paneHeight),
                width: paneWidth - this.PANE_MARGIN,
                height: paneHeight - this.PANE_MARGIN,
                tabHeight: this.TAB_HEIGHT
            });
        });
    }

    private calculateAutoLayout(panes: EditorPane[], effectiveHeight: number): void {
        const paneCount = panes.length;
        
        if (paneCount === 1) {
            this.calculateSingleLayout(panes, effectiveHeight);
        } else if (paneCount === 2) {
            this.calculateVerticalSplitLayout(panes, effectiveHeight);
        } else if (paneCount <= 4) {
            this.calculateGridLayout(panes, effectiveHeight);
        } else {
            // For many panes, use a more complex layout
            this.calculateVerticalSplitLayout(panes, effectiveHeight);
        }
    }

    // Public getters
    public getPanes(): EditorPane[] {
        return Array.from(this.panes.values()).sort((a, b) => a.order - b.order);
    }

    public getPane(paneId: string): EditorPane | undefined {
        return this.panes.get(paneId);
    }

    public getActivePaneId(): string | null {
        return this.activePaneId;
    }

    public getActivePane(): EditorPane | null {
        return this.activePaneId ? this.panes.get(this.activePaneId) || null : null;
    }

    public getPaneLayouts(): Map<string, PaneLayout> {
        return new Map(this.paneLayouts);
    }

    public getPaneLayout(paneId: string): PaneLayout | undefined {
        return this.paneLayouts.get(paneId);
    }

    public getLayoutMode(): LayoutMode {
        return this.layoutMode;
    }

    // Event handling
    public onPaneChange(callback: (panes: EditorPane[]) => void): void {
        this.onPaneChangeCallback = callback;
    }

    public onLayoutChange(callback: (layouts: Map<string, PaneLayout>) => void): void {
        this.onLayoutChangeCallback = callback;
    }

    private notifyPaneChange(): void {
        if (this.onPaneChangeCallback) {
            this.onPaneChangeCallback(this.getPanes());
        }
    }

    private notifyLayoutChange(): void {
        if (this.onLayoutChangeCallback) {
            this.onLayoutChangeCallback(this.getPaneLayouts());
        }
    }

    // Utility methods
    public findPaneAt(x: number, y: number): string | null {
        for (const [paneId, layout] of this.paneLayouts) {
            if (x >= layout.x && x <= layout.x + layout.width &&
                y >= layout.y && y <= layout.y + layout.height) {
                return paneId;
            }
        }
        return null;
    }

    public isPaneTabAt(x: number, y: number): { paneId: string; isCloseButton: boolean } | null {
        // Check if clicking on tab area (top portion)
        if (y > this.TAB_HEIGHT) {
            return null;
        }

        const panes = this.getPanes();
        if (panes.length === 0) {
            return null;
        }

        const tabWidth = Math.min(150, this.canvasWidth / Math.max(1, panes.length));
        let currentX = 0;

        for (const pane of panes) {
            if (x >= currentX && x < currentX + tabWidth) {
                // Check if clicking on close button
                const closeButtonX = currentX + tabWidth - 15;
                const isCloseButton = panes.length > 1 && x > closeButtonX - 10 && x < closeButtonX + 10;
                return { paneId: pane.id, isCloseButton };
            }
            currentX += tabWidth;
        }

        return null;
    }
}