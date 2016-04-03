window.onload = function () {
	// Avoid keeping init node in memory
	let panelinitjs_node = document.querySelector("#panelInit");
	panelinitjs_node.parentNode.removeChild(panelinitjs_node);
	
	// Load perfect-scrollbar.min.js
	let scrollbar_script = document.createElement("script");
	scrollbar_script.src = "perfect-scrollbar.min.js";
	scrollbar_script.onload = function(){
		// Load panel.js after perfect-scrollbar to avoid error(s)
		let paneljs_node = document.createElement("script");
		paneljs_node.src = "panel.js";
		document.querySelector("body").appendChild(paneljs_node);
		}
	document.querySelector("body").appendChild(scrollbar_script);
}
