import { CodeVisualizer } from './core/CodeVisualizer';
import { SupportedLanguage } from './types/index';

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const codeInput = document.getElementById('codeInput') as HTMLTextAreaElement;
    const loadCodeBtn = document.getElementById('loadCode') as HTMLButtonElement;
    const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    const fontSizeSlider = document.getElementById('fontSizeSlider') as HTMLInputElement;
    const fontSizeLabel = document.getElementById('fontSizeLabel') as HTMLSpanElement;
    const lineColorPicker = document.getElementById('lineColorPicker') as HTMLInputElement;

    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    // Initialize the code visualizer
    const visualizer = new CodeVisualizer(canvas);

    // Set up canvas resize handling
    const resizeCanvas = () => {
        const container = canvas.parentElement!;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        visualizer.handleResize();
    };

    // Initial resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Event handlers
    loadCodeBtn.addEventListener('click', () => {
        const code = codeInput.value;
        const language = languageSelect.value;
        visualizer.loadCode(code, language === 'auto' ? undefined : language as SupportedLanguage);
    });

    fontSizeSlider.addEventListener('input', () => {
        const fontSize = parseInt(fontSizeSlider.value);
        fontSizeLabel.textContent = `${fontSize}px`;
        visualizer.setFontSize(fontSize);
    });

    lineColorPicker.addEventListener('change', () => {
        visualizer.setDefaultLineColor(lineColorPicker.value);
    });

    // Load initial code
    const initialCode = codeInput.value;
    visualizer.loadCode(initialCode, 'javascript');

    console.log('Code Connect Visualizer initialized');
}); 