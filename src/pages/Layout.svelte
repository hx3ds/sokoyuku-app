<script>
  import MobileHeader from '../components/Layout/MobileHeader.svelte';
  import Sidebar from '../components/Layout/Sidebar.svelte';
  import MobileBottomNav from '../components/Layout/MobileBottomNav.svelte';
  import RightSidebar from '../components/Layout/RightSidebar.svelte';
  import Controls from '../components/Layout/Controls.svelte';

  let { children } = $props();
</script>

<div class="layout-wrapper">
    <MobileHeader />
    
    <Sidebar />

    <MobileBottomNav />

    <!-- Main Content Area -->
    <main class="main-content">
        <div class="content-wrapper">
            <div class="desktop-header-actions">
                <Controls />
             </div>
            <div id="page" class="page-container">
                {@render children()}
            </div>
        </div>
        <RightSidebar />
    </main>
</div>

<style>
    .layout-wrapper {
        min-height: 100vh;
        font-family: Roboto, sans-serif;
        display: flex;
        flex-direction: column;
    }

    /* Main Content */
    .main-content {
        width: 100%;
        display: flex;
        justify-content: center;
        min-height: 120vh;
        padding-top: 64px; /* header height */
        padding-bottom: 64px; /* bottom nav height */
    }

    .content-wrapper {
        width: 100%;
        max-width: 600px;
        padding-left: 0.5rem;
        padding-right: 0.5rem;
        padding-bottom: 2rem;
    }

    .desktop-header-actions {
        display: none;
    }

    .page-container {
        width: 100%;
        height: 100%;
    }

    /* Media Queries */
    @media (min-width: 768px) {
        .layout-wrapper {
            display: block; 
        }
        
        .main-content {
            padding-left: 280px; /* sidebar width */
            padding-top: 0;
            padding-bottom: 0;
        }

        .content-wrapper {
            max-width: 700px;
            padding-bottom: 2rem;
        }
        
        .desktop-header-actions {
            display: flex;
        }
    }

    @media (min-width: 1024px) {
        .layout-wrapper {
            display: flex;
            flex-direction: row;
            justify-content: center;
        }
    }

    @media (min-width: 1280px) {
        .content-wrapper {
            padding-right: 0;
        }
    }
</style>
