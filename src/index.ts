import { CodeVisualizer } from './core/CodeVisualizer';
import { SupportedLanguage } from './types/index';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    
    // File 1 elements
    const fileName1 = document.getElementById('fileName1') as HTMLInputElement;
    const codeInput1 = document.getElementById('codeInput1') as HTMLTextAreaElement;
    const loadCode1Btn = document.getElementById('loadCode1') as HTMLButtonElement;
    const languageSelect1 = document.getElementById('languageSelect1') as HTMLSelectElement;
    
    // File 2 elements
    const fileName2 = document.getElementById('fileName2') as HTMLInputElement;
    const codeInput2 = document.getElementById('codeInput2') as HTMLTextAreaElement;
    const loadCode2Btn = document.getElementById('loadCode2') as HTMLButtonElement;
    const languageSelect2 = document.getElementById('languageSelect2') as HTMLSelectElement;
    
    // File 3 elements
    const fileName3 = document.getElementById('fileName3') as HTMLInputElement;
    const codeInput3 = document.getElementById('codeInput3') as HTMLTextAreaElement;
    const loadCode3Btn = document.getElementById('loadCode3') as HTMLButtonElement;
    const languageSelect3 = document.getElementById('languageSelect3') as HTMLSelectElement;
    
    // Control elements
    const loadAllFilesBtn = document.getElementById('loadAllFiles') as HTMLButtonElement;
    const clearAllFilesBtn = document.getElementById('clearAllFiles') as HTMLButtonElement;
    const fontSizeSlider = document.getElementById('fontSizeSlider') as HTMLInputElement;
    const fontSizeLabel = document.getElementById('fontSizeLabel') as HTMLSpanElement;
    const lineColorPicker = document.getElementById('lineColorPicker') as HTMLInputElement;
    const lineStyleSelect = document.getElementById('lineStyleSelect') as HTMLSelectElement;
    const connectionLabel = document.getElementById('connectionLabel') as HTMLInputElement;
    
    // Connection editor elements
    const connectionEditor = document.getElementById('connectionEditor') as HTMLDivElement;
    const connectionInfo = document.getElementById('connectionInfo') as HTMLDivElement;
    const editConnectionColor = document.getElementById('editConnectionColor') as HTMLInputElement;
    const editConnectionStyle = document.getElementById('editConnectionStyle') as HTMLSelectElement;
    const editConnectionWidth = document.getElementById('editConnectionWidth') as HTMLInputElement;
    const editConnectionWidthLabel = document.getElementById('editConnectionWidthLabel') as HTMLSpanElement;
    const editConnectionLabel = document.getElementById('editConnectionLabel') as HTMLInputElement;
    const applyConnectionChanges = document.getElementById('applyConnectionChanges') as HTMLButtonElement;
    const deleteConnection = document.getElementById('deleteConnection') as HTMLButtonElement;
    
    // Export elements
    const exportFilename = document.getElementById('exportFilename') as HTMLInputElement;
    const exportPNG = document.getElementById('exportPNG') as HTMLButtonElement;
    const exportSVG = document.getElementById('exportSVG') as HTMLButtonElement;
    const exportPDF = document.getElementById('exportPDF') as HTMLButtonElement;

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Check if all elements exist
    const elements = { 
        fileName1, codeInput1, loadCode1Btn, languageSelect1,
        fileName2, codeInput2, loadCode2Btn, languageSelect2,
        fileName3, codeInput3, loadCode3Btn, languageSelect3,
        loadAllFilesBtn, clearAllFilesBtn, fontSizeSlider, fontSizeLabel, 
        lineColorPicker, lineStyleSelect, connectionLabel,
        connectionEditor, connectionInfo, editConnectionColor, editConnectionStyle,
        editConnectionWidth, editConnectionWidthLabel, editConnectionLabel,
        applyConnectionChanges, deleteConnection, exportFilename, exportPNG, exportSVG, exportPDF
    };
    
    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element ${name} not found`);
            return;
        }
    }

    // Initialize the code visualizer
    const visualizer = new CodeVisualizer(canvas);

    // Set up canvas resize handling
    const resizeCanvas = () => {
        const container = canvas.parentElement!;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        console.log(`Container dimensions: ${newWidth}x${newHeight}`);
        console.log(`Resizing canvas from ${canvas.width}x${canvas.height} to ${newWidth}x${newHeight}`);
        
        if (newWidth > 0 && newHeight > 0) {
            canvas.width = newWidth;
            canvas.height = newHeight;
            canvas.style.width = newWidth + 'px';
            canvas.style.height = newHeight + 'px';
            visualizer.handleResize();
        } else {
            console.error('Invalid container dimensions:', newWidth, newHeight);
        }
    };

    // Initial resize - delay to ensure DOM layout is complete
    setTimeout(() => {
        resizeCanvas();
        // Load initial files after canvas is properly sized
        loadAllFilesBtn.click();
    }, 200);
    window.addEventListener('resize', resizeCanvas);

    // Event handlers for individual file loading
    loadCode1Btn.addEventListener('click', () => {
        console.log('Load File 1 clicked');
        const code = codeInput1.value.trim();
        console.log('File 1 code:', code.substring(0, 50) + '...');
        if (code) {
            const language = languageSelect1.value;
            console.log('Loading file 1 with language:', language);
            visualizer.loadCodeFile('file1', fileName1.value || 'File 1', code, language === 'auto' ? undefined : language as SupportedLanguage);
        } else {
            console.log('No code to load for file 1');
        }
    });
    
    loadCode2Btn.addEventListener('click', () => {
        const code = codeInput2.value.trim();
        if (code) {
            const language = languageSelect2.value;
            visualizer.loadCodeFile('file2', fileName2.value || 'File 2', code, language === 'auto' ? undefined : language as SupportedLanguage);
        }
    });
    
    loadCode3Btn.addEventListener('click', () => {
        const code = codeInput3.value.trim();
        if (code) {
            const language = languageSelect3.value;
            visualizer.loadCodeFile('file3', fileName3.value || 'File 3', code, language === 'auto' ? undefined : language as SupportedLanguage);
        }
    });
    
    // Load all files at once
    loadAllFilesBtn.addEventListener('click', () => {
        console.log('Load All Files clicked');
        const files = [
            { id: 'file1', name: fileName1.value || 'File 1', code: codeInput1.value.trim(), language: languageSelect1.value },
            { id: 'file2', name: fileName2.value || 'File 2', code: codeInput2.value.trim(), language: languageSelect2.value },
            { id: 'file3', name: fileName3.value || 'File 3', code: codeInput3.value.trim(), language: languageSelect3.value }
        ];
        
        console.log('Files to load:', files.map(f => ({ id: f.id, name: f.name, hasCode: !!f.code, language: f.language })));
        
        files.forEach(file => {
            if (file.code) {
                console.log(`Loading ${file.id} with ${file.code.length} characters`);
                visualizer.loadCodeFile(file.id, file.name, file.code, file.language === 'auto' ? undefined : file.language as SupportedLanguage);
            } else {
                console.log(`Skipping ${file.id} - no code`);
            }
        });
    });
    
    // Clear all files
    clearAllFilesBtn.addEventListener('click', () => {
        visualizer.removeCodeFile('file1');
        visualizer.removeCodeFile('file2');
        visualizer.removeCodeFile('file3');
    });

    fontSizeSlider.addEventListener('input', () => {
        const fontSize = parseInt(fontSizeSlider.value);
        fontSizeLabel.textContent = `${fontSize}px`;
        visualizer.setFontSize(fontSize);
    });

    lineColorPicker.addEventListener('change', () => {
        visualizer.setDefaultLineColor(lineColorPicker.value);
    });
    
    lineStyleSelect.addEventListener('change', () => {
        visualizer.setDefaultLineStyle(lineStyleSelect.value as 'solid' | 'dotted' | 'dashed');
    });
    

    // Connection editing event handlers
    editConnectionWidth.addEventListener('input', () => {
        editConnectionWidthLabel.textContent = `${editConnectionWidth.value}px`;
    });

    applyConnectionChanges.addEventListener('click', () => {
        const updates = {
            color: editConnectionColor.value,
            style: editConnectionStyle.value as 'solid' | 'dotted' | 'dashed',
            width: parseInt(editConnectionWidth.value),
            label: editConnectionLabel.value.trim() || undefined
        };
        
        visualizer.updateSelectedConnection(updates);
        console.log('Applied connection changes:', updates);
    });

    deleteConnection.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this connection?')) {
            visualizer.deleteSelectedConnection();
        }
    });

    // Listen for connection selection events
    canvas.addEventListener('connectionSelected', (event: any) => {
        const connection = event.detail.connection;
        showConnectionEditor(connection);
    });

    canvas.addEventListener('connectionDeselected', () => {
        hideConnectionEditor();
    });

    function showConnectionEditor(connection: any): void {
        connectionEditor.style.display = 'block';
        
        // Display connection info
        const startFile = visualizer.getCodeFiles().find(f => f.id === connection.start.fileId)?.name || 'Unknown';
        const endFile = visualizer.getCodeFiles().find(f => f.id === connection.end.fileId)?.name || 'Unknown';
        connectionInfo.textContent = `${startFile}:${connection.start.startLine + 1} → ${endFile}:${connection.end.startLine + 1}`;
        
        // Populate form with current values
        editConnectionColor.value = connection.color;
        editConnectionStyle.value = connection.style;
        editConnectionWidth.value = connection.width.toString();
        editConnectionWidthLabel.textContent = `${connection.width}px`;
        editConnectionLabel.value = connection.label || '';
    }

    function hideConnectionEditor(): void {
        connectionEditor.style.display = 'none';
    }

    // Export event handlers (now use floating prompt)
    exportPNG.addEventListener('click', () => {
        const rect = canvas.getBoundingClientRect();
        visualizer.showExportPrompt(rect.width / 2, rect.height / 2);
    });

    exportSVG.addEventListener('click', () => {
        const rect = canvas.getBoundingClientRect();
        visualizer.showExportPrompt(rect.width / 2, rect.height / 2);
    });

    exportPDF.addEventListener('click', () => {
        const rect = canvas.getBoundingClientRect();
        visualizer.showExportPrompt(rect.width / 2, rect.height / 2);
    });

    // Context menu support for floating prompts
    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Show quick action prompt if there's a selection
        visualizer.showQuickActionPrompt(x, y);
    });

    // Double-click to show quick actions
    canvas.addEventListener('dblclick', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        visualizer.showQuickActionPrompt(x, y);
    });

    // Add floating prompt controls to the UI
    const floatingPromptControls = document.createElement('div');
    floatingPromptControls.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(45, 45, 48, 0.9);
        border: 1px solid #3e3e42;
        border-radius: 6px;
        padding: 10px;
        z-index: 999;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 12px;
        color: #d4d4d4;
    `;
    
    floatingPromptControls.innerHTML = `
        <div style="margin-bottom: 5px; font-weight: bold;">Floating Prompt Controls:</div>
        <div>• Right-click canvas for quick actions</div>
        <div>• Double-click for quick actions</div>
        <div>• Select text and press 'C' for connection prompt</div>
        <div>• Click connection to edit with prompt</div>
        <div>• Export buttons now use floating prompts</div>
    `;
    
    document.body.appendChild(floatingPromptControls);
    
    // Hide controls after 10 seconds
    setTimeout(() => {
        floatingPromptControls.style.display = 'none';
    }, 10000);

    // Set default code examples
    codeInput1.value = `function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

const result = fibonacci(10);
console.log(result);`;

    codeInput2.value = `def calculate_factorial(n):
    if n <= 1:
        return 1
    return n * calculate_factorial(n - 1)

result = calculate_factorial(5)
print(f"Factorial result: {result}")`;

    codeInput3.value = `.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #f0f0f0;
}

.button {
    padding: 10px 20px;
    background-color: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
}`;

    console.log('Code Connect Visualizer with Floating Prompts initialized');
}); 