<script lang="ts">
    import { PDFDocument } from 'pdf-lib';

    let files: File[] = [];
    let mergedPdf: Uint8Array | null = null;
    let splitPdf: Uint8Array | null = null;
    let startPage: number = 1;
    let endPage: number = 1;
    let totalPages: number = 0;
    let error: string | null = null;
    let draggedFile: File | null = null;
    let ignoreEncryption: boolean = false;

    function resetAll() {
        files = [];
        mergedPdf = null;
        splitPdf = null;
        startPage = 1;
        endPage = 1;
        totalPages = 0;
        error = null;
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    function handleDragStart(file: File) {
        draggedFile = file;
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
    }

    function handleDrop(event: DragEvent, targetFile: File) {
        event.preventDefault();
        if (draggedFile && draggedFile !== targetFile) {
            const draggedIndex = files.indexOf(draggedFile);
            const targetIndex = files.indexOf(targetFile);
            files.splice(draggedIndex, 1);
            files.splice(targetIndex, 0, draggedFile);
            files = [...files]; // Trigger reactivity
        }
        draggedFile = null;
    }

    function handleDragEnd() {
        draggedFile = null;
    }

    async function handleFileSelect(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            files = Array.from(input.files);
            if (files.length === 1) {
                try {
                    const file = files[0];
                    const arrayBuffer = await file.arrayBuffer();
                    const pdfDoc = await PDFDocument.load(arrayBuffer);
                    totalPages = pdfDoc.getPageCount();
                    endPage = totalPages;
                } catch (e) {
                    error = 'Error reading PDF: ' + (e as Error).message;
                }
            } else {
                totalPages = 0;
            }
        }
    }

    async function mergePdfs() {
        try {
            error = null;
            const mergedPdfDoc = await PDFDocument.create();

            // Track problematic files
            const encryptedFiles: string[] = [];

            for (const file of files) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    // Try loading with the encryption option
                    const pdfDoc = await PDFDocument.load(arrayBuffer, {
                        ignoreEncryption: ignoreEncryption
                    });
                    const pages = await mergedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                    pages.forEach(page => mergedPdfDoc.addPage(page));
                } catch (fileError) {
                    // Check if it's an encryption error
                    if (fileError instanceof Error && fileError.message.includes('encrypted')) {
                        encryptedFiles.push(file.name);
                    } else {
                        // Rethrow other errors
                        throw fileError;
                    }
                }
            }

            if (encryptedFiles.length > 0) {
                if (!ignoreEncryption) {
                    // If we found encrypted files and aren't ignoring encryption
                    error = `The following files are password-protected: ${encryptedFiles.join(', ')}. Enable "Ignore encryption" option to attempt merging anyway.`;
                    return;
                } else if (encryptedFiles.length === files.length) {
                    // If all files are encrypted and we couldn't process any
                    error = 'Could not merge any files. All PDFs are encrypted and could not be processed.';
                    return;
                }
            }

            // Only save if we have pages
            if (mergedPdfDoc.getPageCount() > 0) {
                mergedPdf = await mergedPdfDoc.save();
            } else {
                error = 'No pages could be merged from the selected files.';
            }
        } catch (e) {
            error = 'Error merging PDFs: ' + (e as Error).message;
        }
    }

    async function splitPdfAtPages() {
        try {
            error = null;
            if (files.length !== 1) {
                error = 'Please select exactly one PDF file to split';
                return;
            }

            const file = files[0];
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const totalPages = pdfDoc.getPageCount();

            if (startPage < 1 || startPage > totalPages || endPage < 1 || endPage > totalPages) {
                error = 'Invalid page range';
                return;
            }

            if (startPage > endPage) {
                error = 'Start page must be less than or equal to end page';
                return;
            }

            const splitPdfDoc = await PDFDocument.create();
            const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage - 1 + i);
            const pages = await splitPdfDoc.copyPages(pdfDoc, pageIndices);
            pages.forEach(page => splitPdfDoc.addPage(page));

            splitPdf = await splitPdfDoc.save();
        } catch (e) {
            error = 'Error splitting PDF: ' + (e as Error).message;
        }
    }

    function downloadMergedPdf() {
        if (mergedPdf) {
            const blob = new Blob([mergedPdf], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Handle filename generation with length limits
            let fileNames = "";
            if (files.length <= 3) {
                // Use all filenames if 3 or fewer files
                fileNames = files.map(file => file.name.replace('.pdf', '')).join('_');
            } else {
                // Use first two filenames + count for more files
                const firstTwo = files.slice(0, 2).map(file => file.name.replace('.pdf', '')).join('_');
                fileNames = `${firstTwo}_and_${files.length - 2}_more`;
            }

            // Limit the overall length to prevent excessively long filenames
            const maxLength = 50;
            if (fileNames.length > maxLength) {
                fileNames = fileNames.substring(0, maxLength - 3) + "...";
            }

            a.download = `merged_${fileNames}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    function downloadSplitPdf() {
        if (splitPdf) {
            const blob = new Blob([splitPdf], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const originalName = files[0].name;
            const nameWithoutExt = originalName.replace('.pdf', '');
            a.download = `${nameWithoutExt}_${startPage}-${endPage}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }
</script>

<div class="pdf-operations">
    <h2>PDF Operations</h2>

    <div class="file-input-container">
        <label for="file-input" class="file-input-label">
            <div class="file-input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                    <polyline points="13 2 13 9 20 9"></polyline>
                </svg>
            </div>
            <div class="file-input-text">
                <span>Choose PDF files</span>
                <span class="file-input-hint">Select multiple files for merging or a single file for splitting</span>
            </div>
        </label>
        <input id="file-input" type="file" accept=".pdf" multiple on:change={handleFileSelect} />
        {#if files.length > 0}
            <p class="selected-count">Selected files: {files.length}</p>
        {/if}
    </div>

    {#if error}
        <div class="error">{error}</div>
    {/if}

    <div class="operations">
        {#if files.length === 0}
            <div class="empty-state">
                <p>Select PDF files to begin</p>
                <p class="hint">Select multiple files for merging or a single file for splitting</p>
            </div>
        {:else if files.length === 1}
            <div class="split-section">
                <h3>Split PDF</h3>
                <p class="page-count">Total Pages: {totalPages}</p>
                <div class="page-range">
                    <div class="range-inputs">
                        <div class="range-input">
                            <label for="start-page">Start Page:</label>
                            <input
                                type="number"
                                id="start-page"
                                bind:value={startPage}
                                min="1"
                                max={totalPages}
                                placeholder="Start page"
                            />
                        </div>
                        <div class="range-input">
                            <label for="end-page">End Page:</label>
                            <input
                                type="number"
                                id="end-page"
                                bind:value={endPage}
                                min="1"
                                max={totalPages}
                                placeholder="End page"
                            />
                        </div>
                    </div>
                </div>
                <button on:click={splitPdfAtPages}>Split PDF</button>
                {#if splitPdf}
                    <button on:click={downloadSplitPdf}>Download Split PDF</button>
                {/if}
            </div>
        {:else if files.length >= 2}
            <div class="merge-section">
                <h3>Merge PDFs</h3>
                <div class="file-list" role="list">
                    <p class="sort-hint">Drag files to reorder them</p>
                    {#each files as file (file.name)}
                        <div
                            class="file-item"
                            draggable="true"
                            on:dragstart={() => handleDragStart(file)}
                            on:dragover={handleDragOver}
                            on:drop={(e) => handleDrop(e, file)}
                            on:dragend={handleDragEnd}
                            role="listitem"
                            aria-label="{file.name} - drag to reorder"
                        >
                            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
                            <span class="file-name">{file.name}</span>
                        </div>
                    {/each}
                </div>
                <button on:click={mergePdfs} disabled={files.length < 2}>
                    Merge PDFs
                </button>
                {#if mergedPdf}
                    <button on:click={downloadMergedPdf}>Download Merged PDF</button>
                {/if}
            </div>
        {/if}
    </div>

    {#if files.length > 0}
        <div class="reset-section">
            <button class="reset-button" on:click={resetAll}>Reset All</button>
        </div>
    {/if}
</div>

<style>
    .pdf-operations {
        max-width: 650px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
        background-color: #1e1e2e;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        color: #e4e4e4;
    }

    h2, h3 {
        color: #e4e4e4;
        margin-bottom: 1.5rem;
    }

    .file-input-container {
        margin-bottom: 2rem;
    }

    .file-input-label {
        display: flex;
        align-items: center;
        padding: 2rem;
        border: 2px dashed #64b5f6;
        border-radius: 8px;
        background-color: #2d3748;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .file-input-label:hover, .file-input-label:focus {
        border-color: #90caf9;
        background-color: #3a4b63;
    }

    .file-input-icon {
        margin-right: 1.5rem;
        color: #64b5f6;
    }

    .file-input-text {
        display: flex;
        flex-direction: column;
        justify-content: start;
        color: #e4e4e4;
    }

    .file-input-hint {
        margin-top: 0.5rem;
        font-size: 0.9rem;
        color: #a0aec0;
    }

    .selected-count {
        margin-top: 1rem;
        font-weight: 500;
        color: #e4e4e4;
    }

    .operations {
        display: flex;
        justify-content: center;
        align-items: stretch;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .merge-section, .split-section {
        padding: 1rem;
        border: 1px solid #3a4b63;
        border-radius: 8px;
        box-sizing: border-box;
        width: 100%;
        min-height: 350px;
        background-color: #2d3748;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .page-count {
        margin: 0.5rem 0;
        color: #a0aec0;
        font-size: 0.9rem;
    }

    .range-input label {
        text-align: left;
        font-size: 0.9rem;
        color: #a0aec0;
    }

    .range-inputs {
        display: flex;
        gap: 1rem;
        margin-bottom: 0.5rem;
    }

    .range-input {
        flex: 1;
    }

    .page-range {
        margin: 1rem 0;
    }

    button {
        margin: 0.5rem 0;
        padding: 0.75rem 1rem;
        background-color: #4299e1;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
        font-weight: 500;
        transition: background-color 0.2s;
    }

    button:hover:not(:disabled) {
        background-color: #3182ce;
    }

    button:disabled {
        background-color: #4a5568;
        color: #a0aec0;
        cursor: not-allowed;
    }

    input[type="number"] {
        padding: 0.5rem;
        margin: 0.5rem 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #4a5568;
        border-radius: 4px;
        background-color: #2d3748;
        color: #e4e4e4;
    }

    .error {
        color: #feb2b2;
        margin: 1rem 0;
        padding: 0.75rem;
        background-color: #422b3a;
        border-radius: 6px;
        border-left: 4px solid #f56565;
    }

    .reset-button {
        background-color: #f56565;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        width: auto;
        display: inline-block;
    }

    .reset-button:hover {
        background-color: #e53e3e;
    }

    .file-list {
        margin: 1rem 0;
        border: 1px solid #4a5568;
        border-radius: 4px;
        max-height: 300px;
        overflow-y: auto;
        background-color: #2d3748;
    }

    .sort-hint {
        margin: 0.5rem;
        color: #a0aec0;
        font-size: 0.9rem;
        text-align: center;
    }

    .file-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        border-bottom: 1px solid #4a5568;
        background-color: #2d3748;
        cursor: move;
    }

    .file-item:last-child {
        border-bottom: none;
    }

    .file-item:hover {
        background-color: #3a4b63;
    }

    .drag-handle {
        margin-right: 0.75rem;
        color: #a0aec0;
        cursor: move;
        font-size: 1.2rem;
    }

    .file-name {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #e4e4e4;
    }

    .empty-state {
        width: 100%;
        min-height: 350px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        color: #a0aec0;
        font-size: 1rem;
        padding: 1.5rem;
        border: 1px dashed #4a5568;
        border-radius: 8px;
    }

    .hint {
        font-size: 0.9rem;
        color: #718096;
    }

    input[type="file"] {
        opacity: 0;
        position: absolute;
        width: 0;
        height: 0;
        overflow: hidden;
    }
</style>