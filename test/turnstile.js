export async function installTurnstileMock(page, token = 'playwright-turnstile-token') {
  await page.addInitScript(({ mockToken }) => {
    let widgetCounter = 0;
    const widgets = new Map();

    window.turnstile = {
      render(container, options = {}) {
        const widgetId = `mock-turnstile-${++widgetCounter}`;
        widgets.set(widgetId, { options, container });

        if (container instanceof HTMLElement) {
          container.dataset.turnstileWidgetId = widgetId;
          container.dataset.turnstileMock = 'true';
        }

        if (typeof options.callback === 'function') {
          options.callback(mockToken);
        }

        return widgetId;
      },
      reset(widgetId) {
        const widget = widgets.get(widgetId);
        if (widget && typeof widget.options.callback === 'function') {
          widget.options.callback(mockToken);
        }
      },
    };
  }, { mockToken: token });
}
