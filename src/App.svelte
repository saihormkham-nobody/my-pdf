<script lang="ts">
  import PdfOperations from './lib/PdfOperations.svelte'
</script>

<main>
  <h1>Made with Love for Koe</h1>
  <PdfOperations />
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 1200px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 2.5em;
    font-weight: 100;
    margin-bottom: 2rem;
  }
</style>
