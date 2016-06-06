'use strict';

function getPreferences(prefId){
	let defaultSettings = options_default;
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
function savePreference(prefId, value, updatePanel){
	localStorage.setItem(prefId, value);
	if(typeof updatePanel == "undefined" || updatePanel == true){
		if(port_panel_sender !== null){
			sendDataToOptionPage("refreshOptions", {});
		}
		if(port_panel !== null){
			refreshPanel({doUpdateTheme: ((prefId == "background_color" || prefId == "panel_theme")? true : false)});
		}
		let streamListSetting = /^.*_keys_list$/;
		if(streamListSetting.test(prefId)){
			updatePanelData();
			setIcon();
		}
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
		return parseInt(node.value);
	} else if(typeof node.value == "string"){
		return node.value;
	} else {
		console.error("Problem with node trying to get value");
	}
}

function settingNode_onChange(event, node, my_port){
	let setting_Name = node.id;
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

let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	options: options,
	options_default: options_default,
	options_default_sync: options_default_sync,
	getPreferences: getPreferences,
	getBooleanFromVar: getBooleanFromVar,
	_: _,
	translateNodes: translateNodes,
	translateNodes_title: translateNodes_title,
	getValueFromNode: getValueFromNode,
	settingNode_onChange: settingNode_onChange
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

let websites = ["beam","dailymotion","hitbox","twitch"];
let liveStatus = {};
let channelInfos = {};
for(let website of websites){
	liveStatus[website] = {};
	channelInfos[website] = {};
}

function encodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%/g,"%25");
		string = string.replace(/\:/g,"%3A");
		string = string.replace(/,/g,"%2C");
	}
	return string;
}
function decodeString(string){
	if(typeof string != "string"){
		console.warn(`encodeString: wrong type (${typeof string})`);
		return string;
	} else {
		// Using a regexp with g flag, in a replace method let it replace all
		string = string.replace(/%3A/g,":");
		string = string.replace(/%2C/g,",");
		string = string.replace(/%25/g,"%");
	}
	return string;
}
class streamListFromSetting{
	constructor(website){
		let somethingElseThanSpaces = /[^\s]+/;
		let pref = this.stringData = new String(getPreferences(`${website}_keys_list`));
		
		let obj = {};
		if(pref != "" && somethingElseThanSpaces.test(pref)){
			let myTable = pref.split(",");
			let reg= /\s*([^\s]+)\s*(.*)?/;
			if(myTable.length > 0){
				for(let i in myTable){
					let url = /((?:http|https):\/\/.*)\s*$/;
					let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
					let cleanEndingSpace = /(.*)\s+$/;
					
					let result=reg.exec(myTable[i]);
					let id = result[1];
					let data = result[2];
					
					obj[id] = {hide: false, ignore: false, notifyOnline: getPreferences("notify_online"), notifyOffline: getPreferences("notify_offline"), streamURL: ""};
					
					if(typeof data != "undefined"){
						if(url.test(data) == true){
							let url_result = url.exec(data);
							obj[id].streamURL = url_result[1];
							data = data.replace(url_result[0],"");
						}
						
						if(filters.test(data)){
							let filters_array = new Array();
							
							let filter_id = /(?:(\w+)\:\:)/;
							let scan_string = data;
							while(filter_id.test(scan_string) == true){
								let current_filter_result = scan_string.match(filter_id);
								
								let current_filter_id = current_filter_result[1];
								
								scan_string = scan_string.substring(current_filter_result.index+current_filter_result[0].length, scan_string.length);
								
								let next_filter_result = scan_string.match(filter_id);
								let next_pos = (next_filter_result !== null)? next_filter_result.index : scan_string.length;
								
								let current_data;
								if(next_filter_result !== null){
									current_data = scan_string.substring(current_filter_result.index, next_filter_result.index);
								} else {
									current_data = scan_string.substring(current_filter_result.index, scan_string.length);
								}
								if(cleanEndingSpace.test(current_data)){
									current_data = cleanEndingSpace.exec(current_data)[1];
								}
								
								if(typeof obj[id][current_filter_id] == "undefined"){
									obj[id][current_filter_id] = new Array();
								}
								
								if(current_filter_id == "hide" || current_filter_id == "ignore" || current_filter_id == "notifyOnline" || current_filter_id == "notifyOffline"){
									let boolean = getBooleanFromVar(current_data);
									if(typeof boolean == "boolean"){
										current_data = boolean;
									} else {
										console.warn(`${current_filter_id} of ${id} should be a boolean`);
									}
									obj[id][current_filter_id] = current_data;
								} else if(current_filter_id == "facebook" || current_filter_id == "twitter"){
									obj[id][current_filter_id] = decodeString(current_data);
								}else {
									obj[id][current_filter_id].push(decodeString(current_data));
								}
								scan_string = scan_string.substring(next_pos, scan_string.length);
							}
						}
					}
				}
			}
		}
		this.objData = obj;
		this.website = website;
	}
	
	streamExist(id){
		for(let i in this.objData){
			if(i.toLowerCase() == id.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	
	addStream(id, url){
		if(this.streamExist(id) == false){
			this.objData[id] = {streamURL: url};
			console.log(`${id} has been added`);
			
			try{
				getPrimary(id, this.website, id);
			}
			catch(error){
				console.warn(`[Live notifier] ${error}`);
			}
		}
	}
	deleteStream(id){
		if(this.streamExist(id)){
			delete this.objData[id];
			console.log(`${id} has been deleted`);
		}
	}
	update(){
		let array = new Array();
		for(let id in this.objData){
			let filters = "";
			for(let j in this.objData[id]){
				if(j != "streamURL"){
					if(typeof this.objData[id][j] == "object" && JSON.stringify(this.objData[id][j]) == "[null]"){
						continue;
					}
					if((j == "facebook" || j == "twitter") && this.objData[id][j] == ""){
						continue;
					}
					if((j == "hide" || j == "ignore") && this.objData[id][j] == false){
						continue;
					}
					if(j == "notifyOnline" && this.objData[id][j] == getPreferences("notify_online")){
						continue;
					}
					if(j == "notifyOffline" && this.objData[id][j] == getPreferences("notify_offline")){
						continue;
					}
					if(typeof this.objData[id][j] == "boolean"){
						filters = filters + " " + j + "::" + this.objData[id][j];
					}
					if(j == "facebook" || j == "twitter"){
						filters = filters + " " + j + "::" + encodeString(this.objData[id][j]);
					} else {
						for(let k in this.objData[id][j]){
							filters = filters + " " + j + "::" + encodeString(this.objData[id][j][k]);
						}
					}
				}
			}
			
			let URL = (typeof this.objData[id].streamURL != "undefined" && this.objData[id].streamURL != "")? (" " + this.objData[id].streamURL) : "";
			
			array.push(`${id}${filters}${URL}`);
		}
		let newSettings = array.join(",");
		savePreference(`${this.website}_keys_list`, newSettings);
		console.log(`New settings (${this.website}): ${localStorage.getItem(`${this.website}_keys_list`)}`);
	}
}

function getStreamURL(website, id, contentId, usePrefUrl){
	var streamList = (new streamListFromSetting(website)).objData;
	
	let streamData = liveStatus[website][id][contentId];
	
	if(id in streamList){
		if(streamList[id].streamURL != "" && usePrefUrl == true){
			return streamList[id].streamURL;
		} else {
			if(typeof liveStatus[website][id][contentId] != "undefined"){
				if(typeof streamData.streamURL == "string" && streamData.streamURL != ""){
					return streamData.streamURL;
				}
			}
			if(typeof channelInfos[website][id] != "undefined"){
				if(typeof channelInfos[website][id].streamURL == "string" && channelInfos.streamURL != ""){
						return channelInfos[website][id].streamURL
				}
			}
			switch(website){
				case "dailymotion":
					return `http://www.dailymotion.com/video/${id}`;
					break;
				case "hitbox":
					return `http://www.hitbox.tv/${id}`;
					break;
				case "twitch":
					return `http://www.twitch.tv/${id}`;
					break;
				case "beam":
					return `https://beam.pro/${id}`;
					break;
				default:
					return null;
			}
		}
	}
}

function refreshPanel(data){
	let doUpdateTheme = false;
	if(typeof data != "undefined"){
		if(typeof data.doUpdateTheme != "undefined"){
			doUpdateTheme = data.doUpdateTheme;
		}
	}
	updatePanelData();
}
function refreshStreamsFromPanel(){
	checkLives();
	updatePanelData();
	function waitToUpdatePanel(){
		updatePanelData();
	}
	setTimeout(waitToUpdatePanel, 5000);
}
let addStreamFromPanel_pageListener = new Array();

let addStream_URLpatterns = {"dailymotion": [/^(?:http|https):\/\/games\.dailymotion\.com\/(?:live|video)\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/www\.dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+).*$/, /^(?:http|https):\/\/games\.dailymotion\.com\/[^\/]+\/v\/([a-zA-Z0-9]+).*$/],
		"channel::dailymotion": [/^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/user\/([^\s\t\/]+).*$/, /^(?:http|https):\/\/(?:games\.|www\.)dailymotion\.com\/(?!user\/|monetization\/|archived\/|fr\/|en\/|legal\/|stream|rss)([^\s\t\/]+).*$/],
		"hitbox": [/^(?:http|https):\/\/www\.hitbox\.tv\/(?:embedchat\/)?([^\/\?\&]+).*$/],
		"twitch": [/^(?:http|https):\/\/www\.twitch\.tv\/([^\/\?\&]+).*$/,/^(?:http|https):\/\/player\.twitch\.tv\/\?channel\=([\w\-]+).*$/],
		"beam": [/^(?:http|https):\/\/beam\.pro\/([^\/\?\&]+)/]
	};
let addStream_URLpatterns_strings = {"dailymotion": ["*://games.dailymotion.com/live/*", "*://games.dailymotion.com/video/*", "*://www.dailymotion.com/video/*", "*://www.dailymotion.com/live/*", "*://games.dailymotion.com/v/.*"],
		"channel::dailymotion": ["*://www.dailymotion.com/*", "*://games.dailymotion.com/*"],
		"hitbox": ["*://www.hitbox.tv/*"],
		"twitch": ["*://www.twitch.tv/*","*://player.twitch.tv/?channel=*"],
		"beam": ["*://beam.pro/*"]
	};
let URLContext_Array = new Array();
for(let website in addStream_URLpatterns_strings){
	URLContext_Array = URLContext_Array.concat(addStream_URLpatterns_strings[website]);
}
chrome.contextMenus.create({
	"title": _("Add_this"),
	"contexts": ["link"],
	"targetUrlPatterns": URLContext_Array,
	"onclick": function(info, tab){
		activeTab = tab;
		let data = info.linkUrl;
		console.info(`[ContextMenu] URL: ${data}`);
		addStreamFromPanel({"ContextMenu_URL": data});
	}
});
function display_id(id){
	if(website_channel_id.test(id)){
		return _("The_channel", website_channel_id.exec(id)[1]);
	} else {
		return _("The_stream", id);
	}
}
let activeTab;
function addStreamFromPanel(data){
	let current_tab = activeTab;
	let active_tab_url = current_tab.url;
	
	let http_url = /^(?:http|https):\/\//;
	if(!http_url.test(active_tab_url)){
		console.info("Current tab isn't a http/https url");
		return false;
	}
	let active_tab_title = current_tab.title;
	let type;
	let url_list;

	if(typeof data == "object"){
		console.dir(data);
		if(data.hasOwnProperty("ContextMenu_URL")){
			url_list = [data.ContextMenu_URL];
			type = "ContextMenu";
		} else if(data.hasOwnProperty("embed_list")){
			console.log("[Live notifier] AddStream - Embed list");
			url_list = data.embed_list;
			type = "embed";
		}
	} else {
		console.info("Current active tab: " + active_tab_url);
		url_list = [active_tab_url];
	}
	for(let url of url_list){
		for(let source_website in addStream_URLpatterns){
			let website = source_website;
			if(website_channel_id.test(source_website)){
				website = website_channel_id.exec(source_website)[1];
			}
			
			let streamListSetting = new streamListFromSetting(website);
			let streamList = streamListSetting.objData;
			for(let pattern of addStream_URLpatterns[source_website]){
				let id = "";
				if(pattern.test(url)){
					id = pattern.exec(url)[1];
					if(streamListSetting.streamExist(id)){
						doNotif("Live notifier",`${display_id(id)} ${_("is_already_configured")}`);
						return true;
					} else {
						let id_toChecked = id;
						let current_API = new API(website, id);
						
						if(website_channel_id.test(source_website)){
							current_API = new API_channelInfos(website, `channel::${id}`);
						}
						
						let xhr = new XMLHttpRequest();
						xhr.open('GET', current_API.url, true);
						xhr.overrideMimeType(current_API.overrideMimeType);
						xhr.send();
						
						xhr.addEventListener("load", function(){
							let data = JSON.parse(xhr.responseText);
							
							console.group()
							console.info(`${website} - ${current_API.url}`);
							console.dir(data);
							console.groupEnd();
							
							if(isValidResponse(website, data) == false){
								if(website == "dailymotion" && (website_channel_id.test(source_website) || data.mode == "vod")){
									let username = (data.mode == "vod")? data["user.username"] : data.username;
									let id_username = `channel::${username}`;
									let id_owner = `channel::${(data.mode == "vod")? data.owner : data.id}`;
									
									// Use username (login) as channel id
									id = id_username;
									if(streamListSetting.streamExist(id_username) || streamListSetting.streamExist(id_owner)){
										doNotif("Live notifier",`${display_id(id)} ${_("is_already_configured")}`);
										return true;
									}
								} else {
									doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_but_not_detected_as_channel")}`);
									return null;
								}
							}
							if(getPreferences("confirm_addStreamFromPanel")){
								let addstreamNotifAction = new notifAction("addStream", {id: id, website: website, url: ((type == "embed")? active_tab_url : "")});
								doActionNotif(`Live notifier (${_("click_to_confirm")})`, `${display_id(id)} ${_("wasnt_configured_and_can_be_added")}`, addstreamNotifAction);
							} else {
								streamListSetting.addStream(id, ((type == "embed")? active_tab_url : ""));
								streamListSetting.update();
								doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_and_have_been_added")}`);
								// Update the panel for the new stream added
								setTimeout(function(){
									refreshPanel(false);
								}, 5000);
							}
						})
						
						return true;
					}
				}
			}
		}
	}
	if(typeof data != "object" && type != "ContextMenu"){
		if(!data.hasOwnProperty("embed_list")){
			chrome.tabs.executeScript(current_tab.id, {file: "/data/page_getEmbedList.js"});
		}
	} else {
		doNotif("Live notifier", _("No_supported_stream_detected_in_the_current_tab_so_nothing_to_add"));
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
			doActionNotif(`Live notifier (${_("click_to_confirm")})`, `${display_id(id)} ${_("will_be_deleted_are_you_sure")}`, deletestreamNotifAction);
		} else {
			delete streamListSetting.objData[id];
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("has_been_deleted")}`);
			// Update the panel for the new stream added
			refreshPanel();
		}
	}
}

function settingUpdate(data){
	let settingName = data.settingName;
	let settingValue = data.settingValue;
	
	let updatePanel = true;
	if(typeof data.updatePanel != "undefined"){
		updatePanel = data.updatePanel;
	}
	
	console.log(`${settingName} - ${settingValue} (Update panel: ${updatePanel})`);
	savePreference(settingName, settingValue, updatePanel);
}

function shareStream(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	
	let streamList = (new streamListFromSetting(website)).objData;
	
	let streamData = liveStatus[website][id][contentId];
	let streamName = streamData.streamName;
	let streamURL = getStreamURL(website, id, contentId, true);
	let streamStatus = streamData.streamStatus;
	
	let facebookID = (typeof streamList[id].facebook == "string" && streamList[id].facebook != "")? streamList[id].facebook : streamData.twitterID;
	let twitterID = (typeof streamList[id].twitter == "string" && streamList[id].twitter != "")? streamList[id].twitter : streamData.twitterID;
	
	let streamerAlias = streamName;
	/*
	if(facebookID != null && facebookID != ""){
		
	}*/
	let reg_testTwitterId= /\s*@(.+)/;
	if(twitterID != null && twitterID != ""){
		streamerAlias = ((reg_testTwitterId.test(twitterID))? "" : "@") + twitterID;
		console.info(`${id}/${contentId} (${website}) twitter ID: ${twitterID}`);
	}
	
	let shareMessage = `${_("I_am_watching_the_stream_of")} ${streamerAlias}, "${streamStatus}"`;
	
	let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}&hashtags=LiveNotifier${(twitterID != "")? `&related=${twitterID}` : ""}`;
	//let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}${(twitterID != "")? `&related=${twitterID}` : ""}&via=LiveNotifier`;
	chrome.tabs.create({ "url": url });
}

function streamSetting_Update(data){
	let website = data.website;
	let id = data.id;
	let contentId = data.contentId;
	
	let streamSettingsData = data.streamSettingsData;
	
	let streamListSetting = new streamListFromSetting(website);
	let streamList = streamListSetting.objData;
	
	for(let i in streamSettingsData){
		streamList[id][i] = streamSettingsData[i];
	}
	streamListSetting.update();
}

let port = null;
function sendDataToPanel(id, data){
	if(port == null){
		console.info("Port to panel not opened");
	} else {
		try{
			port.postMessage({"id": id, "data": data});
		}
		catch(err){
			console.info(`Port to panel not opened or disconnect (${err})`);
		}
	}
}

let port_panel_sender = null;
function sendDataToOptionPage(id, data){
	if(port_panel_sender == null){
		console.info("Port to option page not opened");
	} else {
		try{
			port_panel_sender.postMessage({"id": id, "data": data});
		}
		catch(err){
			console.info(`Port to option page not opened or disconnect (${err})`);
		}
	}
}

let port_options = null;
let port_panel = null;
chrome.runtime.onConnect.addListener(function(_port) {
	console.info(`Port (${_port.name}) connected`);
	
	if(_port.name == "Live_Streamer_Panel"){
		port_panel = _port;
		port_panel.onMessage.addListener(function(message, MessageSender){
			console.group();
			//console.assert(port.name);
			console.log(`onMessage (${_port.name}): ${message}`);
			console.dir(message);
			console.groupEnd();
			
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
					// Make sure to have up-to-date active tab AND its url
					chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
						activeTab = tabs[0];
						addStreamFromPanel(data);
					});
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
					settingUpdate(data);
					break;
				case "shareStream":
					shareStream(data);
					break;
				case "streamSetting_Update":
					streamSetting_Update(data);
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
					settingUpdate(data);
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
	} else if(_port.name == "Live_Streamer_Embed"){
		let port_embed = _port;
		port_embed.onMessage.addListener(function(message, MessageSender){
			let data = message.data;
			
			switch(message.id){
				case "addStream":
					addStreamFromPanel(data);
					break;
			}
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
	sendDataToPanel("initList", {"group_streams_by_websites": getPreferences("group_streams_by_websites"), "show_offline_in_panel": getPreferences("show_offline_in_panel")});
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			// Make sure that the stream from the status is still in the settings
			if(id in streamList){
				if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
					console.info(`[Live notifier - Panel] Ignoring ${id}`);
					continue;
				}
				if(typeof streamList[id].hide == "boolean" && streamList[id].hide == true){
					console.info(`[Live notifier - Panel] Hiding ${id}`);
					continue;
				}
				
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					let streamData = channelInfos[website][id];
					let contentId = id;
					
					console.info(`No data found, using channel infos: ${id} (${website})`);
					
					let streamInfo = {
						id: id,
						type: "channel",
						contentId: contentId,
						online: streamData.online,
						website: website,
						streamName: streamData.streamName,
						streamStatus: streamData.streamStatus,
						streamGame: streamData.streamGame,
						streamOwnerLogo: streamData.streamOwnerLogo,
						streamCategoryLogo: streamData.streamCategoryLogo,
						streamCurrentViewers: streamData.streamCurrentViewers,
						streamUrl: getStreamURL(website, id, contentId, true),
						facebookID: streamData.facebookID,
						twitterID: streamData.twitterID
					}
					streamInfo.streamSettings = streamList[id];
					
					sendDataToPanel("updateData", streamInfo);
				} else {
					for(let contentId in liveStatus[website][id]){
						let streamData = liveStatus[website][id][contentId];
						
						getCleanedStreamStatus(website, id, contentId, streamList[id], streamData.online);
						
						if(streamData.online_cleaned || (getPreferences("show_offline_in_panel") && !streamData.online_cleaned)){
							let streamInfo = {
								id: id,
								type: "live",
								contentId: contentId,
								online: streamData.online_cleaned,
								website: website,
								streamName: streamData.streamName,
								streamStatus: streamData.streamStatus,
								streamGame: streamData.streamGame,
								streamOwnerLogo: streamData.streamOwnerLogo,
								streamCategoryLogo: streamData.streamCategoryLogo,
								streamCurrentViewers: streamData.streamCurrentViewers,
								streamUrl: getStreamURL(website, id, contentId, true),
								facebookID: streamData.facebookID,
								twitterID: streamData.twitterID
							}
							streamInfo.streamSettings = streamList[id];
							
							sendDataToPanel("updateData", streamInfo);
						}
					}
				}
			}
		}
	}
	
	setIcon();
	
	//Update online steam count in the panel
	sendDataToPanel("updateOnlineCount", (onlineCount == 0)? _("No_stream_online") :  _("count_stream_online", onlineCount.toString()));
	
	if(getPreferences("show_offline_in_panel")){
		var offlineCount = getOfflineCount();
		sendDataToPanel("updateOfflineCount", (offlineCount == 0)? _("No_stream_offline") :  _("count_stream_offline", offlineCount.toString()));
	} else {
		sendDataToPanel("updateOfflineCount", "");
	}
	
	let updateSettings = [
		"dailymotion_user_id",
		"hitbox_user_id",
		"twitch_user_id",
		"beam_user_id",
		"check_delay",
		"notification_type",
		"notify_online",
		"notify_offline",
		"group_streams_by_websites",
		"show_offline_in_panel",
		"confirm_addStreamFromPanel",
		"confirm_deleteStreamFromPanel",
		"livestreamer_cmd_to_clipboard",
		"livestreamer_cmd_quality"
	];
	for(let i in updateSettings){
		sendDataToPanel("settingNodesUpdate", {settingName: updateSettings[i], settingValue: getPreferences(updateSettings[i])});
	}
	
	if(current_version != ""){
		sendDataToPanel("current_version", {"current_version": current_version});
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
	let cmd = `livestreamer ${getStreamURL(data.website, data.id, data.contentId, false)} ${getPreferences("livestreamer_cmd_quality")}`;
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
			doActionNotif_onClick(action, message);
		}
	} else if(getPreferences("notification_type") == "chrome_api"){
		chromeAPINotification(title, message, action, imgurl);
	} else {
		console.warn("Unknown notification type");
	}
}
function doActionNotif_onClick(action, message){
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
			doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_and_have_been_added")}`);
			// Update the panel for the new stream added
			setTimeout(function(){
				refreshPanel(false);
			}, 5000);
			break;
		case "deleteStream":
			delete streamListSetting.objData[id];
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("has been deleted.")}`);
			// Update the panel for the new stream added
			refreshPanel(false);
			break;
		default:
			// Nothing - Unknown action
			void(0);
	}
}
let chromeAPI_button_availability = true;
function chromeAPINotification(title, message, action, imgurl){
	let options = {
		type: "basic",
		title: title,
		message: message,
		iconUrl: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL),
		isClickable: true
	}
	if(chromeAPI_button_availability == true){
		options.buttons = [
				{
					title: "Ok",
					iconUrl: "/data/ic_done_black_24px.svg"
				}
			]
	}
	
	let notification_id = "";
	switch(action.type){
		case "openUrl":
			// Notification with openUrl action
			console.info(`Notification (openUrl): "${message}" (${action.data})`);
			notification_id = JSON.stringify(action);
			break;
		case "addStream":
			console.info(`Notification (addStream): "${message}" (${action.data})`);
			notification_id = JSON.stringify(action);
			break;
		case "deleteStream":
			console.info(`Notification (deleteStream): "${message}" (${action.data})`);
			notification_id = JSON.stringify(action);
			break;
		default:
			notification_id = JSON.stringify(new notifAction("none", {}));
	}
	chrome.notifications.create(notification_id, options, function(notificationId){
		if(typeof chrome.runtime.lastError == "object" && typeof chrome.runtime.lastError.message == "string" && chrome.runtime.lastError.message.length > 0){
			let error = chrome.runtime.lastError.message;
			
			console.warn(chrome.runtime.lastError.message);
			
			if(error == "Adding buttons to notifications is not supported."){
				chromeAPI_button_availability = false;
				console.log("Buttons not supported, retying notification without them.")
				chromeAPINotification(title, message, action, imgurl);
			}
		}
	});
}
chrome.notifications.onClicked.addListener(function(notificationId){
	console.info(`${notificationId} (onClicked)`);
	chrome.notifications.clear(notificationId);
});
function doNotificationAction_Event(notificationId){
	if(typeof notificationId == "string" && notificationId != ""){
		
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
					setTimeout(function(){
						refreshPanel(false);
					}, 5000);
				} else if(action.type == "deleteStream"){
					delete streamListSetting.objData[id];
					streamListSetting.update();
					// Update the panel for the new stream added
					refreshPanel();
				}
			} else {
				// Nothing - Unknown action
				void(0);
			}
		}
	}
}
chrome.notifications.onClosed.addListener(function(notificationId, byUser){
	console.info(`${notificationId} (onClosed) - byUser: ${byUser}`);
	chrome.notifications.clear(notificationId);
	
	if(!chromeAPI_button_availability && byUser == true){
		doNotificationAction_Event(notificationId);
	}
});
chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex){
	console.info(`${notificationId} (onButtonClicked) - Button index: ${buttonIndex}`);
	chrome.notifications.clear(notificationId);
	
	doNotificationAction_Event(notificationId);
});

function getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline){
	let streamData = liveStatus[website][id][contentId];
	
	if(streamData.streamStatus != ""){
		let lowerCase_status = (streamData.streamStatus).toLowerCase();
		if(isStreamOnline && streamSetting.statusWhitelist){
			let statusWhitelist = streamSetting.statusWhitelist;
			let whitelisted = false;
			for(let i in statusWhitelist){
				if(lowerCase_status.indexOf(statusWhitelist[i].toLowerCase()) != -1){
					whitelisted = true;
					break;
				}
			}
			if(whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current status does not contain whitelist element(s)`);
			}
		}
		if(isStreamOnline && streamSetting.statusBlacklist){
			let statusBlacklist = streamSetting.statusBlacklist;
			let blacklisted = false;
			for(let i in statusBlacklist){
				if(lowerCase_status.indexOf(statusBlacklist[i].toLowerCase()) != -1){
					blacklisted = true;
				}
			}
			if(blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current status contain blacklist element(s)`);
			}
		}
	}
	if(typeof streamData.streamGame == "string" && streamData.streamGame != ""){
		let lowerCase_streamGame = (streamData.streamGame).toLowerCase();
		if(isStreamOnline && streamSetting.gameWhitelist){
			let gameWhitelist = streamSetting.gameWhitelist;
			let whitelisted = false;
			for(let i in gameWhitelist){
				if(lowerCase_streamGame.indexOf(gameWhitelist[i].toLowerCase()) != -1){
					whitelisted = true;
					break;
				}
			}
			if(whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current game does not contain whitelist element(s)`);
			}
		}
		if(isStreamOnline && streamSetting.gameBlacklist){
			let gameBlacklist = streamSetting.gameBlacklist;
			let blacklisted = false;
			for(let i in gameBlacklist){
				if(lowerCase_streamGame.indexOf(gameBlacklist[i].toLowerCase()) != -1){
					blacklisted = true;
				}
			}
			if(blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current game contain blacklist element(s)`);
			}
		}
	}
	streamData.online_cleaned = isStreamOnline;
	return isStreamOnline;
}

function doStreamNotif(website, id, contentId, streamSetting, isStreamOnline){
	let streamList = (new streamListFromSetting(website)).objData;
	let streamData = liveStatus[website][id][contentId];
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";

	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	let isStreamOnline_cleaned = getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline);
	
	if(isStreamOnline_cleaned){
		if(((typeof streamList[id].notifyOnline == "boolean")? streamList[id].notifyOnline : getPreferences("notify_online")) == true && streamData.notificationStatus == false){
			let streamStatus = streamData.streamStatus + ((streamData.streamGame != "")? (" (" + streamData.streamGame + ")") : "");
				if(streamLogo != ""){
					doNotifUrl(_("Stream_online"), streamName + ": " + streamStatus, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream_online"), streamName + ": " + streamStatus, getStreamURL(website, id, contentId, true));
				}
		}
	} else {
		if(((typeof streamList[id].notifyOffline == "boolean")? streamList[id].notifyOffline : getPreferences("notify_offline")) == true && streamData.notificationStatus == true){
			if(streamLogo != ""){
				doNotif(_("Stream_offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream_offline"),streamName);
			}
		}
	}
	streamData.notificationStatus = isStreamOnline;
}

function getOfflineCount(){
	var offlineCount = 0;
	
	for(let i in websites){
		let website = websites[i];
		let streamList = (new streamListFromSetting(website)).objData;
		
		for(let id in streamList){
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				// Ignoring stream with ignore set to true from online count
				console.log(`[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				continue;
			}
			
			if(id in liveStatus[website]){
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					offlineCount = offlineCount + 1;
				} else {
					for(let contentId in liveStatus[website][id]){
						if(!liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
							offlineCount = offlineCount + 1;
						}
					}
				}
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
		for(let id in liveStatus[website]){
			if(id in streamList && (typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true)){
				// Ignoring stream with ignore set to true from online count
				console.log(`[Live notifier - setIcon] ${id} of ${website} is ignored`);
				continue;
			} else {
				for(let contentId in liveStatus[website][id]){
					if(liveStatus[website][id][contentId].online_cleaned && streamList.hasOwnProperty(id)){
						onlineCount = onlineCount + 1;
					}
				}
			}
		}
	}
	
	if(online_badgeData == null || offline_badgeData == null){
		console.info("Icon(s) not loaded");
		loadBadges();
	} else {
		if (onlineCount > 0){
			chrome.browserAction.setTitle({title: _("count_stream_online",onlineCount)});
			
			chrome.browserAction.setIcon({
				imageData: online_badgeData
			});
			//chrome.browserAction.setIcon({path: "/data/live_online.svg"});
			
			chrome.browserAction.setBadgeText({text: onlineCount.toString()});
			chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000"});
		} else {
			chrome.browserAction.setTitle({title: _("No_stream_online")});
			
			chrome.browserAction.setIcon({
				imageData: offline_badgeData
			});
			//chrome.browserAction.setIcon({imageData: "/data/live_offline.svg"});
			
			chrome.browserAction.setBadgeText({text: onlineCount.toString()});
			chrome.browserAction.setBadgeBackgroundColor({color: "#424242"});
		}
	}
};

let website_channel_id = /channel\:\:(.*)/;
let facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/;
let twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;
function API(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			if(website_channel_id.test(id)){
				this.url = `https://api.dailymotion.com/videos?live_onair&owners=${website_channel_id.exec(id)[1]}&fields=id,title,owner,audience,url,mode,onair?_= ${new Date().getTime()}`;
			} else {
				this.url = `https://api.dailymotion.com/video/${id}?fields=title,owner,user.username,audience,url,mode,onair?_=${new Date().getTime()}`;
			}
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/media/live/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/streams/${id}`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8"; //"text/plain; charset=utf-8";
			break;
		case "beam":
			this.url = `https://beam.pro/api/v1/channels/${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function API_channelInfos(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/user/${website_channel_id.exec(id)[1]}?fields=id,username,screenname,url,avatar_720_url,facebook_url,twitter_url`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		default:
			this.url = null;
			this.overrideMimeType = null;
	}
}
function API_second(website, id){
	this.id = id;
	this.url = "";
	this.overrideMimeType = "";
	
	switch(website){
		case "dailymotion":
			this.url = `https://api.dailymotion.com/video/${id}?fields=id,user.screenname,game.title,user.avatar_720_url,user.facebook_url,user.twitter_url`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8"; //"text/plain; charset=utf-8";
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
		case "dailymotion":
			this.url = `https://api.dailymotion.com/user/${id}/following?fields=id,username,facebook_url,twitter_url?_=${new Date().getTime()}`;
			this.overrideMimeType = "text/plain; charset=latin1";
			break;
		case "hitbox":
			this.url = `https://api.hitbox.tv/following/user?user_name=${id}`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
		case "twitch":
			this.url = `https://api.twitch.tv/kraken/users/${id}/follows/channels`;
			this.overrideMimeType = "application/vnd.twitchtv.v3+json; charset=utf-8";
			break;
		case "beam":
			this.url = `https://beam.pro/api/v1/users/${id}/follows?limit=-1&fields=id,token`;
			this.overrideMimeType = "text/plain; charset=utf-8";
			break;
	}
}
function isValidResponse(website, data){
	if(data == null || typeof data != "object" || JSON.stringify == "{}"){
		console.warn("Unable to get stream state (no connection).");
		return false;
	}
	switch(website){
		case "dailymotion":
			if(data.mode != "live" && typeof data.list == "undefined"){
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
			if(data.error == true){
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
		case "beam":
			if(data == "Channel not found." || data.statusCode == 404){
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
		
		console.group();
		console.info(website);
		console.dir(streamList);
		console.groupEnd();
		//console.info(`${website}: ${JSON.stringify(streamList)}`);
		
		for(let id in streamList){
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				console.info(`Ignoring ${id}`);
				continue;
			}
			getPrimary(id, website, streamList[id]);
		}
	}
	
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, getCheckDelay());
}

function getPrimary(id, website, streamSetting, url, pageNumber){
	//let request_id = id;
	let current_API = new API(website, id);
	if(typeof url == "string"){
		current_API.url = url;
	}
	
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
				liveStatus[website][id] = {};
			}
			
			if(website_channel_id.test(id)){
				if(typeof pageNumber == "number"){
					pagingPrimary[website](id, website, streamSetting, data, pageNumber)
				} else {
					pagingPrimary[website](id, website, streamSetting, data)
				}
			} else {
				processPrimary(id, id, website, streamSetting, data);
			}
	});
}

function pagingPrimaryEnd(id){
	setIcon();
	console.timeEnd(id);
	console.groupEnd();
}
let pagingPrimary = {
	"dailymotion":
		function(id, website, streamSetting, data, pageNumber){
			let list = data.list;
			
			if(data.total == 0){
				getChannelInfo(website, id);
				pagingPrimaryEnd(id);
			} else {
				for(let i in list){
					let contentId = list[i].id;
					processPrimary(id, contentId, website, streamSetting, list[i]);
				}
				
				if(data.has_more){
					let next_url = (new API(website, website_channel_id.exec(id)[1])).url;
					let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
					getPrimary(id, website, streamSetting, next_url + "&page=" + next_page_number, next_page_number);
				} else {
					pagingPrimaryEnd(id);
				}
			}
		}
}

function processPrimary(id, contentId, website, streamSetting, data){
	if(typeof liveStatus[website][id][contentId] == "undefined"){
		liveStatus[website][id][contentId] = {"online": false, "notificationStatus": false, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	let liveState = checkLiveStatus[website](id, contentId, data);
	if(liveState !== null){
		//let second_API = new API_second(website, id);
		let second_API = new API_second(website, contentId);
		
		if(second_API.url !== null && second_API.overrideMimeType !== null){
			let xhr_second = new XMLHttpRequest();
			xhr_second.open('GET', second_API.url, true);
			xhr_second.overrideMimeType(second_API.overrideMimeType);
			xhr_second.send();
			
			xhr_second.addEventListener("load", function(){
				let data_second = JSON.parse(xhr_second.responseText);
				
				console.info(website + " - " + id + " (" + second_API.url + ")");
				console.dir(data_second);
				
				seconderyInfo[website](id, contentId, data_second, liveState);
				
				doStreamNotif(website, id, contentId, streamSetting, liveState);
				setIcon();
			});
		} else {
			doStreamNotif(website, id, contentId, streamSetting, liveState);
		}
	} else {
		console.warn("Unable to get stream state.");
	}
	
	setIcon();
	
	console.timeEnd(id);
	console.groupEnd();
}
function getChannelInfo(website, id){
	let channelInfos_API = new API_channelInfos(website, id);
	
	if(typeof channelInfos["dailymotion"][id] == "undefined"){
		channelInfos["dailymotion"][id] = {"online": false, "notificationStatus": false, "streamName": id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	
	if(channelInfos_API.url !== null && channelInfos_API.overrideMimeType !== null){
		let xhr_channelInfos = new XMLHttpRequest();
		xhr_channelInfos.open('GET', channelInfos_API.url, true);
		xhr_channelInfos.overrideMimeType(channelInfos_API.overrideMimeType);
		xhr_channelInfos.send();
		
		xhr_channelInfos.addEventListener("load", function(){
			let data_channelInfos = JSON.parse(xhr_channelInfos.responseText);
			
			console.info(website + " - " + id + " (" + channelInfos_API.url + ")");
			console.dir(data_channelInfos);
			
			channelInfosProcess[website](id, data_channelInfos);
		});
	}
}
let channelInfosProcess = {
	"dailymotion":
		function(id, data){
			let streamData = channelInfos["dailymotion"][id];
			if(data.hasOwnProperty("screenname")){
				streamData.streamName = data["screenname"];
				streamData.streamURL = data.url;
				if(typeof data["avatar_720_url"] == "string" && data["avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["avatar_720_url"];
				}
				
				if(typeof data["facebook_url"] == "string" && data["facebook_url"] != "" && facebookID_from_url.test(data["facebook_url"])){
					streamData.facebookID = facebookID_from_url.exec(data["facebook_url"])[1];
				}
				if(typeof data["twitter_url"] == "string" && data["twitter_url"] != "" && twitterID_from_url.test(data["twitter_url"])){
					streamData.facebookID = twitterID_from_url.exec(data["twitter_url"])[1];
				}
			}
		}
}

//Fonction principale : check si le live est on
let checkLiveStatus = {
	"beam":
		function(id, contentId, data){
			let streamData = liveStatus["beam"][id][contentId];
			
			streamData.streamName = data.user["username"];
			streamData.streamStatus = data["name"];
			
			if(typeof data.user["avatarUrl"] == "string" && data.user["avatarUrl"] != ""){
				streamData.streamOwnerLogo = data["user"]["avatarUrl"];
			}
			streamData.streamCurrentViewers = parseInt(data["viewersCurrent"]);
			if(typeof data.user.social["twitter"] == "string" && data.user.social["twitter"] != "" && twitterID_from_url.test(data.user.social["twitter"])){
				streamData.twitterID = twitterID_from_url.exec(data.user.social["twitter"])[1];
			}
			
			streamData.online = data["online"];
			return streamData.online;
		},
	"dailymotion":
		function(id, contentId, data){
			let streamData = liveStatus["dailymotion"][id][contentId];
			streamData.streamName = data.title;
			streamData.streamCurrentViewers = JSON.parse(data.audience);
			streamData.streamURL = data.url;
			if(typeof data.onair == "boolean"){
				streamData.online = data.onair;
				return streamData.online;
			} else {
				return null;
			}
		},
	"hitbox":
		function(id, contentId, data){
			let streamData = liveStatus["hitbox"][id][contentId];
			if(data.hasOwnProperty("livestream") == false){
				if(data.error_msg="no_media_found"){
					streamData.online = false;
				}
				streamData.streamName = id;
				return null;
			}
			if(typeof data["livestream"][0] == "object"){
				data = data["livestream"][0];
				streamData.streamName = data["media_user_name"];
				streamData.streamStatus = data["media_status"];
				if(typeof data["category_name"] == "string" && data["category_name"] != ""){
					streamData.streamGame = data["category_name"];
				}
				if(data["category_logo_large"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_large"];
				} else if(data["category_logo_small"] !== null){
					streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv" + data["category_logo_small"];
				} else {
					streamData.streamCategoryLogo = "";
				}
				if(streamData.streamCategoryLogo = "http://edge.sf.hitbox.tv/static/img/generic/blank.gif"){
					streamData.streamCategoryLogo = "";
				}
				if(data.channel["user_logo"] !== null){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo"];
				} else if(data["user_logo_small"] !== null){
					streamData.streamOwnerLogo = "http://edge.sf.hitbox.tv" + data.channel["user_logo_small"];
				} else {
					streamData.streamOwnerLogo = "";
				}
				if(typeof data.channel["channel_link"] == "string" && data.channel["channel_link"] != ""){
					streamData.streamURL = data.channel["channel_link"];
				}
				streamData.streamCurrentViewers = parseInt(data["media_views"]);
				
				streamData.online = (data["media_is_live"] == "1")? true : false;
				if(typeof data.channel["twitter_account"] == "string" && data.channel["twitter_account"] != "" && typeof data.channel["twitter_account"] == "string" && data.channel["twitter_enabled"] == "1"){
					streamData.twitterID = data.channel["twitter_account"];
				}
				return streamData.online;
				/* if(data["media_is_live"] == "1"){
					return true;
				} else {
					return false
				}*/
			} else {
				return null;
			}
		},
	"twitch":
		function(id, contentId, data){
			let streamData = liveStatus["twitch"][id][contentId];
			if(data.hasOwnProperty("stream")){
				data = data["stream"];
				if(data != null){
					streamData.streamName = data["channel"]["display_name"];
					streamData.streamStatus = data["channel"]["status"];
					streamData.streamGame = (data["game"] !== null && typeof data["game"] == "string")? data["game"] : "";
					if(typeof data.channel["logo"] == "string" && data.channel["logo"] != "") {
						streamData.streamOwnerLogo = data.channel["logo"];
					}
					if(typeof data.channel["url"] == "string" && data.channel["url"] != "") {
						streamData.streamURL = data.channel["url"];
					}
					streamData.streamCurrentViewers = parseInt(data["viewers"]);
					
					streamData.online = true;
					return streamData.online;
				} else {
					if(streamData.streamName == ""){
						streamData.streamName = id;
					}
					streamData.online = false;
					return streamData.online;
				}
			} else {
				return null;
			}
		}
}
let seconderyInfo = {
	"dailymotion":
		function(id, contentId, data, isStreamOnline){
			let streamData = liveStatus["dailymotion"][id][contentId];
			if(data.hasOwnProperty("user.screenname")){
				if(isStreamOnline){
					streamData.streamStatus = streamData.streamName;
					streamData.streamGame = (data["game.title"] !== null && typeof data["game.title"] == "string")? data["game.title"] : "";
				}
				if(typeof data["user.avatar_720_url"] == "string" && data["user.avatar_720_url"] != ""){
					streamData.streamOwnerLogo = data["user.avatar_720_url"];
				}
				streamData.streamName = data["user.screenname"];
				
				if(typeof data["user.facebook_url"] == "string" && data["user.facebook_url"] != "" && facebookID_from_url.test(data["user.facebook_url"])){
					streamData.facebookID = facebookID_from_url.exec(data["user.facebook_url"])[1];
				}
				if(typeof data["user.twitter_url"] == "string" && data["user.twitter_url"] != "" && twitterID_from_url.test(data["user.twitter_url"])){
					streamData.facebookID = twitterID_from_url.exec(data["user.twitter_url"])[1];
				}
			}
		},
	"twitch":
		function(id, contentId, data, isStreamOnline){
			let streamData = liveStatus["twitch"][id][contentId];
			if(typeof data["display_name"] == "string"){
				streamData.streamName = data["display_name"];
			}
			if(typeof data["logo"] == "string" && data["logo"] != ""){
				streamData.streamOwnerLogo = data["logo"];
			}
		}
}

function importButton(website){
	if(website == "beam"){
		let xhr = new XMLHttpRequest();
		xhr.open('GET', `https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`, true);
		xhr.overrideMimeType("text/plain; charset=utf-8");
		xhr.send();
		xhr.addEventListener("load", function(){
			let data = JSON.parse(xhr.responseText); //xhr.responseText;
			
			if(!isValidResponse(website, data)){
				console.warn(`Sometimes bad things just happen - ${website} - https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`);
				doNotif("Live notifier", _("beam_import_error"));
			} else {
				console.group();
				console.info(`${website} - https://beam.pro/api/v1/channels/${getPreferences(`${website}_user_id`)}`);
				console.dir(data);
				
				let numerical_id = data.user.id;
				
				console.groupEnd();
				
				importStreams(website, numerical_id);
			}
		});
	} else {
		importStreams(website, getPreferences(`${website}_user_id`));
	}
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
		setTimeout(function(){
			refreshPanel(false);
		}, 5000);
	});
}
function importStreamsEnd(id){
	setIcon();
	console.timeEnd(id);
}
let importStreamWebsites = {
	"beam": function(id, data){
		let streamListSetting = new streamListFromSetting("beam");
		let streamList = streamListSetting.objData;
		if(typeof data == "object"){
			for(let item of data){
				streamListSetting.addStream(item["token"], "");
			}
			streamListSetting.update();
		}
	},
	"dailymotion": function(id, data, pageNumber){
		let streamListSetting = new streamListFromSetting("dailymotion");
		let streamList = streamListSetting.objData;
		
		if(data.total > 0){
			for(let item of data.list){
				if(!streamListSetting.streamExist(`channel::${item.id}`) && !streamListSetting.streamExist(`channel::${item.username}`)){
					streamListSetting.addStream(`channel::${item.id}`, "");
				} else {
					console.log(`${item.username} already exist`);
				}
			}
			streamListSetting.update();
		}
		
		if(data.has_more){
			let next_url = new importAPI("dailymotion", id).url;
			let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
			importStreams("dailymotion", id, next_url + "&page=" + next_page_number, next_page_number);
		} else {
			importStreamsEnd(id);
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
				let next_page_number = ((typeof pageNumber == "number")? pageNumber : 1) + 1;
				importStreams("hitbox", id, next_url + "&offset=" + next_page_number, next_page_number);
			} else {
				importStreamsEnd(id);
			}
		}
	},
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
	}
}


//				------ Load / Unload Event(s) ------				//

// Load online/offline badges
let online_badgeData = null;
let offline_badgeData = null;

function loadBadges(){
	let old_node = document.querySelector('#canvas_online');
	if(old_node !== null){
		old_node.parentNode.removeChild(old_node);
	}
	let canvas_online = document.createElement('canvas');
	canvas_online.id = 'canvas_online';
	document.querySelector('body').appendChild(canvas_online);
	let context_online = canvas_online.getContext('2d');
	
	let xhr_online = new XMLHttpRequest();
	xhr_online.open('GET', "/data/live_online.svg", true);
	xhr_online.overrideMimeType("text/plain; charset=utf-8");
	xhr_online.send();
	
	xhr_online.addEventListener("load", function(){
		context_online.drawSvg(xhr_online.responseText, 0, 0, 19, 19);
		online_badgeData = context_online.getImageData(0, 0, 19, 19);
	});
	
	old_node = document.querySelector('#canvas_offline');
	if(old_node !== null){
		old_node.parentNode.removeChild(old_node);
	}
	let canvas_offline = document.createElement('canvas');
	canvas_offline.id = 'canvas_offline';
	document.querySelector('body').appendChild(canvas_offline);
	let context_offline = canvas_offline.getContext('2d');
	
	let xhr_offline = new XMLHttpRequest();
	xhr_offline.open('GET', "/data/live_offline.svg", true);
	xhr_offline.overrideMimeType("text/plain; charset=utf-8");
	xhr_offline.send();
	
	xhr_offline.addEventListener("load", function(){
		context_offline.drawSvg(xhr_offline.responseText, 0, 0, 19, 19);
		offline_badgeData = context_offline.getImageData(0, 0, 19, 19);
	});
}

// Begin to check lives
var interval
checkLives();

// Checking if updated
let current_version = "";
(function checkIfUpdated(){
	let getVersionNumbers =  /^(\d*)\.(\d*)\.(\d*)$/;
	let last_executed_version = getPreferences("livenotifier_version");
	current_version = chrome.runtime.getManifest().version;
	
	let last_executed_version_numbers = getVersionNumbers.exec(last_executed_version);
	let current_version_numbers = getVersionNumbers.exec(current_version);
	
	if(last_executed_version != current_version && last_executed_version != "0.0.0"){
		if(current_version_numbers.length == 4 && last_executed_version_numbers.length == 4){
			if(current_version_numbers[1] > last_executed_version_numbers[1]){
				doNotif("Live notifier", _("Addon_have_been_updated", current_version));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] > last_executed_version_numbers[2])){
				doNotif("Live notifier", _("Addon_have_been_updated", current_version));
			} else if((current_version_numbers[1] == last_executed_version_numbers[1]) && (current_version_numbers[2] == last_executed_version_numbers[2]) && (current_version_numbers[3] > last_executed_version_numbers[3])){
				doNotif("Live notifier", _("Addon_have_been_updated", current_version));
			}
		}
	}
	savePreference("livenotifier_version", current_version);
})();
