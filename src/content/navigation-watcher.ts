export function onLocationChange(callback: () => void): () => void {
  const notify = (): void => {
    callback();
  };

  window.addEventListener("popstate", notify);
  document.addEventListener("turbo:load", notify);
  document.addEventListener("pjax:end", notify);

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = (...args: Parameters<History["pushState"]>): void => {
    originalPushState(...args);
    notify();
  };

  history.replaceState = (...args: Parameters<History["replaceState"]>): void => {
    originalReplaceState(...args);
    notify();
  };

  return () => {
    window.removeEventListener("popstate", notify);
    document.removeEventListener("turbo:load", notify);
    document.removeEventListener("pjax:end", notify);
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;
  };
}
