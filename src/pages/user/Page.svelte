<script>
    import { onMount } from "svelte";
    import InfoStack from "../../components/InfoStack/InfoStack.svelte";
    import InfoStackItem from "../../components/InfoStack/InfoStackItem.svelte";
    import InfoStackInput from "../../components/InfoStack/InfoStackInput.svelte";
    import InfoStackTextarea from "../../components/InfoStack/InfoStackTextarea.svelte";
    import Loading from "../../components/Loading.svelte";
    import NotFound from "../../components/NotFound.svelte";
    import { fetchUserProfile } from "../../proxy/user.js";
    import PageContainer from "../../components/PageContainer.svelte";
    import { t } from "../../i18n/locale.svelte.js";

    let { username = "" } = $props();
    let user = $state(null);
    let loading = $state(true);

    $effect(() => {
        if (username) {
            loadUser();
        }
    });

    async function loadUser() {
        loading = true;
        user = await fetchUserProfile(username);
        loading = false;
    }
</script>

<PageContainer id="page-user">
    {#if loading}
        <Loading />
    {:else if !user}
        <NotFound text="User Not Found" />
    {:else}
        <!-- User Information -->
        <InfoStack title="User Details" display="flex-col" gap="1rem">
            <InfoStackInput title="Username" id="user-username" value={user.username} readonly />
            <InfoStackInput title="Full Name" id="user-fullname" value={user.full_name} readonly />
            <InfoStackTextarea title="Description" id="user-description" value={user.description || t("No description")} readonly />
        </InfoStack>

        <!-- Prototypes Section -->
        <InfoStack title="Prototypes">
             <InfoStackItem 
                href="/prototypes/{user.username}"
                title={t("View Prototypes")}
                description={t("Browse prototypes created by {username}", { username: user.username })}
            />
        </InfoStack>
    {/if}
</PageContainer>
