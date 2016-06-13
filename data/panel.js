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

let _ = chrome.i18n.getMessage;

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
function unhideClassNode(node){
	let hideClass_reg = /\s*hide/i;
	
	if(hideClass_reg.test(node.className) == true){
		node.className = node.className.replace(/\s*hide/i,"");
	}
}
function hideClassNode(node){
	let hideClass_reg = /\s*hide/i;
	
	if(hideClass_reg.test(node.className) == false){
		node.className += " hide";
	}
}
function setting_Toggle(){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamEditor);
	
	if(setting_Enabled){
		setting_Enabled = false;
		
		my_port.sendData("refreshPanel","");
		
		unhideClassNode(streamList);
		hideClassNode(settings_node);
		
		scrollbar_streamList_update();
	} else {
		setting_Enabled = true;
		unhideClassNode(settings_node);
		hideClassNode(streamList);
		
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
	my_port.sendData("importStreams", website);
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
			prefNode.addEventListener("input", settingNode_onChange);
			break;
		case "integer":
		case "bool":
		case "color":
		case "menulist":
			prefNode.addEventListener("change", settingNode_onChange);
			break;
		case "control":
			if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick, false);
			}
			break;
	}
}
loadPreferences();

function refreshSettings(event){
	let prefId = "";
	let prefValue = "";
	if(typeof event.key == "string"){
		prefId = event.key;
		prefValue = event.newValue;
	} else if(typeof event.target == "object"){
		prefId = event.target.id;
		prefValue = getPreferences(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	if(!(typeof options[prefId].showPrefInPanel == "boolean" && options[prefId].showPrefInPanel == false) && typeof options[prefId].type == "string"){
		if(prefNode == null){
			console.warn(`${prefId} node is null`);
		} else {
			switch(options[prefId].type){
				case "string":
				case "color":
				case "menulist":
					prefNode.value = prefValue;
					break;
				case "integer":
					prefNode.value = parseInt(prefValue);
					break;
				case "bool":
					prefNode.checked = getBooleanFromVar(prefValue);
					break;
				case "control":
					// Nothing to update, no value
					break;
			}
			if(prefId == "panel_theme" || prefId == "background_color"){
				theme_update({"theme": getPreferences("panel_theme"), "background_color": getPreferences("background_color")});
			}
		}
	}
}
window.addEventListener('storage', refreshSettings);
/*			---- Settings end ----			*/

/*			---- Stream Editor----			*/

let closeEditorButton = document.querySelector("#closeEditor");
closeEditorButton.addEventListener("click", function(event){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	my_port.sendData("refreshPanel","");
	
	unhideClassNode(streamList);
	hideClassNode(streamEditor);
	hideClassNode(settings_node);
}, false);

let saveEditedStreamButton = document.querySelector("#saveEditedStream");
function saveEditedStreamButton_onClick(event){
	let node = this;
	
	let website = node.getAttribute("data-website");
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	
	let customURL_node = document.querySelector("#customURL");
	
	function removeEmplyItems(obj){
		for(let i in obj){
			if(obj[i] == "" /* || /^\s+$/ */){
				delete obj[i];
			}
		}
		return obj;
	}
	
	let streamSettingsData = {
		streamURL: (customURL_node.validity.valid == true)? customURL_node.value : "",
		statusBlacklist: removeEmplyItems(document.querySelector("#streamEditor #status_blacklist").value.split('\n')),
		statusWhitelist: removeEmplyItems(document.querySelector("#streamEditor #status_whitelist").value.split('\n')),
		gameBlacklist: removeEmplyItems(document.querySelector("#streamEditor #game_blacklist").value.split('\n')),
		gameWhitelist: removeEmplyItems(document.querySelector("#streamEditor #game_whitelist").value.split('\n')),
		twitter: document.querySelector("#streamEditor #twitter").value,
		hide: document.querySelector("#streamEditor #hideStream").checked,
		ignore: document.querySelector("#streamEditor #ignoreStream").checked,
		notifyOnline: document.querySelector("#streamEditor #notifyOnline").checked,
		notifyOffline: document.querySelector("#streamEditor #notifyOffline").checked
	}
	
	my_port.sendData("streamSetting_Update", {
		website: website,
		id: id,
		contentId: contentId,
		streamSettingsData: streamSettingsData
	});
}
saveEditedStreamButton.addEventListener("click", saveEditedStreamButton_onClick, false);

/*			---- Stream Editor end----			*/


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
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let website = node.getAttribute("data-website");
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	
	my_port.sendData("shareStream", {
		website: node.getAttribute("data-website"),
		id: node.getAttribute("data-id"),
		contentId: node.getAttribute("data-contentId"),
	});
}
function newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, facebookID, twitterID){
	let node = document.createElement("span");
	node.setAttribute("data-website", website);
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "share";
	node.appendChild(node_img);
	
	return node;
}
function newEditStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.getAttribute("data-id");
	let contentId = node.getAttribute("data-contentId");
	let website = node.getAttribute("data-website");
	let title = node.getAttribute("data-title");
	
	let streamSettings = JSON.parse(node.getAttribute("data-streamSettings"));
	
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamList);
	hideClassNode(settings_node);
	
	let titleNode = document.querySelector("#editedStreamTitle");
	titleNode.textContent = title;
	
	let saveEditedStream = document.querySelector("#saveEditedStream");
	saveEditedStream.setAttribute("data-id", id);
	saveEditedStream.setAttribute("data-contentId", contentId);
	saveEditedStream.setAttribute("data-website", website);
	
	document.querySelector("#streamEditor #customURL").value = streamSettings.streamURL;
	document.querySelector("#streamEditor #status_blacklist").value = (streamSettings.statusBlacklist)? streamSettings.statusBlacklist.join("\n") : "";
	document.querySelector("#streamEditor #status_whitelist").value = (streamSettings.statusWhitelist)? streamSettings.statusWhitelist.join("\n") : "";
	document.querySelector("#streamEditor #game_blacklist").value = (streamSettings.gameBlacklist)? streamSettings.gameBlacklist.join("\n") : "";
	document.querySelector("#streamEditor #game_whitelist").value = (streamSettings.gameWhitelist)? streamSettings.gameWhitelist.join("\n") : "";
	document.querySelector("#streamEditor #twitter").value = (streamSettings.twitter)? streamSettings.twitter : "";
	document.querySelector("#streamEditor #hideStream").checked = (typeof streamSettings.hide == "boolean")? streamSettings.hide : false;
	document.querySelector("#streamEditor #ignoreStream").checked = (typeof streamSettings.ignore == "boolean")? streamSettings.ignore : false;
	document.querySelector("#streamEditor #notifyOnline").checked = (typeof streamSettings.notifyOnline == "boolean")? streamSettings.notifyOnline : true;
	document.querySelector("#streamEditor #notifyOffline").checked = (typeof streamSettings.notifyOffline == "boolean")? streamSettings.notifyOffline : false;
	
	unhideClassNode(streamEditor);
	scrollbar_streamEditor_update();
}
function newEditStreamButton(id, contentId, website, title, streamSettings){
	let node = document.createElement("span");
	node.setAttribute("data-id", id);
	node.setAttribute("data-contentId", contentId);
	node.setAttribute("data-website", website);
	node.setAttribute("data-title", title);
	node.setAttribute("data-streamSettings", JSON.stringify(streamSettings));
	
	let node_img =  document.createElement("i");
	node_img.className = "material-icons";
	node_img.textContent = "settings";
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
	let editStream_node = null;
	let shareStream_node = null;
	if(data.type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(data.id, data.contentId, data.website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	editStream_node = newEditStreamButton(data.id, data.contentId, data.website, data.streamName, data.streamSettings);
	control_span.appendChild(editStream_node);
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
	if(editStream_node !== null){
		editStream_node.addEventListener("click", newEditStreamButton_onClick, false);
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
	} else if(id == "streamEditor"){
		scroll_node = document.querySelector('#streamEditor');
	} else {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}
	
	Ps.initialize(scroll_node, {
		theme: "slimScrollbar",
		suppressScrollX: true
	});
}

function scrollbar_streamList_update(){
	let scroll_node = document.querySelector('#streamList');
	Ps.update(scroll_node);
}
function scrollbar_streamEditor_update(){
	let scroll_node = document.querySelector('#streamEditor');
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
	load_scrollbar("streamEditor");
	load_scrollbar("settings_container");
	
	window.onresize = function(){
		scrollbar_streamList_update();
		scrollbar_streamEditor_update();
		scrollbar_settings_container_update();
	}
//});
