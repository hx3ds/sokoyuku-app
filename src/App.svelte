<script>
  import SignIn from './pages/signin/Page.svelte';
  import SignInPassword from './pages/signin_password/Page.svelte';
  import SignUp from './pages/signup/Page.svelte';
  import ChangePassword from './pages/change_password/Page.svelte';
  import { fetchProfile } from './proxy/user.js';
  import { onMount } from 'svelte';
  import Layout from './pages/Layout.svelte';
  import Explore from './pages/explore/Page.svelte';
  import Models from './pages/models/Page.svelte';
  import Overview from './pages/overview/Page.svelte';
  import Profile from './pages/profile/Page.svelte';
  import MyPrototypes from './pages/my_prototypes/Page.svelte';
  import MySubscriptions from './pages/my_subscriptions/Page.svelte';
  import Notifications from './pages/notifications/Page.svelte';
  import PaymentHistory from './pages/payment_history/Page.svelte';
  import ChatHistory from './pages/chat_history/Page.svelte';
  import PayoutDetails from './pages/payout_details/Page.svelte';
  import User from './pages/user/Page.svelte';
  import Credits from './pages/credits/Page.svelte';
  import Model from './pages/model/Page.svelte';
  import Prototype from './pages/prototype/Page.svelte';
  import Prototypes from './pages/prototypes/Page.svelte';
  import NotFound from './pages/not_found/Page.svelte';
  import Modal from './components/Modal/Modal.svelte';

  /**
   * @typedef {object} Route
   * @property {string} path
   * @property {any} component
   * @property {boolean=} public
   * @property {boolean=} noLayout
   * @property {boolean=} prefix
   */

  /** @type {Route | null} */
  let activeRoute = null;
  /** @type {Set<Route>} */
  let visitedRoutes = new Set();
  /** @type {Map<Route, Record<string, string>>} */
  let routeParamsMap = new Map();
  let isAuthLayout = false;
  let isAuthenticated = false;

  /** @type {Route[]} */
  const routes = [
    { path: '/signin', component: SignIn, public: true, noLayout: true },
    { path: '/signin-password', component: SignInPassword, public: true, noLayout: true },
    { path: '/signup', component: SignUp, public: true, noLayout: true },
    { path: '/change-password', component: ChangePassword, public: true, noLayout: true },
    { path: '/explore', component: Explore },
    { path: '/models', component: Models },
    { path: '/overview', component: Overview },
    { path: '/profile', component: Profile },
    { path: '/my-prototypes', component: MyPrototypes },
    { path: '/my-subscriptions', component: MySubscriptions },
    { path: '/notifications', component: Notifications },
    { path: '/payment-history', component: PaymentHistory },
    { path: '/chat-history', component: ChatHistory },
    { path: '/payout-details', component: PayoutDetails },
    { path: '/user/:username', component: User },
    { path: '/model/:modelId', component: Model },
    { path: '/prototypes/:username', component: Prototypes },
    { path: '/prototype/:prototypeId', component: Prototype },
    { path: '/credits', component: Credits }
  ];

  /** @type {Route} */
  const notFoundRoute = { path: '*', component: NotFound, noLayout: true };

  /** @param {string} path */
  async function navigate(path) {
    if (!path || path === '/') {
         path = '/explore';
         history.replaceState(null, '', '/explore');
    }
    
    /** @type {Record<string, string>} */
    let params = {};
    /** @type {Route | null} */
    let match = null;

    for (const route of routes) {
      if (route.path.includes(':')) {
        const routeSegments = route.path.split('/').filter(Boolean);
        const pathSegments = path.split('/').filter(Boolean);

        if (routeSegments.length === pathSegments.length) {
          /** @type {Record<string, string>} */
          const p = {};
          let isMatch = true;
          
          for (let i = 0; i < routeSegments.length; i++) {
            if (routeSegments[i].startsWith(':')) {
              p[routeSegments[i].slice(1)] = pathSegments[i];
            } else if (routeSegments[i] !== pathSegments[i]) {
              isMatch = false;
              break;
            }
          }

          if (isMatch) {
            match = route;
            params = p;
            break;
          }
        }
      } else if (route.prefix) {
         if (path.startsWith(route.path)) {
             match = route;
             break;
         }
      } else {
         if (path === route.path) {
             match = route;
             break;
         }
      }
    }

    if (match && !match.public) {
        if (!isAuthenticated) {
            try {
                const profile = await fetchProfile();
                console.log("Profile:", profile);
                if (profile) {
                    isAuthenticated = true;
                } else {
                    history.replaceState(null, '', '/signin');
                    match = routes.find(r => r.path === '/signin') || null;
                }
            } catch (e) {
                 history.replaceState(null, '', '/signin');
                 match = routes.find(r => r.path === '/signin') || null;
            }
        }
    }

    if (!match) {
        match = notFoundRoute;
    }

    activeRoute = match;
    isAuthLayout = !!match.noLayout;
    
    visitedRoutes.add(match);
    visitedRoutes = visitedRoutes; // Trigger reactivity
    
    routeParamsMap.set(match, params);
    routeParamsMap = routeParamsMap; // Trigger reactivity

    window.scrollTo(0, 0);
  }

  onMount(() => {
    navigate(window.location.pathname);

    const handlePopState = () => {
      navigate(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  });
</script>

<div class="app-root">
  <!-- Auth / NoLayout Pages -->
  <div class:hidden={!isAuthLayout}>
     {#each [...routes, notFoundRoute] as route}
        {#if route.noLayout && visitedRoutes.has(route)}
           <div class:hidden={activeRoute !== route}>
              <svelte:component this={route.component} {...routeParamsMap.get(route)} />
           </div>
        {/if}
     {/each}
  </div>

  <!-- Layout Pages -->
  <div class:hidden={isAuthLayout}>
      <Layout>
         {#each [...routes, notFoundRoute] as route}
            {#if !route.noLayout && visitedRoutes.has(route)}
               <div class:hidden={activeRoute !== route} class="page-route-wrapper">
                  <svelte:component this={route.component} {...routeParamsMap.get(route)} />
               </div>
            {/if}
         {/each}
      </Layout>
  </div>

  <Modal />
</div>

<style>
    .app-root {
        min-height: 100vh;
        font-family: Roboto, sans-serif;
    }

    .hidden {
        display: none;
    }

    .page-route-wrapper {
        width: 100%;
        height: 100%;
    }
</style>
