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

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Check if all elements exist
    const elements = { 
        fileName1, codeInput1, loadCode1Btn, languageSelect1,
        fileName2, codeInput2, loadCode2Btn, languageSelect2,
        fileName3, codeInput3, loadCode3Btn, languageSelect3,
        loadAllFilesBtn, clearAllFilesBtn, fontSizeSlider, fontSizeLabel, lineColorPicker
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

    console.log('Code Connect Visualizer initialized');
}); 