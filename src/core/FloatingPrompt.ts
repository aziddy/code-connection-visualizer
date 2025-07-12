export interface PromptField {
    id: string;
    label: string;
    type: 'text' | 'color' | 'select' | 'range' | 'checkbox';
    value?: string | number | boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
    step?: number;
}

export interface PromptAction {
    id: string;
    label: string;
    type: 'primary' | 'secondary' | 'danger';
    callback: (values: Record<string, any>) => void;
}

export interface PromptConfig {
    title: string;
    fields: PromptField[];
    actions: PromptAction[];
    position?: { x: number; y: number };
    width?: number;
    height?: number;
    draggable?: boolean;
    closable?: boolean;
}

export class FloatingPrompt {
    private container!: HTMLDivElement;
    private header!: HTMLDivElement;
    private content!: HTMLDivElement;
    private footer!: HTMLDivElement;
    private config: PromptConfig;
    private isDragging = false;
    private dragOffset = { x: 0, y: 0 };
    private onCloseCallback?: () => void;

    constructor(config: PromptConfig) {
        this.config = config;
        this.createPrompt();
        this.setupEventListeners();
        this.populateFields();
    }

    private createPrompt(): void {
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'floating-prompt';
        this.container.style.cssText = `
            position: absolute;
            background: #2d2d30;
            border: 1px solid #3e3e42;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            min-width: ${this.config.width || 300}px;
            max-width: 500px;
            z-index: 1000;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            color: #d4d4d4;
            user-select: none;
        `;

        // Create header
        this.header = document.createElement('div');
        this.header.className = 'floating-prompt-header';
        this.header.style.cssText = `
            padding: 12px 16px;
            background: #37373d;
            border-bottom: 1px solid #3e3e42;
            border-radius: 6px 6px 0 0;
            cursor: ${this.config.draggable !== false ? 'move' : 'default'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            font-size: 14px;
        `;

        const title = document.createElement('span');
        title.textContent = this.config.title;
        this.header.appendChild(title);

        if (this.config.closable !== false) {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '×';
            closeBtn.style.cssText = `
                background: none;
                border: none;
                color: #d4d4d4;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            closeBtn.addEventListener('click', () => this.close());
            this.header.appendChild(closeBtn);
        }

        // Create content area
        this.content = document.createElement('div');
        this.content.className = 'floating-prompt-content';
        this.content.style.cssText = `
            padding: 16px;
            max-height: 400px;
            overflow-y: auto;
        `;

        // Create footer
        this.footer = document.createElement('div');
        this.footer.className = 'floating-prompt-footer';
        this.footer.style.cssText = `
            padding: 12px 16px;
            background: #37373d;
            border-top: 1px solid #3e3e42;
            border-radius: 0 0 6px 6px;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        `;

        // Assemble the prompt
        this.container.appendChild(this.header);
        this.container.appendChild(this.content);
        this.container.appendChild(this.footer);

        // Position the prompt
        if (this.config.position) {
            this.container.style.left = `${this.config.position.x}px`;
            this.container.style.top = `${this.config.position.y}px`;
        } else {
            // Center on screen
            this.container.style.left = '50%';
            this.container.style.top = '50%';
            this.container.style.transform = 'translate(-50%, -50%)';
        }
    }

    private populateFields(): void {
        this.config.fields.forEach(field => {
            const fieldContainer = document.createElement('div');
            fieldContainer.style.cssText = `
                margin-bottom: 16px;
            `;

            const label = document.createElement('label');
            label.textContent = field.label;
            label.style.cssText = `
                display: block;
                margin-bottom: 6px;
                font-size: 12px;
                color: #cccccc;
            `;

            let input: HTMLElement;

            switch (field.type) {
                case 'text':
                    input = document.createElement('input');
                    (input as HTMLInputElement).type = 'text';
                    (input as HTMLInputElement).value = field.value as string || '';
                    (input as HTMLInputElement).placeholder = field.placeholder || '';
                    break;

                case 'color':
                    input = document.createElement('input');
                    (input as HTMLInputElement).type = 'color';
                    (input as HTMLInputElement).value = field.value as string || '#007acc';
                    break;

                case 'select':
                    input = document.createElement('select');
                    field.options?.forEach(option => {
                        const optionEl = document.createElement('option');
                        optionEl.value = option.value;
                        optionEl.textContent = option.label;
                        optionEl.selected = option.value === field.value;
                        (input as HTMLSelectElement).appendChild(optionEl);
                    });
                    break;

                case 'range':
                    const rangeContainer = document.createElement('div');
                    rangeContainer.style.display = 'flex';
                    rangeContainer.style.alignItems = 'center';
                    rangeContainer.style.gap = '8px';

                    input = document.createElement('input');
                    (input as HTMLInputElement).type = 'range';
                    (input as HTMLInputElement).min = (field.min || 0).toString();
                    (input as HTMLInputElement).max = (field.max || 100).toString();
                    (input as HTMLInputElement).step = (field.step || 1).toString();
                    (input as HTMLInputElement).value = (field.value || 0).toString();

                    const valueLabel = document.createElement('span');
                    valueLabel.textContent = (field.value || 0).toString();
                    valueLabel.style.cssText = `
                        min-width: 30px;
                        font-size: 12px;
                        color: #cccccc;
                    `;

                    (input as HTMLInputElement).addEventListener('input', () => {
                        valueLabel.textContent = (input as HTMLInputElement).value;
                    });

                    rangeContainer.appendChild(input);
                    rangeContainer.appendChild(valueLabel);
                    input = rangeContainer;
                    break;

                case 'checkbox':
                    input = document.createElement('input');
                    (input as HTMLInputElement).type = 'checkbox';
                    (input as HTMLInputElement).checked = field.value as boolean || false;
                    break;
            }

            // Style input elements
            if (input.tagName === 'INPUT' || input.tagName === 'SELECT') {
                input.style.cssText = `
                    width: 100%;
                    padding: 8px;
                    background: #3c3c3c;
                    border: 1px solid #5a5a5a;
                    border-radius: 4px;
                    color: #d4d4d4;
                    font-family: inherit;
                    font-size: 12px;
                `;
            }

            // Store reference to input for value retrieval
            input.setAttribute('data-field-id', field.id);

            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);
            this.content.appendChild(fieldContainer);
        });

        // Create action buttons
        this.config.actions.forEach(action => {
            const button = document.createElement('button');
            button.textContent = action.label;
            button.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-family: inherit;
                font-size: 12px;
                font-weight: bold;
            `;

            switch (action.type) {
                case 'primary':
                    button.style.background = '#0e639c';
                    button.style.color = 'white';
                    break;
                case 'danger':
                    button.style.background = '#dc3545';
                    button.style.color = 'white';
                    break;
                case 'secondary':
                default:
                    button.style.background = '#6c757d';
                    button.style.color = 'white';
                    break;
            }

            button.addEventListener('click', () => {
                const values = this.getValues();
                action.callback(values);
            });

            this.footer.appendChild(button);
        });
    }

    private setupEventListeners(): void {
        if (this.config.draggable !== false) {
            this.header.addEventListener('mousedown', this.startDrag.bind(this));
            document.addEventListener('mousemove', this.drag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));
        }

        // Prevent prompt from closing when clicking inside
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.container.parentElement) {
                this.close();
            }
        });
    }

    private startDrag(event: MouseEvent): void {
        this.isDragging = true;
        const rect = this.container.getBoundingClientRect();
        this.dragOffset.x = event.clientX - rect.left;
        this.dragOffset.y = event.clientY - rect.top;
        event.preventDefault();
    }

    private drag(event: MouseEvent): void {
        if (!this.isDragging) return;

        const newX = event.clientX - this.dragOffset.x;
        const newY = event.clientY - this.dragOffset.y;

        // Keep prompt within viewport
        const maxX = window.innerWidth - this.container.offsetWidth;
        const maxY = window.innerHeight - this.container.offsetHeight;

        this.container.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
        this.container.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        this.container.style.transform = 'none';
    }

    private stopDrag(): void {
        this.isDragging = false;
    }

    private getValues(): Record<string, any> {
        const values: Record<string, any> = {};

        this.config.fields.forEach(field => {
            const element = this.content.querySelector(`[data-field-id="${field.id}"]`) as HTMLInputElement | HTMLSelectElement;
            
            if (element) {
                switch (field.type) {
                    case 'checkbox':
                        values[field.id] = (element as HTMLInputElement).checked;
                        break;
                    case 'range':
                        values[field.id] = parseFloat((element as HTMLInputElement).value);
                        break;
                    default:
                        values[field.id] = element.value;
                        break;
                }
            }
        });

        return values;
    }

    public show(container: HTMLElement = document.body): void {
        container.appendChild(this.container);
        
        // Focus first input
        const firstInput = this.content.querySelector('input, select') as HTMLInputElement;
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    public close(): void {
        if (this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }
        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }

    public updateField(fieldId: string, value: any): void {
        const element = this.content.querySelector(`[data-field-id="${fieldId}"]`) as HTMLInputElement | HTMLSelectElement;
        if (element) {
            if (element.type === 'checkbox') {
                (element as HTMLInputElement).checked = value;
            } else {
                element.value = value;
            }
        }
    }

    public onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    public setPosition(x: number, y: number): void {
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        this.container.style.transform = 'none';
    }
}