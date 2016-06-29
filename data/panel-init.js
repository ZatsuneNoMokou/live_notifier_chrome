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
	// Avoid keeping init node in memory
	let panelinitjs_node = document.querySelector("#panelInit");
	panelinitjs_node.parentNode.removeChild(panelinitjs_node);
	
	// Load perfect-scrollbar.min.js
	let scrollbar_script = document.createElement("script");
	scrollbar_script.src = "perfect-scrollbar.min.js";
	scrollbar_script.onload = function(){
		// Load options-api.js after perfect-scrollbar to avoid error(s)
		let options_api_script = document.createElement("script");
		options_api_script.src = "options-api.js";
		options_api_script.onload = function(){
			// Load panel.js after options-api.js to avoid error(s)
			let paneljs_node = document.createElement("script");
			paneljs_node.src = "panel.js";
			document.querySelector("body").appendChild(paneljs_node);
			}
		document.querySelector("body").appendChild(options_api_script);
		}
	document.querySelector("body").appendChild(scrollbar_script);
}
