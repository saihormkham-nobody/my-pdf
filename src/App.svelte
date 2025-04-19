<script lang="ts">
  import PdfOperations from './lib/PdfOperations.svelte'
  import { onMount } from 'svelte'

  let isDraggingOverApp = false
  let pdfOperationsComponent: any

  // Handle drag events on the entire document
  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    if (!isDraggingOverApp) {
      isDraggingOverApp = true
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    // Only consider it a leave if we're leaving to a target that is not contained within the app
    if (!event.relatedTarget || !document.getElementById('app')?.contains(event.relatedTarget as Node)) {
      isDraggingOverApp = false
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDraggingOverApp = false

    // Forward the drop event to the PdfOperations component
    if (pdfOperationsComponent) {
      pdfOperationsComponent.handleGlobalDrop(event)
    }
  }

  onMount(() => {
    // Add event listeners to document
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      // Clean up event listeners
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  })
</script>

<main id="app" class:dragging={isDraggingOverApp}>
  <h1>Made with Love for Koe</h1>
  <PdfOperations bind:this={pdfOperationsComponent} />

  {#if isDraggingOverApp}
    <div class="global-drop-indicator">
      <div class="drop-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        <span>Drop PDF files anywhere to add them</span>
      </div>
    </div>
  {/if}
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 1200px;
    margin: 0 auto;
    position: relative;
    min-height: 100vh;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 2.5em;
    font-weight: 100;
    margin-bottom: 2rem;
  }

  .global-drop-indicator {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(30, 30, 46, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    pointer-events: none;
  }

  .drop-message {
    background-color: #2d3748;
    padding: 2rem;
    border-radius: 8px;
    border: 2px dashed #64b5f6;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #e4e4e4;
    font-size: 1.25rem;
  }

  .drop-message svg {
    color: #64b5f6;
    margin-bottom: 1rem;
  }

  main.dragging {
    outline: 2px dashed #64b5f6;
    outline-offset: -2px;
  }
</style>
