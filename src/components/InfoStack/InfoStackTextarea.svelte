<script>
    import InfoStackItem from './InfoStackItem.svelte';
    import { tick, onMount } from 'svelte';

    let {
        title = '',
        description = '',
        value = $bindable(),
        placeholder = '',
        required = false,
        readonly = false,
        disabled = false,
        rows = 1,
        className = '',
        textareaClass = '',
        start = undefined,
        hover = false,
        isLabel = true,
        autosize = true,
        maxHeight = '400px',
        ...rest
    } = $props();

    let textarea;

    const resize = async () => {
        if (textarea && autosize) {
            await tick();
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    onMount(() => {
        if (autosize) resize();
    });

    $effect(() => {
        if (autosize && value != null) {
            resize();
        }
    });
</script>

<InfoStackItem {title} {description} {className} {start} {hover} {isLabel}>
    {#snippet children()}
        <textarea 
            bind:this={textarea}
            bind:value 
            {placeholder} 
            {required} 
            {readonly}
            {disabled}
            {rows} 
            class="textarea-field {textareaClass}"
            class:editing={!readonly && !disabled}
            style:max-height={maxHeight}
            {...rest}
            oninput={resize}
        ></textarea>
    {/snippet}
</InfoStackItem>

<style>

    .textarea-field {
        width: 100%;
        padding: 0;
        border: none;
        border-bottom: 1px solid transparent;
        box-shadow: none;
        background-color: transparent;
        font-family: inherit;
        font-size: 14px;
        color: var(--color-text-main);
        outline: none;
        resize: none;
        padding-top: 0.5rem;
        transition: border-color 0.15s;
        overflow: hidden;
    }

    .textarea-field:focus {
        outline: none;
        box-shadow: none;
    }

    .textarea-field.editing {
        border-bottom-color: var(--color-border);
    }

    .textarea-field.editing:focus {
        border-bottom-color: var(--color-primary);
    }
</style>
