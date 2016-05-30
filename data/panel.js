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
let options = appGlobal.options;
let options_default = appGlobal.options_default;
let options_default_sync = appGlobal.options_default_sync;
let _ = appGlobal._;
let translateNodes = appGlobal.translateNodes;
let translateNodes_title = appGlobal.translateNodes_title;
let getValueFromNode = appGlobal.getValueFromNode;
let getBooleanFromVar = appGlobal.getBooleanFromVar;
let settingNode_onChange = function(){
	appGlobal.settingNode_onChange(event, this, my_port);
}

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
		}, 1250);
	}
	
	let streamListNode = document.querySelector("#streamList");
	let deleteButtonMode_reg = /\s*deleteButtonMode/;
	if(deleteButtonMode_reg.test(streamListNode.className)){
		streamListNode.className = streamListNode.className.replace(deleteButtonMode_reg,"");
	} else {
		streamListNode.className += " deleteButtonMode";
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


/*				---- Setting nodes generator ----				*/
function loadPreferences(){
	let container = document.querySelector("section#settings_container #preferences");
	
	for(let id in options){
		let option = options[id];
		if(typeof option.type == "undefined" || option.type == "hidden"){
			continue;
		}
		if(typeof option.showPrefInPanel == "boolean" && option.showPrefInPanel == false){
			continue;
		}
		
		let groupNode = null;
		if(typeof option.group == "string" && option.group != ""){
			groupNode = getPreferenceGroupNode(container, option.group);
		}
		newPreferenceNode(((groupNode == null)? container : groupNode), id, option);
	}
}
function getPreferenceGroupNode(parent, groupId){
	let groupNode = document.querySelector(`#${groupId}.pref_group`);
	if(groupNode == null){
		groupNode = document.createElement("p");
		groupNode.id = groupId;
		groupNode.className = "pref_group";
		if(groupId == "dailymotion" || groupId == "hitbox" || groupId == "twitch" || groupId == "beam"){
			groupNode.className += " website_pref"
		}
		parent.appendChild(groupNode);
	}
	return groupNode;
}
function import_onClick(){
	let getWebsite = /^(\w+)_import$/i;
	let website = getWebsite.exec(this.id)[1];
	port_options.sendData("importStreams", website);
}
function newPreferenceNode(parent, id, prefObj){
	let node = document.createElement("div");
	node.className = "preferenceContainer";
	
	let labelNode = document.createElement("label");
	labelNode.className = "preference";
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	labelNode.setAttribute("data-translate-title",`${id}_description`)
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title
	title.setAttribute("data-translate-id",`${id}_title`)
	labelNode.appendChild(title);
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			prefNode = document.createElement("input");
			prefNode.type = "text";
			prefNode.value = getPreferences(id);
			break;
		case "integer":
			prefNode = document.createElement("input");
			prefNode.type = "number";
			prefNode.value = parseInt(getPreferences(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			prefNode.checked = getBooleanFromVar(getPreferences(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			prefNode.value = getPreferences(id);
			break;
		case "control":
			prefNode = document.createElement("button");
			prefNode.textContent = prefObj.label;
			break;
		case "menulist":
			prefNode = document.createElement("select");
			prefNode.size = 2;
			for(let o in prefObj.options){
				let option = prefObj.options[o];
				
				let optionNode = document.createElement("option");
				optionNode.text = option.label;
				optionNode.value = option.value;
				optionNode.setAttribute("data-translate-id",`${id}_${option.value}`);
				
				prefNode.add(optionNode);
			}
			prefNode.value = getPreferences(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.className = "preferenceInput";
	}
	if(id.indexOf("_keys_list") != -1 || id.indexOf("_user_id") != -1){
		node.className += " flex_input_text";
	}
	prefNode.setAttribute("data-setting-type", prefObj.type);
	
	if(prefObj.type != "menulist"){
		prefNode.setAttribute("data-translate-id", id);
	}
	
	node.appendChild(labelNode);
	node.appendChild(prefNode);
	parent.appendChild(node);
	
	switch(prefObj.type){
		case "string":
			prefNode.addEventListener("input", settingNode_onChange, false);
			break;
		case "integer":
		case "bool":
		case "color":
		case "menulist":
			prefNode.addEventListener("change", settingNode_onChange, false);
			break;
		case "control":
			if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick, false);
			}
			break;
	}
}
loadPreferences();


function settingNodesUpdate(data){
	let settingNode = document.querySelector(`#${data.settingName}`);
	
	if(settingNode !== null){
		console.dir(settingNode)
		switch(options[data.settingName].type){
			case "string":
			case "color":
			case "menulist":
				settingNode.value = data.settingValue;
				break;
			case "integer":
				settingNode.value = parseInt(data.settingValue);
				break;
			case "bool":
				settingNode.checked = getBooleanFromVar(data.settingValue);
				break;
			case "control":
				// Nothing to update, no value
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
	node.className = "deleteStreamButton";
	node.setAttribute("data-id", id);
	node.setAttribute("data-website", website);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "delete";
	node.appendChild(node_img);
	
	return node;
}
let I_am_watching_the_stream_of = "";
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	let streamName = node.getAttribute("data-streamName");
	let website = node.getAttribute("data-website");
	let streamUrl = node.getAttribute("data-streamUrl");
	let streamStatus = node.getAttribute("data-streamStatus");
	
	let facebookID = node.getAttribute("data-facebookID");
	let twitterID = node.getAttribute("data-twitterID");
	
	let streamerAlias = streamName;
	/*
	if(facebookID != null && facebookID != ""){
		
	}*/
	if(twitterID != null && twitterID != ""){
		streamerAlias = `@${twitterID}`;
		console.info(`${id}/${contentId} (${website}) twitter ID: ${twitterID}`)
	}
	
	let shareMessage = `${I_am_watching_the_stream_of} ${streamerAlias}, "${streamStatus}"`;
	console.info(shareMessage);
	
	// window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamUrl}&hashtags=LiveNotifier${(twitterID != "")? `&related=${twitterID}` : ""}&via=LiveNotifier`, '_blank');
	window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamUrl}${(twitterID != "")? `&related=${twitterID}` : ""}&via=LiveNotifier`, '_blank');
}
function newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, facebookID, twitterID){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	node.setAttribute("data-streamName", streamName);
	node.setAttribute("data-website", website);
	node.setAttribute("data-streamUrl", streamUrl);
	node.setAttribute("data-streamStatus", streamStatus)
	node.setAttribute("data-facebookID", facebookID);
	node.setAttribute("data-twitterID", twitterID);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "share";
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
	if(typeof data.facebookID == "string" && data.facebookID != ""){
		newLine.setAttribute("data-facebookID", data.facebookID);
	}
	if(typeof data.facebookID == "string" && data.twitterID != ""){
		newLine.setAttribute("data-twitterID", data.twitterID);
	}
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.className = "stream_control";
	let deleteButton_node = newDeleteStreamButton(data.id, data.website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	let shareStream_node = null;
	if(data.type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(data.id, data.contentId, data.website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	if(data.online){
		shareStream_node = newShareStreamButton(data.id, data.contentId, data.website, data.streamName, data.streamUrl, data.streamStatus, (typeof data.facebookID == "string")? data.facebookID: "", (typeof data.twitterID == "string")? data.twitterID: "");
		control_span.appendChild(shareStream_node);
		
		stream_right_container_node.appendChild(control_span);
	} else {
		newLine.appendChild(control_span);
	}
	deleteButton_node.addEventListener("click", newDeleteStreamButton_onClick, false);
	if(copyLivestreamerCmd_node !== null){
		copyLivestreamerCmd_node.addEventListener("click", newCopyLivestreamerCmdButton_onClick, false);
	}
	if(shareStream_node !== null){
		shareStream_node.addEventListener("click", newShareStreamButton_onClick, false);
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

function current_version(data){
	let current_version_node = document.querySelector("#current_version");
	current_version_node.textContent = data.current_version;
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
			case "I_am_watching_the_stream_of":
				I_am_watching_the_stream_of = data;
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
			case "current_version":
				current_version(data);
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
