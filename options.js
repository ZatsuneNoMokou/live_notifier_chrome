/* Source code from: https://developer.chrome.com/extensions/options */
'use strict';

let backgroundPage = chrome.extension.getBackgroundPage();
let appGlobal = backgroundPage.appGlobal;
let getPreferences = appGlobal.getPreferences;
let getBooleanFromVar = appGlobal.getBooleanFromVar;
let _ = appGlobal._;
let translateNodes = appGlobal.translateNodes;
let translateNodes_title = appGlobal.translateNodes_title;
let getValueFromNode = appGlobal.getValueFromNode;

// Saves options to chrome.storage
function save_options() {
	let preferenceInput_nodes = document.querySelectorAll(".preferenceInput");
	
	for(let i in preferenceInput_nodes){
		let node = preferenceInput_nodes[i];
		if(typeof node.id == "string"){
			port_options.sendData("setting_Update", {settingName: node.id, settingValue: getValueFromNode(node)});
		}
	}
	var status = document.querySelector('#status');
	status.textContent = _("options_saved");
	setTimeout(function() {
		status.textContent = '';
	}, 1250);
}

function sendDataToMain(portName){
	this.port = chrome.runtime.connect({name: portName});
	console.info(`Port (${portName}) connection initiated`);
	this.sendData = function(id, data){
		this.port.postMessage({"id": id, "data": data});
	}
}
let port_options =	new sendDataToMain("Live_Streamer_Options");
let port = port_options.port;


port.onDisconnect.addListener(function(port) {
	console.info(`Port disconnected: ${port.name}`);
});

let hitbox_import_button = document.querySelector("button#hitbox_import");
hitbox_import_button.addEventListener("click", function(){
	port_options.sendData("importStreams","hitbox");
});

let twitch_import_button = document.querySelector("button#twitch_import");
twitch_import_button.addEventListener("click", function(){
	port_options.sendData("importStreams","twitch");
});

let beam_import_button = document.querySelector("button#beam_import");
beam_import_button.addEventListener("click", function(){
	port_options.sendData("importStreams","beam");
});

let pref_nodes = {
	dailymotion_keys_list: document.querySelector('#dailymotion_keys_list'),
	hitbox_keys_list: document.querySelector('#hitbox_keys_list'),
	twitch_keys_list: document.querySelector('#twitch_keys_list'),
	beam_keys_list: document.querySelector('#beam_keys_list'),
	
	hitbox_user_id: document.querySelector('#hitbox_user_id'),
	twitch_user_id: document.querySelector('#twitch_user_id'),
	beam_user_id: document.querySelector('#beam_user_id'),

	check_delay:					document.querySelector('#check_delay'),
	notification_type:				document.querySelector('#notification_type'),
	notify_online:					document.querySelector('#notify_online'),
	notify_offline:					document.querySelector('#notify_offline'),
	show_offline_in_panel:			document.querySelector('#show_offline_in_panel'),
	confirm_addStreamFromPanel:		document.querySelector('#confirm_addStreamFromPanel'),
	confirm_deleteStreamFromPanel:	document.querySelector('#confirm_deleteStreamFromPanel'),
	panel_theme:					document.querySelector('#panel_theme'),
	background_color: 				document.querySelector('#background_color'),
	livestreamer_cmd_to_clipboard: 	document.querySelector('#livestreamer_cmd_to_clipboard'),
	livestreamer_cmd_quality: 		document.querySelector('#livestreamer_cmd_quality')
}
function restore_options() {
	pref_nodes.dailymotion_keys_list.value =			getPreferences("dailymotion_keys_list");
	pref_nodes.hitbox_keys_list.value =					getPreferences("hitbox_keys_list");
	pref_nodes.twitch_keys_list.value =					getPreferences("twitch_keys_list");
	pref_nodes.beam_keys_list.value =					getPreferences("beam_keys_list");
	
	pref_nodes.hitbox_user_id.value =					getPreferences("hitbox_user_id");
	pref_nodes.twitch_user_id.value =					getPreferences("twitch_user_id");
	pref_nodes.beam_user_id.value =						getPreferences("beam_user_id");
	
	pref_nodes.check_delay.value =						parseInt(getPreferences("check_delay"));
	pref_nodes.notification_type.value = 				getPreferences("notification_type");
	pref_nodes.notify_online.checked =					getPreferences("notify_online");
	pref_nodes.notify_offline.checked =					getPreferences("notify_offline");
	pref_nodes.show_offline_in_panel.checked =			getPreferences("show_offline_in_panel");
	pref_nodes.confirm_addStreamFromPanel.checked =		getPreferences("confirm_addStreamFromPanel");
	pref_nodes.confirm_deleteStreamFromPanel.checked =	getPreferences("confirm_deleteStreamFromPanel");
	pref_nodes.panel_theme.value =						getPreferences("panel_theme");
	pref_nodes.background_color.value =					getPreferences("background_color");
	pref_nodes.livestreamer_cmd_to_clipboard.checked =	getPreferences("livestreamer_cmd_to_clipboard");
	pref_nodes.livestreamer_cmd_quality.value =			getPreferences("livestreamer_cmd_quality");
}

function init(){
	translateNodes(document);
	translateNodes_title(document);
	restore_options();
}
document.addEventListener('DOMContentLoaded',				init);
document.querySelector('#save').addEventListener('click',	save_options);

let port_mainscript = null
chrome.runtime.onConnect.addListener(function(_port) {
	console.info(`Port (${_port.name}) connected`);
	port_mainscript = _port;
	port_mainscript.onMessage.addListener(function(message, MessageSender){
		console.group();
		console.log("Page option (onMessage):");
		console.dir(message);
		console.groupEnd();
		
		let id = message.id;
		let data = message.data;
		
		switch(id){
			case "refreshOptions":
				restore_options();
				break;
		}
	});
	port_mainscript.onDisconnect.addListener(function(port) {
		console.assert(`Port disconnected: ${port.name}`);
		port = null;
	});
});

// Storage area compatibility - Might not be useful for now, but Firefox Webextension doesn't seems to plan using the sync storage area
let storage = (typeof chrome.storage.sync == "object")? chrome.storage.sync : chrome.storage.local;

// Save states using in chrome.storage.
function saveOptionsInSync(){
	let dailymotion_keys_list = pref_nodes.dailymotion_keys_list.value;
	let hitbox_keys_list = pref_nodes.hitbox_keys_list.value;
	let twitch_keys_list = pref_nodes.twitch_keys_list.value;
	let beam_keys_list = pref_nodes.beam_keys_list.value;
	
	let hitbox_user_id = pref_nodes.hitbox_user_id.value;
	let twitch_user_id = pref_nodes.twitch_user_id.value;
	let beam_user_id = pref_nodes.beam_user_id.value;
	
	let check_delay =						parseInt(pref_nodes.check_delay.value);
	let notification_type =					pref_nodes.notification_type.value;
	let notify_online =						pref_nodes.notify_online.checked;
	let notify_offline =					pref_nodes.notify_offline.checked;
	let show_offline_in_panel =				pref_nodes.show_offline_in_panel.checked;
	let confirm_addStreamFromPanel =		pref_nodes.confirm_addStreamFromPanel.checked;
	let confirm_deleteStreamFromPanel =		pref_nodes.confirm_deleteStreamFromPanel.checked;
	let panel_theme =						pref_nodes.panel_theme.value;
	let background_color = 					pref_nodes.background_color.value;
	let livestreamer_cmd_to_clipboard = 	pref_nodes.livestreamer_cmd_to_clipboard.checked;
	let livestreamer_cmd_quality = 			pref_nodes.livestreamer_cmd_quality.value;
	storage.set({
		dailymotion_keys_list: dailymotion_keys_list,
		hitbox_keys_list: hitbox_keys_list,
		twitch_keys_list: twitch_keys_list,
		beam_keys_list: beam_keys_list,
		
		hitbox_user_id: hitbox_user_id,
		twitch_user_id: twitch_user_id,
		beam_user_id: beam_user_id,
		
		check_delay: check_delay,
		notification_type: notification_type,
		notify_online: notify_online,
		notify_offline: notify_offline,
		show_offline_in_panel: show_offline_in_panel,
		confirm_addStreamFromPanel: confirm_addStreamFromPanel,
		confirm_deleteStreamFromPanel: confirm_deleteStreamFromPanel,
		panel_theme: panel_theme,
		background_color: background_color,
		livestreamer_cmd_to_clipboard: livestreamer_cmd_to_clipboard,
		livestreamer_cmd_quality: livestreamer_cmd_quality
	}, function() {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = _("options_saved_sync");
		setTimeout(function() {
			status.textContent = '';
		}, 1250);
	});
}
// Restores states using the preferences
// stored in chrome.storage.
function restaureOptionsFromSync(){
	// Default values
	storage.get({
		dailymotion_keys_list: "",
		hitbox_keys_list: "",
		twitch_keys_list: "",
		beam_key_list: "",
		hitbox_user_id: "",
		twitch_user_id: "",
		beam_user_id: "",
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
		livestreamer_cmd_quality: "best"
	}, function(items) {
		pref_nodes.dailymotion_keys_list.value =				items.dailymotion_keys_list;
		pref_nodes.hitbox_keys_list.value =						items.hitbox_keys_list;
		pref_nodes.twitch_keys_list.value =						items.twitch_keys_list;
		pref_nodes.beam_keys_list.value =						items.beam_keys_list;
		
		pref_nodes.hitbox_user_id.value =						items.hitbox_user_id;;
		pref_nodes.twitch_user_id.value =						items.twitch_user_id;
		pref_nodes.beam_user_id.value =						items.beam_user_id;
		
		pref_nodes.check_delay.value =							parseInt(items.check_delay);
		pref_nodes.notification_type.value =					items.notification_type;
		pref_nodes.notify_online.checked =						getBooleanFromVar(items.notify_online);
		pref_nodes.notify_offline.checked =						getBooleanFromVar(items.notify_offline);
		pref_nodes.show_offline_in_panel.checked =				getBooleanFromVar(items.show_offline_in_panel);
		pref_nodes.confirm_addStreamFromPanel.checked =			getBooleanFromVar(items.confirm_addStreamFromPanel);
		pref_nodes.confirm_deleteStreamFromPanel.checked =		getBooleanFromVar(items.confirm_deleteStreamFromPanel);
		pref_nodes.panel_theme.value =							items.panel_theme;
		pref_nodes.background_color.value =						items.background_color;
		pref_nodes.livestreamer_cmd_to_clipboard.checked =	items.livestreamer_cmd_to_clipboard;
		pref_nodes.livestreamer_cmd_quality.value =			items.livestreamer_cmd_quality;
	});
}

let restaure_sync_button = document.querySelector("#restaure_sync");
restaure_sync_button.addEventListener("click", function(){restaureOptionsFromSync();});

let save_sync_button = document.querySelector("#save_sync");
save_sync_button.addEventListener("click", function(){saveOptionsInSync();});
