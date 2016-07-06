'use strict';

var backgroundPage = chrome.extension.getBackgroundPage();
var getPreference = backgroundPage.getPreference;

var theme_cache_update = backgroundPage.theme_cache_update;
var panelColorStylesheet = theme_cache_update(document, {"theme": getPreference("panel_theme"), "background_color": getPreference("background_color")});

if(typeof panelColorStylesheet == "object" && panelColorStylesheet !== null){
	console.info("Theme update");
	
	let currentThemeNode = document.querySelector("#panel-color-stylesheet");
	currentThemeNode.parentNode.removeChild(currentThemeNode);
	
	document.querySelector("head").appendChild(panelColorStylesheet);
}


window.onload = function () {
	window.onload = null;
	loadJS("js/", ["panel/perfect-scrollbar.min.js", "options-api.js", "panel/panel.js"]);
}
