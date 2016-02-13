'use strict';

// let addon_background_page = chrome.extension.getBackgroundPage()

function sendDataToMain(portName){
	this.port = chrome.runtime.connect({name: portName});
	console.info(`Port (${portName}) connection initiated`);
	this.sendData = function(id, data){
		this.port.postMessage({"id": id, "data": data});
	}
}
let my_port =	new sendDataToMain("Live_Streamer_Panel");
let port = my_port.port;

let backgroundPage = chrome.extension.getBackgroundPage();
let appGlobal = backgroundPage.appGlobal;
let _ = appGlobal._;
let translateNodes = appGlobal.translateNodes;
let translateNodes_title = appGlobal.translateNodes_title;
let getValueFromNode = appGlobal.getValueFromNode;

port.onDisconnect.addListener(function(port) {
	console.info(`Port disconnected: ${port.name}`);
});

var refreshStreamsButton = document.querySelector("#refreshStreams");

function refreshButtonClick(){
	my_port.sendData("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

var addStreamButton = document.querySelector("#addStream");

function addStreamButtonClick(){
	my_port.sendData("addStream","");
}
addStreamButton.addEventListener("click",addStreamButtonClick,false);

let deleteStreamButton = document.querySelector("#deleteStream");
let deleteStreamWarning = document.querySelector("#deleteStreamWarning");
let deleteModeState = false;

function deleteStreamButtonClick(){
	if(deleteModeState){
		deleteModeState = false;
		deleteStreamButton.className = deleteStreamButton.className.replace(/\s*active/i,"");
		deleteStreamWarning.className += " hide";
	} else {
		deleteModeState = true;
		deleteStreamButton.className += " active";
		deleteStreamWarning.className = deleteStreamWarning.className.replace(/\s*hide/i,"");
	}
}
deleteStreamButton.addEventListener("click", deleteStreamButtonClick, false);

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
function setting_Toggle(){
	let streamList = document.querySelector("#streamList");
	let settings_node = document.querySelector("#settings_container");
	if(setting_Enabled){
		setting_Enabled = false;
		streamList.className = deleteStreamButton.className.replace(/\s*hide/i,"");
		settings_node.className += " hide";
	} else {
		setting_Enabled = true;
		streamList.className += " hide";
		settings_node.className = deleteStreamWarning.className.replace(/\s*hide/i,"");
	}
}
settings_button.addEventListener("click", setting_Toggle, false);

let background_color_input = document.querySelector("#background_color");
function background_color_input_onChange(){
	let node = this;
	let value = getValueFromNode(node);
	my_port.sendData("setting_Update", {settingName: "background_color", settingValue: value});
	theme_update({"theme": panel_theme, "background_color": value});
}
background_color_input.addEventListener("change", background_color_input_onChange, false);

let panel_theme_select = document.querySelector("#panel_theme");
function panel_theme_select_onChange(){
	let node = this;
	let value = getValueFromNode(node);
	my_port.sendData("setting_Update", {settingName: "panel_theme", settingValue: value});
	theme_update({"theme": value, "background_color": background_color});
}
panel_theme_select.addEventListener("change", panel_theme_select_onChange, false);


function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.lastChild.removeEventListener("click", streamItemClick);
		node.removeChild(node.lastChild);
	}
}

function onlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOnlineList");
	this.hitbox = document.querySelector("#hitboxOnlineList");
	this.twitch = document.querySelector("#twitchOnlineList");
}
function offlineNodes(){
	this.dailymotion = document.querySelector("#dailymotionOfflineList");
	this.hitbox = document.querySelector("#hitboxOfflineList");
	this.twitch = document.querySelector("#twitchOfflineList");
}

function initList(showOffline){
	let streamItems = document.querySelectorAll(".item-stream");
	if(streamItems.length > 0){
		for(let i in streamItems){
			let node = streamItems[i];
			if(typeof node.removeChild != "undefined"){
				node.removeEventListener("click", streamItemClick);
				node.parentNode.removeChild(node);
			}
		}
	}
	document.querySelector("#streamListOffline").className = (showOffline)? "" : "hide";
}

function showNonEmptySitesBlocks(){
	let nodeListOnline = new onlineNodes();
	let nodeListOffline = new offlineNodes();
	
	for(let i in nodeListOnline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
	for(let i in nodeListOffline){
		nodeListOnline[i].className = (nodeListOnline[i].hasChildNodes())? "" : "hide";
	}
}

function listenerOnlineCount(data){
	let streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
	removeAllChildren(streamOnlineCountNode);
	streamOnlineCountNode.appendChild(document.createTextNode(data));
}

function listenerOfflineCount(data){
	let streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");
	removeAllChildren(streamOfflineCountNode);
	streamOfflineCountNode.appendChild(document.createTextNode(data));
}

function listener(data){
	let nodeListOnline = new onlineNodes();
	let nodeListOffline = new offlineNodes();
	
	var newLine = document.createElement("div");
	newLine.id = data.website + '/' + data.id;
	
	let streamOwnerLogo = data.streamOwnerLogo;
	let streamCategoryLogo = data.streamCategoryLogo;
	let streamLogo = ""
	
	if(data.online && typeof streamCategoryLogo == "string" && streamCategoryLogo != ""){
		streamLogo  = streamCategoryLogo;
	} else if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(typeof streamLogo == "string" && streamLogo != ""){
		newLine.style.backgroundImage = "url('" + streamLogo + "')";
		newLine.className = "streamLogo";
	}

	var titleLine = document.createElement("span");
	titleLine.className = "streamTitle";
	if(typeof streamLogo == "string" && streamLogo != ""){
		var imgStreamStatusLogo = document.createElement("img");
		imgStreamStatusLogo.className = "streamStatusLogo";
		imgStreamStatusLogo.src = (data.online)? "online-stream.svg" : "offline-stream.svg";
		titleLine.appendChild(imgStreamStatusLogo);
	}
	titleLine.appendChild(document.createTextNode(data.streamName));
	newLine.appendChild(titleLine);
	
	if(data.online && typeof data.streamCurrentViewers == "number"){
		var viewerCountNode = document.createElement("span");
		viewerCountNode.className = "streamCurrentViewers";
		viewerCountNode.appendChild(document.createTextNode(data.streamCurrentViewers));
		var viewerCountLogoNode = document.createElement("i");
		viewerCountLogoNode.className = "material-icons";
		viewerCountLogoNode.appendChild(document.createTextNode("visibility"));
		viewerCountNode.appendChild(viewerCountLogoNode);
		titleLine.appendChild(viewerCountNode);
	}
	
	if(data.online){
		if(data.streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.className = "streamStatus";
			statusLine.appendChild(document.createTextNode(data.streamStatus + ((data.streamGame.length > 0)? (" (" + data.streamGame + ")") : "")));
			newLine.appendChild(statusLine);
		}
		
		newLine.className += " item-stream onlineItem";
		nodeListOnline[data.website].appendChild(newLine);
	} else {
		newLine.className += " item-stream offlineItem";
		nodeListOffline[data.website].appendChild(newLine);
	}
	newLine.className += " cursor";
	
	newLine.setAttribute("data-streamId", data.id);
	newLine.setAttribute("data-online", data.online);
	newLine.setAttribute("data-streamWebsite", data.website);
	newLine.setAttribute("data-streamUrl", data.streamUrl);
	newLine.addEventListener("click", streamItemClick);

	showNonEmptySitesBlocks();
}
function streamItemClick(){
	let node = this;
	let id = node.getAttribute("data-streamId");
	let online = node.getAttribute("data-online");
	let website = node.getAttribute("data-streamWebsite");
	let streamUrl = node.getAttribute("data-streamUrl");
	
	if(deleteModeState == true){
		my_port.sendData("deleteStream", {id: id, website: website});
		deleteStreamButtonClick();
	} else {
		if(online){
			my_port.sendData("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
		} else {
			my_port.sendData("openTab", streamUrl);
		}
	}
}

function color(hexColorCode) {
	let getCodes =  /^#([\da-fA-F]{2,2})([\da-fA-F]{2,2})([\da-fA-F]{2,2})$/;
	if(getCodes.test(hexColorCode)){
		let result = getCodes.exec(hexColorCode);
		this.R= parseInt(result[1],16);
		this.G= parseInt(result[2],16);
		this.B= parseInt(result[3],16);
	}
	this.rgbCode = function(){
		return "rgb(" + this.R + ", " + this.G + ", " + this.B + ")";
	}
	/* RGB to HSL function from https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion/9493060#9493060 */
	this.getHSL = function(){
		let r = this.R;let g = this.G;let b = this.B;
		
		r /= 255, g /= 255, b /= 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b);
		var h, s, l = (max + min) / 2;

		if(max == min){
			h = s = 0; // achromatic
		}else{
			var d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
			switch(max){
				case r: h = (g - b) / d + (g < b ? 6 : 0); break;
				case g: h = (b - r) / d + 2; break;
				case b: h = (r - g) / d + 4; break;
			}
			h /= 6;
		}
		return {"H": h * 360, "S": s * 100 + "%", "L": l * 100 + "%"};
	}
}

let panel_theme;
let background_color;
function theme_update(data){
	panel_theme = data.theme;
	background_color = data.background_color;
	
	let background_color_input = document.querySelector("#background_color");
	let panel_theme_select = document.querySelector("#panel_theme");
	background_color_input.value = background_color;
	panel_theme_select.value = panel_theme;
	
	let panelColorStylesheet;
	let baseColor = new color(data.background_color);
	if(typeof baseColor != "object"){return null;}
	panelColorStylesheet = document.createElement("style");
	panelColorStylesheet.id = "panel-color-stylesheet";
	let baseColor_hsl = baseColor.getHSL();
	let baseColor_L = JSON.parse(baseColor_hsl.L.replace("%",""))/100;
	let values;
	if(data.theme == "dark"){
		var custom_stylesheet = "@import url(css/panel-text-color-white.css);\n";
		if(baseColor_L > 0.5 || baseColor_L < 0.1){
			values = ["19%","13%","26%","13%"];
		} else {
			values = [(baseColor_L + 0.06) * 100 + "%", baseColor_L * 100 + "%", (baseColor_L + 0.13) * 100 + "%", baseColor_L * 100 + "%"];
		}
	} else if(data.theme == "light"){
		var custom_stylesheet = "@import url(css/panel-text-color-black.css);\n";
		if(baseColor_L < 0.5 /*|| baseColor_L > 0.9*/){
			values = ["87%","74%","81%","87%"];
		} else {
			values = [baseColor_L * 100 + "%", (baseColor_L - 0.13) * 100 + "%", (baseColor_L - 0.06) * 100 + "%", baseColor_L * 100 + "%"];
		}
	}
	custom_stylesheet += "body {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[0] + ");}\n";
	custom_stylesheet += "header, footer {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[1] + ");}\n";
	custom_stylesheet += "header button, .item-stream {background-color: hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[2] + ");}\n";
	custom_stylesheet += "header, .item-stream, footer{box-shadow: 0px 0px 5px 0px hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + values[3] + ");}";
	panelColorStylesheet.appendChild(document.createTextNode(custom_stylesheet));
	//console.log(baseColor.rgbCode());
	//console.log("hsl(" + baseColor_hsl.H + ", " + baseColor_hsl.S + ", " + baseColor_hsl.L + ")");
	
	if(typeof panelColorStylesheet == "object"){
		let currentThemeNode = document.querySelector("#panel-color-stylesheet");
		currentThemeNode.parentNode.removeChild(currentThemeNode);
		
		document.querySelector("head").appendChild(panelColorStylesheet);
	}
}

let port_mainscript = null
chrome.runtime.onConnect.addListener(function(_port) {
	console.info(`Port (${_port.name}) connected`);
	port_mainscript = _port;
	port_mainscript.onMessage.addListener(function(message, MessageSender){
		console.group();
		console.log("Panel (onMessage):");
		console.dir(message);
		console.groupEnd();
		
		let id = message.id;
		let data = message.data;
		
		switch(id){
			case "initList":
				initList(data);
				break;
			case "updateOnlineCount":
				listenerOnlineCount(data);
				break;
			case "updateOfflineCount":
				listenerOfflineCount(data);
				break;
			case "updateData":
				listener(data);
				break;
			case "panel_theme":
				theme_update(data);
			break;
		}
	});
	port_mainscript.onDisconnect.addListener(function(port) {
		console.assert(`Port disconnected: ${port.name}`);
		port = null;
	});
});

document.addEventListener('DOMContentLoaded', function () {
	my_port.sendData("panel_onload","");
	
	translateNodes(document);
	translateNodes_title(document);
});
