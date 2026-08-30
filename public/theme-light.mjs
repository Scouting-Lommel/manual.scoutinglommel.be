// Force the light theme: the manual is a light-theme docs site. Starlight's
// ThemeProvider (inline in <head>) may set data-theme=dark from the system
// preference; that dark theme's white headings clash with the light brand
// backgrounds. This module re-asserts light after load and pins the storage
// so any re-render keeps light.
function forceLight() {
	document.documentElement.setAttribute('data-theme', 'light');
}
forceLight();
localStorage.setItem('starlight-theme', 'light');
localStorage.setItem('starlight-theme-system', 'false');
document.addEventListener('DOMContentLoaded', forceLight);
window.addEventListener('load', forceLight);
