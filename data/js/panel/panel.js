'use strict';

// Avoid keeping init node in memory
let panelinitjs_node = document.querySelector("#panelInit");
panelinitjs_node.parentNode.removeChild(panelinitjs_node)


function sendDataToMain(id, data){
	function responseCallback(response){
		if(typeof response != "undefined"){
			console.group();
			console.info(`Port response of ${id}: `);
			console.groupEnd();
		}
	}
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Panel","receiver": "Live_Notifier_Main", "id": id, "data": data}, responseCallback);
}

var backgroundPage = chrome.extension.getBackgroundPage();
let appGlobal = backgroundPage.appGlobal;
let options = appGlobal.options;
let options_default = appGlobal.options_default;
let options_default_sync = appGlobal.options_default_sync;

let streamListFromSetting = appGlobal.streamListFromSetting;
let websites = appGlobal.websites;
let liveStatus = appGlobal.liveStatus;
let channelInfos = appGlobal.channelInfos;
let getCleanedStreamStatus = appGlobal.getCleanedStreamStatus;
let getStreamURL = appGlobal.getStreamURL;
let getOfflineCount = appGlobal.getOfflineCount;
let doStreamNotif = appGlobal.doStreamNotif;
let setIcon = appGlobal.setIcon;

let getPrimary = appGlobal.getPrimary

let _ = chrome.i18n.getMessage;

var refreshStreamsButton = document.querySelector("#refreshStreams");

function refreshButtonClick(){
	sendDataToMain("refreshStreams","");
}
refreshStreamsButton.addEventListener("click",refreshButtonClick,false);

var addStreamButton = document.querySelector("#addStream");

function addStreamButtonClick(){
	sendDataToMain("addStream","");
}
addStreamButton.addEventListener("click",addStreamButtonClick,false);

function allowDrop(event){
	event.preventDefault();
}
function drag(event) {
	let node = event.target;
	if(node.draggable == true && node.dataset.streamId != null){
		let id = node.dataset.streamId;
		let website = node.dataset.streamWebsite;
		
		let data = {id: id, website: website};
		
		event.dataTransfer.setData("text", JSON.stringify(data));
	}
}
function drop(event) {
	event.preventDefault();
	
	let dropDiv = document.querySelector("#deleteStream");
	dropDiv.classList.remove("active");
	
	let data = JSON.parse(event.dataTransfer.getData("text"));
	
	sendDataToMain("deleteStream", {id: data.id, website: data.website});
}
function dragenter(event){
	if(event.target.classList.contains('dragover') == true){
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.add("active");
	}
}
function dragleave(event){
	if(event.target.classList.contains('dragover') == false){//Chrome only: FALSE
		let dropDiv = document.querySelector("#deleteStream");
		dropDiv.classList.remove("active");
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
		deleteStreamTooltip.classList.remove("hide");
		setTimeout(function() {
			showDeleteTooltip = false;
			deleteStreamTooltip.classList.add("hide");
		}, 1250);
	}
	
	document.querySelector("#streamList").classList.toggle("deleteButtonMode");
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
	
	searchInputContainer.classList.toggle("hide");
	searchInput.value = "";
	searchInput_onInput();
	
	scrollbar_update("streamList");
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
.item-stream:not([data-stream-name-lowercase*="${search}"]):not([data-stream-status-lowercase*="${search}"]):not([data-stream-game-lowercase*="${search}"]):not([data-stream-website-lowercase*="${search}"]){
	display: none;
	visibility: hidden;
}
`;
	} else {
		searchCSS_Node.textContent = "";
	}
	scrollbar_update("streamList");
}

/*				---- Settings ----				*/
let settings_button = document.querySelector("#settings");
let setting_Enabled = false;
function unhideClassNode(node){
	node.classList.remove("hide");
}
function hideClassNode(node){
	node.classList.add("hide");
}
function selectSection(sectionNodeId){
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	let debugSection = document.querySelector("section#debugSection");
	
	if(typeof sectionNodeId == "string" && sectionNodeId != ""){
		let sectionList = [streamList, streamEditor, settings_node, debugSection];
		
		let sectionEnabled = false;
		for(let i in sectionList){
			if(sectionList[i].id == sectionNodeId){
				sectionEnabled = true;
				unhideClassNode(sectionList[i]);
				scrollbar_update(sectionNodeId);
				
				switch(sectionNodeId){
					case "streamList":
						setting_Enabled = false;
						sendDataToMain("refreshPanel", "");
						break;
					case "settings_container":
						setting_Enabled = true;
						break;
				}
			} else {
				hideClassNode(sectionList[i]);
			}
		}
		if(sectionEnabled == false){
			unhideClassNode(streamList);
		}
	}
}
function setting_Toggle(sectionNodeId){
	if(setting_Enabled){
		//setting_Enabled = false;
		selectSection("streamList");
	} else {
		//setting_Enabled = true;
		selectSection("settings_container");
	}
}
settings_button.addEventListener("click", setting_Toggle, false);

/*				---- Debug section ----				*/

let close_debugSection = document.querySelector("#close_debugSection");
close_debugSection.addEventListener("click", function(event){
	selectSection("streamList");
}, false);

let versionNode = document.querySelector("#current_version");
versionNode.addEventListener("dblclick", enableDebugSection);

function enableDebugSection(){
	selectSection("debugSection");
}

/*				---- End Debug section ----				*/

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
		groupNode.classList.add("pref_group");
		if(groupId == "dailymotion" || groupId == "hitbox" || groupId == "twitch" || groupId == "beam"){
			groupNode.classList.add("website_pref");
		}
		parent.appendChild(groupNode);
	}
	return groupNode;
}
function import_onClick(){
	let getWebsite = /^(\w+)_import$/i;
	let website = getWebsite.exec(this.id)[1];
	sendDataToMain("importStreams", website);
}
function newPreferenceNode(parent, id, prefObj){
	let node = document.createElement("div");
	node.classList.add("preferenceContainer");
	
	let labelNode = document.createElement("label");
	labelNode.classList.add("preference");
	if(typeof prefObj.description == "string"){
		labelNode.title = prefObj.description;
	}
	labelNode.htmlFor = id;
	labelNode.dataset.translateTitle = `${id}_description`;
	
	let title = document.createElement("span");
	title.id = `${id}_title`;
	title.textContent = prefObj.title
	title.dataset.translateId = `${id}_title`;
	labelNode.appendChild(title);
	
	let prefNode = null;
	switch(prefObj.type){
		case "string":
			if(typeof prefObj.stringList == "boolean" && prefObj.stringList == true){
				prefNode = document.createElement("textarea");
				prefNode.dataset.stringList = true;
				prefNode.value = getFilterListFromPreference(getPreference(id)).join("\n");
				
				node.classList.add("stringList");
			} else {
				prefNode = document.createElement("input");
				prefNode.type = "text";
				prefNode.value = getPreference(id);
			}
			break;
		case "integer":
			prefNode = document.createElement("input");
			prefNode.type = "number";
			prefNode.value = parseInt(getPreference(id));
			break;
		case "bool":
			prefNode = document.createElement("input");
			prefNode.type = "checkbox";
			prefNode.checked = getBooleanFromVar(getPreference(id));
			break;
		case "color":
			prefNode = document.createElement("input");
			prefNode.type = "color";
			prefNode.value = getPreference(id);
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
				optionNode.dataset.translateId = `${id}_${option.value}`;
				
				prefNode.add(optionNode);
			}
			prefNode.value = getPreference(id);
			break;
	}
	prefNode.id = id;
	if(prefObj.type != "control"){
		prefNode.classList.add("preferenceInput");
	}
	if(id.indexOf("_keys_list") != -1 || id.indexOf("_user_id") != -1){
		node.classList.add("flex_input_text");
	}
	prefNode.dataset.settingType = prefObj.type;
	
	if(prefObj.type != "menulist"){
		prefNode.dataset.translateId = id;
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
			if(id == "export_preferences"){
				prefNode.addEventListener("click", exportPrefsToFile);
			} else if(id == "import_preferences"){
				prefNode.addEventListener("click", importPrefsFromFile);
			} else if(id.indexOf("_import") != -1){
				prefNode.addEventListener("click", import_onClick);
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
		prefValue = getPreference(prefId);
	}
	let prefNode = document.querySelector(`#preferences #${prefId}`);
	
	if(event.type != "input" && !(typeof options[prefId].showPrefInPanel == "boolean" && options[prefId].showPrefInPanel == false) && typeof options[prefId].type == "string"){
		if(prefNode == null){
			console.warn(`${prefId} node is null`);
		} else {
			switch(options[prefId].type){
				case "string":
					if(typeof options[prefId].stringList == "boolean" && options[prefId].stringList == true){
						prefNode.value = getFilterListFromPreference(getPreference(prefId)).join("\n");
					} else {
						prefNode.value = prefValue;
					}
					break;
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
				theme_update({"theme": getPreference("panel_theme"), "background_color": getPreference("background_color")});
			}
		}
	}
}
window.addEventListener('storage', refreshSettings);
/*			---- Settings end ----			*/

/*			---- Stream Editor----			*/

let closeEditorButton = document.querySelector("#closeEditor");
closeEditorButton.addEventListener("click", function(event){
	selectSection(streamList);
}, false);

let saveEditedStreamButton = document.querySelector("#saveEditedStream");
function saveEditedStreamButton_onClick(event){
	let node = this;
	
	let website = node.dataset.website;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	
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
	
	sendDataToMain("streamSetting_Update", {
		website: website,
		id: id,
		contentId: contentId,
		streamSettingsData: streamSettingsData
	});
}
saveEditedStreamButton.addEventListener("click", saveEditedStreamButton_onClick, false);

/*			---- Stream Editor end----			*/

function updatePanelData(data){
	console.log("Updating panel data");
	
	if(typeof data.doUpdateTheme == "boolean" && data.doUpdateTheme == true){
		theme_update({"theme": getPreference("panel_theme"), "background_color": getPreference("background_color")});
	}
	
	//Clear stream list in the panel
	initList({"group_streams_by_websites": getPreference("group_streams_by_websites"), "show_offline_in_panel": getPreference("show_offline_in_panel")});
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			// Make sure that the stream from the status is still in the settings
			if(id in streamList){
				if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
					//console.info(`[Live notifier - Panel] Ignoring ${id}`);
					continue;
				}
				if(typeof streamList[id].hide == "boolean" && streamList[id].hide == true){
					//console.info(`[Live notifier - Panel] Hiding ${id}`);
					continue;
				}
				
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					if(typeof channelInfos[website][id] != "undefined"){
						let streamData = channelInfos[website][id];
						let contentId = id;
						
						console.info(`No data found, using channel infos: ${id} (${website})`);
						
						listener(website, id, contentId, "channel", streamList[id], channelInfos[website][id]);
					}
				} else {
					for(let contentId in liveStatus[website][id]){
						let streamData = liveStatus[website][id][contentId];
						
						getCleanedStreamStatus(website, id, contentId, streamList[id], streamData.liveStatus.API_Status);
						
						if(streamData.liveStatus.filteredStatus || (getPreference("show_offline_in_panel") && !streamData.liveStatus.filteredStatus)){
							doStreamNotif(website, id, contentId, streamList[id], streamData.liveStatus.API_Status);
							
							listener(website, id, contentId, "live", streamList[id], liveStatus[website][id][contentId]);
						}
					}
				}
			} else {
				delete liveStatus[website][id];
				console.info(`${id} from ${website} was already deleted but not from liveStatus`);
			}
		}
	}
	if(appGlobal["checkingLivesState"] == null){
		let notCheckedYet = false;
		for(let website in websites){
			var streamList = (new streamListFromSetting(website)).objData;
			for(let id in streamList){
				if(!(id in liveStatus[website])){
					notCheckedYet = true;
					console.info(`${id} from ${website} is not checked yet`);
					try{
						getPrimary(id, website, id);
					}
					catch(error){
						console.warn(`[Live notifier] ${error}`);
					}
				}
			}
		}
		if(notCheckedYet == true){
			setTimeout(function(){
				sendDataToMain("refreshPanel", "");
			}, 5000);
		}
	}
	setIcon();
	
	//Update online steam count in the panel
	let onlineCount = appGlobal["onlineCount"];
	listenerOnlineCount((onlineCount == 0)? _("No_stream_online") :  _("count_stream_online", onlineCount.toString()));
	
	if(getPreference("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		listenerOfflineCount((offlineCount == 0)? _("No_stream_offline") :  _("count_stream_offline", offlineCount.toString()));
	} else {
		listenerOfflineCount("");
	}
	
	let debug_checkingLivesState_node = document.querySelector("#debug_checkingLivesState");
	debug_checkingLivesState_node.className = (appGlobal["checkingLivesState"] == null); console.log(appGlobal["checkingLivesState"] == null);
	
	//Update Live notifier version displayed in the panel preferences
	if(typeof appGlobal["version"] == "string"){
		current_version(appGlobal["version"]);
	}
}

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
	
	unhideClassNode(document.querySelector("#noErrorToShow"));
	removeAllChildren(document.querySelector("#debugData"));
	
	document.querySelector("#streamListOffline").classList.toggle("hide", !showOffline)
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
	let id = node.dataset.id;
	let website = node.dataset.website;
	
	sendDataToMain("deleteStream", {id: id, website: website});
}
function newDeleteStreamButton(id, website){
	let node = document.createElement("span");
	node.classList.add("deleteStreamButton");
	node.dataset.id = id;
	node.dataset.website = website;
	
	return node;
}
function newShareStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let website = node.dataset.website;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	
	sendDataToMain("shareStream", {
		website: node.dataset.website,
		id: node.dataset.id,
		contentId: node.dataset.contentId,
	});
}
function newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, facebookID, twitterID){
	let node = document.createElement("span");
	node.classList.add("shareStreamButton");
	node.dataset.website = website;
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	
	return node;
}
function newEditStreamButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	let website = node.dataset.website;
	let title = node.dataset.title;
	
	let streamSettings = JSON.parse(node.dataset.streamSettings);
	
	let streamList = document.querySelector("#streamList");
	let streamEditor = document.querySelector("#streamEditor");
	let settings_node = document.querySelector("#settings_container");
	
	hideClassNode(streamList);
	hideClassNode(settings_node);
	
	let titleNode = document.querySelector("#editedStreamTitle");
	titleNode.textContent = title;
	
	let saveEditedStream = document.querySelector("#saveEditedStream");
	saveEditedStream.dataset.id = id;
	saveEditedStream.dataset.contentId = contentId;
	saveEditedStream.dataset.website = website;
	
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
	scrollbar_update("streamEditor");
}
function newEditStreamButton(id, contentId, website, title, streamSettings){
	let node = document.createElement("span");
	node.classList.add("editStreamButton");
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	node.dataset.website = website;
	node.dataset.title = title;
	node.dataset.streamSettings = JSON.stringify(streamSettings);
	
	return node;
}
function newCopyLivestreamerCmdButton_onClick(event){
	event.stopPropagation();
	
	let node = this;
	let id = node.dataset.id;
	let contentId = node.dataset.contentId;
	let website = node.dataset.website;
	
	sendDataToMain("copyLivestreamerCmd", {id: id, contentId: contentId, website: website});
}
function newCopyLivestreamerCmdButton(id, contentId, website){
	let node = document.createElement("span");
	node.classList.add("copyLivestreamerCmdButton");
	node.dataset.id = id;
	node.dataset.contentId = contentId;
	node.dataset.website = website;
	
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
			current_node.classList.toggle("hide", !current_node.hasChildNodes());
		}
	}
}
function insertStreamNode(newLine, website, id, contentId, type, streamData, online){
	let statusNode;
	let statusStreamList;
	
	if(online){
		statusNode = document.querySelector("#streamListOnline");
		statusStreamList = document.querySelectorAll("#streamListOnline .item-stream");
	} else {
		statusNode = document.querySelector("#streamListOffline");
		statusStreamList = document.querySelectorAll("#streamListOffline .item-stream");
	}
	
	if(group_streams_by_websites){
		streamNodes[((online)? "online" : "offline")][website].appendChild(newLine);
		return true;
	} else {
		if(statusStreamList.length > 0){
			for(let i in statusStreamList){
				let streamNode = statusStreamList[i];
				if(typeof streamNode.tagName == "string"){
					let streamNode_title = streamNode.dataset.streamName;
					if(streamData.streamName.toLowerCase() < streamNode_title.toLowerCase()){
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

function listener(website, id, contentId, type, streamSettings, streamData){
	let online = (type == "channel")? streamData.liveStatus.API_Status : streamData.liveStatus.filteredStatus;
	let liveStatus = streamData.liveStatus;
	
	let streamName = streamData.streamName;
	let streamStatus = streamData.streamStatus;
	let streamGame = streamData.streamGame;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamCurrentViewers = streamData.streamCurrentViewers;
	let streamUrl = getStreamURL(website, id, contentId, true);
	let facebookID = streamData.facebookID;
	let twitterID = streamData.twitterID;
	
	var newLine = document.createElement("div");
	newLine.id = `${website}/${id}/${contentId}`;
	
	let stream_right_container_node;
	if(online){
		stream_right_container_node = document.createElement("span");
		stream_right_container_node.id = "stream_right_container";
		newLine.appendChild(stream_right_container_node);
		
		if(online && typeof streamCurrentViewers == "number"){
			var viewerCountNode = document.createElement("span");
			viewerCountNode.classList.add("streamCurrentViewers");
			
			let viewer_number = (typeof streamCurrentViewers == "number")? streamCurrentViewers : parseInt(streamCurrentViewers);
			viewerCountNode.dataset.streamCurrentViewers = (viewer_number < 1000)? viewer_number : ((Math.round(viewer_number / 100)/10) + "k");
			
			stream_right_container_node.appendChild(viewerCountNode);
		}
	}
	
	let streamLogo = "";
	
	if(online && typeof streamCategoryLogo == "string" && streamCategoryLogo != ""){
		streamLogo  = streamCategoryLogo;
	} else if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(typeof streamLogo == "string" && streamLogo != ""){
		newLine.style.backgroundImage = "url('" + streamLogo + "')";
		newLine.classList.add("streamLogo");
	}

	var titleLine = document.createElement("span");
	titleLine.classList.add("streamTitle");
	if(typeof streamLogo == "string" && streamLogo != ""){
		var imgStreamStatusLogo = document.createElement("img");
		imgStreamStatusLogo.classList.add("streamStatusLogo");
		imgStreamStatusLogo.src = (online)? "online-stream.svg" : "offline-stream.svg";
		titleLine.appendChild(imgStreamStatusLogo);
	}
	titleLine.textContent = streamName;
	newLine.appendChild(titleLine);
	
	if(online){
		if(streamStatus != ""){
			var statusLine = document.createElement("span");
			statusLine.classList.add("streamStatus");
			statusLine.textContent = streamStatus + ((streamGame.length > 0)? (" (" + streamGame + ")") : "");
			newLine.appendChild(statusLine);
			
			newLine.dataset.streamStatus = streamStatus;
			newLine.dataset.streamStatusLowercase = streamStatus.toLowerCase();
		}
		
		if(streamGame.length > 0){
			newLine.dataset.streamGame = streamGame;
			newLine.dataset.streamGameLowercase = streamGame.toLowerCase();
		}
		
		newLine.classList.add("item-stream", "onlineItem");
		insertStreamNode(newLine, website, id, contentId, type, streamData, online);
	} else {
		newLine.classList.add("item-stream", "offlineItem");
		insertStreamNode(newLine, website, id, contentId, type, streamData, online);
	}
	newLine.classList.add("cursor");
	
	newLine.dataset.streamId = id;
	newLine.dataset.contentId = contentId;
	newLine.dataset.online = online;
	newLine.dataset.streamName = streamName;
	newLine.dataset.streamNameLowercase = streamName.toLowerCase();
	newLine.dataset.streamWebsite = website;
	newLine.dataset.streamWebsiteLowercase = website.toLowerCase();
	newLine.dataset.streamUrl = streamUrl;
	
	newLine.dataset.streamSettings = JSON.stringify(streamSettings);
	
	if(typeof facebookID == "string" && facebookID != ""){
		newLine.dataset.facebookId = facebookID;
	}
	if(typeof twitterID == "string" && twitterID != ""){
		newLine.dataset.twitterId = twitterID;
	}
	newLine.addEventListener("click", streamItemClick);
	
	/*			---- Control span ----			*/
	let control_span = document.createElement("span");
	control_span.classList.add("stream_control");
	let deleteButton_node = newDeleteStreamButton(id, website);
	control_span.appendChild(deleteButton_node);
	
	let copyLivestreamerCmd_node = null;
	let editStream_node = null;
	let shareStream_node = null;
	if(type == "live"){
		copyLivestreamerCmd_node = newCopyLivestreamerCmdButton(id, contentId, website);
		control_span.appendChild(copyLivestreamerCmd_node);
	}
	editStream_node = newEditStreamButton(id, contentId, website, streamName, streamSettings);
	control_span.appendChild(editStream_node);
	if(online){
		shareStream_node = newShareStreamButton(id, contentId, website, streamName, streamUrl, streamStatus, (typeof facebookID == "string")? facebookID: "", (typeof twitterID == "string")? twitterID: "");
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
	scrollbar_update("streamList");
	
	if(typeof liveStatus.lastCheckStatus == "string" && liveStatus.lastCheckStatus != "" && liveStatus.lastCheckStatus != "success"){
		let debugDataNode = document.querySelector("#debugData");
		let newDebugItem = document.createElement('div');
		newDebugItem.classList.add("debugItem");
		newDebugItem.dataset.streamWebsite = website;
		
		let newDebugItem_title = document.createElement('span');
		newDebugItem_title.classList.add("debugTitle");
		newDebugItem_title.textContent = streamName;
		newDebugItem.appendChild(newDebugItem_title);
		
		let newDebugItem_status = document.createElement('span');
		newDebugItem_status.textContent = `${liveStatus.lastCheckStatus}`;
		newDebugItem.appendChild(newDebugItem_status);
		
		debugDataNode.appendChild(newDebugItem);
		
		let noErrorToShow = document.querySelector("#noErrorToShow");
		hideClassNode(noErrorToShow);
		
		scrollbar_update("debugSection");
	}
}
function streamItemClick(){
	let node = this;
	let id = node.dataset.streamId;
	let online = node.dataset.online;
	let website = node.dataset.streamWebsite;
	let streamUrl = node.dataset.streamUrl;
	
	if(online){
		sendDataToMain("openOnlineLive", {id: id, website: website, streamUrl: streamUrl});
	} else {
		sendDataToMain("openTab", streamUrl);
	}
}

function current_version(version){
	let current_version_node = document.querySelector("#current_version");
	current_version_node.textContent = version;
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

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(message.receiver == "Live_Notifier_Panel"){
		console.group()
		console.info("Message:");
		console.dir(message);
		console.groupEnd();
		
		let id = message.id;
		let data = message.data;
		
		switch(id){
			case "updatePanelData":
				updatePanelData(data);
				break;
		}
	}
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
	} else if(id == "debugSection"){
		scroll_node = document.querySelector('#debugSection');
	} else {
		console.warn(`[Live notifier] Unkown scrollbar id (${id})`);
		return null;
	}
	
	Ps.initialize(scroll_node, {
		theme: "slimScrollbar",
		suppressScrollX: true
	});
}

function scrollbar_update(nodeId){
	if(typeof nodeId == "string" && nodeId != ""){
		let scrollbar_node = document.querySelector(`#${nodeId}`);
		if(scrollbar_node != null){
			Ps.update(scrollbar_node);
		}
	}
}

//document.addEventListener('DOMContentLoaded', function () {
	sendDataToMain("panel_onload","");
	
	translateNodes(document);
	translateNodes_title(document);
	
	load_scrollbar("streamList");
	load_scrollbar("streamEditor");
	load_scrollbar("settings_container");
	load_scrollbar("debugSection");
	
	window.onresize = function(){
		scrollbar_update("streamList");
		scrollbar_update("streamEditor");
		scrollbar_update("settings_container");
		scrollbar_update("debugSection");
	}
//});
