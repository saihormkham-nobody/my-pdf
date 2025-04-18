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

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                const pages = await mergedPdfDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdfDoc.addPage(page));
            }

            mergedPdf = await mergedPdfDoc.save();
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
            const fileNames = files.map(file => file.name.replace('.pdf', '')).join('_');
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

    <div class="file-input">
        <input type="file" accept=".pdf" multiple on:change={handleFileSelect} />
        <p>Selected files: {files.length}</p>
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

    <div class="reset-section">
        <button class="reset-button" on:click={resetAll}>Reset All</button>
    </div>
</div>

<style>
    .pdf-operations {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
    }

    .file-input {
        margin-bottom: 2rem;
    }

    .operations {
        display: flex;
        justify-content: center;
        gap: 2rem;
        flex-wrap: wrap;
    }

    .merge-section, .split-section {
        padding: 1.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        min-width: 350px; /* Fixed width for both sections */
        max-width: 650px; /* Maximum width to prevent overflow */
        min-height: 350px; /* Minimum height to maintain consistency */
    }

    .page-range {
        margin: 1rem 0;
    }

    .range-inputs {
        display: flex;
        gap: 1rem;
    }

    .range-input {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .range-input label {
        text-align: left;
        font-size: 0.9rem;
        color: #666;
    }

    button {
        margin: 0.5rem 0;
        padding: 0.5rem 1rem;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
    }

    button:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }

    input[type="number"] {
        padding: 0.5rem;
        margin: 0.5rem 0;
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .error {
        color: red;
        margin: 1rem 0;
        padding: 0.5rem;
        background-color: #ffebee;
        border-radius: 4px;
    }

    .reset-section {
        margin-top: 2rem;
        text-align: center;
    }

    .reset-button {
        background-color: #f44336;
        padding: 0.75rem 1.5rem;
        font-size: 1.1rem;
        width: auto;
        display: inline-block;
    }

    .reset-button:hover {
        background-color: #d32f2f;
    }

    .page-count {
        margin: 0.5rem 0;
        color: #666;
        font-size: 0.9rem;
    }

    .file-list {
        margin: 1rem 0;
        border: 1px solid #ccc;
        border-radius: 4px;
        max-height: 300px;
        overflow-y: auto;
        background-color: white;
    }

    .sort-hint {
        margin: 0.5rem;
        color: #666;
        font-size: 0.9rem;
        text-align: center;
    }

    .file-item {
        display: flex;
        align-items: center;
        padding: 0.75rem;
        border-bottom: 1px solid #eee;
        background-color: white;
        cursor: move;
    }

    .file-item:last-child {
        border-bottom: none;
    }

    .file-item:hover {
        background-color: #f5f5f5;
    }

    .drag-handle {
        margin-right: 0.75rem;
        color: #666;
        cursor: move;
        font-size: 1.2rem;
    }

    .file-name {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #333;
    }

    .empty-state {
        text-align: center;
        color: #666;
        font-size: 1rem;
    }

    .hint {
        font-size: 0.9rem;
        color: #999;
    }
</style>