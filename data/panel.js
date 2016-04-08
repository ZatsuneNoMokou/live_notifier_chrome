'use strict';

function sendDataToMain(portName){
	this.port = chrome.runtime.connect({name: portName});
	console.info(`Port (${portName}) connection initiated`);
	this.sendData = function(id, data){
		this.port.postMessage({"id": id, "data": data});
	}
}
let my_port =	new sendDataToMain("Live_Streamer_Panel");
let port = my_port.port;

var backgroundPage = chrome.extension.getBackgroundPage();
let appGlobal = backgroundPage.appGlobal;
let _ = appGlobal._;
let translateNodes = appGlobal.translateNodes;
let translateNodes_title = appGlobal.translateNodes_title;
let getValueFromNode = appGlobal.getValueFromNode;
let getBooleanFromVar = appGlobal.getBooleanFromVar;

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

function allowDrop(event){
	event.preventDefault();
}
function drag(event) {
	let node = event.target;
	if(node.draggable = true && node.getAttribute("data-streamId") !== null){
		let id = node.getAttribute("data-streamId");
		let website = node.getAttribute("data-streamWebsite");
		
		let data = {id: id, website: website};
		
		event.dataTransfer.setData("text", JSON.stringify(data));
	}
}
function drop(event) {
	event.preventDefault();
	
	let dropDiv = document.querySelector("#deleteStream");
	dropDiv.className = dropDiv.className.replace(/\s*active/i,"");
	
	let data = JSON.parse(event.dataTransfer.getData("text"));
	
	my_port.sendData("deleteStream", {id: data.id, website: data.website});
}
function dragenter(event){
	if(event.target.className.indexOf('dragover') != -1){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.className += " active";
	}
}
function dragleave(event){
	let node = event.target;
	if(event.target.className.indexOf('dragover') != -1){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.className = dropDiv.className.replace(/\s*active/i,"");
	}
}
let dropDiv = document.querySelector("#deleteStream");
dropDiv.addEventListener("drop", drop);
dropDiv.addEventListener("dragover", allowDrop);
document.addEventListener("dragenter", dragenter); // Event dragging something and entering a valid node
document.addEventListener("dragleave", dragleave); // Event dragging something and leaving a valid node
document.addEventListener("dragstart", drag); // Get dragged element data
let deleteStreamButton = document.querySelector("#deleteStream");
let deleteStreamTooltip = document.querySelector("#deleteStreamTooltip");
let showDeleteTooltip = false;
function deleteStreamButtonClick(){
	if(!showDeleteTooltip){
		showDeleteTooltip = true;
		deleteStreamTooltip.className = deleteStreamTooltip.className.replace(/\s*hide/i,"");
		setTimeout(function() {
			showDeleteTooltip = false;
			deleteStreamTooltip.className += " hide";
		}, 2500);
	}
}
deleteStreamButton.addEventListener("click", deleteStreamButtonClick, false);

/*				---- Search Button ----				*/
let toggle_search_button = document.querySelector("button#searchStream");
let searchInput_onInput_Loaded = false;
function searchContainer_Toggle(){
	let searchInputContainer = document.querySelector("#searchInputContainer");
	let hiddenClass = /\s*hide/i;
	
	let searchInput = document.querySelector("input#searchInput");
	if(!searchInput_onInput_Loaded){
		searchInput.addEventListener("input", searchInput_onInput);
		
		let searchLabel = document.querySelector("#searchInputContainer label");
		searchLabel.addEventListener("click", searchInput_onInput);
	}
	
	if(hiddenClass.test(searchInputContainer.className)){
		searchInputContainer.className = searchInputContainer.className.replace(/\s*hide/i,"");
	} else {
		searchInputContainer.className += " hide";
		searchInput.value = "";
		searchInput_onInput();
	}
	scrollbar_streamList_update();
}
toggle_search_button.addEventListener("click", searchContainer_Toggle);


function searchInput_onInput(){
	let searchInput = document.querySelector("input#searchInput");
	
	let somethingElseThanSpaces = /[^\s]+/;
	let search = searchInput.value.toLowerCase();
	let searchCSS_Node = document.querySelector("#search-cssSelector");
	let cssSelector = "";
	if(search.length > 0 && somethingElseThanSpaces.test(search)){
		searchCSS_Node.textContent = `
.item-stream:not([data-streamnamelowercase*="${search}"]):not([data-streamstatuslowercase*="${search}"]):not([data-streamgamelowercase*="${search}"]):not([data-streamwebsitelowercase*="${search}"]){
	display: none;
	visibility: hidden;
}
`;
	} else {
		searchCSS_Node.textContent = "";
	}
	scrollbar_streamList_update();
}

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
function setting_Toggle(){
	let streamList = document.querySelector("#streamList");
	let settings_node = document.querySelector("#settings_container");
	if(setting_Enabled){
		setting_Enabled = false;
		streamList.className = streamList.className.replace(/\s*hide/i,"");
		settings_node.className += " hide";
		
		scrollbar_streamList_update();
	} else {
		setting_Enabled = true;
		streamList.className += " hide";
		settings_node.className = settings_node.className.replace(/\s*hide/i,"");
		
		scrollbar_settings_container_update();
	}
}
settings_button.addEventListener("click", setting_Toggle, false);

let dailymotion_user_id_input = document.querySelector("#dailymotion_user_id");
dailymotion_user_id_input.addEventListener("input", settingNode_onChange, false);

let dailymotion_import_button = document.querySelector("button#dailymotion_import");
dailymotion_import_button.addEventListener("click", function(){
	my_port.sendData("importStreams","dailymotion");
});

let hitbox_user_id_input = document.querySelector("#hitbox_user_id");
hitbox_user_id_input.addEventListener("input", settingNode_onChange, false);

let hitbox_import_button = document.querySelector("button#hitbox_import");
hitbox_import_button.addEventListener("click", function(){
	my_port.sendData("importStreams","hitbox");
});

let twitch_user_id_input = document.querySelector("#twitch_user_id");
twitch_user_id_input.addEventListener("input", settingNode_onChange, false);

let twitch_import_button = document.querySelector("button#twitch_import");
twitch_import_button.addEventListener("click", function(){
	my_port.sendData("importStreams","twitch");
});

let beam_user_id_input = document.querySelector("#beam_user_id");
beam_user_id_input.addEventListener("input", settingNode_onChange, false);

let beam_import_button = document.querySelector("button#beam_import");
beam_import_button.addEventListener("click", function(){
	my_port.sendData("importStreams","beam");
});

let check_delay_input = document.querySelector("#check_delay");
check_delay_input.addEventListener("change", settingNode_onChange, false);

let notification_type_select = document.querySelector("#notification_type");
notification_type_select.addEventListener("change", settingNode_onChange, false);

let notify_online_input = document.querySelector("#notify_online");
notify_online_input.addEventListener("change", settingNode_onChange, false);

let notify_offline_input = document.querySelector("#notify_offline");
notify_offline_input.addEventListener("change", settingNode_onChange, false);

let group_streams_by_websites_input = document.querySelector("#group_streams_by_websites");
group_streams_by_websites_input.addEventListener("change", settingNode_onChange, false);

let show_offline_in_panel = document.querySelector("#show_offline_in_panel");
show_offline_in_panel.addEventListener("change", settingNode_onChange, false);

let confirm_addStreamFromPanel_input = document.querySelector("#confirm_addStreamFromPanel");
confirm_addStreamFromPanel_input.addEventListener("change", settingNode_onChange, false);

let confirm_deleteStreamFromPanel_input = document.querySelector("#confirm_deleteStreamFromPanel");
confirm_deleteStreamFromPanel_input.addEventListener("change", settingNode_onChange, false);

let background_color_input = document.querySelector("#background_color");
background_color_input.addEventListener("change", settingNode_onChange, false);

let panel_theme_select = document.querySelector("#panel_theme");
panel_theme_select.addEventListener("change", settingNode_onChange, false);

let livestreamer_cmd_to_clipboard_input = document.querySelector("#livestreamer_cmd_to_clipboard");
livestreamer_cmd_to_clipboard_input.addEventListener("change", settingNode_onChange, false);

let livestreamer_cmd_quality_input = document.querySelector("#livestreamer_cmd_quality");
livestreamer_cmd_quality_input.addEventListener("input", settingNode_onChange, false);

function settingNode_onChange(event){
	let node = this;
	let setting_Name = this.id;
	let value = getValueFromNode(node);
	if(setting_Name == "check_delay" && value < 1){
		value = 1;
	}
	
	let updatePanel = true
	// if(event.type == "input" && this.tagName == "INPUT" && this.type == "text"){
	if(event.type == "input"){
		updatePanel = false;
	}
	my_port.sendData("setting_Update", {settingName: setting_Name, settingValue: value, updatePanel: updatePanel});
	
	if(updatePanel){
		my_port.sendData("refreshPanel", {doUpdateTheme: ((setting_Name == "background_color" || setting_Name == "panel_theme")? true : false)})
	}
}

function settingNodesUpdate(data){
	let settingNode = document.querySelector(`#${data.settingName}`);
	if(settingNode !== null){
		switch(settingNode.getAttribute("data-setting-type")){
			case "boolean":
				settingNode.checked = getBooleanFromVar(data.settingValue);
				break;
			case "number":
				settingNode.value = parseInt(data.settingValue);
				break;
			case "string":
				settingNode.value = data.settingValue;
				break;
		}
	} else {
		console.warn(`${data.settingName} node is null`);
	}
}
/*			---- Settings end ----			*/


function removeAllChildren(node){
	// Taken from https://stackoverflow.com/questions/683366/remove-all-the-children-dom-elements-in-div
	while (node.hasChildNodes()) {
		node.lastChild.removeEventListener("click", streamItemClick);
		node.removeChild(node.lastChild);
	}
}

let group_streams_by_websites = true;
function initList(data){
	let showOffline = data.show_offline_in_panel;
	group_streams_by_websites = data.group_streams_by_websites;
	
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

function listenerOnlineCount(data){
	let streamOnlineCountNode = document.querySelector("#streamOnlineCountLabel");
	removeAllChildren(streamOnlineCountNode);
	streamOnlineCountNode.textContent = data;
}

function listenerOfflineCount(data){
	let streamOfflineCountNode = document.querySelector("#streamOfflineCountLabel");
	removeAllChildren(streamOfflineCountNode);
	streamOfflineCountNode.textContent = data;
}

function newDeleteStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let website = node.getAttribute("data-website");
	
	my_port.sendData("deleteStream", {id: id, website: website});
}
function newDeleteStreamButton(id, website){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "delete";
	node.appendChild(node_img);
	
	return node;
}
function newCopyLivestreamerCmdButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	let website = node.getAttribute("data-website");
	
	my_port.sendData("copyLivestreamerCmd", {id: id, contentId: contentId, website: website});
}
function newCopyLivestreamerCmdButton(id, contentId, website){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "content_copy";
	node.appendChild(node_img);
	
	return node;
}

let streamNodes = {
	"online": {
		"beam": document.querySelector("#streamListOnline .beam"),
		"dailymotion": document.querySelector("#streamListOnline .dailymotion"),
		"hitbox": document.querySelector("#streamListOnline .hitbox"),
		"twitch": document.querySelector("#streamListOnline .twitch")
	},
	"offline": {
		"beam": document.querySelector("#streamListOffline .beam"),
		"dailymotion": document.querySelector("#streamListOffline .dailymotion"),
		"hitbox": document.querySelector("#streamListOffline .hitbox"),
		"twitch": document.querySelector("#streamListOffline .twitch")
	}
}

function showNonEmptySitesBlocks(){
	let current_node;
	for(let onlineStatus in streamNodes){
		for(let website in streamNodes[onlineStatus]){
			current_node = streamNodes[onlineStatus][website];
			current_node.className = current_node.className.replace(/\s*hide/i,"");
			current_node.className = current_node.className + ((current_node.hasChildNodes())? "" : " hide");
		}
	}
}
function insertStreamNode(newLine, data){
	let statusNode;
	let statusStreamList;
	
	if(data.online){
		statusNode = document.querySelector("#streamListOnline");
		statusStreamList = document.querySelectorAll("#streamListOnline .item-stream");
	} else {
		statusNode = document.querySelector("#streamListOffline");
		statusStreamList = document.querySelectorAll("#streamListOffline .item-stream");
	}
	
	if(group_streams_by_websites){
		streamNodes[((data.online)? "online" : "offline")][data.website].appendChild(newLine);
		return true;
	} else {
		if(statusStreamList.length > 0){
			for(let i in statusStreamList){
				let streamNode = statusStreamList[i];
				if(typeof streamNode.getAttribute == "function"){
					let streamNode_title = streamNode.getAttribute("data-streamName");
					if(data.streamName.toLowerCase() < streamNode_title.toLowerCase()){
						streamNode.parentNode.insertBefore(newLine,streamNode);
						return true;
					}
				}
			}
		}
		statusNode.appendChild(newLine);
		return true;
	}
}

function listener(data){
	var newLine = document.createElement("div");
	newLine.id = `${data.website}/${data.id}/${data.contentId}`;
	
	let stream_right_container_node;
	if(data.online && typeof data.streamCurrentViewers == "number"){
		stream_right_container_node = document.createElement("span");
		stream_right_container_node.id = "stream_right_container";
		
		var viewerCountNode = document.createElement("span");
		viewerCountNode.className = "streamCurrentViewers";
		
		let viewer_number = (typeof data.streamCurrentViewers == "number")? data.streamCurrentViewers : parseInt(data.streamCurrentViewers);
		viewerCountNode.textContent = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10)+ "k");
		
		var viewerCountLogoNode = document.createElement("i");
		viewerCountLogoNode.className = "material-icons";
		viewerCountLogoNode.textContent ="visibility";
		viewerCountNode.appendChild(viewerCountLogoNode);
		stream_right_container_node.appendChild(viewerCountNode);
		newLine.appendChild(stream_right_container_node);
	}
	
	let streamOwnerLogo = data.streamOwnerLogo;
	let streamCategoryLogo = data.streamCategoryLogo;
	let streamLogo = "";
	
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
	titleLine.textContent = data.streamName;
	newLine.appendChild(titleLine);
	
	if(data.online){
		if(data.streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.className = "streamStatus";
			statusLine.textContent = data.streamStatus + ((data.streamGame.length > 0)? (" (" + data.streamGame + ")") : "");
			newLine.appendChild(statusLine);
			
			newLine.setAttribute("data-streamStatus", data.streamStatus);
			newLine.setAttribute("data-streamStatusLowerCase", data.streamStatus.toLowerCase());
		}
		
		if(data.streamGame.length > 0){
			newLine.setAttribute("data-streamGame", data.streamGame);
			newLine.setAttribute("data-streamGameLowerCase", data.streamGame.toLowerCase());
		}
		
		newLine.className += " item-stream onlineItem";
		insertStreamNode(newLine, data);
	} else {
		newLine.className += " item-stream offlineItem";
		insertStreamNode(newLine, data);
	}
	newLine.className += " cursor";
	
	newLine.setAttribute("data-streamId", data.id);
	newLine.setAttribute("data-contentId", data.contentId);
	newLine.setAttribute("data-online", data.online);
	newLine.setAttribute("data-streamName", data.streamName);
	newLine.setAttribute("data-streamNameLowerCase", data.streamName.toLowerCase());
	newLine.setAttribute("data-streamWebsite", data.website);
	newLine.setAttribute("data-streamWebsiteLowerCase", data.website.toLowerCase());
	newLine.setAttribute("data-streamUrl", data.streamUrl);
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.className = "stream_control";
	let deleteButton_node = newDeleteStreamButton(data.id, data.website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	if(data.type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(data.id, data.contentId, data.website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	if(data.online){
		stream_right_container_node.appendChild(control_span);
	} else {
		newLine.appendChild(control_span);
	}
	deleteButton_node.addEventListener("click", newDeleteStreamButton_onClick, false);
	if(copyLivestreamerCmd_node !== null){
		copyLivestreamerCmd_node.addEventListener("click", newCopyLivestreamerCmdButton_onClick, false);
	}
	
	newLine.draggable = true;
	
	showNonEmptySitesBlocks();
	scrollbar_streamList_update();
}
function streamItemClick(){
	let node = this;
	let id = node.getAttribute("data-streamId");
	let online = node.getAttribute("data-online");
	let website = node.getAttribute("data-streamWebsite");
	let streamUrl = node.getAttribute("data-streamUrl");
	
	if(online){
		my_port.sendData("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
	} else {
		my_port.sendData("openTab", streamUrl);
	}
}

var theme_cache_update = backgroundPage.theme_cache_update;
function theme_update(data){
	let panelColorStylesheet = theme_cache_update(document, data);
	
	if(typeof panelColorStylesheet == "object" && panelColorStylesheet !== null){
		console.info("Theme update");
		
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
			case "settingNodesUpdate":
				settingNodesUpdate(data);
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

let scrollbar = {"streamList": null, "settings_container": null};
function load_scrollbar(id){
	let scroll_node;
	if(id == "streamList"){
		scroll_node = document.querySelector('#streamList');
	} else if(id == "settings_container"){
		scroll_node = document.querySelector('#settings_container');
	} else {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}
	
	Ps.initialize(scroll_node, {
		theme: "slimScrollbar"
	});
}

function scrollbar_streamList_update(){
	let scroll_node = document.querySelector('#streamList');
	Ps.update(scroll_node);
}
function scrollbar_settings_container_update(){
	let scroll_node = document.querySelector('#settings_container');
	Ps.update(scroll_node);
}

//document.addEventListener('DOMContentLoaded', function () {
	my_port.sendData("panel_onload","");
	
	translateNodes(document);
	translateNodes_title(document);
	
	load_scrollbar("streamList");
	load_scrollbar("settings_container");
	
	window.onresize = function(){
		scrollbar_streamList_update();
		
		scrollbar_settings_container_update();
	}
//});
