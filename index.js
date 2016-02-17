'use strict';

function getPreferences(prefId){
	let defaultSettings = {
		dailymotion_keys_list: "",
		hitbox_keys_list: "",
		twitch_keys_list: "",
		hitbox_user_id: "",
		twitch_user_id: "",
		check_delay: 5,
		notification_type: "web",
		notify_online: true,
		notify_offline: false,
		show_offline_in_panel: false,
		confirm_addStreamFromPanel: false,
		confirm_deleteStreamFromPanel: true,
		panel_theme: "dark",
		background_color: "#000000",
		livestreamer_cmd_to_clipboard: false,
		livestreamer_cmd_quality: "best",
		livenotifier_version: "0.0.0"
	}
	if(typeof localStorage.getItem(prefId) != "undefined" && localStorage.getItem(prefId) != null){
		let current_pref = localStorage.getItem(prefId);
		switch(typeof defaultSettings[prefId]){
			case "string":
				return current_pref;
				break;
			case "number":
				return parseInt(current_pref);
				break;
			case "boolean":
				return getBooleanFromVar(current_pref);
			default:
				return
		}
		return localStorage.getItem(prefId);
	} else if(typeof defaultSettings[prefId] != "undefined"){
		console.warn(`Preference ${prefId} not found, using default`);
		savePreference(prefId, defaultSettings[prefId]);
		return defaultSettings[prefId];
	}
}
function savePreference(prefId, value){
	localStorage.setItem(prefId, value);
	if(port_panel_sender !== null){
		sendDataToOptionPage("refreshOptions", {});
	}
	if(port_panel !== null){
		refreshPanel({doUpdateTheme: ((prefId == "background_color" || prefId == "panel_theme")? true : false)});
	}
}
function getBooleanFromVar(string){
	switch(typeof string){
		case "boolean":
			return string;
			break;
	case "number":
		case "string":
			if(string == "true" || string == "on" || string == 1){
				return true;
			} else if(string == "false" || string == "off" || string == 0){
				return false;
			} else {
				console.warn(`getBooleanFromVar: Unkown boolean (${string})`);
				return string;
			}
			break;
		default:
			console.warn(`getBooleanFromVar: Unknown type to make boolean (${typeof string})`);
	}
}
function translateNodes(locale_document){
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-id]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.getAttribute == "function"){
			node.textContent = _(node.getAttribute("data-translate-id"));
		}
	}
}
function translateNodes_title(locale_document){
	let document = locale_document;
	let translate_nodes = document.querySelectorAll("[data-translate-title]");
	for(let i in translate_nodes){
		let node = translate_nodes[i];
		if(typeof node.getAttribute == "function"){
			node.title = _(node.getAttribute("data-translate-title"));
		}
	}
}
function getValueFromNode(node){
	if(node.type == "checkbox") {
		return node.checked;
	} else if(node.tagName == "input" && node.type == "number"){
		console.log("Number");
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	getPreferences: getPreferences,
	getBooleanFromVar: getBooleanFromVar,
	_: _,
	translateNodes: translateNodes,
	translateNodes_title: translateNodes_title,
	getValueFromNode: getValueFromNode
}

function getCheckDelay(){
	let check_delay_pref = getPreferences('check_delay');
	if(check_delay_pref == "number" && !isNaN(check_delay_pref)){
		return ((check_delay_pref <= 1)? check_delay_pref : 1) * 60000;
	} else {
		return 5 * 60000;
	}
}

let myIconURL = "/data/live_offline.svg";

let websites = ["dailymotion","hitbox","twitch"];
let liveStatus = {};
for(let website of websites){
	liveStatus[website] = {};
}

function streamListFromSetting(website){
	let somethingElseThanSpaces = /[^\s]+/;
	let pref = new String(getPreferences(`${website}_keys_list`));
	this.stringData = pref;
	let obj = {};
	if(pref != "" && somethingElseThanSpaces.test(pref)){
		let myTable = pref.split(",");
		let reg= /\s*([^\s]+)\s*(.*)/;
		let reg_removeSpaces= /\s*([^\s]+)\s*/;
		if(myTable.length > 0){
			for(let i in myTable){
				if(reg.test(myTable[i])){
					let result=reg.exec(myTable[i]);
					obj[result[1]]=result[2];
				} else {
					let somethingElseThanSpaces = /[^\s]+/;
					if(somethingElseThanSpaces.test(myTable[i]) == true){
						obj[reg_removeSpaces.exec(myTable[i])[1]]="";
					}
				}
			}
		}
	}
	this.objData = obj;
	this.website = website;
	this.streamExist = function(id){
		for(let i in this.objData){
			if(i.toLowerCase() == id.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	this.addStream = function(id, url){
		if(this.streamExist(id) == false){
			this.objData[id] = url;
			console.log(`${id} has been added`);
		}
	}
	this.deleteStream = function(id){
		if(this.streamExist(id)){
			delete this.objData[id];
			console.log(`${id} has been deleted`);
		}
	}
	this.update = function(){
		let array = new Array();
		for(let i in this.objData){
			array.push(i + ((this.objData[i] != "")? (" " + this.objData[i]) : ""));
		}
		let newSettings = array.join(",");
		savePreference(`${this.website}_keys_list`, newSettings);
		console.log(`New settings (${this.website}): ${localStorage.getItem(`${this.website}_keys_list`)}`);
	}
}

function getStreamURL(website, id, usePrefUrl){
	var streamList = (new streamListFromSetting(website)).objData;	
	if(streamList[id] != "" && usePrefUrl == true){
		return streamList[id];
	} else {
		if(typeof liveStatus[website][id].streamURL == "string" && liveStatus[website][id].streamURL != ""){
			return liveStatus[website][id].streamURL;
		} else {
			switch(website){
				case "dailymotion":
					return "http://www.dailymotion.com/video/" + id;
					break;
				case "hitbox":
					return "http://www.hitbox.tv/" + id;
					break;
				case "twitch":
					return "http://www.twitch.tv/" + id;
					break;
				default:
					return null;
			}
		}
	}
}

function refreshPanel(data){
	updatePanelData(data.doUpdateTheme);
}
function refreshStreamsFromPanel(){
	checkLives();
	updatePanelData();
	function waitToUpdatePanel(){
		updatePanelData();
		clearInterval(intervalRefreshPanel);
	}
	var intervalRefreshPanel = setInterval(waitToUpdatePanel, 5000);
}
let addStreamFromPanel_pageListener = new Array();

// Source code from: https://stackoverflow.com/a/24026281
let activeTab;
function updateActive(tab) {
	activeTab = tab;
}
function onActivated(info) {
	chrome.tabs.get(info.tabId, updateActive);
}
function onUpdated(info, tab) {
	if (tab.active)
		updateActive(tab);
}
chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	updateActive(tabs[0]);
	chrome.tabs.onActivated.addListener(onActivated);
	chrome.tabs.onUpdated.addListener(onUpdated);
	//chrome.windows.onFocusChanged.addListener()
});

function addStreamFromPanel(embed_list){
	let current_tab = activeTab;
	let active_tab_url = current_tab.url;
	console.info(`Current active tab: ${active_tab_url}`);
	let http_url = /^(?:http|https):\/\//;
	if(!http_url.test(active_tab_url)){
		console.info("Current tab isn't a http/https url");
		return false;
	}
	let active_tab_title = current_tab.title;
	let type;
	let patterns = {"dailymotion": [/^(?:http|https):\/\/games\.dailymotion\.com\/live\/([a-zA-Z0-9]*).*$/, /^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]*).*$/],
					"hitbox": [/^(?:http|https):\/\/www\.hitbox\.tv\/(?:embedchat\/)?([^\/\?\&]*).*$/],
					"twitch": [/^(?:http|https):\/\/www\.twitch\.tv\/([^\/\?\&]*).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]*).*$/]};
	let url_list;
	if(typeof embed_list == "object"){
		url_list = embed_list;
		type = "embed";
	} else {
		url_list = [active_tab_url];
	}
	for(let url of url_list){
		for(let website in patterns){
			let streamListSetting = new streamListFromSetting(website);
			let streamList = streamListSetting.objData;
			for(let pattern of patterns[website]){
				let id = "";
				if(pattern.test(url)){
					id = pattern.exec(url)[1];
					if(streamListSetting.streamExist(id)){
						doNotif("Stream Notifier",`${id} ${_("is_already_configured")}`);
						return true;
					} else {
						let id_toChecked = id;
						let current_API = new API(website, id);
						
						let xhr = new XMLHttpRequest();
						xhr.open('GET', current_API.url, true);
						xhr.overrideMimeType(current_API.overrideMimeType);
						xhr.send();
						
						xhr.addEventListener("load", function(){
							let data = JSON.parse(xhr.responseText);
							
							if(isValidResponse(website, data) == false){
								doNotif("Stream Notifier", `${id} ${_("wasnt_configured_but_not_detected_as_channel")}`);
								return null;
							} else {
								if(getPreferences("confirm_addStreamFromPanel")){
									let addstreamNotifAction = new notifAction("addStream", {id: id, website: website, url: ((type == "embed")? active_tab_url : "")});
									doActionNotif(`Stream Notifier (${_("click_to_confirm")})`, `${id} ${_("wasnt_configured_and_can_be_added")}`, addstreamNotifAction);
								} else {
									streamListSetting.addStream(id, ((type == "embed")? active_tab_url : ""));
									streamListSetting.update();
									doNotif("Stream Notifier", `${id} ${_("wasnt_configured_and_have_been_added")}`);
									// Update the panel for the new stream added
									refreshStreamsFromPanel();
								}
							}
						})
						
						return true;
					}
				}
			}
		}
	}
	if(typeof embed_list != "object"){
		chrome.tabs.executeScript(current_tab.id, {file: "/data/page_getEmbedList.js"});
	} else {
		doNotif("Stream Notifier", _("No_supported_stream_detected_in_the_current_tab_so_nothing_to_add"));
	}
}
function deleteStreamFromPanel(data){
	let streamListSetting = new streamListFromSetting(data.website);
	let streamList = streamListSetting.objData;
	let id = data.id;
	let website = data.website;
	if(streamListSetting.streamExist(id)){
		if(getPreferences("confirm_deleteStreamFromPanel")){
			let deletestreamNotifAction = new notifAction("deleteStream", {id: id, website: website});
			doActionNotif(`Stream Notifier (${_("click_to_confirm")})`, `${id} ${_("will_be_deleted_are_you_sure")}`, deletestreamNotifAction);
		} else {
			delete streamListSetting.objData[id];
			streamListSetting.update();
			doNotif("Stream Notifier", `${id} ${_("has_been_deleted")}`);
			// Update the panel for the new stream added
			refreshStreamsFromPanel();
		}
	}
}

function settingUpdate(settingName, settingValue){
	console.log(settingName + " - " + settingValue);
	savePreference(settingName, settingValue);
}

let port = null;
function sendDataToPanel(id, data){
	if(port == null){
		console.warn("Port to panel not opened");
	} else {
		port.postMessage({"id": id, "data": data});
	}
}

let port_panel_sender = null;
function sendDataToOptionPage(id, data){
	if(port_panel_sender == null){
		console.warn("Port to option page not opened");
	} else {
		port_panel_sender.postMessage({"id": id, "data": data});
	}
}

let port_options = null;
let port_panel = null;
chrome.runtime.onConnect.addListener(function(_port) {
	console.info(`Port (${_port.name}) connected`);
	
	if(_port.name == "Live_Streamer_Panel"){
		port_panel = _port;
		port_panel.onMessage.addListener(function(message, MessageSender){
			//console.assert(port.name);
			console.log(`onMessage (${_port.name}): ${message}`);
			let id = message.id;
			let data = message.data;
			
			switch(id){
				case "refreshPanel":
					refreshPanel(data);
					break;
				case "importStreams":
					let website = message.data;
					console.info(`Importing ${website}...`);
					importButton(website);
					break;
				case "refreshStreams":
					refreshStreamsFromPanel(data);
					break;
				case "addStream":
					addStreamFromPanel(data);
					break;
				case "deleteStream":
					deleteStreamFromPanel(data);
					break;
				case "copyLivestreamerCmd":
					copyLivestreamerCmd(data);
					break;
				case "openOnlineLive":
					openOnlineLive(data);
					break;
				case "openTab":
					openTabIfNotExist(data);
					break;
				case "panel_onload":
					handleChange(data);
					break;
				case "setting_Update":
					settingUpdate(data.settingName, data.settingValue);
					break;
			}
		});
		function openPortToPanel(portName){
			port = chrome.runtime.connect({name: portName});
			console.info(`Port (${portName}) connection initiated`);
			return port;
		}
		port = openPortToPanel("Live_Streamer_Main");
		
		port.onDisconnect.addListener(function(port) {
			console.info(`Port disconnected: ${port.name}`);
			if(port.name == "Live_Streamer_Main"){
				port = null;
			}
		});
		
		port_panel.onDisconnect.addListener(function(port) {
			console.assert(`Port disconnected: ${port.name}`);
			port_panel = null;
		});
	} else if(_port.name == "Live_Streamer_Options"){
		port_options = _port;
		port_options.onMessage.addListener(function(message, MessageSender){
			let data = message.data;
			
			switch(message.id){
				case "importStreams":
					let website = message.data;
					console.info(`Importing ${website}...`);
					importButton(website);
					break;
				case "setting_Update":
					settingUpdate(data.settingName, data.settingValue);
					break;
			}
		});
		
		function openPortToOptionPage(portName){
			port_panel_sender = chrome.runtime.connect({name: portName});
			console.info(`Port (${portName}) connection initiated`);
			return port_panel_sender;
		}
		port_panel_sender = openPortToOptionPage("Live_Streamer_Main");
		
		port_panel_sender.onDisconnect.addListener(function(port) {
			console.info(`Port disconnected: ${port.name}`);
			if(port_panel_sender.name == "Live_Streamer_Main"){
				port_panel_sender = null;
			}
		});

		port_options.onDisconnect.addListener(function(port) {
			console.assert(`Port disconnected: ${port.name}`);
			port_panel = null;
		});
	} else {
		console.info("Unkown port name");
	}
});

function updatePanelData(updateTheme){
	if(typeof updateTheme == "undefined" || updateTheme == true){
		console.log("Sending panel theme data");
		sendDataToPanel("panel_theme", {"theme": getPreferences("panel_theme"), "background_color": getPreferences("background_color")});
	}
	
	//Clear stream list in the panel
	sendDataToPanel("initList", getPreferences("show_offline_in_panel"));
	
	//Update online steam count in the panel
	sendDataToPanel("updateOnlineCount", (onlineCount == 0)? _("No_stream_online") :  _("count_stream_online", onlineCount.toString()) + ":");
	
	if(getPreferences("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		sendDataToPanel("updateOfflineCount", (offlineCount == 0)? _("No_stream_offline") :  _("count_stream_offline", offlineCount.toString()) + ":");
	} else {
		sendDataToPanel("updateOfflineCount", "");
	}
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let i in liveStatus[website]){
			if(i in streamList && (liveStatus[website][i].online || (getPreferences("show_offline_in_panel") && !liveStatus[website][i].online))){
				let streamInfo = {"id": i, "online": liveStatus[website][i].online, "website": website, "streamName": liveStatus[website][i].streamName, "streamStatus": liveStatus[website][i].streamStatus, "streamGame": liveStatus[website][i].streamGame, "streamOwnerLogo": liveStatus[website][i].streamOwnerLogo, "streamCategoryLogo": liveStatus[website][i].streamCategoryLogo, "streamCurrentViewers": liveStatus[website][i].streamCurrentViewers, "streamUrl": getStreamURL(website, i, true)}
				sendDataToPanel("updateData", streamInfo);
			}
		}
	}
	
	let updateSettings = [
		"hitbox_user_id",
		"twitch_user_id",
		"check_delay",
		"notification_type",
		"notify_online",
		"notify_offline",
		"show_offline_in_panel",
		"confirm_addStreamFromPanel",
		"confirm_deleteStreamFromPanel",
		"livestreamer_cmd_to_clipboard",
		"livestreamer_cmd_quality"
	];
	for(let i in updateSettings){
		sendDataToPanel("settingNodesUpdate", {settingName: updateSettings[i], settingValue: getPreferences(updateSettings[i])});
	}
}

function handleChange() {
	setIcon();
	updatePanelData();
}

function copyToClipboard(string){
	
	let copy = function(string){
		let copy_form;
		if(document.querySelector("#copy_form") === null){
			copy_form = document.createElement("textarea");
			copy_form.id = "copy_form";
			copy_form.textContent = string;
			document.querySelector("body").appendChild(copy_form);
		} else {
			copy_form = document.querySelector("#copy_form");
		}
		
		copy_form.focus();
		document.execCommand('SelectAll');
		let clipboard_success = document.execCommand('Copy');
		if(clipboard_success){
			doNotif("Live notifier", _("Livestreamer_command_copied_into_the_clipboard"));
		}
		console.info(`Copied: ${string}`)
		
		copy_form.parentNode.removeChild(copy_form);
	}
	
	chrome.permissions.contains({
		permissions: ['clipboardWrite'],
	}, function(result) {
		if(result){
			copy(string);
		} else {
			console.log("Clipboard writing permission not granted");
			chrome.permissions.request({
				permissions: ['clipboardWrite'],
			}, function(result) {
				if(result){
					copy(string);
				} else {
					console.error("The extension doesn't have the permissions.");
				}
			});
		}
	});
}
function copyLivestreamerCmd(data){
	let cmd = `livestreamer ${getStreamURL(data.website, data.id, false)} ${getPreferences("livestreamer_cmd_quality")}`;
	copyToClipboard(cmd);
}
function openOnlineLive(data){
	openTabIfNotExist(data.streamUrl);
	if(getPreferences("livestreamer_cmd_to_clipboard")){
		copyLivestreamerCmd(data);
	}
}

function openTabIfNotExist(url){
	console.log(url);
	chrome.tabs.query({}, function(tabs) {
		let custom_url = url.toLowerCase().replace(/http(?:s)?\:\/\/(?:www\.)?/i,"");
		for(let tab of tabs){
			if(tab.url.toLowerCase().indexOf(custom_url) != -1){ // Mean the url was already opened in a tab
				chrome.tabs.highlight({tabs: tab.index}); // Show the already opened tab
				return true; // Return true to stop the function as the tab is already opened
			}
		}
		// If the function is still running, it mean that the url isn't detected to be opened, so, we can open it
		let action_url = url;
		chrome.tabs.create({ url: action_url });
		return false; // Return false because the url wasn't already in a tab
	});
}

function doNotif(title, message, imgurl) {
	doActionNotif(title, message, {}, imgurl);
}

function doNotifUrl(title,message,url,imgurl){
	doActionNotif(title, message, new notifAction("openUrl", url), imgurl);
}

function notifAction(type,data){
	this.type = type;
	this.data = data;
}
function doActionNotif(title, message, action, imgurl){
	console.info("Notification (" + ((typeof action.type == "string")? action.type : "Unknown/No action" ) + '): "' + message + '"');
	
	if(getPreferences("notification_type") == "web"){
		let options = {
			body: message,
			icon: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL)
		}
		let notif = new Notification(title, options);
		notif.onclick = function(){
			doActionNotif_onClick(action);
		}
	} else if(getPreferences("notification_type") == "chrome_api"){
		chromeAPINotification(title, message, action, imgurl);
	} else {
		console.warn("Unknown notification type");
	}
}
function doActionNotif_onClick(action){
	let streamListSetting;
	let id;
	if(action.type == "addStream" || action.type == "deleteStream"){
		streamListSetting = new streamListFromSetting(action.data.website);
		id = action.data.id;
	}
	switch(action.type){
		case "openUrl":
			// Notification with openUrl action
			openTabIfNotExist(action.data);
			console.info(`Notification (openUrl): "${message}" (${action.data})`);
			break;
		case "function":
			// Notification with custom function as action
			action.data();
			break;
		case "addStream":
			let url = action.data.url;
			streamListSetting.addStream(id, url);
			streamListSetting.update();
			doNotif("Stream Notifier", `${id} ${_("wasnt_configured_and_have_been_added")}`);
			// Update the panel for the new stream added
			refreshStreamsFromPanel();
			break;
		case "deleteStream":
			delete streamListSetting.objData[id];
			streamListSetting.update();
			doNotif("Stream Notifier", `${id} ${_("has been deleted.")}`);
			// Update the panel for the new stream added
			refreshStreamsFromPanel();
			break;
		default:
			// Nothing - Unknown action
			void(0);
	}
}
function chromeAPINotification(title, message, action, imgurl){
	let options = {
		type: "basic",
		title: title,
		message: message,
		iconUrl: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL),
		isClickable: true,
		buttons: [
			{
				title: "Ok",
				 iconUrl: "/data/ic_done_black_24px.svg"
			}
		]
	}
	
	switch(action.type){
		case "openUrl":
			// Notification with openUrl action
			console.info(`Notification (openUrl): "${message}" (${action.data})`);
			chrome.notifications.create(JSON.stringify(action), options);
			break;
		case "addStream":
			console.info(`Notification (addStream): "${message}" (${action.data})`);
			chrome.notifications.create(JSON.stringify(action), options);
			break;
		case "deleteStream":
			console.info(`Notification (deleteStream): "${message}" (${action.data})`);
			chrome.notifications.create(JSON.stringify(action), options);
			break;
		default:
			chrome.notifications.create(JSON.stringify(new notifAction("none", {})), options);
	}
}
chrome.notifications.onClicked.addListener(function(notificationId){
	console.info(`${notificationId} (onClicked)`);
	chrome.notifications.clear(notificationId);
});
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex){
	console.info(`${notificationId} (onButtonClicked) - Button index: ${buttonIndex}`);
	chrome.notifications.clear(notificationId);
	
	if( typeof notificationId == "string" && notificationId != ""){
		
		let action = JSON.parse(notificationId);
		
		if(typeof action.type == "string"){
			if(action.type == "openUrl"){
				// Notification with openUrl action
				openTabIfNotExist(action.data);
			} else if(action.type == "addStream" || action.type == "deleteStream"){
				let streamListSetting = new streamListFromSetting(action.data.website);
				let id = action.data.id;
				
				if(action.type == "addStream"){
					let url = action.data.url;
					
					console.info(action.data.website);
					
					streamListSetting.addStream(id, url);
					streamListSetting.update();
					// Update the panel for the new stream added
					refreshStreamsFromPanel();
				} else if(action.type == "deleteStream"){
					delete streamListSetting.objData[id];
					streamListSetting.update();
					// Update the panel for the new stream added
					refreshStreamsFromPanel();
				}
			} else {
				// Nothing - Unknown action
				void(0);
			}
		}
	}
});

function doStreamNotif(website,id,isStreamOnline){
	let streamName = liveStatus[website][id].streamName;
	let streamOwnerLogo = liveStatus[website][id].streamOwnerLogo;
	let streamCategoryLogo = liveStatus[website][id].streamCategoryLogo;
	let streamLogo = "";

	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	if(isStreamOnline){
		if(getPreferences("notify_online") && liveStatus[website][id].online == false){
			let streamStatus = liveStatus[website][id].streamStatus + ((liveStatus[website][id].streamGame != "")? (" (" + liveStatus[website][id].streamGame + ")") : "");
			if(streamStatus.length > 0 && streamStatus.length < 60){
				if(streamLogo != ""){
					doNotifUrl(_("Stream_online"), streamName + ": " + streamStatus, getStreamURL(website, id, true), streamLogo);
				} else {
					doNotifUrl(_("Stream_online"), streamName + ": " + streamStatus, getStreamURL(website, id, true));
				}
				
			} else {
				if(streamLogo != ""){
					doNotifUrl(_("Stream_online"), streamName, getStreamURL(website, id, true), streamLogo);
				} else {
					doNotifUrl(_("Stream_online"), streamName, getStreamURL(website, id, true));
				}
			}
		}
	} else {
		if(getPreferences("notify_offline") && liveStatus[website][id].online){
			if(streamLogo != ""){
				doNotif(_("Stream_offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream_offline"),streamName);
			}
		}
	}
	liveStatus[website][id].online = isStreamOnline;
}

function getOfflineCount(){
	var offlineCount = 0;
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let i in liveStatus[website]){
			if(!liveStatus[website][i].online && streamList.hasOwnProperty(i)){
				offlineCount = offlineCount + 1;
			}
		}
	}
	return offlineCount;
}

//Changement de l'icone
let onlineCount;
function setIcon() {
	onlineCount = 0;
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let i in liveStatus[website]){
			if(liveStatus[website][i].online && streamList.hasOwnProperty(i)){
				onlineCount = onlineCount + 1;
			}
		}
	}
	
	if (onlineCount > 0){
		chrome.browserAction.setTitle({title: _("count_stream_online",onlineCount)});
		chrome.browserAction.setIcon({path: "/data/live_online.svg"});
		chrome.browserAction.setBadgeText({text: onlineCount.toString()});
		chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000"});
	}
	else {
		chrome.browserAction.setTitle({title: _("No_stream_online")});
		chrome.browserAction.setIcon({path: "/data/live_offline.svg"});
		chrome.browserAction.setBadgeText({text: onlineCount.toString()});
		chrome.browserAction.setBadgeBackgroundColor({color: "#424242"});
	}
};

function API(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/video/${id}?fields=title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/media/live/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/streams/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function API_second(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/video/${id}?fields=id,user.screenname,game.title,user.avatar_720_url`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		default:
			this.url = null;
			this.overrideMimeType = null;
	}
}
function importAPI(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}/follows/channels`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/following/user?user_name=${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function isValidResponse(website, data){
	if(data == null){
		console.warn("Unable to get stream state (no connection).");
		return false;
	}
	switch(website){
		case "dailymotion":
			if(data.mode != "live"){
				console.warn(`[${website}] Unable to get stream state (not a stream).`);
				return false;
			}
			if(typeof data.error == "object"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
		case "hitbox":
			if(data.error == "live"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
		case "twitch":
			if(data.error == "Not Found"){
				console.warn(`[${website}] Unable to get stream state (error detected).`);
				return false;
			}
			break;
	}
	return true;
}

function checkLives(){
	console.group();
	
	for(let i in websites){
		let website = websites[i];
		let streamList = (new streamListFromSetting(website)).objData;
		
		console.info(`${website}: ${JSON.stringify(streamList)}`);
		
		for(let id in streamList){
			//let request_id = id;
			let current_API = new API(website, id);
			
			//console.time(id);
			
			let xhr = new XMLHttpRequest();
			xhr.open('GET', current_API.url, true);
			xhr.overrideMimeType(current_API.overrideMimeType);
			xhr.send();
			
			xhr.addEventListener("load", function(){
					let data = JSON.parse(xhr.responseText);
					if(isValidResponse(website, data) == false){
						console.timeEnd(id);
						console.groupEnd();
						return null;
					}
					
					console.group();
					console.info(`${website} - ${id} (${current_API.url})`);
					console.dir(data);
					
					if(typeof liveStatus[website][id] == "undefined"){
						liveStatus[website][id] = {"online": false, "streamName": "", "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": ""};
					}
					let liveState = checkLiveStatus[website](id,data);
					if(liveState !== null){
						let second_API = new API_second(website, id);
						
						if(second_API.url !== null && second_API.overrideMimeType !== null){
							let xhr_second = new XMLHttpRequest();
							xhr_second.open('GET', second_API.url, true);
							xhr_second.overrideMimeType(second_API.overrideMimeType);
							xhr_second.send();
							
							xhr_second.addEventListener("load", function(){
								let data_second = JSON.parse(xhr_second.responseText);
								
								console.info(website + " - " + id + " (" + second_API.url + ")");
								console.dir(data_second);
								
								seconderyInfo[website](id,data_second,liveState);
								
								doStreamNotif(website,id,liveState);
								setIcon();
							});
						} else {
							doStreamNotif(website,id,liveState);
						}
					} else {
						console.warn("Unable to get stream state.");
					}
					
					setIcon();
					
					console.timeEnd(id);
					console.groupEnd();
			});
		}
	}
	
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, getCheckDelay());
}

//Fonction principale : check si le live est on
let checkLiveStatus = {
	"dailymotion":
		function(dailymotion_key, data){
			liveStatus["dailymotion"][dailymotion_key].streamName = data.title;
			liveStatus["dailymotion"][dailymotion_key].streamCurrentViewers = JSON.parse(data.audience);
			liveStatus["dailymotion"][dailymotion_key].streamURL = data.url;
			if(typeof data.onair == "boolean"){
				return data.onair;
			} else {
				return null;
			}
		},
	"hitbox":
		function(hitbox_key, data){
			if(data.hasOwnProperty("livestream") == false){
				if(data.error_msg="no_media_found"){
					liveStatus["hitbox"][hitbox_key].online = false;
				}
				liveStatus["hitbox"][hitbox_key].streamName = hitbox_key;
				return null;
			}
			if(typeof data["livestream"][0] == "object"){
				data = data["livestream"][0];
				liveStatus["hitbox"][hitbox_key].streamName = data["media_user_name"];
				liveStatus["hitbox"][hitbox_key].streamStatus = data["media_status"];
				liveStatus["hitbox"][hitbox_key].streamGame = data["category_name"];
				if(data["category_logo_large"] !== null){
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "";
				}
				if(liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "http://edge.sf.hitbox.tv/static/img/generic/blank.gif"){
					liveStatus["hitbox"][hitbox_key].streamCategoryLogo = "";
				}
				if(data.channel["user_logo"] !== null){
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(data["user_logo_small"] !== null){
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					liveStatus["hitbox"][hitbox_key].streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] == "string" && data.channel["channel_link"] != ""){
					liveStatus["hitbox"][hitbox_key].streamURL = data.channel["channel_link"];
				}
				liveStatus["hitbox"][hitbox_key].streamCurrentViewers = JSON.parse(data["media_views"]);
				if(data["media_is_live"] == "1"){
					return true;
				} else {
					return false
				}
			} else {
				return null;
			}
		},
	"twitch":
		function(twitch_key, data){
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				if(data != null){
					liveStatus["twitch"][twitch_key].streamName = data["channel"]["display_name"];
					liveStatus["twitch"][twitch_key].streamStatus = data["channel"]["status"];
					liveStatus["twitch"][twitch_key].streamGame = (data["game"] !== null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						liveStatus["twitch"][twitch_key].streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						liveStatus["twitch"][twitch_key].streamURL = data.channel["url"];
					}
					liveStatus["twitch"][twitch_key].streamCurrentViewers = JSON.parse(data["viewers"]);
					return true;
				} else {
					if(liveStatus["twitch"][twitch_key].streamName == ""){
						liveStatus["twitch"][twitch_key].streamName = twitch_key;
					}
					return false;
				}
			} else {
				return null;
			}
		}
}
let seconderyInfo = {
	"dailymotion":
		function(id,data,isStreamOnline){
			if(data.hasOwnProperty("user.screenname")){
				if(isStreamOnline){
					liveStatus["dailymotion"][id].streamStatus = liveStatus["dailymotion"][id].streamName;
					liveStatus["dailymotion"][id].streamGame = (data["game.title"] !== null && typeof data["game.title"] == "string")? data["game.title"] : "";
				}
				if(typeof data["user.avatar_720_url"] == "string" && data["user.avatar_720_url"] != ""){
					liveStatus["dailymotion"][id].streamOwnerLogo = data["user.avatar_720_url"];
				}
				liveStatus["dailymotion"][id].streamName = data["user.screenname"];
			}
		},
	"twitch":
		function(id,data,isStreamOnline){
			if(typeof data["logo"] == "string" && data["logo"] != ""){
				liveStatus["twitch"][id].streamOwnerLogo = data["logo"];
			}
		}
}

function importButton(website){
	importStreams(website, getPreferences(`${website}_user_id`));
}
function importStreams(website, id, url, pageNumber){
	let current_API = new importAPI(website, id);
	if(typeof url == "string" && url != ""){
		current_API.url = url;
	} else {
		console.time(current_API.id);
	}
	let xhr = new XMLHttpRequest();
	xhr.open('GET', current_API.url, true);
	xhr.overrideMimeType(current_API.overrideMimeType);
	xhr.send();
	
	xhr.addEventListener("load", function(){
		let data = JSON.parse(xhr.responseText);
		
		console.group();
		console.info(`${website} - ${id} (${current_API.url})`);
		console.dir(data);
		
		if(typeof pageNumber == "number"){
			importStreamWebsites[website](id, data, pageNumber);
		} else {
			importStreamWebsites[website](id, data);
		}
		console.groupEnd();
	});
}
function importStreamsEnd(id){
	setIcon();
	console.timeEnd(id);
}
let importStreamWebsites = {
	"twitch": function(id, data){
		let streamListSetting = new streamListFromSetting("twitch");
		let streamList = streamListSetting.objData;
		if(typeof data.follows == "object"){
			for(let item of data.follows){
				streamListSetting.addStream(item["channel"]["display_name"], "");
			}
			streamListSetting.update();
			if(data.follows.length > 0 && typeof data._links.next == "string"){
				importStreams("twitch", id, data._links.next);
			} else {
				importStreamsEnd(id);
			}
		}
	},
	"hitbox": function(id, data, pageNumber){
		let streamListSetting = new streamListFromSetting("hitbox");
		let streamList = streamListSetting.objData;
		if(typeof data.following == "object"){
			for(let item of data.following){
				streamListSetting.addStream(item["user_name"], "");
			}
			streamListSetting.update();
			if(data.following.length > 0){
				let next_url = new importAPI("hitbox", id).url;
				let current_pageNumber = ((typeof pageNumber == "number")? pageNumber : 1);
				importStreams("hitbox", id, next_url + "&offset=" + current_pageNumber, current_pageNumber + 1);
			} else {
				importStreamsEnd(id);
			}
		}
	}
}


//				------ Load / Unload Event(s) ------				//

// Begin to check lives
var interval
checkLives();

// Checking if updated
(function checkIfUpdated(){
	let getVersionNumbers =  /^(\d*)\.(\d*)\.(\d*)$/;
	let last_executed_version = getPreferences("livenotifier_version");
	let current_version = chrome.runtime.getManifest().version;
	
	let last_executed_version_numbers = getVersionNumbers.exec(last_executed_version);
	let current_version_numbers = getVersionNumbers.exec(current_version);
	
	if(last_executed_version != current_version && last_executed_version != "0.0.0"){
		if(current_version_numbers.length == 4 && last_executed_version_numbers.length == 4){
			if(current_version_numbers[1] > last_executed_version_numbers[1]){
				doNotif("Live notifier", _("Addon_have_been_updated"));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] > last_executed_version_numbers[2])){
				doNotif("Live notifier", _("Addon_have_been_updated"));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] == last_executed_version_numbers[2]) && (current_version_numbers[3] > last_executed_version_numbers[3])){
				doNotif("Live notifier", _("Addon_have_been_updated"));
			}
			savePreference("livenotifier_version", current_version);
		}
	}
})();
