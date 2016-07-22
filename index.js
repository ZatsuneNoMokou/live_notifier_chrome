'use strict';

window.addEventListener('storage', function(event){
	let prefId = event.key;
	let prefValue = event.newValue;
	
	if(prefId = "check_delay" && parseInt(prefValue) < 1){
		savePreference("check_delay", 1);
	}
});

let _ = chrome.i18n.getMessage;

// appGlobal: Accessible with chrome.extension.getBackgroundPage();
var appGlobal = {
	options: options,
	options_default: options_default,
	options_default_sync: options_default_sync
}

function getCheckDelay(){
	let check_delay_pref = getPreference('check_delay');
	if(check_delay_pref == "number" && !isNaN(check_delay_pref)){
		if(check_delay_pref < 1){
			savePreference("check_delay", 1);
		}
		return ((check_delay_pref <= 1)? check_delay_pref : 1) * 60000;
	} else {
		return 5 * 60000;
	}
}

let myIconURL = "/data/live_offline.svg";

let websites = {};
appGlobal["websites"] = websites;
let liveStatus = {};
appGlobal["liveStatus"] = liveStatus;
let channelInfos = {};
appGlobal["channelInfos"] = channelInfos;

function Request_Get(options){
	if(typeof options.url != "string" && typeof options.onComplete != "function"){
		console.warn("Error in options");
	} else {
		let xhr;
		if(typeof options.anonymous == "boolean"){
			xhr = new XMLHttpRequest({anonymous:true});
		} else {
			xhr = new XMLHttpRequest();
		}
		
		xhr.open('GET', options.url, true);
		if(typeof options.overrideMimeType == "string"){
			xhr.overrideMimeType(options.overrideMimeType);
		}
		
		xhr.addEventListener("loadend", function(){
			let response = {
				"url": xhr.responseURL,
				"text": xhr.responseText,
				"json": null,
				"status": xhr.status,
				"statusText": xhr.statusText,
				"header": xhr.getAllResponseHeaders()
			}
			try{response.json = JSON.parse(xhr.responseText);}
			catch(error){/*console.warn(error);*/}
			options.onComplete(response);
		});
		xhr.send();
	}
}

let streamListFromSetting_cache = null;
class streamListFromSetting{
	constructor(requested_website){
		let somethingElseThanSpaces = /[^\s]+/;
		this.stringData = getPreference("stream_keys_list");
		let pref = new String(this.stringData);
		
		if(streamListFromSetting_cache != null && streamListFromSetting_cache.hasOwnProperty("stringData") && streamListFromSetting_cache.stringData == pref){
			//console.log("[Live notifier] streamListFromSetting: Using cache")
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = streamListFromSetting_cache.obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = streamListFromSetting_cache.obj;
		}
		
		let obj = {};
		for(let website in websites){
			obj[website] = {};
		}
		if(pref != "" && somethingElseThanSpaces.test(pref)){
			let myTable = pref.split(",");
			let reg= /\s*([^\s\:]+)\:\:([^\s]+)\s*(.*)?/;
			if(myTable.length > 0){
				for(let i in myTable){
					let url = /((?:http|https):\/\/.*)\s*$/;
					let filters = /\s*(?:(\w+)\:\:(.+)\s*)/;
					let cleanEndingSpace = /(.*)\s+$/;
					
					let result=reg.exec(myTable[i]);
					if(result == null){
						console.warn(`Error with ${myTable[i]}`);
						continue;
					}
					let website = result[1];
					let id = result[2];
					let data = result[3];
					
					if(websites.hasOwnProperty(website) == false){
						// Skip websites not supported, or not yet
						continue;
					}
					obj[website][id] = {hide: false, ignore: false, notifyOnline: getPreference("notify_online"), notifyOffline: getPreference("notify_offline"), streamURL: ""};
					
					if(typeof data != "undefined"){
						if(url.test(data) == true){
							let url_result = url.exec(data);
							obj[website][id].streamURL = url_result[1];
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
								let next_pos = (next_filter_result != null)? next_filter_result.index : scan_string.length;
								
								let current_data;
								if(next_filter_result != null){
									current_data = scan_string.substring(current_filter_result.index, next_filter_result.index);
								} else {
									current_data = scan_string.substring(current_filter_result.index, scan_string.length);
								}
								if(cleanEndingSpace.test(current_data)){
									current_data = cleanEndingSpace.exec(current_data)[1];
								}
								
								if(typeof obj[website][id][current_filter_id] == "undefined"){
									obj[website][id][current_filter_id] = [];
								}
								
								if(current_filter_id == "hide" || current_filter_id == "ignore" || current_filter_id == "notifyOnline" || current_filter_id == "notifyOffline"){
									let boolean = getBooleanFromVar(current_data);
									if(typeof boolean == "boolean"){
										current_data = boolean;
									} else {
										console.warn(`${current_filter_id} of ${id} should be a boolean`);
									}
									obj[website][id][current_filter_id] = current_data;
								} else if(current_filter_id == "facebook" || current_filter_id == "twitter"){
									obj[website][id][current_filter_id] = decodeString(current_data);
								}else {
									obj[website][id][current_filter_id].push(decodeString(current_data));
								}
								scan_string = scan_string.substring(next_pos, scan_string.length);
							}
						}
					}
				}
			}
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = obj;
		} else {
			if(typeof requested_website == "string" && requested_website != ""){
				this.objData = obj[requested_website];
				this.website = requested_website;
			}
			this.objDataAll = obj;
		}
		
		// Update cache
		streamListFromSetting_cache = {
			"stringData": this.stringData,
			"obj": obj
		}
	}
	
	streamExist(website, id){
		for(let i in this.objDataAll[website]){
			if(i.toLowerCase() == id.toLowerCase()){
				return true;
			}
		}
		return false;
	}
	addStream(website, id, url){
		if(this.streamExist(website, id) == false){
			this.objDataAll[website][id] = {streamURL: url};
			this.objData = this.objDataAll[website];
			console.log(`${id} has been added`);
			
			try{
				getPrimary(id, website, id);
			}
			catch(error){
				console.warn(`[Live notifier] ${error}`);
			}
		}
	}
	deleteStream(website, id){
		if(this.streamExist(website, id)){
			delete this.objDataAll[website][id];
			delete this.objData[id];
			if(typeof liveStatus[website][id] != "undefined"){
				delete liveStatus[website][id];
			}
			console.log(`${id} has been deleted`);
		}
	}
	update(){
		let array = [];
		for(let website in this.objDataAll){
			for(let id in this.objDataAll[website]){
				let filters = "";
				for(let j in this.objDataAll[website][id]){
					if(j != "streamURL"){
						if(typeof this.objDataAll[website][id][j] == "object" && JSON.stringify(this.objDataAll[website][id][j]) == "[null]"){
							continue;
						}
						if((j == "facebook" || j == "twitter") && this.objDataAll[website][id][j] == ""){
							continue;
						}
						if((j == "hide" || j == "ignore") && this.objDataAll[website][id][j] == false){
							continue;
						}
						if(j == "notifyOnline" && this.objDataAll[website][id][j] == getPreference("notify_online")){
							continue;
						}
						if(j == "notifyOffline" && this.objDataAll[website][id][j] == getPreference("notify_offline")){
							continue;
						}
						if(typeof this.objDataAll[website][id][j] == "boolean"){
							filters = filters + " " + j + "::" + this.objDataAll[website][id][j];
						}
						if(j == "facebook" || j == "twitter"){
							filters = filters + " " + j + "::" + encodeString(this.objDataAll[website][id][j]);
						} else {
							for(let k in this.objDataAll[website][id][j]){
								filters = filters + " " + j + "::" + encodeString(this.objDataAll[website][id][j][k]);
							}
						}
					}
				}
				
				let URL = (typeof this.objDataAll[website][id].streamURL != "undefined" && this.objDataAll[website][id].streamURL != "")? (" " + this.objDataAll[website][id].streamURL) : "";
				
				array.push(`${website}::${id}${filters}${URL}`);
			}
		}
		let newSettings = array.join(", ");
		savePreference("stream_keys_list", newSettings);
		setIcon();
		console.log(`Stream key list update: ${localStorage.getItem(`stream_keys_list`)}`);
	}
}
appGlobal["streamListFromSetting"] = streamListFromSetting;

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
				if(typeof channelInfos[website][id].streamURL == "string" && channelInfos[website][id].streamURL != ""){
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
appGlobal["getStreamURL"] = getStreamURL;

function refreshPanel(data){
	let doUpdateTheme = false;
	if(typeof data != "undefined"){
		if(typeof data.doUpdateTheme != "undefined"){
			doUpdateTheme = data.doUpdateTheme;
		}
	}
	updatePanelData(doUpdateTheme);
}
function refreshStreamsFromPanel(){
	checkLives();
	updatePanelData();
	function waitToUpdatePanel(){
		updatePanelData();
	}
	setTimeout(waitToUpdatePanel, 5000);
}

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
		for(let website in websites){
			for(let source_website in websites[website].addStream_URLpatterns){
				let streamListSetting = new streamListFromSetting(website);
				let streamList = streamListSetting.objData;
				for(let pattern of websites[website].addStream_URLpatterns[source_website]){
					let id = "";
					if(pattern.test(url)){
						id = pattern.exec(url)[1];
						if(streamListSetting.streamExist(website, id)){
							doNotif("Live notifier",`${display_id(id)} ${_("is_already_configured")}`);
							return true;
						} else {
							let current_API = websites[website].API(id);
							
							if(website_channel_id.test(source_website)){
								current_API = websites[website].API_channelInfos(`channel::${id}`);
							}
							
							Request_Get({
								url: current_API.url,
								overrideMimeType: current_API.overrideMimeType,
								onComplete: function (response) {
									let data = response.json;
									
									console.group()
									console.info(`${website} - ${response.url}`);
									console.dir(data);
									console.groupEnd();
									
									let responseValidity = checkResponseValidity(website, data);
									
									if(website == "dailymotion" && (responseValidity == "success" || responseValidity == "vod" || responseValidity == "notstream")){
											let username = (typeof data.mode == "string")? data["user.username"] : data.username;
											let id_username = `channel::${username}`;
											let id_owner = `channel::${(typeof data.mode == "string")? data.owner : data.id}`;
											
											// Use username (login) as channel id
											id = id_owner;
											if(streamListSetting.streamExist(website, id_username) || streamListSetting.streamExist(website, id_owner)){
												doNotif("Live notifier",`${display_id(id)} ${_("is_already_configured")}`);
												return true;
											}
									} else if(website == "dailymotion" && responseValidity == "invalid_parameter"){
										doNotif("Live notifier", _("No_supported_stream_detected_in_the_current_tab_so_nothing_to_add"));
										return null;
									} else if(checkResponseValidity(website, data) != "success"){
										doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_but_error_retrieving_data")}`);
										return null;
									}
									
									if(getPreference("confirm_addStreamFromPanel")){
										let addstreamNotifAction = new notifAction("addStream", {id: id, website: website, url: ((type == "embed")? active_tab_url : "")});
										doActionNotif(`Live notifier`, `${display_id(id)} ${_("wasnt_configured_and_can_be_added")}`, addstreamNotifAction);
									} else {
										streamListSetting.addStream(website, id, ((type == "embed")? active_tab_url : ""));
										streamListSetting.update();
										doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_and_have_been_added")}`);
										// Update the panel for the new stream added
										setTimeout(function(){
											refreshPanel(false);
										}, 5000);
									}
								}
							})
							return true;
						}
					}
				}
			}
		}
	}
	if(typeof data != "object" && type != "ContextMenu"){
		if(!data.hasOwnProperty("embed_list")){
			chrome.tabs.executeScript(current_tab.id, {file: "/data/js/page_getEmbedList.js"});
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
	if(streamListSetting.streamExist(website, id)){
		if(getPreference("confirm_deleteStreamFromPanel")){
			let deletestreamNotifAction = new notifAction("deleteStream", {id: id, website: website});
			doActionNotif(`Live notifier`, `${display_id(id)} ${_("will_be_deleted_are_you_sure")}`, deletestreamNotifAction);
		} else {
			streamListSetting.deleteStream(website, id);
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("has_been_deleted")}`);
			// Update the panel for the new stream added
			refreshPanel(false);
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
	
	console.log(`${settingName} - ${settingValue}`);
	savePreference(settingName, settingValue);
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
	
	//let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}&hashtags=LiveNotifier${(twitterID != "")? `&related=${twitterID}` : ""}`;
	let url = `https:\/\/twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}&url=${streamURL}${(twitterID != "")? `&related=${twitterID}` : ""}&via=LiveNotifier`;
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

function sendDataToPanel(id, data){
	function responseCallback(response){
		if(typeof response != "undefined"){
			console.group();
			console.info(`Port response of ${id}: `);
			console.dir(response);
			console.groupEnd();
		}
	}
	chrome.runtime.sendMessage({"sender": "Live_Notifier_Main","receiver": "Live_Notifier_Panel", "id": id, "data": data}, responseCallback);
}
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
	if(message.receiver == "Live_Notifier_Main"){
		console.group()
		console.info("Message:");
		console.dir(message);
		console.groupEnd();
		
		let id = message.id;
		let data = message.data;
		
		if(message.sender == "Live_Notifier_Panel" || message.sender == "Live_Notifier_Embed" || message.sender == "Live_Notifier_Options"){
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
				case "shareStream":
					shareStream(data);
					break;
				case "streamSetting_Update":
					streamSetting_Update(data);
					break;
				default:
					console.warn(`Unkown message id (${id})`);
			}
		} else if(message.sender == "Live_Streamer_Embed"){
			switch(message.id){
				case "addStream":
					addStreamFromPanel(data);
					break;
			}
		} else {
			console.warn("Unknown sender");
		}
	}
});


function updatePanelData(doUpdateTheme){
	// Update panel data
	sendDataToPanel("updatePanelData", {"doUpdateTheme": (typeof doUpdateTheme != "undefined")? doUpdateTheme : true});
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
	let cmd = `livestreamer ${getStreamURL(data.website, data.id, data.contentId, false)} ${getPreference("livestreamer_cmd_quality")}`;
	copyToClipboard(cmd);
}
function openOnlineLive(data){
	openTabIfNotExist(data.streamUrl);
	if(getPreference("livestreamer_cmd_to_clipboard")){
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
	if(getPreference("notification_type") == "web"){
		console.info(`Notification (${(typeof action.type == "string")? action.type : "Unknown/No action"}): "${message}" (${imgurl})`);
		let options = {
			body: message,
			icon: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL)
		}
		if(action.type == "addStream" || action.type == "deleteStream"){
			title = `${title} (${_("click_to_confirm")})`;
		}
		let notif = new Notification(title, options);
		notif.onclick = function(){
			doActionNotif_onClick(action, message);
		}
	} else if(getPreference("notification_type") == "chrome_api"){
		chromeAPINotification(title, message, action, imgurl);
	} else {
		console.warn("Unknown notification type");
	}
}
function doActionNotif_onClick(action, message){
	let streamListSetting;
	let id;
	let website;
	if(action.type == "addStream" || action.type == "deleteStream"){
		website = action.data.website;
		streamListSetting = new streamListFromSetting(website);
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
			streamListSetting.addStream(website, id, url);
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("wasnt_configured_and_have_been_added")}`);
			// Update the panel for the new stream added
			setTimeout(function(){
				refreshPanel(false);
			}, 5000);
			break;
		case "deleteStream":
			streamListSetting.deleteStream(website, id);
			streamListSetting.update();
			doNotif("Live notifier", `${display_id(id)} ${_("has been deleted.")}`);
			// Update the panel for the new stream added
			refreshPanel(false);
			break;
		default:
			// Nothing - Unknown action
	}
}
let chromeAPI_button_availability = true;
function chromeAPINotification(title, message, action, imgurl){
	//console.warn(chromeAPI_button_availability + " - " + action.type);
	let options = {
		type: "basic",
		title: title,
		message: message,
		iconUrl: ((typeof imgurl == "string" && imgurl != "")? imgurl : myIconURL),
		isClickable: true
	}
	
	let openUrl = {title: _("Open_in_browser"), iconUrl: "/data/images/ic_open_in_browser_black_24px.svg"},
		close = {title: _("Close"), iconUrl: "/data/images/ic_close_black_24px.svg"},
		addItem = {title: _("Add"), iconUrl: "/data/images/ic_add_circle_black_24px.svg"},
		deleteItem = {title: _("Delete"), iconUrl: "/data/images/ic_delete_black_24px.svg"},
		cancel = {title: _("Cancel"), iconUrl: "/data/images/ic_cancel_black_24px.svg"};
	
	if(chromeAPI_button_availability == true){
		// 2 buttons max per notification
		// 2nd button is a cancel (no action) button
		switch(action.type){
			case "openUrl":
				// Notification with openUrl action
				options.buttons = [openUrl, close]
				break;
			case "addStream":
				options.buttons = [addItem, cancel]
				break;
			case "deleteStream":
				options.buttons = [deleteItem, cancel]
				break;
			default:
				options.buttons = [close];
		}
	} else if(action.type == "addStream" || action.type == "deleteStream"){
		options.title = `${options.title} (${_("click_to_confirm")})`;
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
			notification_id = JSON.stringify(new notifAction("none", {timestamp: Date.now()}));
	}
	chrome.notifications.create(notification_id, options, function(notificationId){
		if(typeof chrome.runtime.lastError == "object" && typeof chrome.runtime.lastError.message == "string" && chrome.runtime.lastError.message.length > 0){
			let error = chrome.runtime.lastError.message;
			
			console.warn(chrome.runtime.lastError.message);
			
			if(error == "Adding buttons to notifications is not supported."){
				chromeAPI_button_availability = false;
				console.log("Buttons not supported, retrying notification without them.")
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
				let website = action.data.website;
				let streamListSetting = new streamListFromSetting(website);
				let id = action.data.id;
				
				if(action.type == "addStream"){
					let url = action.data.url;
					
					console.info(action.data.website);
					
					streamListSetting.addStream(website, id, url);
					streamListSetting.update();
					// Update the panel for the new stream added
					setTimeout(function(){
						refreshPanel(false);
					}, 5000);
				} else if(action.type == "deleteStream"){
					streamListSetting.deleteStream(website, id);
					streamListSetting.update();
					// Update the panel for the deleted stream
					refreshPanel(false);
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
	
	// 0 is the first button, used as button of action
	if(buttonIndex == 0){
		doNotificationAction_Event(notificationId);
	}
});

function getCleanedStreamStatus(website, id, contentId, streamSetting, isStreamOnline){
	let streamData = liveStatus[website][id][contentId];
	
	if(streamData.streamStatus != ""){
		let lowerCase_status = (streamData.streamStatus).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			
			if(streamSetting.statusWhitelist){
				let statusWhitelist = streamSetting.statusWhitelist;
				for(let i in statusWhitelist){
					if(lowerCase_status.indexOf(statusWhitelist[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("statusWhitelist") != ""){
				let statusWhitelist_List = getFilterListFromPreference(getPreference("statusWhitelist"));
				for(let i in statusWhitelist_List){
					if(lowerCase_status.indexOf(statusWhitelist_List[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((streamSetting.statusWhitelist || getPreference("statusWhitelist") != "") && whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current status does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			
			if(streamSetting.statusBlacklist){
				let statusBlacklist = streamSetting.statusBlacklist;
				for(let i in statusBlacklist){
					if(lowerCase_status.indexOf(statusBlacklist[i].toLowerCase()) != -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("statusBlacklist") != ""){
				let statusBlacklist_List = getFilterListFromPreference(getPreference("statusBlacklist"));
				for(let i in statusBlacklist_List){
					if(lowerCase_status.indexOf(statusBlacklist_List[i].toLowerCase()) != -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((streamSetting.statusBlacklist || getPreference("statusBlacklist") != "") && blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current status contain blacklist element(s)`);
			}
		}
	}
	if(typeof streamData.streamGame == "string" && streamData.streamGame != ""){
		let lowerCase_streamGame = (streamData.streamGame).toLowerCase();
		if(isStreamOnline){
			let whitelisted = false;
			if(streamSetting.gameWhitelist){
				let gameWhitelist = streamSetting.gameWhitelist;
				for(let i in gameWhitelist){
					if(lowerCase_streamGame.indexOf(gameWhitelist[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if(getPreference("gameWhitelist") != ""){
				let gameWhitelist_List = getFilterListFromPreference(getPreference("gameWhitelist"));
				for(let i in gameWhitelist_List){
					if(lowerCase_streamGame.indexOf(gameWhitelist_List[i].toLowerCase()) != -1){
						whitelisted = true;
						break;
					}
				}
			}
			if((streamSetting.gameWhitelist || getPreference("gameWhitelist") != "") && whitelisted == false){
				isStreamOnline = false;
				console.info(`${id} current game does not contain whitelist element(s)`);
			}
			
			let blacklisted = false;
			if(streamSetting.gameBlacklist){
				let gameBlacklist = streamSetting.gameBlacklist;
				for(let i in gameBlacklist){
					if(lowerCase_streamGame.indexOf(gameBlacklist[i].toLowerCase()) != -1){
						blacklisted = true;
					}
				}
			}
			if(getPreference("gameBlacklist") != ""){
				let gameBlacklist_List = getFilterListFromPreference(getPreference("gameBlacklist"));
				for(let i in gameBlacklist_List){
					if(lowerCase_streamGame.indexOf(gameBlacklist_List[i].toLowerCase()) != -1){
						blacklisted = true;
						break;
					}
				}
			}
			if((streamSetting.gameBlacklist || getPreference("gameBlacklist") != "") && blacklisted == true){
				isStreamOnline = false;
				console.info(`${id} current game contain blacklist element(s)`);
			}
		}
		
	}
	streamData.liveStatus.filteredStatus = isStreamOnline;
	return isStreamOnline;
}
appGlobal["getCleanedStreamStatus"] = getCleanedStreamStatus;

function doStreamNotif(website, id, contentId, streamSetting){
	let streamList = (new streamListFromSetting(website)).objData;
	let streamData = liveStatus[website][id][contentId];
	
	let online = streamData.liveStatus.API_Status;
	
	let streamName = streamData.streamName;
	let streamOwnerLogo = streamData.streamOwnerLogo;
	let streamCategoryLogo = streamData.streamCategoryLogo;
	let streamLogo = "";
	
	if(typeof streamOwnerLogo == "string" && streamOwnerLogo != ""){
		streamLogo  = streamOwnerLogo;
	}
	
	let isStreamOnline_filtered = getCleanedStreamStatus(website, id, contentId, streamSetting, online);
	
	if(isStreamOnline_filtered){
		if(((typeof streamList[id].notifyOnline == "boolean")? streamList[id].notifyOnline : getPreference("notify_online")) == true && streamData.liveStatus.notifiedStatus == false){
			let streamStatus = ((streamData.streamStatus != "")? ": " + streamData.streamStatus : "") + ((streamData.streamGame != "")? (" (" + streamData.streamGame + ")") : "");
				if(streamLogo != ""){
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true), streamLogo);
				} else {
					doNotifUrl(_("Stream online"), `${streamName}${streamStatus}`, getStreamURL(website, id, contentId, true));
				}
		}
	} else {
		if(((typeof streamList[id].notifyOffline == "boolean")? streamList[id].notifyOffline : getPreference("notify_offline")) == true && streamData.liveStatus.notifiedStatus == true){
			if(streamLogo != ""){
				doNotif(_("Stream offline"),streamName, streamLogo);
			} else {
				doNotif(_("Stream offline"),streamName);
			}
		}
	}
	streamData.liveStatus.notifiedStatus = isStreamOnline_filtered;
}
appGlobal["doStreamNotif"] = doStreamNotif;

function getOfflineCount(){
	var offlineCount = 0;
	
	for(let website in websites){
		let streamList = (new streamListFromSetting(website)).objData;
		
		for(let id in streamList){
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - getOfflineCount] ${id} of ${website} is ignored`);
				continue;
			}
			
			if(id in liveStatus[website]){
				if(JSON.stringify(liveStatus[website][id]) == "{}"){
					offlineCount = offlineCount + 1;
				} else {
					for(let contentId in liveStatus[website][id]){
						if(!liveStatus[website][id][contentId].liveStatus.filteredStatus && streamList.hasOwnProperty(id)){
							offlineCount = offlineCount + 1;
						}
					}
				}
			}
		}
	}
	return offlineCount;
}
appGlobal["getOfflineCount"] = getOfflineCount;

//Changement de l'icone
function setIcon() {
	appGlobal["onlineCount"] = 0;
	
	for(let website in liveStatus){
		var streamList = (new streamListFromSetting(website)).objData;
		for(let id in liveStatus[website]){
			if(id in streamList && (typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true)){
				// Ignoring stream with ignore set to true from online count
				//console.log(`[Live notifier - setIcon] ${id} of ${website} is ignored`);
				continue;
			} else {
				for(let contentId in liveStatus[website][id]){
					if(liveStatus[website][id][contentId].liveStatus.filteredStatus && streamList.hasOwnProperty(id)){
						appGlobal["onlineCount"] = appGlobal["onlineCount"] + 1;
					}
				}
			}
		}
	}
	
	if(online_badgeData == null || offline_badgeData == null){
		console.info("Icon(s) not loaded");
		loadBadges();
	} else {
		if (appGlobal["onlineCount"] > 0){
			chrome.browserAction.setTitle({title: _("count_stream_online",appGlobal["onlineCount"])});
			
			chrome.browserAction.setIcon({
				imageData: online_badgeData
			});
			//chrome.browserAction.setIcon({path: "/data/live_online.svg"});
			
			chrome.browserAction.setBadgeText({text: appGlobal["onlineCount"].toString()});
			chrome.browserAction.setBadgeBackgroundColor({color: "#FF0000"});
		} else {
			chrome.browserAction.setTitle({title: _("No_stream_online")});
			
			chrome.browserAction.setIcon({
				imageData: offline_badgeData
			});
			//chrome.browserAction.setIcon({imageData: "/data/live_offline.svg"});
			
			chrome.browserAction.setBadgeText({text: appGlobal["onlineCount"].toString()});
			chrome.browserAction.setBadgeBackgroundColor({color: "#424242"});
		}
	}
};
appGlobal["setIcon"] = setIcon;

let website_channel_id = /channel\:\:(.*)/;
let facebookID_from_url = /(?:http|https):\/\/(?:www\.)?facebook.com\/([^\/]+)(?:\/.*)?/;
let twitterID_from_url = /(?:http|https):\/\/(?:www\.)?twitter.com\/([^\/]+)(?:\/.*)?/;

function checkResponseValidity(website, data){
	if(data == null || typeof data != "object" || JSON.stringify == "{}"){
		console.warn("Unable to get stream state (no connection).");
		return "parse_error";
	}
	let state = websites[website].checkResponseValidity(data);
	switch(state){
		case "error":
			console.warn(`[${website}] Unable to get stream state (error detected).`);
			return "error";
			break;
		case "vod":
			console.warn(`[${website}] Unable to get stream state (vod detected).`);
			return "vod";
			break;
		case "notstream":
			console.warn(`[${website}] Unable to get stream state (not a stream).`);
			return "notstream";
			break;
		case "":
		case "success":
			return "success";
		default:
			console.warn(`[${website}] Unable to get stream state (${state}).`);
			return state;
			break;
	}
	
	return "success";
}

let checkingLivesState_wait = false,
	checkingLivesState = appGlobal["checkingLivesState"] = null;
function checkLivesProgress_init(){
	if(checkingLivesState != null){
		console.warn("[checkLivesProgress_init] Previous progress wasn't finished?");
	}
	checkingLivesState = appGlobal["checkingLivesState"] = {};
}
function checkLivesProgress_initStream(website, id){
	if(checkingLivesState == null){
		checkLivesProgress_init();
	}
	if(!checkingLivesState.hasOwnProperty(website)){
		checkingLivesState[website] = {};
	}
	if(!checkingLivesState[website].hasOwnProperty(id)){
		checkingLivesState[website][id] = {};
	}
}
function checkLivesProgress_addContent(website, id, contentId){

	if(typeof checkingLivesState[website][id] != "object"){
		checkLivesProgress_initStream(website, id);
	}
	checkingLivesState[website][id][contentId] = "";
}
function checkLivesProgress_removeContent(website, id, contentId){
	if(checkingLivesState.hasOwnProperty(website) == true && checkingLivesState[website].hasOwnProperty(id) == true && typeof checkingLivesState[website][id][contentId] == "string"){
		delete checkingLivesState[website][id][contentId];
	}
	checkLivesProgress_checkStreamEnd(website, id);
}
function checkLivesProgress_checkStreamEnd(website, id){
	if(checkingLivesState.hasOwnProperty(website) == true && checkingLivesState[website].hasOwnProperty(id) == true && JSON.stringify(checkingLivesState[website][id]) == "{}"){
		delete checkingLivesState[website][id];
	}
	checkLivesProgress_checkLivesEnd();
}
function checkLivesProgress_checkLivesEnd(){
	if(checkingLivesState_wait == false){
		for(let website in websites){
			if(JSON.stringify(checkingLivesState[website]) == "{}"){
				delete checkingLivesState[website];
			}
		}
		
		if(JSON.stringify(checkingLivesState) == "{}"){
			checkingLivesState = appGlobal["checkingLivesState"] = null;
			console.info("[Live notifier] Live check end");
		}
	}
}

function checkLives(){
	console.group();
	
	checkingLivesState_wait = true;
	checkLivesProgress_init();
	
	for(let website in websites){
		let streamList = (new streamListFromSetting(website)).objData;
		
		console.group();
		console.info(website);
		console.dir(streamList);
		console.groupEnd();
		
		for(let id in streamList){
			if(typeof streamList[id].ignore == "boolean" && streamList[id].ignore == true){
				//console.info(`Ignoring ${id}`);
				continue;
			}
			checkLivesProgress_initStream(website, id);
			getPrimary(id, website, streamList[id]);
		}
	}
	
	checkingLivesState_wait = false;
	console.groupEnd();
	
	clearInterval(interval);
	interval = setInterval(checkLives, getCheckDelay());
}

function getPrimary(id, website, streamSetting, url, pageNumber){
	checkLivesProgress_initStream(website, id);
	
	let current_API = websites[website].API(id);
	if(typeof url == "string"){
		current_API.url = url;
	}
	
	console.time(`${website}::${id}`);
	
	Request_Get({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let data = response.json;
			
			console.group();
			console.info(`${website} - ${id} (${response.url})`);
			console.dir(data);
			console.groupEnd();
			
			if(typeof liveStatus[website][id] == "undefined"){
				liveStatus[website][id] = {};
			}
			
			if(website_channel_id.test(id) == true){
				if(typeof channelInfos[website][id] == "undefined"){
					let defaultChannelInfos = channelInfos[website][id] = {"liveStatus": {"API_Status": false, "notificationStatus": false, "lastCheckStatus": "", "liveList": {}}, "streamName": (website_channel_id.test(id) == true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
				}
				
				if(checkResponseValidity(website, data) == "success"){
					let streamListData;
					if(typeof pageNumber == "number"){
						streamListData = websites[website].channelList(id, website, data, pageNumber);
					} else {
						streamListData = websites[website].channelList(id, website, data);
					}
					
					if(typeof pageNumber != "number"){
						// First loop
						channelInfos[website][id].liveStatus.liveList = {};
					}
					
					if(JSON.stringify(streamListData.streamList) == "{}"){
						getChannelInfo(website, id);
						channelListEnd(website, id);
						
						checkLivesProgress_checkStreamEnd(website, id);
					} else {
						for(let i in streamListData.streamList){
							let contentId = i;
							channelInfos[website][id].liveStatus.liveList[contentId] = "";
							checkLivesProgress_addContent(website, id, contentId);
							processPrimary(id, contentId, website, streamSetting, streamListData.streamList[i]);
						}
						if(streamListData.hasOwnProperty("next") == true){
							if(streamListData.next == null){
								channelListEnd(website, id);
							} else {
								getPrimary(id, website, streamSetting, streamListData.url, streamListData.next_page_number);
							}
						}
					}
				} else {
					channelListEnd(website, id);
				}
			} else {
				let contentId = id;
				checkLivesProgress_addContent(website, id, contentId);
				processPrimary(id, contentId, website, streamSetting, data);
			}
		}
	});
}
appGlobal["getPrimary"] = getPrimary;

function channelListEnd(website, id){
	for(let contentId in liveStatus[website][id]){
		if(channelInfos[website][id].liveStatus.liveList.hasOwnProperty(contentId) == false){
			delete liveStatus[website][id][contentId];
		}
	}
	
	setIcon();
	console.timeEnd(`${website}::${id}`);
	console.groupEnd();
}

function processPrimary(id, contentId, website, streamSetting, data){
	if(typeof liveStatus[website][id][contentId] == "undefined"){
		let defaultStatus = liveStatus[website][id][contentId] = {"liveStatus": {"API_Status": false, "filteredStatus": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": contentId, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	let responseValidity = liveStatus[website][id][contentId].liveStatus.lastCheckStatus = checkResponseValidity(website, data);
	if(responseValidity == "success"){
		let liveState = websites[website].checkLiveStatus(id, contentId, data, liveStatus[website][id][contentId]);
		if(liveState != null){
			if(websites[website].hasOwnProperty("API_second") == true){
				let second_API = websites[website].API_second(contentId);
				
				Request_Get({
					url: second_API.url,
					overrideMimeType: second_API.overrideMimeType,
					onComplete: function (response) {
						let data_second = response.json;
						
						console.info(`${website} - ${id} (${response.url})`);
						console.dir(data_second);
						
						websites[website].seconderyInfo(id, contentId, data_second, liveStatus[website][id][contentId], liveState);
						
						checkLivesProgress_removeContent(website, id, contentId);
						doStreamNotif(website, id, contentId, streamSetting, liveState);
						setIcon();
					}
				});
			} else {
				checkLivesProgress_removeContent(website, id, contentId);
				doStreamNotif(website, id, contentId, streamSetting, liveState);
			}
		} else {
			console.warn("Unable to get stream state.");
			checkLivesProgress_removeContent(website, id, contentId);
		}
	} else {
		checkLivesProgress_removeContent(website, id, contentId);
	}
	setIcon();
	
	console.timeEnd(`${website}::${id}`);
	console.groupEnd();
}
function getChannelInfo(website, id){
	let channelInfos_API = websites[website].API_channelInfos(id);
	
	if(typeof channelInfos[website][id] == "undefined"){
		let defaultChannelInfos = channelInfos[website][id] = {"liveStatus": {"API_Status": false, "notifiedStatus": false, "lastCheckStatus": ""}, "streamName": (website_channel_id.test(id) == true)? website_channel_id.exec(id)[1] : id, "streamStatus": "", "streamGame": "", "streamOwnerLogo": "", "streamCategoryLogo": "", "streamCurrentViewers": null, "streamURL": "", "facebookID": "", "twitterID": ""};
	}
	if(websites[website].hasOwnProperty("API_channelInfos") == true){
		Request_Get({
			url: channelInfos_API.url,
			overrideMimeType: channelInfos_API.overrideMimeType,
			onComplete: function (response) {
				let data_channelInfos = response.json;
				
				console.group();
				console.info(`${website} - ${id} (${response.url})`);
				console.dir(data_channelInfos);
				console.groupEnd();
				
				let responseValidity = channelInfos[website][id].liveStatus.lastCheckStatus = checkResponseValidity(website, data_channelInfos);
				if(responseValidity == "success"){
					websites[website].channelInfosProcess(id, data_channelInfos, channelInfos[website][id]);
				}
			}
		});
	}
}

function importButton(website){
	if(website == "beam"){
		Request_Get({
			url: `https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`,
			overrideMimeType: "text/plain; charset=utf-8",
			onComplete: function (response) {
				let data = response.json;
				
				if(checkResponseValidity(website, data) != "success"){
					console.warn(`Sometimes bad things just happen - ${website} - https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`);
					doNotif("Live notifier", _("beam import error"));
				} else {
					console.group();
					console.info(`${website} - https://beam.pro/api/v1/channels/${getPreference(`${website}_user_id`)}`);
					console.dir(data);
					
					let numerical_id = data.user.id;
					
					console.groupEnd();
					
					importStreams(website, numerical_id);
				}
			}
		});
	} else {
		importStreams(website, getPreference(`${website}_user_id`));
	}
}

function importStreams(website, id, url, pageNumber){
	let current_API = websites[website].importAPI(id);
	if(typeof url == "string" && url != ""){
		current_API.url = url;
	} else {
		console.time(`${website}::${id}`);
	}
	Request_Get({
		url: current_API.url,
		overrideMimeType: current_API.overrideMimeType,
		onComplete: function (response) {
			let data = response.json;
			
			console.group();
			console.info(`${website} - ${id} (${current_API.url})`);
			console.dir(data);
			
			let streamListSetting = new streamListFromSetting(website);
			let streamList = streamListSetting.objData;
			
			let importStreamList_Data;
			if(typeof pageNumber == "number"){
				importStreamList_Data = websites[website].importStreamWebsites(id, data, streamListSetting, pageNumber);
			} else {
				importStreamList_Data = websites[website].importStreamWebsites(id, data, streamListSetting);
			}
			
			
			for(let id of importStreamList_Data.list){
				streamListSetting.addStream(website, id, "");
			}
			streamListSetting.update();
			
			if(importStreamList_Data.hasOwnProperty("next") == true && importStreamList_Data.next != null){
				if(importStreamList_Data.next.hasOwnProperty("pageNumber") == true){
					importStreams(website, id, importStreamList_Data.next.url, importStreamList_Data.next.pageNumber);
				} else {
					importStreams(website, id, importStreamList_Data.next.url);
				}
			} else {
				importStreamsEnd(website, id);
			}
			
			console.groupEnd();
			setTimeout(function(){
				refreshPanel(false);
			}, 5000);
		}
	});
}
function importStreamsEnd(website, id){
	setIcon();
	console.timeEnd(`${website}::${id}`);
}

//				------ Load / Unload Event(s) ------				//

// Load online/offline badges
let online_badgeData = null;
let offline_badgeData = null;

function loadBadges(){
	let old_node = document.querySelector('#canvas_online');
	if(old_node != null){
		old_node.parentNode.removeChild(old_node);
	}
	let canvas_online = document.createElement('canvas');
	canvas_online.id = 'canvas_online';
	document.querySelector('body').appendChild(canvas_online);
	let context_online = canvas_online.getContext('2d');

	Request_Get({
		url: "/data/live_online.svg",
		overrideMimeType: "text/plain; charset=utf-8",
		onComplete: function (response) {
			context_online.drawSvg(response.text, 0, 0, 19, 19);
			online_badgeData = context_online.getImageData(0, 0, 19, 19);
		}
	});
	
	old_node = document.querySelector('#canvas_offline');
	if(old_node != null){
		old_node.parentNode.removeChild(old_node);
	}
	let canvas_offline = document.createElement('canvas');
	canvas_offline.id = 'canvas_offline';
	document.querySelector('body').appendChild(canvas_offline);
	let context_offline = canvas_offline.getContext('2d');
	
	Request_Get({
		url: "/data/live_offline.svg",
		overrideMimeType: "text/plain; charset=utf-8",
		onComplete: function (response) {
			context_offline.drawSvg(response.text, 0, 0, 19, 19);
			offline_badgeData = context_offline.getImageData(0, 0, 19, 19);
		}
	});
}
loadJS("/data/js/", ["canvg/rgbcolor.js", "canvg/StackBlur.js", "canvg/canvg.js"], loadBadges);


// Begin to check lives
var interval
loadJS("/data/js/platforms/", ["beam.js", "dailymotion.js", "hitbox.js", "twitch.js"], function(){
	let URLContext_Array = [];
	
	for(let website in websites){
		for(let source_website in websites[website].addStream_URLpatterns_strings){
			URLContext_Array = URLContext_Array.concat(websites[website].addStream_URLpatterns_strings[source_website]);
		}
	}
	chrome.contextMenus.removeAll();
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
	
	/* 		----- Importation/Removal of old preferences -----		*/
	if(getPreference("stream_keys_list") == ""){
		let importSreamsFromOldVersion = function(){
			let somethingElseThanSpaces = /[^\s]+/;
			let newPrefTable = [];
			for(let website in websites){
				let pref = getPreference(`${website}_keys_list`);
				if(typeof pref != "undefined" && pref != "" && somethingElseThanSpaces.test(pref)){
					let myTable = pref.split(",");
					for(let i in myTable){
						newPrefTable.push(`${website}::${myTable[i]}`);
					}
				}
			}
			savePreference("stream_keys_list", newPrefTable.join(", "));
			for(let website in websites){
				localStorage.removeItem(`${website}_keys_list`);
			}
		}
		importSreamsFromOldVersion();
	}
	
	if(typeof getPreference("livenotifier_version") == "string"){
		localStorage.removeItem("livenotifier_version");
	}
	
	let storage = (typeof chrome.storage.sync == "object")? chrome.storage.sync : chrome.storage.local;
	let toRemove = ["livenotifier_version"];
	for(let website in websites){
		toRemove.push(`${website}_keys_list`);
	}
	storage.remove(toRemove, function(){
		if(typeof chrome.runtime.lastError != "undefined"){
			console.warn(`Error removing preference(s) from sync: ${chrome.runtime.lastError}`);
		}
	});
	/* 		----- Fin Importation/Removal des vieux paramères -----		*/
	
	for(let website in websites){
		liveStatus[website] = {};
		channelInfos[website] = {};
	}
	
	checkLives();
});


// Checking if updated
let previousVersion = "";
let current_version = appGlobal["version"] = chrome.runtime.getManifest().version;
function checkIfUpdated(details){
	let getVersionNumbers =  /^(\d*)\.(\d*)\.(\d*)$/;
	
	let installReason = details.reason;
	console.info(`Runtime onInstalled reason: ${installReason}`);
	
	// Checking if updated
	if(installReason == "update"){
		previousVersion = details.previousVersion;
		let previousVersion_numbers = getVersionNumbers.exec(previousVersion);
		let current_version_numbers = getVersionNumbers.exec(current_version);
		
		if(previousVersion != current_version){
			if(current_version_numbers.length == 4 && previousVersion_numbers.length == 4){
				if(current_version_numbers[1] > previousVersion_numbers[1]){
					doNotif("Live notifier", _("Addon_have_been_updated", current_version));
				} else if((current_version_numbers[1] == previousVersion_numbers[1]) && (current_version_numbers[2] > previousVersion_numbers[2])){
					doNotif("Live notifier", _("Addon_have_been_updated", current_version));
				} else if((current_version_numbers[1] == previousVersion_numbers[1]) && (current_version_numbers[2] == previousVersion_numbers[2]) && (current_version_numbers[3] > previousVersion_numbers[3])){
					doNotif("Live notifier", _("Addon_have_been_updated", current_version));
				}
			}
		}
	}
	chrome.runtime.onInstalled.removeListener(checkIfUpdated);
}
chrome.runtime.onInstalled.addListener(checkIfUpdated);
