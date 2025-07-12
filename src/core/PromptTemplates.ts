import { PromptConfig } from './FloatingPrompt';

export class PromptTemplates {
    static createConnectionPrompt(
        onCreateConnection: (values: any) => void,
        onCancel: () => void,
        defaultValues?: any
    ): PromptConfig {
        return {
            title: 'Create Connection',
            fields: [
                {
                    id: 'label',
                    label: 'Connection Label',
                    type: 'text',
                    placeholder: 'Enter optional label...',
                    value: defaultValues?.label || ''
                },
                {
                    id: 'color',
                    label: 'Connection Color',
                    type: 'color',
                    value: defaultValues?.color || '#007acc'
                },
                {
                    id: 'style',
                    label: 'Line Style',
                    type: 'select',
                    value: defaultValues?.style || 'solid',
                    options: [
                        { value: 'solid', label: 'Solid Line' },
                        { value: 'dotted', label: 'Dotted Line' },
                        { value: 'dashed', label: 'Dashed Line' }
                    ]
                },
                {
                    id: 'width',
                    label: 'Line Width',
                    type: 'range',
                    min: 1,
                    max: 8,
                    step: 1,
                    value: defaultValues?.width || 2
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'create',
                    label: 'Create Connection',
                    type: 'primary',
                    callback: onCreateConnection
                }
            ],
            draggable: true,
            closable: true,
            width: 320
        };
    }

    static editConnectionPrompt(
        connection: any,
        onSaveConnection: (values: any) => void,
        onDeleteConnection: () => void,
        onCancel: () => void
    ): PromptConfig {
        return {
            title: 'Edit Connection',
            fields: [
                {
                    id: 'info',
                    label: 'Connection Details',
                    type: 'text',
                    value: `From: ${connection.startFile}:${connection.start.startLine + 1} → To: ${connection.endFile}:${connection.end.startLine + 1}`,
                    placeholder: ''
                },
                {
                    id: 'label',
                    label: 'Connection Label',
                    type: 'text',
                    placeholder: 'Enter optional label...',
                    value: connection.label || ''
                },
                {
                    id: 'color',
                    label: 'Connection Color',
                    type: 'color',
                    value: connection.color
                },
                {
                    id: 'style',
                    label: 'Line Style',
                    type: 'select',
                    value: connection.style,
                    options: [
                        { value: 'solid', label: 'Solid Line' },
                        { value: 'dotted', label: 'Dotted Line' },
                        { value: 'dashed', label: 'Dashed Line' }
                    ]
                },
                {
                    id: 'width',
                    label: 'Line Width',
                    type: 'range',
                    min: 1,
                    max: 8,
                    step: 1,
                    value: connection.width
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'delete',
                    label: 'Delete',
                    type: 'danger',
                    callback: onDeleteConnection
                },
                {
                    id: 'save',
                    label: 'Save Changes',
                    type: 'primary',
                    callback: onSaveConnection
                }
            ],
            draggable: true,
            closable: true,
            width: 320
        };
    }

    static quickActionPrompt(
        selection: any,
        onQuickConnect: (values: any) => void,
        onEditSelection: (values: any) => void,
        onCancel: () => void
    ): PromptConfig {
        return {
            title: 'Quick Actions',
            fields: [
                {
                    id: 'info',
                    label: 'Selected Text',
                    type: 'text',
                    value: `${selection.fileName}:${selection.startLine + 1} (${selection.selectedText})`,
                    placeholder: ''
                },
                {
                    id: 'action',
                    label: 'Choose Action',
                    type: 'select',
                    value: 'connect',
                    options: [
                        { value: 'connect', label: 'Create Connection' },
                        { value: 'highlight', label: 'Highlight Text' },
                        { value: 'annotate', label: 'Add Annotation' }
                    ]
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'apply',
                    label: 'Apply',
                    type: 'primary',
                    callback: (values) => {
                        if (values.action === 'connect') {
                            onQuickConnect(values);
                        } else {
                            onEditSelection(values);
                        }
                    }
                }
            ],
            draggable: true,
            closable: true,
            width: 280
        };
    }

    static exportPrompt(
        onExport: (values: any) => void,
        onCancel: () => void,
        defaultFilename: string = 'code-visualization'
    ): PromptConfig {
        return {
            title: 'Export Visualization',
            fields: [
                {
                    id: 'filename',
                    label: 'Filename',
                    type: 'text',
                    placeholder: 'Enter filename...',
                    value: defaultFilename
                },
                {
                    id: 'format',
                    label: 'Export Format',
                    type: 'select',
                    value: 'png',
                    options: [
                        { value: 'png', label: 'PNG Image' },
                        { value: 'svg', label: 'SVG Vector' },
                        { value: 'pdf', label: 'PDF Document' }
                    ]
                },
                {
                    id: 'includeBackground',
                    label: 'Include Background',
                    type: 'checkbox',
                    value: true
                },
                {
                    id: 'highResolution',
                    label: 'High Resolution (2x)',
                    type: 'checkbox',
                    value: false
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'export',
                    label: 'Export',
                    type: 'primary',
                    callback: onExport
                }
            ],
            draggable: true,
            closable: true,
            width: 300
        };
    }

    static settingsPrompt(
        currentSettings: any,
        onSaveSettings: (values: any) => void,
        onCancel: () => void
    ): PromptConfig {
        return {
            title: 'Application Settings',
            fields: [
                {
                    id: 'fontSize',
                    label: 'Font Size',
                    type: 'range',
                    min: 10,
                    max: 24,
                    step: 1,
                    value: currentSettings.fontSize || 14
                },
                {
                    id: 'defaultConnectionColor',
                    label: 'Default Connection Color',
                    type: 'color',
                    value: currentSettings.defaultConnectionColor || '#007acc'
                },
                {
                    id: 'defaultConnectionStyle',
                    label: 'Default Connection Style',
                    type: 'select',
                    value: currentSettings.defaultConnectionStyle || 'solid',
                    options: [
                        { value: 'solid', label: 'Solid Line' },
                        { value: 'dotted', label: 'Dotted Line' },
                        { value: 'dashed', label: 'Dashed Line' }
                    ]
                },
                {
                    id: 'autoSave',
                    label: 'Auto-save Project',
                    type: 'checkbox',
                    value: currentSettings.autoSave || false
                },
                {
                    id: 'showGrid',
                    label: 'Show Grid',
                    type: 'checkbox',
                    value: currentSettings.showGrid || false
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'reset',
                    label: 'Reset to Defaults',
                    type: 'danger',
                    callback: () => onSaveSettings({
                        fontSize: 14,
                        defaultConnectionColor: '#007acc',
                        defaultConnectionStyle: 'solid',
                        autoSave: false,
                        showGrid: false
                    })
                },
                {
                    id: 'save',
                    label: 'Save Settings',
                    type: 'primary',
                    callback: onSaveSettings
                }
            ],
            draggable: true,
            closable: true,
            width: 350
        };
    }

    static confirmPrompt(
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel: () => void,
        confirmLabel: string = 'Confirm',
        cancelLabel: string = 'Cancel'
    ): PromptConfig {
        return {
            title,
            fields: [
                {
                    id: 'message',
                    label: '',
                    type: 'text',
                    value: message,
                    placeholder: ''
                }
            ],
            actions: [
                {
                    id: 'cancel',
                    label: cancelLabel,
                    type: 'secondary',
                    callback: onCancel
                },
                {
                    id: 'confirm',
                    label: confirmLabel,
                    type: 'danger',
                    callback: onConfirm
                }
            ],
            draggable: false,
            closable: true,
            width: 280
        };
    }
}